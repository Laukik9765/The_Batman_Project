// Dashboard component — vigilante central hub
// Path: src/pages/Dashboard.tsx

import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { supabase } from '../lib/supabase';
import { 
  BatIcon, 
  DailyTasksIcon, 
  GoalsIcon, 
  SleepIcon, 
  FinanceIcon, 
  FlameIcon,
  AIMentorIcon,
  SideQuestsIcon
} from '../components/ui/Icons';
import { motion } from 'framer-motion';

export const Dashboard: React.FC = () => {
  const { 
    profile, 
    dailyTasks, 
    taskCompletions, 
    goals, 
    sleepLogs, 
    financeTransactions,
    addToast
  } = useAppStore();

  const [greeting, setGreeting] = useState('Good evening');
  const [motivation, setMotivation] = useState('Loading transmission from Alfred...');
  const [fetchingMotivation, setFetchingMotivation] = useState(false);
  const [stats, setStats] = useState({
    tasksDone: '0/0',
    activeGoals: 0,
    sleepHours: 0,
    netFinance: '₹0.00'
  });
  const [streak, setStreak] = useState(0);
  const [activities, setActivities] = useState<any[]>([]);

  // 1. Calculate time-based greeting
  useEffect(() => {
    const hrs = new Date().getHours();
    if (hrs < 12) setGreeting('Good morning');
    else if (hrs < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  // 2. Compute Dashboard statistics & activity list
  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0];

    // Active daily tasks
    const activeTasks = dailyTasks.filter(t => t.is_active);
    const activeTasksCount = activeTasks.length;
    
    // Completions today
    const completionsToday = taskCompletions.filter(c => c.date === todayStr && c.completed);
    const tasksDoneStr = `${completionsToday.length}/${activeTasksCount}`;

    // Active goals
    const activeGoalsCount = goals.filter(g => g.status === 'active').length;

    // Sleep last night (most recent log)
    const lastSleep = sleepLogs.length > 0 ? parseFloat(sleepLogs[0].duration_hours as any) : 0;

    // Net finance overall
    const netTotal = financeTransactions
      .reduce((sum, t) => {
        const amt = parseFloat(t.amount as any);
        const isExp = t.finance_categories?.type === 'expense';
        return isExp ? sum - amt : sum + amt;
      }, 0);

    const netFinanceStr = `${netTotal >= 0 ? '+' : ''}₹${netTotal.toFixed(2)}`;

    setStats({
      tasksDone: tasksDoneStr,
      activeGoals: activeGoalsCount,
      sleepHours: lastSleep,
      netFinance: netFinanceStr
    });

    // 3. Compute Streak (freeze at 75%+)
    // Group completions by date
    const completionsByDate: Record<string, { total: number; completed: number }> = {};
    
    // Map active tasks to compute completion rate per date
    taskCompletions.forEach(c => {
      if (!completionsByDate[c.date]) {
        completionsByDate[c.date] = { total: 0, completed: 0 };
      }
      completionsByDate[c.date].total++;
      if (c.completed) completionsByDate[c.date].completed++;
    });

    const sortedDates = Object.keys(completionsByDate).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    
    let currentStreak = 0;
    if (sortedDates.length > 0) {
      const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      
      let streakActive = true;
      let idx = 0;

      // Allow streak to continue if we haven't finished today yet, starting verification from yesterday
      if (sortedDates[0] !== todayStr && sortedDates[0] !== yesterdayStr) {
        streakActive = false;
      }

      while (streakActive && idx < sortedDates.length) {
        const d = sortedDates[idx];
        const dayStats = completionsByDate[d];
        const rate = dayStats.completed / dayStats.total;
        
        // 75% streak freeze threshold
        if (rate >= 0.75) {
          currentStreak++;
          idx++;
        } else {
          streakActive = false;
        }
      }
    }
    setStreak(currentStreak);

    // 4. Construct recent activities timeline (last 5 items)
    const actList: any[] = [];

    // Add task completions
    taskCompletions.slice(0, 5).forEach(c => {
      const t = dailyTasks.find(task => task.id === c.task_id);
      if (t) {
        actList.push({
          id: `comp-${c.id}`,
          timestamp: new Date(c.completed_at || c.date).getTime(),
          title: `Completed Habit: ${t.name}`,
          category: 'tasks',
          timeStr: new Date(c.completed_at || c.date).toLocaleDateString(),
          icon: DailyTasksIcon,
          color: 'text-bat-success'
        });
      }
    });

    // Add side quests
    useAppStore.getState().sideQuests.slice(0, 3).forEach(sq => {
      actList.push({
        id: `sq-${sq.id}`,
        timestamp: new Date(sq.created_at || sq.date).getTime(),
        title: `Logged Side Quest Entry: "${sq.content.substring(0, 40)}..."`,
        category: 'quests',
        timeStr: new Date(sq.created_at || sq.date).toLocaleDateString(),
        icon: SideQuestsIcon,
        color: 'text-bat-info'
      });
    });

    // Add sleep logs
    sleepLogs.slice(0, 3).forEach(s => {
      actList.push({
        id: `sleep-${s.id}`,
        timestamp: new Date(s.created_at || s.date).getTime(),
        title: `Logged Sleep: ${s.duration_hours}h (${s.quality_rating}/5 Quality)`,
        category: 'sleep',
        timeStr: new Date(s.created_at || s.date).toLocaleDateString(),
        icon: SleepIcon,
        color: 'text-bat-white'
      });
    });

    // Add transactions
    financeTransactions.slice(0, 3).forEach(f => {
      const type = f.finance_categories?.type;
      actList.push({
        id: `finance-${f.id}`,
        timestamp: new Date(f.created_at || f.transaction_date).getTime(),
        title: `Logged ${type === 'income' ? 'Income' : 'Expense'}: ₹${parseFloat(f.amount as any).toFixed(2)} (${f.finance_categories?.name})`,
        category: 'finance',
        timeStr: new Date(f.created_at || f.transaction_date).toLocaleDateString(),
        icon: FinanceIcon,
        color: type === 'income' ? 'text-bat-success' : 'text-bat-danger'
      });
    });

    // Sort by timestamp descending and take top 5
    actList.sort((a, b) => b.timestamp - a.timestamp);
    setActivities(actList.slice(0, 5));

  }, [dailyTasks, taskCompletions, goals, sleepLogs, financeTransactions]);

  // 5. Fetch Alfred's Daily Motivation card
  useEffect(() => {
    const fetchAlfredMotivation = async () => {
      if (!profile || fetchingMotivation) return;
      setFetchingMotivation(true);

      try {
        // Look up if Alfred has written any motivation today to avoid repeated OpenAI calls
        const todayStr = new Date().toISOString().split('T')[0];
        
        // We will make a call to our ai-chat Edge Function proxy with a prompt asking for the daily briefing
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({
            message: "Generate a brief, 3-sentence daily motivation transmission starting with 'Good day, Master Bruce.' or similar, tailored to my stats.",
            customContext: "Provide a quick daily transmission from Alfred for my dashboard banner. Keep it under 60 words."
          }),
        });

        const result = await response.json();
        
        if (response.ok && result.reply) {
          setMotivation(result.reply);
        } else {
          setMotivation("Remember why you began this quest, sir. The night is darkest just before the dawn. And I promise you, the dawn is coming.");
        }
      } catch (err) {
        console.error('Failed to retrieve Alfred daily motivation:', err);
        setMotivation("Gotham's skies are cloudy today, sir. Keep your focus, prioritize your daily checklist, and let discipline guide your steps. I am standing by.");
      } finally {
        setFetchingMotivation(false);
      }
    };

    fetchAlfredMotivation();
  }, [profile]);

  // SVG Progress Ring calculations
  const todayStr = new Date().toISOString().split('T')[0];
  const activeTasks = dailyTasks.filter(t => t.is_active);
  const totalActiveTasks = activeTasks.length;
  const completionsToday = taskCompletions.filter(c => c.date === todayStr && c.completed).length;
  const percentage = totalActiveTasks > 0 ? Math.round((completionsToday / totalActiveTasks) * 100) : 0;
  
  // Ring parameters
  const radius = 60;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="space-y-6">
      
      {/* Welcome Banner */}
      <div className="bat-glass p-6 rounded relative overflow-hidden flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-bebas text-3xl md:text-4xl text-bat-gold tracking-widest">
            {greeting.toUpperCase()}, {profile?.full_name?.toUpperCase() || 'VIGILANTE'}
          </h1>
          <p className="text-sm font-mono text-bat-gray uppercase mt-1">
            GOTHAM CITY SURVEILLANCE DATA — TERMINAL ACTIVE
          </p>
        </div>
        
        {/* Streak Flame indicator */}
        <motion.div 
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="flex items-center gap-2 self-start md:self-auto bg-bat-black px-4 py-2 border border-bat-border rounded"
        >
          <span className="text-bat-gold"><FlameIcon size={24} /></span>
          <div className="font-mono">
            <span className="text-bat-gold font-bold text-lg">{streak}</span>
            <span className="text-xs text-bat-gray ml-1 uppercase font-semibold">DAY STREAK</span>
          </div>
        </motion.div>
      </div>

      {/* Progress Ring and Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Progress Ring Card */}
        <div className="bat-glass p-6 rounded flex flex-col items-center justify-center text-center">
          <h3 className="font-bebas text-xl text-bat-gold tracking-wider mb-4">TODAY'S TASK INTEGRITY</h3>
          <div className="relative w-36 h-36 flex items-center justify-center">
            {/* SVG Progress Circle */}
            <svg className="w-full h-full transform -rotate-90">
              {/* Back track */}
              <circle
                cx="72"
                cy="72"
                r={radius}
                className="text-bat-border"
                strokeWidth={strokeWidth}
                stroke="currentColor"
                fill="transparent"
              />
              {/* Glow filter definition */}
              <defs>
                <filter id="gold-glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              {/* Animated fill */}
              <motion.circle
                cx="72"
                cy="72"
                r={radius}
                className="text-bat-gold"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                filter="url(#gold-glow)"
              />
            </svg>
            {/* Text center */}
            <div className="absolute flex flex-col items-center justify-center">
              <span className="font-bebas text-3xl text-bat-white">{percentage}%</span>
              <span className="text-[10px] text-bat-gray font-mono uppercase">COMPLETED</span>
            </div>
          </div>
          <p className="text-xs font-mono text-bat-gray mt-4 uppercase">
            {completionsToday} of {totalActiveTasks} active tasks checked
          </p>
        </div>

        {/* Quick Stats Grid */}
        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          <div className="bat-glass p-5 rounded flex flex-col justify-between">
            <div>
              <span className="text-bat-gold mb-1 block"><DailyTasksIcon size={20} /></span>
              <div className="text-[10px] text-bat-gray font-mono uppercase">DAILY CHECKLIST</div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-bebas text-bat-white font-semibold">{stats.tasksDone}</span>
              <span className="text-xs text-bat-gray font-mono block uppercase mt-1">TASKS COMPLETED TODAY</span>
            </div>
          </div>

          <div className="bat-glass p-5 rounded flex flex-col justify-between">
            <div>
              <span className="text-bat-gold mb-1 block"><GoalsIcon size={20} /></span>
              <div className="text-[10px] text-bat-gray font-mono uppercase">OBJECTIVES METRIC</div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-bebas text-bat-white font-semibold">{stats.activeGoals}</span>
              <span className="text-xs text-bat-gray font-mono block uppercase mt-1">ACTIVE GOALS</span>
            </div>
          </div>

          <div className="bat-glass p-5 rounded flex flex-col justify-between">
            <div>
              <span className="text-bat-gold mb-1 block"><SleepIcon size={20} /></span>
              <div className="text-[10px] text-bat-gray font-mono uppercase">SLEEP RECUPERATION</div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-bebas text-bat-white font-semibold">{stats.sleepHours}h</span>
              <span className="text-xs text-bat-gray font-mono block uppercase mt-1">SLEPT LAST NIGHT</span>
            </div>
          </div>

          <div className="bat-glass p-5 rounded flex flex-col justify-between">
            <div>
              <span className="text-bat-gold mb-1 block"><FinanceIcon size={20} /></span>
              <div className="text-[10px] text-bat-gray font-mono uppercase">FINANCIAL LEDGER</div>
            </div>
            <div className="mt-4">
              <span className={`text-3xl font-bebas font-semibold ${
                stats.netFinance.startsWith('+') ? 'text-bat-success' : stats.netFinance.includes('₹0.00') ? 'text-bat-white' : 'text-bat-danger'
              }`}>
                {stats.netFinance}
              </span>
              <span className="text-xs text-bat-gray font-mono block uppercase mt-1">TOTAL NET BALANCE</span>
            </div>
          </div>

        </div>
      </div>

      {/* Alfred Motivation transmission card */}
      <div className="bat-glass p-6 rounded border-l-4 border-bat-gold relative overflow-hidden">
        <div className="absolute right-4 top-4 text-bat-gold opacity-10">
          <AIMentorIcon size={64} />
        </div>
        <div className="flex items-center gap-2 text-bat-gold mb-2">
          <span className="font-bebas text-lg tracking-wider">TRANSMISSION FROM ALFRED</span>
          <span className="w-1.5 h-1.5 rounded-full bg-bat-success animate-ping" />
        </div>
        <p className="text-sm font-mono leading-relaxed text-bat-white max-w-2xl">
          "{motivation}"
        </p>
      </div>

      {/* Recent Activity Feed */}
      <div className="bat-glass p-6 rounded">
        <h3 className="font-bebas text-xl text-bat-gold tracking-wider mb-6">RECENT SECURITY ACTIVITIES</h3>
        
        {activities.length === 0 ? (
          <div className="p-8 text-center text-xs text-bat-gray font-mono uppercase border border-dashed border-bat-border rounded bg-bat-black bg-opacity-30">
            No recent activity logs found. Complete daily habits to begin database records.
          </div>
        ) : (
          <div className="relative pl-6 border-l border-bat-border space-y-6">
            {activities.map((act) => (
              <div key={act.id} className="relative flex flex-col md:flex-row md:items-center justify-between gap-2">
                {/* Dot indicator */}
                <span className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-bat-dark border-2 border-bat-border flex items-center justify-center">
                  <span className="w-1 h-1 rounded-full bg-bat-gold" />
                </span>
                
                <div className="flex items-center gap-3">
                  <span className={`${act.color} flex-shrink-0`}><act.icon size={18} /></span>
                  <span className="text-sm text-bat-white font-medium">{act.title}</span>
                </div>
                
                <span className="text-xs font-mono text-bat-gray self-start md:self-auto uppercase">
                  {act.timeStr}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
