// Goals Tracker Module
// Path: src/pages/Goals.tsx

import React, { useState, useEffect } from 'react';
import { useAppStore, Goal, GoalTask } from '../store/appStore';
import { supabase } from '../lib/supabase';
import { 
  PlusIcon, 
  TrashIcon, 
  CheckIcon, 
  WarningIcon, 
  XIcon,
  GoalsIcon,
  AIMentorIcon
} from '../components/ui/Icons';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export const Goals: React.FC = () => {
  const {
    goals,
    goalTasks,
    goalTaskCompletions,
    failureReasons,
    addGoal,
    updateGoal,
    addGoalTask,
    toggleGoalTaskCompletion,
    submitFailureReason,
    addToast
  } = useAppStore();

  const [todayStr] = useState(() => new Date().toISOString().split('T')[0]);

  // UI state
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newSubTaskName, setNewSubTaskName] = useState('');

  // Add Goal Form states
  const [goalName, setGoalName] = useState('');
  const [goalCategory, setGoalCategory] = useState<Goal['category']>('Fitness');
  const [targetDate, setTargetDate] = useState('');
  const [motivation, setMotivation] = useState('');

  // AI Report state
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // Goal missed sub-task failure reasons queue
  const [missedTasksQueue, setMissedTasksQueue] = useState<GoalTask[]>([]);
  const [currentMissedTask, setCurrentMissedTask] = useState<GoalTask | null>(null);
  const [failureReasonText, setFailureReasonText] = useState('');
  const [yesterdayStr, setYesterdayStr] = useState('');

  // 1. Check for missed goal sub-tasks from yesterday on mount
  useEffect(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yestStr = yesterday.toISOString().split('T')[0];
    setYesterdayStr(yestStr);

    const activeGoalTasks = goalTasks.filter(gt => {
      const createdDate = new Date(gt.created_at).toISOString().split('T')[0];
      return gt.is_active && createdDate <= yestStr;
    });

    const completionsYest = goalTaskCompletions.filter(c => c.date === yestStr && c.completed);
    const missed = activeGoalTasks.filter(gt => 
      !completionsYest.some(c => c.goal_task_id === gt.id)
    );

    const missedWithoutReason = missed.filter(gt => 
      !failureReasons.some(fr => fr.source_id === gt.id && fr.date === yestStr)
    );

    if (missedWithoutReason.length > 0) {
      setMissedTasksQueue(missedWithoutReason);
      setCurrentMissedTask(missedWithoutReason[0]);
    }
  }, [goalTasks, goalTaskCompletions, failureReasons]);

  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalName.trim() || !targetDate) {
      addToast('Objective name and target date are required parameters.', 'danger');
      return;
    }
    addGoal(goalName, goalCategory, targetDate, motivation);
    setGoalName('');
    setMotivation('');
    setTargetDate('');
    setShowAddGoal(false);
  };

  const handleAddSubTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal || !newSubTaskName.trim()) return;
    addGoalTask(selectedGoal.id, newSubTaskName);
    setNewSubTaskName('');
  };

  const handleFailureReasonSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMissedTask || failureReasonText.trim().length < 10) {
      addToast('Please input a valid explanation (min 10 characters).', 'danger');
      return;
    }

    submitFailureReason('goal_task', currentMissedTask.id, yesterdayStr, failureReasonText);

    const nextQueue = missedTasksQueue.slice(1);
    setMissedTasksQueue(nextQueue);
    setFailureReasonText('');

    if (nextQueue.length > 0) {
      setCurrentMissedTask(nextQueue[0]);
    } else {
      setCurrentMissedTask(null);
    }
  };

  const handleGenerateAIReport = async (goal: Goal) => {
    setLoadingReport(true);
    setAiReport(null);
    
    try {
      const gTasks = goalTasks.filter(t => t.goal_id === goal.id);
      const taskIds = gTasks.map(t => t.id);
      const completions = goalTaskCompletions.filter(c => taskIds.includes(c.goal_task_id));
      const failures = failureReasons.filter(f => f.source_type === 'goal_task' && taskIds.includes(f.source_id));

      const context = `Objective: "${goal.name}". Category: "${goal.category}". Motivations: "${goal.motivation}". Target: ${goal.target_date}. State: ${goal.status}. Total linked tasks: ${gTasks.length}. Total completions: ${completions.filter(c=>c.completed).length}. Total failed attempts: ${failures.length}.`;

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          message: "Provide a comprehensive Objective Analysis Report styled as Alfred for my goal. Include progress analysis, pacing estimation, adjustment suggestions, and a motivational closing referencing my motivations.",
          customContext: context
        }),
      });

      const result = await response.json();
      if (response.ok && result.reply) {
        setAiReport(result.reply);
        addToast('Alfred analysis compiled successfully.', 'success');
      } else {
        setAiReport("Apologies, sir. The satellite connection was interrupted, and I could not verify pacing statistics.");
      }
    } catch (e) {
      console.error(e);
      setAiReport("System error. Failed to compile Pacings and Adjustments report.");
    } finally {
      setLoadingReport(false);
    }
  };

  // Helper calculations for list view
  const getGoalProgress = (goalId: string) => {
    const gTasks = goalTasks.filter(t => t.goal_id === goalId);
    if (gTasks.length === 0) return 0;
    
    const taskIds = gTasks.map(t => t.id);
    // completions for today
    const completions = goalTaskCompletions.filter(c => taskIds.includes(c.goal_task_id) && c.completed);
    return Math.round((completions.length / gTasks.length) * 100);
  };

  const getDaysRemaining = (targetDateStr: string) => {
    const target = new Date(targetDateStr);
    const diffTime = target.getTime() - new Date().getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays < 0 ? 0 : diffDays;
  };

  // Selected goal computations (for Detail Drill-down view)
  const detailTasks = selectedGoal ? goalTasks.filter(t => t.goal_id === selectedGoal.id) : [];
  const detailTaskIds = detailTasks.map(t => t.id);
  const detailCompletions = goalTaskCompletions.filter(c => detailTaskIds.includes(c.goal_task_id));
  const detailCompletedCount = detailCompletions.filter(c => c.completed).length;
  const detailMissedCount = Math.max(0, detailTasks.length - detailCompletedCount);

  // Line Chart: sub-task completions over time
  // Group completions by date
  const completionsByDate: Record<string, number> = {};
  detailCompletions.forEach(c => {
    if (c.completed) {
      completionsByDate[c.date] = (completionsByDate[c.date] || 0) + 1;
    }
  });
  
  const lineChartData = Object.entries(completionsByDate)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Pie Chart: completed vs missed
  const pieData = [
    { name: 'Completed Checkpoints', value: detailCompletedCount },
    { name: 'Missed Checkpoints', value: detailMissedCount }
  ];
  const PIE_COLORS = ['#F5C518', '#E84040']; // Gold, Danger

  return (
    <div className="space-y-6">
      
      {/* Missed Subtask Failure Reason Modal */}
      <AnimatePresence>
        {currentMissedTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-bat-dark border border-bat-border rounded shadow-[0_0_40px_rgba(0,0,0,0.8)] w-full max-w-md p-6 bat-glow-gold"
            >
              <div className="flex items-center gap-2 text-bat-danger mb-4">
                <WarningIcon size={24} />
                <h3 className="font-bebas text-2xl tracking-wider">OBJECTIVE CHECKPOINT MISSED</h3>
              </div>
              
              <p className="text-sm text-bat-white leading-relaxed mb-4">
                You didn't complete the objective task <span className="text-bat-gold font-bold">"{currentMissedTask.name}"</span> yesterday ({yesterdayStr}).
              </p>
              
              <form onSubmit={handleFailureReasonSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-bat-gray uppercase tracking-widest mb-1.5">
                    What locked you back? (Required — min 10 characters)
                  </label>
                  <textarea
                    value={failureReasonText}
                    onChange={(e) => setFailureReasonText(e.target.value)}
                    className="w-full px-4 py-2.5 bg-bat-black border border-bat-border text-bat-white focus:outline-none focus:border-bat-gold rounded text-sm transition-colors h-24 resize-none"
                    placeholder="Provide a briefing of the issue..."
                    required
                  />
                  <div className="text-[10px] text-bat-gray font-mono text-right mt-1">
                    {failureReasonText.length}/10 MIN CHARS
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={failureReasonText.length < 10}
                  className="w-full py-2.5 bg-bat-danger hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-bat-white font-bebas text-lg tracking-widest transition-colors rounded"
                >
                  LOG INCIDENT REPORT
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header section */}
      <div className="flex justify-between items-center bg-bat-dark border border-bat-border p-4 rounded">
        <button
          onClick={() => {
            setShowAddGoal(true);
            setSelectedGoal(null);
          }}
          className="flex items-center gap-2 bg-bat-gold hover:bg-bat-gold-dim text-bat-black px-4 py-2 rounded font-bebas text-md tracking-wider transition-colors"
        >
          <PlusIcon size={16} />
          ESTABLISH OBJECTIVE
        </button>
        <span className="text-xs font-mono text-bat-gray uppercase">
          STRATEGIC LONG-TERM OBJECTIVES: <span className="text-bat-white">{goals.length} ACTIVE</span>
        </span>
      </div>

      {/* Goal Creation modal popup */}
      <AnimatePresence>
        {showAddGoal && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-bat-dark border border-bat-border p-6 rounded shadow-[0_4px_30px_rgba(0,0,0,0.8)] w-full max-w-md bat-glow-gold"
            >
              <div className="flex justify-between items-center pb-4 border-b border-bat-border mb-4">
                <span className="font-bebas text-xl text-bat-gold tracking-wider">ESTABLISH STRATEGIC GOAL</span>
                <button onClick={() => setShowAddGoal(false)} className="text-bat-gray hover:text-bat-white">
                  <XIcon size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateGoal} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-bat-gray uppercase tracking-widest mb-1">
                    Goal / Objective Name
                  </label>
                  <input
                    type="text"
                    value={goalName}
                    onChange={(e) => setGoalName(e.target.value)}
                    className="w-full px-4 py-2 bg-bat-black border border-bat-border text-bat-white focus:outline-none focus:border-bat-gold rounded text-sm transition-colors"
                    placeholder="e.g. Master Wayne's investments portfolio"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-bat-gray uppercase tracking-widest mb-1">
                      Category
                    </label>
                    <select
                      value={goalCategory}
                      onChange={(e: any) => setGoalCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-bat-black border border-bat-border text-bat-white focus:outline-none focus:border-bat-gold rounded text-sm"
                    >
                      <option value="Fitness">Fitness</option>
                      <option value="Finance">Finance</option>
                      <option value="Learning">Learning</option>
                      <option value="Career">Career</option>
                      <option value="Personal">Personal</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-bat-gray uppercase tracking-widest mb-1">
                      Target Date
                    </label>
                    <input
                      type="date"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                      className="w-full px-3 py-1.5 bg-bat-black border border-bat-border text-bat-white focus:outline-none focus:border-bat-gold rounded text-sm font-mono"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-bat-gray uppercase tracking-widest mb-1">
                    Motivation Statement
                  </label>
                  <textarea
                    value={motivation}
                    onChange={(e) => setMotivation(e.target.value)}
                    className="w-full px-4 py-2 bg-bat-black border border-bat-border text-bat-white focus:outline-none focus:border-bat-gold rounded text-sm transition-colors h-20 resize-none"
                    placeholder="Explain why achieving this objective is critical..."
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-bat-gold hover:bg-bat-gold-dim text-bat-black font-bebas text-lg tracking-widest transition-colors rounded"
                >
                  SAVE OBJECTIVE
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main layout split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Goals List (Left side) */}
        <div className={`space-y-4 ${selectedGoal ? 'lg:col-span-1' : 'lg:col-span-3'}`}>
          <div className="bat-glass p-6 rounded">
            <h3 className="font-bebas text-xl text-bat-gold tracking-wider mb-6">LONG TERM OBJECTIVE INDEX</h3>
            
            {goals.length === 0 ? (
              <div className="p-8 text-center text-xs text-bat-gray font-mono uppercase border border-dashed border-bat-border rounded">
                NO ACTIVE GOALS DETECTED.
              </div>
            ) : (
              <div className="space-y-4">
                {goals.map((g) => {
                  const progress = getGoalProgress(g.id);
                  const daysLeft = getDaysRemaining(g.target_date);
                  const isSelected = selectedGoal?.id === g.id;

                  return (
                    <div
                      key={g.id}
                      onClick={() => {
                        setSelectedGoal(g);
                        setAiReport(null);
                      }}
                      className={`p-5 rounded border cursor-pointer transition-all ${
                        isSelected 
                          ? 'bg-bat-surface border-bat-gold shadow-[0_0_15px_rgba(245,197,24,0.1)]' 
                          : 'bg-bat-black border-bat-border hover:border-bat-gray'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <span className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
                            g.category === 'Fitness' ? 'bg-bat-success text-bat-black bg-opacity-20' : 
                            g.category === 'Finance' ? 'bg-bat-gold text-bat-black bg-opacity-20' : 
                            'bg-bat-surface text-bat-white'
                          }`}>
                            {g.category.toUpperCase()}
                          </span>
                          <h4 className="font-bebas text-xl text-bat-white tracking-wider mt-2">{g.name}</h4>
                          {g.motivation && (
                            <p className="text-xs text-bat-gray italic mt-1 truncate max-w-sm">
                              "{g.motivation}"
                            </p>
                          )}
                        </div>
                        <div className="text-right font-mono">
                          <span className="text-sm font-bold text-bat-gold block">{daysLeft}</span>
                          <span className="text-[9px] text-bat-gray uppercase">DAYS REMAINING</span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-6">
                        <div className="flex justify-between text-[10px] font-mono text-bat-gray uppercase mb-1">
                          <span>Today's Task progress</span>
                          <span className="text-bat-white">{progress}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-bat-black border border-bat-border rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-bat-gold transition-all duration-500" 
                            style={{ width: `${progress}%` }} 
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Goal Detail View (Right side popup/drawer logic) */}
        {selectedGoal && (
          <div className="lg:col-span-2 space-y-6">
            <div className="bat-glass p-6 rounded relative">
              {/* Close button */}
              <button 
                onClick={() => setSelectedGoal(null)}
                className="absolute right-4 top-4 text-bat-gray hover:text-bat-white"
              >
                <XIcon size={18} />
              </button>

              <span className="text-xs font-mono text-bat-gold uppercase">OBJECTIVE DASHBOARD</span>
              <h2 className="font-bebas text-3xl text-bat-white tracking-wider mt-1">{selectedGoal.name}</h2>
              <p className="text-sm text-bat-gray font-mono mt-1 uppercase">Target Date: {selectedGoal.target_date}</p>

              {selectedGoal.motivation && (
                <div className="bg-bat-black p-4 border border-bat-border mt-4 rounded">
                  <span className="text-[10px] font-mono text-bat-gold uppercase block mb-1">STRATEGIC RATIONALE / "WHY"</span>
                  <p className="text-xs italic text-bat-white leading-relaxed">"{selectedGoal.motivation}"</p>
                </div>
              )}

              {/* Sub-tasks Section */}
              <div className="mt-6 border-t border-bat-border pt-6">
                <h3 className="font-bebas text-lg text-bat-gold tracking-wide mb-4">TACTICAL LINKED TASKS</h3>
                
                <form onSubmit={handleAddSubTask} className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={newSubTaskName}
                    onChange={(e) => setNewSubTaskName(e.target.value)}
                    className="flex-grow px-3 py-2 bg-bat-black border border-bat-border text-bat-white focus:outline-none focus:border-bat-gold rounded text-xs transition-colors"
                    placeholder="Define linked habit/sub-task..."
                    required
                  />
                  <button
                    type="submit"
                    className="bg-bat-gold hover:bg-bat-gold-dim text-bat-black font-bebas px-4 py-2 rounded text-xs tracking-wider uppercase transition-colors"
                  >
                    LINK
                  </button>
                </form>

                {detailTasks.length === 0 ? (
                  <div className="text-xs text-bat-gray font-mono uppercase p-4 border border-dashed border-bat-border text-center rounded">
                    NO LINKED SUB-TASKS DEFINED.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {detailTasks.map((t) => {
                      const done = goalTaskCompletions.some(
                        (c) => c.goal_task_id === t.id && c.date === todayStr && c.completed
                      );

                      return (
                        <div key={t.id} className="flex items-center justify-between p-3 bg-bat-black border border-bat-border rounded">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => toggleGoalTaskCompletion(t.id, todayStr, !done)}
                              className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-all focus:outline-none ${
                                done ? 'border-bat-gold bg-bat-gold bg-opacity-10' : 'border-bat-border'
                              }`}
                            >
                              {done && <CheckIcon size={12} className="text-bat-gold" />}
                            </button>
                            <span className={`text-xs ${done ? 'line-through text-bat-gray' : 'text-bat-white'}`}>
                              {t.name}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Analysis Charts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* completions pie */}
              <div className="bat-glass p-6 rounded flex flex-col items-center">
                <h3 className="font-bebas text-lg text-bat-gold tracking-wide mb-4">CHECKPOINT ANALYSIS</h3>
                {detailTasks.length === 0 ? (
                  <div className="py-8 text-xs text-bat-gray font-mono uppercase text-center">NO SUB-TASKS DEFINED</div>
                ) : (
                  <div className="w-full h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={55}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#12121A', borderColor: '#2A2A3A', borderRadius: '4px' }}
                          itemStyle={{ color: '#E8E8F0', fontFamily: 'monospace', fontSize: '11px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex justify-center gap-4 text-[9px] font-mono text-bat-gray mt-1">
                      <div>COMPLETED: {detailCompletedCount}</div>
                      <div>MISSED: {detailMissedCount}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* completion over time line chart */}
              <div className="bat-glass p-6 rounded">
                <h3 className="font-bebas text-lg text-bat-gold tracking-wide mb-4">RETENTION PACING</h3>
                {lineChartData.length === 0 ? (
                  <div className="py-8 text-xs text-bat-gray font-mono uppercase text-center">NO COMPLETIONS LOGGED</div>
                ) : (
                  <div className="w-full h-40 font-mono text-[9px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={lineChartData}>
                        <XAxis dataKey="date" stroke="#8888A0" />
                        <YAxis stroke="#8888A0" />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#12121A', borderColor: '#2A2A3A', borderRadius: '4px' }}
                          itemStyle={{ color: '#E8E8F0', fontFamily: 'monospace' }}
                        />
                        <Line type="monotone" dataKey="count" stroke="#F5C518" strokeWidth={2} dot={{ fill: '#0A0A0F' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

            {/* Alfred AI Report Card */}
            <div className="bat-glass p-6 rounded relative overflow-hidden">
              <div className="absolute right-4 top-4 text-bat-gold opacity-10">
                <AIMentorIcon size={64} />
              </div>
              <div className="flex justify-between items-center mb-4">
                <span className="font-bebas text-lg text-bat-gold tracking-wide flex items-center gap-2">
                  ALFRED PACING & PROJECTION
                </span>
                <button
                  onClick={() => handleGenerateAIReport(selectedGoal)}
                  disabled={loadingReport}
                  className="bg-bat-black border border-bat-border text-bat-gold hover:border-bat-gold text-xs font-mono px-3 py-1.5 rounded transition-all"
                >
                  {loadingReport ? 'ANALYZING TELEMETRY...' : 'COMPILE ANALYSIS'}
                </button>
              </div>

              {aiReport ? (
                <div className="bg-bat-black p-4 border border-bat-border rounded font-mono text-xs text-bat-white leading-relaxed whitespace-pre-wrap">
                  {aiReport}
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-bat-gray font-mono uppercase border border-dashed border-bat-border rounded bg-bat-black bg-opacity-30">
                  {loadingReport ? 'Alfred is calculating pacing metrics...' : 'NO ACTIVE REPORT. PRESS BUTTON ABOVE TO DECRYPT.'}
                </div>
              )}
            </div>

          </div>
        )}

      </div>

    </div>
  );
};
