// Daily Habits/Tasks Module
// Path: src/pages/DailyTasks.tsx

import React, { useState, useEffect } from 'react';
import { useAppStore, DailyTask } from '../store/appStore';
import { 
  PlusIcon, 
  TrashIcon, 
  CheckIcon, 
  WarningIcon, 
  XIcon 
} from '../components/ui/Icons';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

export const DailyTasks: React.FC = () => {
  const {
    dailyTasks,
    taskCompletions,
    failureReasons,
    addDailyTask,
    updateDailyTask,
    deleteDailyTask,
    toggleTaskCompletion,
    submitFailureReason,
    addToast
  } = useAppStore();

  const [todayStr] = useState(() => new Date().toISOString().split('T')[0]);

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [taskCategory, setTaskCategory] = useState<DailyTask['category']>('Health');
  const [estMinutes, setEstMinutes] = useState(15);

  // Failure Reason Modal states (stack of missed tasks from yesterday)
  const [missedTasksQueue, setMissedTasksQueue] = useState<DailyTask[]>([]);
  const [currentMissedTask, setCurrentMissedTask] = useState<DailyTask | null>(null);
  const [failureReasonText, setFailureReasonText] = useState('');
  const [yesterdayStr, setYesterdayStr] = useState('');

  // Editing state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<DailyTask['category']>('Health');
  const [editMinutes, setEditMinutes] = useState(15);

  // 1. Check for missed tasks from yesterday on mount
  useEffect(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yestDateStr = yesterday.toISOString().split('T')[0];
    setYesterdayStr(yestDateStr);

    // Active tasks defined on or before yesterday
    const activeYestTasks = dailyTasks.filter(t => {
      const createdDate = new Date(t.created_at).toISOString().split('T')[0];
      return t.is_active && createdDate <= yestDateStr;
    });

    // Find completions for yesterday
    const completionsYest = taskCompletions.filter(c => c.date === yestDateStr && c.completed);
    
    // Find which tasks were missed
    const missed = activeYestTasks.filter(t => 
      !completionsYest.some(c => c.task_id === t.id)
    );

    // Filter out those that already have a logged failure reason
    const missedWithoutReason = missed.filter(t => 
      !failureReasons.some(fr => fr.source_id === t.id && fr.date === yestDateStr)
    );

    if (missedWithoutReason.length > 0) {
      setMissedTasksQueue(missedWithoutReason);
      setCurrentMissedTask(missedWithoutReason[0]);
    }
  }, [dailyTasks, taskCompletions, failureReasons]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName.trim()) {
      addToast('Please enter a habit description.', 'danger');
      return;
    }
    addDailyTask(taskName, taskCategory, estMinutes);
    setTaskName('');
    setEstMinutes(15);
    setShowAddForm(false);
  };

  const handleEditClick = (task: DailyTask) => {
    setEditingTaskId(task.id);
    setEditName(task.name);
    setEditCategory(task.category);
    setEditMinutes(task.est_minutes);
  };

  const handleEditSave = (id: string) => {
    if (!editName.trim()) return;
    updateDailyTask(id, { name: editName, category: editCategory, est_minutes: editMinutes });
    setEditingTaskId(null);
  };

  const handleFailureReasonSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMissedTask || !failureReasonText.trim()) {
      addToast('Incident description is required.', 'danger');
      return;
    }

    submitFailureReason('daily_task', currentMissedTask.id, yesterdayStr, failureReasonText);
    
    // Dequeue next missed task
    const nextQueue = missedTasksQueue.slice(1);
    setMissedTasksQueue(nextQueue);
    setFailureReasonText('');

    if (nextQueue.length > 0) {
      setCurrentMissedTask(nextQueue[0]);
    } else {
      setCurrentMissedTask(null);
    }
  };

  const handleCompleteAll = async () => {
    const activeTasks = dailyTasks.filter(t => t.is_active);
    for (const t of activeTasks) {
      const done = taskCompletions.some(c => c.task_id === t.id && c.date === todayStr && c.completed);
      if (!done) {
        await toggleTaskCompletion(t.id, todayStr, true);
      }
    }
    addToast('All tactical checkpoints completed.', 'success');
  };

  // Reordering helpers
  const moveTask = async (index: number, direction: 'up' | 'down') => {
    // Standard array reorder
    const updated = [...dailyTasks];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= updated.length) return;
    
    // Swap
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    
    // In this implementation, we just local-swap in state. 
    // For production, you could maintain a 'position' integer column.
    // Here we swap and trigger UI re-renders.
    useAppStore.setState({ dailyTasks: updated });
  };

  // --- Graph Data Computations ---
  // 1. Today's completions (Pie Chart)
  const activeTasksCount = dailyTasks.filter(t => t.is_active).length;
  const completedTodayCount = taskCompletions.filter(c => c.date === todayStr && c.completed).length;
  const missedTodayCount = Math.max(0, activeTasksCount - completedTodayCount);

  const pieData = [
    { name: 'Completed', value: completedTodayCount },
    { name: 'Missed', value: missedTodayCount }
  ];
  
  const PIE_COLORS = ['#40C870', '#E84040']; // Success, Danger

  // 2. Weekly completion rate per task (Bar Chart)
  const date7DaysAgo = new Date();
  date7DaysAgo.setDate(date7DaysAgo.getDate() - 7);
  const date7DaysAgoStr = date7DaysAgo.toISOString().split('T')[0];

  const barData = dailyTasks.filter(t => t.is_active).map(t => {
    const comps = taskCompletions.filter(c => c.task_id === t.id && c.date >= date7DaysAgoStr);
    const totalDays = comps.length || 1;
    const completedDays = comps.filter(c => c.completed).length;
    const rate = Math.round((completedDays / totalDays) * 100);
    
    return {
      name: t.name.length > 15 ? `${t.name.substring(0, 15)}...` : t.name,
      rate
    };
  });

  // 3. Calendar heatmap computation (current month)
  const getDaysInMonth = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  };

  const getHeatmapGrid = () => {
    const days = getDaysInMonth();
    const grid = [];
    const now = new Date();
    
    for (let day = 1; day <= days; day++) {
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      // Calculate tasks status for this date
      const activeTasksOnDate = dailyTasks.filter(t => {
        const createdDate = new Date(t.created_at).toISOString().split('T')[0];
        return createdDate <= dateStr;
      });

      const completionsOnDate = taskCompletions.filter(c => c.date === dateStr && c.completed);
      
      let status: 'gold' | 'gray' | 'red' | 'empty' = 'empty';
      
      if (new Date(dateStr) > now) {
        status = 'empty';
      } else if (activeTasksOnDate.length > 0) {
        const rate = completionsOnDate.length / activeTasksOnDate.length;
        if (rate === 1) status = 'gold';
        else if (rate > 0) status = 'gray';
        else status = 'red';
      }

      grid.push({ day, date: dateStr, status });
    }
    return grid;
  };

  const heatmapGrid = getHeatmapGrid();

  return (
    <div className="space-y-6">
      
      {/* Failure Reason Modal (Sequential) */}
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
                <h3 className="font-bebas text-2xl tracking-wider">INCIDENT BRIEFING</h3>
              </div>
              
              <p className="text-sm text-bat-white leading-relaxed mb-4">
                You didn't complete the habit <span className="text-bat-gold font-bold">"{currentMissedTask.name}"</span> yesterday ({yesterdayStr}).
              </p>
              
              <form onSubmit={handleFailureReasonSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-bat-gray uppercase tracking-widest mb-1.5">
                    What locked you back? (Required)
                  </label>
                  <textarea
                    value={failureReasonText}
                    onChange={(e) => setFailureReasonText(e.target.value)}
                    className="w-full px-4 py-2.5 bg-bat-black border border-bat-border text-bat-white focus:outline-none focus:border-bat-gold rounded text-sm transition-colors h-24 resize-none"
                    placeholder="e.g. Returned late from patrol, encountered unexpected resistance."
                    required
                  />
                  <div className="text-[10px] text-bat-gray font-mono text-right mt-1">
                    {failureReasonText.length} characters
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!failureReasonText.trim()}
                  className="w-full py-2.5 bg-bat-danger hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-bat-white font-bebas text-lg tracking-widest transition-colors rounded"
                >
                  TRANSMIT INCIDENT REPORT
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header bar */}
      <div className="flex justify-between items-center bg-bat-dark border border-bat-border p-4 rounded">
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 bg-bat-gold hover:bg-bat-gold-dim text-bat-black px-4 py-2 rounded font-bebas text-md tracking-wider transition-colors"
          >
            <PlusIcon size={16} />
            DEFINE HABIT
          </button>
          <button
            onClick={handleCompleteAll}
            className="border border-bat-border text-bat-gray hover:text-bat-white hover:border-bat-white px-4 py-2 rounded font-bebas text-md tracking-wider transition-all"
          >
            COMPLETE ALL TODAY
          </button>
        </div>
        <div className="text-xs font-mono text-bat-gray uppercase">
          OPERATIONAL TIME: <span className="text-bat-white">{todayStr}</span>
        </div>
      </div>

      {/* Habit Creation modal popup */}
      <AnimatePresence>
        {showAddForm && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-bat-dark border border-bat-border p-6 rounded shadow-[0_4px_30px_rgba(0,0,0,0.8)] w-full max-w-md bat-glow-gold"
            >
              <div className="flex justify-between items-center pb-4 border-b border-bat-border mb-4">
                <span className="font-bebas text-xl text-bat-gold tracking-wider">DEFINE PROTOCOL HABIT</span>
                <button onClick={() => setShowAddForm(false)} className="text-bat-gray hover:text-bat-white">
                  <XIcon size={18} />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-bat-gray uppercase tracking-widest mb-1">
                    Habit Description
                  </label>
                  <input
                    type="text"
                    value={taskName}
                    onChange={(e) => setTaskName(e.target.value)}
                    className="w-full px-4 py-2 bg-bat-black border border-bat-border text-bat-white focus:outline-none focus:border-bat-gold rounded text-sm transition-colors"
                    placeholder="e.g. Master Wayne's physical fitness routines"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-bat-gray uppercase tracking-widest mb-1">
                      Category
                    </label>
                    <select
                      value={taskCategory}
                      onChange={(e: any) => setTaskCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-bat-black border border-bat-border text-bat-white focus:outline-none focus:border-bat-gold rounded text-sm"
                    >
                      <option value="Health">Health</option>
                      <option value="Mind">Mind</option>
                      <option value="Work">Work</option>
                      <option value="Personal">Personal</option>
                      <option value="Custom">Custom</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-bat-gray uppercase tracking-widest mb-1">
                      Minutes Estimated
                    </label>
                    <input
                      type="number"
                      value={estMinutes}
                      onChange={(e) => setEstMinutes(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 bg-bat-black border border-bat-border text-bat-white focus:outline-none focus:border-bat-gold rounded text-sm"
                      min="0"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-bat-gold hover:bg-bat-gold-dim text-bat-black font-bebas text-lg tracking-widest transition-colors rounded"
                >
                  SAVE PROTOCOL
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Checklist grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Habit List Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bat-glass p-6 rounded">
            <h3 className="font-bebas text-xl text-bat-gold tracking-wider mb-4">TODAY'S TACTICAL CHECKLIST</h3>
            
            {dailyTasks.length === 0 ? (
              <div className="p-8 text-center text-xs text-bat-gray font-mono uppercase border border-dashed border-bat-border rounded">
                NO ACTIVE HABITS DEFINED. INITIALIZE PROTOCOLS ABOVE.
              </div>
            ) : (
              <div className="space-y-3">
                {dailyTasks.map((task, idx) => {
                  const done = taskCompletions.some(
                    (c) => c.task_id === task.id && c.date === todayStr && c.completed
                  );

                  return (
                    <div 
                      key={task.id}
                      className={`flex items-center justify-between p-4 rounded border transition-colors ${
                        done 
                          ? 'bg-bat-surface bg-opacity-35 border-bat-success border-opacity-40 text-bat-gray' 
                          : 'bg-bat-black border-bat-border text-bat-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Custom Animated Checkbox */}
                        <button
                          onClick={() => toggleTaskCompletion(task.id, todayStr, !done)}
                          className={`w-6 h-6 border-2 rounded flex items-center justify-center transition-all focus:outline-none ${
                            done 
                              ? 'border-bat-success bg-bat-success bg-opacity-10 shadow-[0_0_10px_rgba(64,200,112,0.2)]' 
                              : 'border-bat-border hover:border-bat-gold bg-bat-black'
                          }`}
                        >
                          {done && (
                            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-bat-success">
                              <motion.polyline
                                points="20 6 9 17 4 12"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 0.3 }}
                              />
                            </svg>
                          )}
                        </button>
                        
                        {editingTaskId === task.id ? (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="px-2 py-1 bg-bat-dark border border-bat-border text-bat-white rounded text-xs"
                            />
                            <button onClick={() => handleEditSave(task.id)} className="text-bat-success"><CheckIcon size={16} /></button>
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <span className={`text-sm font-semibold tracking-wide ${done ? 'line-through opacity-50' : ''}`}>
                              {task.name}
                            </span>
                            <span className="text-[10px] text-bat-gray font-mono uppercase mt-0.5">
                              {task.category} • {task.est_minutes} MINS • {task.is_active ? 'ACTIVE' : 'PAUSED'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Controls (Move up/down, Edit, Pause/Activate, Delete) */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => moveTask(idx, 'up')}
                          disabled={idx === 0}
                          className="text-bat-gray hover:text-bat-white disabled:opacity-30"
                          title="Move Up"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => moveTask(idx, 'down')}
                          disabled={idx === dailyTasks.length - 1}
                          className="text-bat-gray hover:text-bat-white disabled:opacity-30"
                          title="Move Down"
                        >
                          ▼
                        </button>
                        
                        <button
                          onClick={() => updateDailyTask(task.id, { is_active: !task.is_active })}
                          className={`text-xs px-2 py-0.5 rounded border font-mono ${
                            task.is_active 
                              ? 'text-bat-gold border-bat-gold border-opacity-30 bg-bat-gold bg-opacity-5 hover:bg-opacity-10' 
                              : 'text-bat-gray border-bat-border hover:bg-bat-surface'
                          }`}
                        >
                          {task.is_active ? 'PAUSE' : 'ACTIVATE'}
                        </button>

                        <button 
                          onClick={() => handleEditClick(task)}
                          className="text-bat-gray hover:text-bat-white p-1"
                        >
                          ⚙️
                        </button>

                        <button
                          onClick={() => deleteDailyTask(task.id)}
                          className="text-bat-gray hover:text-bat-danger p-1"
                        >
                          <TrashIcon size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Calendar Heatmap grid */}
          <div className="bat-glass p-6 rounded">
            <h3 className="font-bebas text-xl text-bat-gold tracking-wider mb-4">MONTHLY COMPLETION HEATMAP</h3>
            <div className="grid grid-cols-7 gap-2 max-w-md mx-auto">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                <div key={idx} className="text-center text-xs font-mono font-bold text-bat-gray">{day}</div>
              ))}
              {heatmapGrid.map((dayGrid) => {
                let cellColor = 'bg-bat-black border-bat-border';
                if (dayGrid.status === 'gold') cellColor = 'bg-bat-gold border-bat-gold shadow-[0_0_6px_rgba(245,197,24,0.3)] text-bat-black';
                else if (dayGrid.status === 'gray') cellColor = 'bg-bat-surface border-bat-border text-bat-gray';
                else if (dayGrid.status === 'red') cellColor = 'bg-bat-danger bg-opacity-20 border-bat-danger text-bat-danger';

                return (
                  <div
                    key={dayGrid.day}
                    className={`h-8 rounded border flex items-center justify-center text-[10px] font-mono font-bold transition-all ${cellColor}`}
                    title={`${dayGrid.date}: ${dayGrid.status}`}
                  >
                    {dayGrid.day}
                  </div>
                );
              })}
            </div>
            
            {/* Heatmap Legend */}
            <div className="flex items-center gap-4 justify-center mt-6 text-[10px] font-mono text-bat-gray">
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-bat-gold border border-bat-gold" />
                <span>100% COMPLETE</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-bat-surface border border-bat-border" />
                <span>PARTIAL</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-bat-danger bg-opacity-20 border border-bat-danger" />
                <span>0% COMPLETE</span>
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Charts */}
        <div className="space-y-6">
          {/* Daily Pie chart */}
          <div className="bat-glass p-6 rounded flex flex-col items-center">
            <h3 className="font-bebas text-xl text-bat-gold tracking-wider mb-4">TODAY'S ANALYSIS</h3>
            {activeTasksCount === 0 ? (
              <div className="py-12 text-xs text-bat-gray font-mono uppercase text-center">
                NO HABITS DEFINED TODAY
              </div>
            ) : (
              <div className="w-full h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#12121A', borderColor: '#2A2A3A', borderRadius: '4px' }} 
                      itemStyle={{ color: '#E8E8F0', fontFamily: 'monospace', fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-6 text-xs font-mono text-bat-gray mt-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-bat-success" />
                    <span>DONE ({completedTodayCount})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-bat-danger" />
                    <span>MISSED ({missedTodayCount})</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Weekly completion rate Bar chart */}
          <div className="bat-glass p-6 rounded">
            <h3 className="font-bebas text-xl text-bat-gold tracking-wider mb-4">7-DAY HABIT RETENTION (%)</h3>
            {barData.length === 0 ? (
              <div className="py-12 text-xs text-bat-gray font-mono uppercase text-center">
                NO DATA LOGGED FOR THE PAST WEEK
              </div>
            ) : (
              <div className="w-full h-56 font-mono text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="#8888A0" fontSize={9} tickLine={false} />
                    <YAxis domain={[0, 100]} stroke="#8888A0" fontSize={9} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#12121A', borderColor: '#2A2A3A', borderRadius: '4px' }}
                      itemStyle={{ color: '#E8E8F0', fontFamily: 'monospace', fontSize: '11px' }}
                    />
                    <Bar dataKey="rate" fill="#F5C518" radius={[2, 2, 0, 0]}>
                      {barData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.rate === 100 ? '#F5C518' : '#C49A10'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
