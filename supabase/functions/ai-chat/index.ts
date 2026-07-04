// Deno Edge Function for AI Chat Proxy with Alfred Persona
// Path: supabase/functions/ai-chat/index.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"

// Helper to determine CORS headers dynamically to prevent wildcard *
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
    allowedOrigin = 'https://creative-manager-psi.vercel.app'; // Fallback
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

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    // Auth header check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: authError } = await supabaseService.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const userId = user.id;

    // 1. Verify daily limit (max 20 requests per user per day)
    const today = new Date().toISOString().split('T')[0];
    const { count, error: countError } = await supabaseService
      .from('ai_chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('role', 'user')
      .gte('created_at', `${today}T00:00:00Z`);

    if (countError) {
      console.error('Error counting daily requests:', countError);
    } else if (count !== null && count >= 20) {
      return new Response(JSON.stringify({ 
        error: "Rate limit exceeded. Gotham's servers need rest. Maximum 20 Alfred transmissions per day." 
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse input message
    const body = await req.json();
    const { message, customContext, localGeminiApiKey } = body;
    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'Bad Request: Missing message parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 2. Fetch User Profile
    const { data: profile } = await supabaseService
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    // 3. Fetch Context from last 7 days
    const date7DaysAgo = new Date();
    date7DaysAgo.setDate(date7DaysAgo.getDate() - 7);
    const date7DaysAgoStr = date7DaysAgo.toISOString().split('T')[0];

    // Daily tasks status
    const { data: tasks } = await supabaseService
      .from('daily_tasks')
      .select('id, name, category, est_minutes')
      .eq('user_id', userId)
      .eq('is_active', true);

    const { data: taskCompletions } = await supabaseService
      .from('task_completions')
      .select('task_id, date, completed')
      .eq('user_id', userId)
      .gte('date', date7DaysAgoStr);

    // Side quests
    const { data: sideQuests } = await supabaseService
      .from('side_quest_entries')
      .select('date, content, tags')
      .eq('user_id', userId)
      .gte('date', date7DaysAgoStr)
      .order('date', { ascending: false });

    // Goals
    const { data: goals } = await supabaseService
      .from('goals')
      .select('id, name, category, motivation, target_date, status')
      .eq('user_id', userId)
      .eq('status', 'active');

    // Sleep Logs
    const { data: sleepLogs } = await supabaseService
      .from('sleep_logs')
      .select('date, duration_hours, quality_rating, notes')
      .eq('user_id', userId)
      .gte('date', date7DaysAgoStr)
      .order('date', { ascending: false });

    // Finance last 30 days
    const date30DaysAgo = new Date();
    date30DaysAgo.setDate(date30DaysAgo.getDate() - 30);
    const date30DaysAgoStr = date30DaysAgo.toISOString().split('T')[0];

    const { data: transactions } = await supabaseService
      .from('finance_transactions')
      .select('amount, transaction_date, finance_categories(name, type)')
      .eq('user_id', userId)
      .gte('transaction_date', date30DaysAgoStr);

    // Failure Reasons last 7 days
    const { data: failureReasons } = await supabaseService
      .from('failure_reasons')
      .select('source_type, date, reason_text')
      .eq('user_id', userId)
      .gte('date', date7DaysAgoStr);

    // 4. Construct AI System Context
    const activeGoalsContext = goals?.map(g => `- Goal: "${g.name}" (${g.category}). Why: "${g.motivation}". Target: ${g.target_date}`).join('\n') || 'None';
    const recentSleepContext = sleepLogs?.map(s => `- Date: ${s.date}, Duration: ${s.duration_hours}h, Quality: ${s.quality_rating}/5, Note: "${s.notes || ''}"`).join('\n') || 'No sleep logs for the last 7 days.';
    
    // Finance Summary
    let totalIncome = 0;
    let totalExpense = 0;
    const categorySpending: Record<string, number> = {};

    transactions?.forEach(t => {
      const amount = parseFloat(t.amount as any);
      const cat = t.finance_categories;
      if (cat) {
        if (cat.type === 'income') {
          totalIncome += amount;
        } else {
          totalExpense += amount;
          categorySpending[cat.name] = (categorySpending[cat.name] || 0) + amount;
        }
      }
    });

    const topExpenses = Object.entries(categorySpending)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, val]) => `- ${name}: ₹${val.toFixed(2)}`)
      .join('\n') || 'None';

    const financeContext = `Net income: ₹${totalIncome.toFixed(2)}, Total expense: ₹${totalExpense.toFixed(2)}\nTop Expenses:\n${topExpenses}`;
    
    // Recent side quests
    const sideQuestsContext = sideQuests?.map(sq => `- Date: ${sq.date}, Tags: [${sq.tags.join(', ')}]. Entry: "${sq.content}"`).join('\n') || 'No side quests logged.';

    // Missed task reason logs
    const failureReasonsContext = failureReasons?.map(f => `- Date: ${f.date}, Type: ${f.source_type}. Reason for failure: "${f.reason_text}"`).join('\n') || 'None';

    // Daily tasks checklist stats
    const taskCompletionStats = tasks?.map(task => {
      const completions = taskCompletions?.filter(c => c.task_id === task.id) || [];
      const totalChecked = completions.filter(c => c.completed).length;
      const totalDays = completions.length || 1;
      const rate = ((totalChecked / totalDays) * 100).toFixed(0);
      return `- Task: "${task.name}" (${task.category}), completion rate over last 7 days: ${rate}% (${totalChecked}/${totalDays} days)`;
    }).join('\n') || 'No active habits defined.';

    // Gather past chat history (last 10 messages for session context)
    const { data: chatHistoryRows } = await supabaseService
      .from('ai_chat_messages')
      .select('role, content')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(10);

    const chatHistory = chatHistoryRows?.map(msg => ({
      role: msg.role,
      content: msg.content
    })) || [];

    const systemPrompt = `You are Alfred — the user's personal AI mentor in The Batman Project, a self-improvement platform.
Your role is that of a wise, composed, deeply loyal mentor who believes unconditionally in the user's potential. You speak with calm authority, subtle wit, and genuine warmth — like Alfred Pennyworth.

Your job is to:
1. Analyze the user's habit, sleep, finance, and goal data provided.
2. Identify patterns — positive and negative.
3. Offer specific, actionable suggestions (not generic advice).
4. Motivate the user in a personalized way — reference their actual data, their goals, their reasons for failures.
5. Never lecture. Never be harsh. Be honest but encouraging.
6. When the user is struggling, remind them why they started (use their goal motivation statements).
7. Keep responses concise unless the user asks for a detailed analysis.

You are not a general chatbot. Stay focused on the user's self-improvement journey. If asked something outside this scope, briefly redirect.

Address the user by their full name or username. Make every interaction feel personal, not templated.

USER PROFILE:
- Username: ${profile?.username || 'Gotham Resident'}
- Display Name: ${profile?.full_name || 'Defender'}
- Timezone: ${profile?.timezone || 'UTC'}

CURRENT SYSTEM DATA CONTEXT:
[Active Goals]
${activeGoalsContext}

[Habit Completion Rates (Last 7 Days)]
${taskCompletionStats}

[Recent Sleep Logs (Last 7 Days)]
${recentSleepContext}

[Finance Summary (Last 30 Days)]
${financeContext}

[Side Quests/Journal Entries (Last 7 Days)]
${sideQuestsContext}

[Submitted Failure Reasons (Last 7 Days)]
${failureReasonsContext}

[Extra Context / Requested Action]
${customContext || 'None'}
`;

    // 5. Send payload to AI provider
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    
    if (!geminiApiKey) {
      return new Response(JSON.stringify({ error: 'Server Error: GEMINI_API_KEY is not configured on the server.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let assistantReply = "";

    // Use Gemini API from Google AI Studio
    const geminiMessages = [
      ...chatHistory.map(h => ({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.content }]
      })),
      {
        role: 'user',
        parts: [{ text: message }]
      }
    ];

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: geminiMessages,
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        generationConfig: {
          temperature: 0.7
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error response:', errorText);
      return new Response(JSON.stringify({ error: 'Gemini AI provider returned an error.' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const geminiData = await response.json();
    assistantReply = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "My apologies, sir. I seem to have lost my line of thought.";

    // 6. Save messages to Database
    await supabaseService.from('ai_chat_messages').insert([
      { user_id: userId, role: 'user', content: message },
      { user_id: userId, role: 'assistant', content: assistantReply }
    ]);

    // Return the response
    return new Response(JSON.stringify({ reply: assistantReply }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Unhandled Edge Function error:', error);
    return new Response(JSON.stringify({ error: 'Server Error: Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
