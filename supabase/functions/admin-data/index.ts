// Deno Edge Function for Admin Dashboard Data & User Management
// Path: supabase/functions/admin-data/index.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"
import { verify } from "https://deno.land/x/djwt@v3.0.1/mod.ts"

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
  ];
  
  let allowedOrigin = '';
  if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app') || origin.endsWith('github.dev')) {
    allowedOrigin = origin;
  } else {
    allowedOrigin = 'https://creative-manager-psi.vercel.app';
  }
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
    'Access-Control-Max-Age': '86400',
  };
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle preflight OPTIONS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const adminJwtSecret = Deno.env.get('ADMIN_JWT_SECRET') || 'batman_dark_knight_secret_key_2026';

    // 1. Verify Admin Token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Missing token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    let adminPayload;
    try {
      const encoder = new TextEncoder();
      const keyData = encoder.encode(adminJwtSecret);
      const key = await crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign", "verify"]
      );

      adminPayload = await verify(token, key);
    } catch (_err) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid session token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (adminPayload.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: Insufficient permissions' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 2. Parse Request Action
    const { action, params } = await req.json();
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Helper to return success responses
    const success = (data: any) => new Response(JSON.stringify({ data }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

    switch (action) {
      case 'getUserList': {
        // Query user statistics using raw SQL structure where possible or parallel queries
        // To prevent massive load, we pull the profiles and compute aggregate statistics
        const { data: profiles, error: pErr } = await supabase
          .from('profiles')
          .select('id, username, email, role, created_at, last_active_at, is_suspended')
          .order('created_at', { ascending: false });

        if (pErr) throw pErr;

        // Populate detail statistics for each profile
        const userList = await Promise.all(profiles.map(async (p) => {
          // Total active daily tasks defined
          const { count: tasksCount } = await supabase
            .from('daily_tasks')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', p.id);

          // Active goals
          const { count: goalsCount } = await supabase
            .from('goals')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', p.id)
            .eq('status', 'active');

          // Sleep average duration (last 7 days)
          const date7DaysAgo = new Date();
          date7DaysAgo.setDate(date7DaysAgo.getDate() - 7);
          const { data: sleepRows } = await supabase
            .from('sleep_logs')
            .select('duration_hours')
            .eq('user_id', p.id)
            .gte('date', date7DaysAgo.toISOString().split('T')[0]);

          const sleepAvg = sleepRows && sleepRows.length > 0
            ? sleepRows.reduce((sum, s) => sum + parseFloat(s.duration_hours as any), 0) / sleepRows.length
            : 0;

          // Average daily completion rate (last 30 days)
          const date30DaysAgo = new Date();
          date30DaysAgo.setDate(date30DaysAgo.getDate() - 30);
          const date30DaysAgoStr = date30DaysAgo.toISOString().split('T')[0];

          const { data: taskCompletions } = await supabase
            .from('task_completions')
            .select('completed')
            .eq('user_id', p.id)
            .gte('date', date30DaysAgoStr);

          const completionsCount = taskCompletions ? taskCompletions.length : 0;
          const completedCount = taskCompletions ? taskCompletions.filter(c => c.completed).length : 0;
          const avgCompletions = completionsCount > 0 ? (completedCount / completionsCount) * 100 : 0;

          // Calculate current streak of 100% completions (simplified calculation)
          // Look at task completions grouped by date
          const { data: completionsByDate } = await supabase
            .from('task_completions')
            .select('date, completed')
            .eq('user_id', p.id)
            .order('date', { ascending: false });

          let currentStreak = 0;
          if (completionsByDate && completionsByDate.length > 0) {
            const dateGroups: Record<string, { total: number; completed: number }> = {};
            completionsByDate.forEach(c => {
              if (!dateGroups[c.date]) dateGroups[c.date] = { total: 0, completed: 0 };
              dateGroups[c.date].total++;
              if (c.completed) dateGroups[c.date].completed++;
            });

            const sortedDates = Object.keys(dateGroups).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
            
            // Check if streak was broken before today (allow offset of 1 day for today)
            const todayStr = new Date().toISOString().split('T')[0];
            const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
            
            let streakActive = true;
            let checkIdx = 0;
            
            // Allow checking from yesterday if user hasn't finished today yet
            if (sortedDates[0] !== todayStr && sortedDates[0] !== yesterdayStr) {
              streakActive = false;
            }

            while (streakActive && checkIdx < sortedDates.length) {
              const d = sortedDates[checkIdx];
              const group = dateGroups[d];
              const pct = group.completed / group.total;
              
              // PRD rule: Streak freeze at 75%+ completion
              if (pct >= 0.75) {
                currentStreak++;
                checkIdx++;
              } else {
                streakActive = false;
              }
            }
          }

          return {
            id: p.id,
            username: p.username,
            email: p.email,
            role: p.role,
            created_at: p.created_at,
            last_active_at: p.last_active_at,
            is_suspended: p.is_suspended,
            total_tasks: tasksCount || 0,
            active_goals: goalsCount || 0,
            sleep_avg: parseFloat(sleepAvg.toFixed(1)),
            avg_completion: parseFloat(avgCompletions.toFixed(0)),
            current_streak: currentStreak
          };
        }));

        return success(userList);
      }

      case 'getUserDrillDown': {
        const { targetUserId } = params;
        if (!targetUserId) throw new Error('Missing targetUserId');

        const { data: profile, error: prErr } = await supabase
          .from('profiles')
          .select('id, username, email, is_suspended')
          .eq('id', targetUserId)
          .single();

        if (prErr) throw prErr;

        // Fetch task completions (recent 30 days) for calendar heatmap
        const { data: completions } = await supabase
          .from('task_completions')
          .select('date, completed')
          .eq('user_id', targetUserId)
          .order('date', { ascending: false })
          .limit(300);

        // Fetch active goals and progress
        const { data: goals } = await supabase
          .from('goals')
          .select('id, name, category, status, target_date, created_at')
          .eq('user_id', targetUserId);

        const goalsWithProgress = await Promise.all((goals || []).map(async (g) => {
          const { data: subTasks } = await supabase
            .from('goal_tasks')
            .select('id')
            .eq('goal_id', g.id);

          const taskIds = subTasks?.map(t => t.id) || [];
          let progress = 0;
          if (taskIds.length > 0) {
            const { data: subCompletions } = await supabase
              .from('goal_task_completions')
              .select('completed')
              .in('goal_task_id', taskIds);
            
            const total = subCompletions?.length || 0;
            const completed = subCompletions?.filter(c => c.completed).length || 0;
            progress = total > 0 ? Math.round((completed / total) * 100) : 0;
          }

          return { ...g, progress };
        }));

        // Fetch sleep logs (last 30 days)
        const { data: sleepLogs } = await supabase
          .from('sleep_logs')
          .select('date, duration_hours, quality_rating')
          .eq('user_id', targetUserId)
          .order('date', { ascending: false })
          .limit(30);

        // Fetch finance transaction summaries (Expense by category, plus totals)
        const { data: transactions } = await supabase
          .from('finance_transactions')
          .select('amount, finance_categories(name, type)')
          .eq('user_id', targetUserId);

        let totalIncome = 0;
        let totalExpense = 0;
        const categoryMap: Record<string, number> = {};

        transactions?.forEach(t => {
          const amt = parseFloat(t.amount as any);
          const cat = t.finance_categories;
          if (cat) {
            if (cat.type === 'income') {
              totalIncome += amt;
            } else {
              totalExpense += amt;
              categoryMap[cat.name] = (categoryMap[cat.name] || 0) + amt;
            }
          }
        });

        const financePie = Object.entries(categoryMap).map(([name, value]) => ({ name, value }));

        // AI Chat conversation count
        const { count: chatCount } = await supabase
          .from('ai_chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', targetUserId);

        // Count of failure reasons by category (privacy: do not select full text)
        const { data: failures } = await supabase
          .from('failure_reasons')
          .select('source_type');

        const failureCounts: Record<string, number> = { daily_task: 0, goal_task: 0, sleep: 0 };
        failures?.forEach(f => {
          if (failureCounts[f.source_type] !== undefined) {
            failureCounts[f.source_type]++;
          }
        });

        return success({
          profile,
          completions,
          goals: goalsWithProgress,
          sleepLogs,
          financeSummary: {
            income: totalIncome,
            expense: totalExpense,
            categoryBreakdown: financePie
          },
          aiChatCount: chatCount || 0,
          failureStats: failureCounts
        });
      }

      case 'getPlatformStats': {
        // Total registered users
        const { count: totalUsers } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        // Daily Active Users (active in last 30 days)
        const date30DaysAgo = new Date();
        date30DaysAgo.setDate(date30DaysAgo.getDate() - 30);
        const { data: activeUsersData } = await supabase
          .from('profiles')
          .select('last_active_at')
          .gte('last_active_at', date30DaysAgo.toISOString());

        const activeCount = activeUsersData ? activeUsersData.length : 0;

        // Feature usage breakdown counts
        const { count: tasksCount } = await supabase.from('daily_tasks').select('*', { count: 'exact', head: true });
        const { count: sideQuestsCount } = await supabase.from('side_quest_entries').select('*', { count: 'exact', head: true });
        const { count: goalsCount } = await supabase.from('goals').select('*', { count: 'exact', head: true });
        const { count: sleepCount } = await supabase.from('sleep_logs').select('*', { count: 'exact', head: true });
        const { count: financeCount } = await supabase.from('finance_transactions').select('*', { count: 'exact', head: true });

        // Overall task completion rate
        const { data: completions } = await supabase.from('task_completions').select('completed');
        const compTotal = completions ? completions.length : 0;
        const compDone = completions ? completions.filter(c => c.completed).length : 0;
        const avgGlobalCompletion = compTotal > 0 ? (compDone / compTotal) * 100 : 0;

        // Signups per day (last 30 days)
        const { data: profilesSignup } = await supabase
          .from('profiles')
          .select('created_at')
          .gte('created_at', date30DaysAgo.toISOString());

        const signupMap: Record<string, number> = {};
        profilesSignup?.forEach(p => {
          const dStr = new Date(p.created_at).toISOString().split('T')[0];
          signupMap[dStr] = (signupMap[dStr] || 0) + 1;
        });

        const newSignupsChart = Object.entries(signupMap).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date));

        return success({
          totalUsers: totalUsers || 0,
          activeUsers30d: activeCount,
          avgCompletionRate: parseFloat(avgGlobalCompletion.toFixed(1)),
          featureUsage: [
            { name: 'Habits', count: tasksCount || 0 },
            { name: 'Side Quests', count: sideQuestsCount || 0 },
            { name: 'Goals', count: goalsCount || 0 },
            { name: 'Sleep Logs', count: sleepCount || 0 },
            { name: 'Finance Logs', count: financeCount || 0 }
          ],
          newSignups: newSignupsChart
        });
      }

      case 'suspendUser': {
        const { targetUserId } = params;
        if (!targetUserId) throw new Error('Missing targetUserId');
        const { error } = await supabase
          .from('profiles')
          .update({ is_suspended: true })
          .eq('id', targetUserId);
        if (error) throw error;
        return success({ success: true, status: 'suspended' });
      }

      case 'reactivateUser': {
        const { targetUserId } = params;
        if (!targetUserId) throw new Error('Missing targetUserId');
        const { error } = await supabase
          .from('profiles')
          .update({ is_suspended: false })
          .eq('id', targetUserId);
        if (error) throw error;
        return success({ success: true, status: 'active' });
      }

      case 'resetPassword': {
        const { targetUserId } = params;
        if (!targetUserId) throw new Error('Missing targetUserId');
        
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', targetUserId)
          .single();

        if (!userProfile) throw new Error('User email not found');

        const { error } = await supabase.auth.admin.generateLink({
          type: 'recovery',
          email: userProfile.email
        });

        if (error) throw error;
        return success({ success: true, message: 'Recovery email sent' });
      }

      case 'deleteUser': {
        const { targetUserId } = params;
        if (!targetUserId) throw new Error('Missing targetUserId');
        
        // Deleting user via Supabase Auth Admin API wipes their profile and all database rows
        // thanks to cascading foreign key constraints
        const { error } = await supabase.auth.admin.deleteUser(targetUserId);
        if (error) throw error;
        return success({ success: true, message: 'User hard deleted successfully' });
      }

      case 'promoteToAdmin': {
        const { targetUserId } = params;
        if (!targetUserId) throw new Error('Missing targetUserId');
        
        const { error } = await supabase
          .from('profiles')
          .update({ role: 'admin' })
          .eq('id', targetUserId);
          
        if (error) throw error;
        return success({ success: true, role: 'admin' });
      }

      default:
        return new Response(JSON.stringify({ error: `Action '${action}' not found` }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

  } catch (error) {
    console.error('Unhandled Admin Data Error:', error);
    return new Response(JSON.stringify({ error: 'Server Error: ' + error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
