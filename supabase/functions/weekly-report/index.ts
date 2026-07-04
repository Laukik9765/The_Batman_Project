// Deno Edge Function for Sunday Weekly AI Report Generation
// Path: supabase/functions/weekly-report/index.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"

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
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

    if (!geminiApiKey) {
      throw new Error('Missing AI API Key (GEMINI_API_KEY) on the server');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // This can be triggered by a CRON scheduler or manual POST request by admin
    // Find users who have been active in the last 7 days to compile reports
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const oneWeekAgoStr = oneWeekAgo.toISOString();

    const { data: activeUsers, error: usersErr } = await supabase
      .from('profiles')
      .select('id, username, full_name, email, timezone')
      .gte('last_active_at', oneWeekAgoStr)
      .eq('is_suspended', false);

    if (usersErr) throw usersErr;

    // Report date details (Today is Sunday)
    const today = new Date();
    // Sunday is the start of the week for our reports
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - today.getDay());
    const weekStartStr = sunday.toISOString().split('T')[0];

    const generatedReports = [];

    // Loop through each active user and compile report
    for (const user of activeUsers || []) {
      const userId = user.id;

      // Check if report already exists for this week
      const { data: existingReport } = await supabase
        .from('ai_weekly_reports')
        .select('id')
        .eq('user_id', userId)
        .eq('week_start', weekStartStr)
        .maybeSingle();

      if (existingReport) {
        console.log(`Report already exists for user ${user.username} for week ${weekStartStr}. Skipping.`);
        continue;
      }

      // Fetch user metrics for last 7 days
      const date7DaysAgoStr = oneWeekAgo.toISOString().split('T')[0];

      // Daily tasks
      const { data: tasks } = await supabase
        .from('daily_tasks')
        .select('id, name, category')
        .eq('user_id', userId);

      const { data: completions } = await supabase
        .from('task_completions')
        .select('task_id, completed, date')
        .eq('user_id', userId)
        .gte('date', date7DaysAgoStr);

      // Goals
      const { data: goals } = await supabase
        .from('goals')
        .select('id, name, category, motivation, target_date')
        .eq('user_id', userId)
        .eq('status', 'active');

      // Sleep logs
      const { data: sleep } = await supabase
        .from('sleep_logs')
        .select('duration_hours, quality_rating, date')
        .eq('user_id', userId)
        .gte('date', date7DaysAgoStr);

      // Finance transactions
      const { data: finance } = await supabase
        .from('finance_transactions')
        .select('amount, transaction_date, finance_categories(name, type)')
        .eq('user_id', userId)
        .gte('transaction_date', date7DaysAgoStr);

      // Failure Reasons
      const { data: failures } = await supabase
        .from('failure_reasons')
        .select('source_type, reason_text, date')
        .eq('user_id', userId)
        .gte('date', date7DaysAgoStr);

      // Construct context for the AI prompt
      const tasksSummary = tasks?.map(t => {
        const tComps = completions?.filter(c => c.task_id === t.id) || [];
        const checked = tComps.filter(c => c.completed).length;
        const total = tComps.length || 1;
        return `- ${t.name} (${t.category}): Completion rate ${((checked / total) * 100).toFixed(0)}% (${checked}/${total} days)`;
      }).join('\n') || 'No tasks logged.';

      const goalsSummary = goals?.map(g => `- Goal: ${g.name} (Category: ${g.category}). Target: ${g.target_date}`).join('\n') || 'No active goals.';
      
      const sleepCount = sleep?.length || 0;
      const sleepAvg = sleepCount > 0 ? sleep.reduce((sum, s) => sum + parseFloat(s.duration_hours as any), 0) / sleepCount : 0;
      const sleepQualityAvg = sleepCount > 0 ? sleep.reduce((sum, s) => sum + s.quality_rating, 0) / sleepCount : 0;
      const sleepSummary = `Logged ${sleepCount}/7 nights. Avg duration: ${sleepAvg.toFixed(1)}h. Avg quality: ${sleepQualityAvg.toFixed(1)}/5.`;

      let totalExpense = 0;
      let totalIncome = 0;
      const expenseBreakdown: Record<string, number> = {};
      finance?.forEach(f => {
        const amt = parseFloat(f.amount as any);
        if (f.finance_categories?.type === 'income') {
          totalIncome += amt;
        } else if (f.finance_categories?.type === 'expense') {
          totalExpense += amt;
          expenseBreakdown[f.finance_categories.name] = (expenseBreakdown[f.finance_categories.name] || 0) + amt;
        }
      });
      const topExpensesStr = Object.entries(expenseBreakdown)
        .sort((a,b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, val]) => `${name}: $${val.toFixed(2)}`)
        .join(', ') || 'None';
      const financeSummary = `Total Income: $${totalIncome.toFixed(2)}. Total Expenses: $${totalExpense.toFixed(2)}. Top expenses: ${topExpensesStr}.`;

      const failuresSummary = failures?.map(f => `- ${f.date} (${f.source_type}): "${f.reason_text}"`).join('\n') || 'No missed tasks logged.';

      const prompt = `Generate a Weekly Report summarizing the user's progress for the week starting ${weekStartStr}.
Username: ${user.username}
Display Name: ${user.full_name}

[METRICS CONTEXT]
- Daily Habits Completion:
${tasksSummary}

- Active Goals:
${goalsSummary}

- Sleep Metrics:
${sleepSummary}

- Finance Overview:
${financeSummary}

- Missed Task Reasons logged this week:
${failuresSummary}

PROMPT INSTRUCTIONS:
Compile a highly personalized "Weekly Transmission from Alfred" report in markdown.
Speak in the voice of Alfred Pennyworth — respectful, wise, warm, subtle wit, and deeply committed to the user's growth.
Include:
1. **Executive Summary**: A summary of their weekly performance (encouraging, realistic).
2. **Habit & Goals Analysis**: Discuss what habits were successfully maintained and any progress made on goals. Point out trends (e.g. if they struggled with work tasks but excelled in personal ones).
3. **Health & Wealth Reflection**: Discuss sleep consistency and financial balance based on the metrics.
4. **Failure Analysis**: Review their failure reasons constructively. What patterns are locking them back?
5. **Top 3 Actionable Suggestions**: Give three precise, simple changes they should focus on next week.

Do not use templates, make it read like a genuine letter. Keep the formatting clean with elegant markdown headings. Do not use emoji.
`;

      const systemMessage = `You are Alfred Pennyworth, the loyal butler and mentor. Write a personal weekly progress report for the user.`;

      // Call AI provider
      let reportContent = "";

      // Use Gemini API from Google AI Studio
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: prompt }] }
          ],
          systemInstruction: {
            parts: [{ text: systemMessage }]
          },
          generationConfig: {
            temperature: 0.7
          }
        })
      });

      if (!response.ok) {
        console.error(`Failed to generate Gemini report for ${user.username}:`, await response.text());
        continue;
      }

      const geminiData = await response.json();
      reportContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "Apologies, sir. I was unable to construct the weekly report.";

      // Save report in Database
      const { error: insErr } = await supabase.from('ai_weekly_reports').insert([
        {
          user_id: userId,
          week_start: weekStartStr,
          content: reportContent
        }
      ]);

      if (insErr) {
        console.error(`Error saving report for ${user.username}:`, insErr);
      } else {
        generatedReports.push(user.username);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      generated: generatedReports.length, 
      usernames: generatedReports 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Unhandled Weekly Report Generator Error:', error);
    return new Response(JSON.stringify({ error: 'Server Error: ' + error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
