// Quick Add Modals for Keyboard Shortcuts (T, S, F)
// Path: src/components/layout/QuickAddModals.tsx

import React, { useState, useEffect } from 'react';
import { useAppStore, DailyTask, FinanceCategory } from '../../store/appStore';
import { XIcon, DailyTasksIcon, SleepIcon, FinanceIcon } from '../ui/Icons';
import { motion, AnimatePresence } from 'framer-motion';

const parse24To12 = (time24: string) => {
  if (!time24) return { hour: 12, minute: '00', ampm: 'AM' as const };
  const [hStr, mStr] = time24.split(':');
  let hour24 = parseInt(hStr, 10);
  const minute = mStr || '00';
  let ampm: 'AM' | 'PM' = 'AM';
  let hour12 = hour24;

  if (hour24 >= 12) {
    ampm = 'PM';
    if (hour24 > 12) {
      hour12 = hour24 - 12;
    }
  } else if (hour24 === 0) {
    hour12 = 12;
  }
  return { hour: hour12, minute, ampm };
};

const format12To24 = (hour: number, minute: string, ampm: 'AM' | 'PM') => {
  let hour24 = hour;
  if (ampm === 'PM' && hour < 12) {
    hour24 = hour + 12;
  } else if (ampm === 'AM' && hour === 12) {
    hour24 = 0;
  }
  const hStr = hour24.toString().padStart(2, '0');
  const mStr = minute.padStart(2, '0');
  return `${hStr}:${mStr}`;
};

interface QuickAddModalsProps {
  showTask: boolean;
  setShowTask: (show: boolean) => void;
  showSleep: boolean;
  setShowSleep: (show: boolean) => void;
  showFinance: boolean;
  setShowFinance: (show: boolean) => void;
}

export const QuickAddModals: React.FC<QuickAddModalsProps> = ({
  showTask,
  setShowTask,
  showSleep,
  setShowSleep,
  showFinance,
  setShowFinance,
}) => {
  const {
    addDailyTask,
    logSleep,
    financeCategories,
    addFinanceTransaction,
    addToast,
  } = useAppStore();

  const getTodayStr = () => new Date().toISOString().split('T')[0];

  // 1. Task State
  const [taskName, setTaskName] = useState('');
  const [taskCategory, setTaskCategory] = useState<DailyTask['category']>('Health');
  const [taskMinutes, setTaskMinutes] = useState(15);
  const [submittingTask, setSubmittingTask] = useState(false);

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName.trim()) return;
    setSubmittingTask(true);
    await addDailyTask(taskName, taskCategory, taskMinutes);
    setTaskName('');
    setTaskMinutes(15);
    setSubmittingTask(false);
    setShowTask(false);
  };

  // 2. Sleep State
  const [sleepDate, setSleepDate] = useState(getTodayStr());
  const [bedHour, setBedHour] = useState(10);
  const [bedMinute, setBedMinute] = useState('00');
  const [bedAmPm, setBedAmPm] = useState<'AM' | 'PM'>('PM');

  const [wakeHour, setWakeHour] = useState(6);
  const [wakeMinute, setWakeMinute] = useState('00');
  const [wakeAmPm, setWakeAmPm] = useState<'AM' | 'PM'>('AM');

  const bedtime = format12To24(bedHour, bedMinute, bedAmPm);
  const wakeTime = format12To24(wakeHour, wakeMinute, wakeAmPm);
  const [sleepQuality, setSleepQuality] = useState(4);
  const [sleepNotes, setSleepNotes] = useState('');
  const [submittingSleep, setSubmittingSleep] = useState(false);

  const handleSleepSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingSleep(true);
    
    const [bedH, bedM] = bedtime.split(':').map(Number);
    const [wakeH, wakeM] = wakeTime.split(':').map(Number);
    let bedDate = new Date(2000, 0, 1, bedH, bedM);
    let wakeDate = new Date(2000, 0, 1, wakeH, wakeM);
    if (wakeDate < bedDate) wakeDate.setDate(wakeDate.getDate() + 1);
    const duration = parseFloat(((wakeDate.getTime() - bedDate.getTime()) / (1000 * 60 * 60)).toFixed(2));

    await logSleep(sleepDate, bedtime, wakeTime, duration, sleepQuality, sleepNotes);
    setSleepNotes('');
    setSubmittingSleep(false);
    setShowSleep(false);
  };

  // 3. Finance State
  const [financeDate, setFinanceDate] = useState(getTodayStr());
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [financeNote, setFinanceNote] = useState('');
  const [submittingFinance, setSubmittingFinance] = useState(false);

  const handleFinanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0 || !categoryId) return;
    setSubmittingFinance(true);
    await addFinanceTransaction(amt, categoryId, financeDate, financeNote, false, null);
    setAmount('');
    setFinanceNote('');
    setSubmittingFinance(false);
    setShowFinance(false);
  };

  const modalClass = "bg-bat-dark border border-bat-border rounded p-6 shadow-[0_0_50px_rgba(0,0,0,0.9)] w-full max-w-md relative bat-glow-gold z-50";

  return (
    <AnimatePresence>
      {/* Quick Task Modal */}
      {showTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 backdrop-blur-xs p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className={modalClass}
          >
            <button onClick={() => setShowTask(false)} className="absolute right-4 top-4 text-bat-gray hover:text-white">
              <XIcon size={18} />
            </button>
            <div className="flex items-center gap-2 text-bat-gold mb-4 border-b border-bat-border pb-2">
              <DailyTasksIcon size={20} />
              <span className="font-bebas text-xl tracking-wider">QUICK-ADD DAILY HABIT (T)</span>
            </div>
            <form onSubmit={handleTaskSubmit} className="space-y-4 font-mono text-xs">
              <div>
                <label className="block text-[9px] font-bold text-bat-gray uppercase tracking-widest mb-1">Habit Name</label>
                <input
                  type="text"
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  className="w-full px-3 py-2 bg-bat-black border border-bat-border text-bat-white focus:outline-none focus:border-bat-gold rounded text-xs"
                  placeholder="e.g. Meditate in Batcave"
                  required
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-bat-gray uppercase tracking-widest mb-1">Category</label>
                  <select
                    value={taskCategory}
                    onChange={(e: any) => setTaskCategory(e.target.value)}
                    className="w-full px-2 py-1.5 bg-bat-black border border-bat-border text-bat-white focus:outline-none focus:border-bat-gold rounded text-xs"
                  >
                    <option value="Health">Health</option>
                    <option value="Mind">Mind</option>
                    <option value="Work">Work</option>
                    <option value="Personal">Personal</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-bat-gray uppercase tracking-widest mb-1">Est. Minutes</label>
                  <input
                    type="number"
                    value={taskMinutes}
                    onChange={(e) => setTaskMinutes(parseInt(e.target.value) || 0)}
                    className="w-full px-2 py-1 bg-bat-black border border-bat-border text-bat-white focus:outline-none focus:border-bat-gold rounded text-xs"
                    min="0"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={submittingTask}
                className="w-full py-2 bg-bat-gold hover:bg-bat-gold-dim text-bat-black font-bebas text-md tracking-widest rounded"
              >
                SAVE TASK
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Quick Sleep Modal */}
      {showSleep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 backdrop-blur-xs p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className={modalClass}
          >
            <button onClick={() => setShowSleep(false)} className="absolute right-4 top-4 text-bat-gray hover:text-white">
              <XIcon size={18} />
            </button>
            <div className="flex items-center gap-2 text-bat-gold mb-4 border-b border-bat-border pb-2">
              <SleepIcon size={20} />
              <span className="font-bebas text-xl tracking-wider">QUICK-LOG SLEEP CYCLE (S)</span>
            </div>
            <form onSubmit={handleSleepSubmit} className="space-y-4 font-mono text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-bat-gray uppercase tracking-widest mb-1.5">Bedtime</label>
                  <div className="flex items-stretch gap-1">
                    <select
                      value={bedHour}
                      onChange={(e) => setBedHour(Number(e.target.value))}
                      className="flex-1 min-w-[40px] px-1 py-1.5 bg-bat-black border border-bat-border text-bat-white focus:outline-none focus:border-bat-gold rounded text-xs font-mono cursor-pointer"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                        <option key={h} value={h}>
                          {h.toString().padStart(2, '0')}
                        </option>
                      ))}
                    </select>

                    <span className="text-bat-gray font-mono font-bold flex items-center">:</span>

                    <select
                      value={bedMinute}
                      onChange={(e) => setBedMinute(e.target.value)}
                      className="flex-1 min-w-[40px] px-1 py-1.5 bg-bat-black border border-bat-border text-bat-white focus:outline-none focus:border-bat-gold rounded text-xs font-mono cursor-pointer"
                    >
                      {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')).map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>

                    <div className="flex bg-bat-black border border-bat-border rounded overflow-hidden shrink-0">
                      <button
                        type="button"
                        onClick={() => setBedAmPm('AM')}
                        className={`px-1.5 text-[9px] font-mono font-bold transition-all border-r border-bat-border ${
                          bedAmPm === 'AM'
                            ? 'bg-bat-gold text-bat-black'
                            : 'text-bat-gray hover:text-bat-white'
                        }`}
                      >
                        AM
                      </button>
                      <button
                        type="button"
                        onClick={() => setBedAmPm('PM')}
                        className={`px-1.5 text-[9px] font-mono font-bold transition-all ${
                          bedAmPm === 'PM'
                            ? 'bg-bat-gold text-bat-black'
                            : 'text-bat-gray hover:text-bat-white'
                        }`}
                      >
                        PM
                      </button>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-bat-gray uppercase tracking-widest mb-1.5">Wake time</label>
                  <div className="flex items-stretch gap-1">
                    <select
                      value={wakeHour}
                      onChange={(e) => setWakeHour(Number(e.target.value))}
                      className="flex-1 min-w-[40px] px-1 py-1.5 bg-bat-black border border-bat-border text-bat-white focus:outline-none focus:border-bat-gold rounded text-xs font-mono cursor-pointer"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                        <option key={h} value={h}>
                          {h.toString().padStart(2, '0')}
                        </option>
                      ))}
                    </select>

                    <span className="text-bat-gray font-mono font-bold flex items-center">:</span>

                    <select
                      value={wakeMinute}
                      onChange={(e) => setWakeMinute(e.target.value)}
                      className="flex-1 min-w-[40px] px-1 py-1.5 bg-bat-black border border-bat-border text-bat-white focus:outline-none focus:border-bat-gold rounded text-xs font-mono cursor-pointer"
                    >
                      {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')).map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>

                    <div className="flex bg-bat-black border border-bat-border rounded overflow-hidden shrink-0">
                      <button
                        type="button"
                        onClick={() => setWakeAmPm('AM')}
                        className={`px-1.5 text-[9px] font-mono font-bold transition-all border-r border-bat-border ${
                          wakeAmPm === 'AM'
                            ? 'bg-bat-gold text-bat-black'
                            : 'text-bat-gray hover:text-bat-white'
                        }`}
                      >
                        AM
                      </button>
                      <button
                        type="button"
                        onClick={() => setWakeAmPm('PM')}
                        className={`px-1.5 text-[9px] font-mono font-bold transition-all ${
                          wakeAmPm === 'PM'
                            ? 'bg-bat-gold text-bat-black'
                            : 'text-bat-gray hover:text-bat-white'
                        }`}
                      >
                        PM
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-bat-gray uppercase tracking-widest mb-1 font-mono">Date</label>
                  <input
                    type="date"
                    value={sleepDate}
                    onChange={(e) => setSleepDate(e.target.value)}
                    className="w-full px-2 py-1 bg-bat-black border border-bat-border text-bat-white focus:outline-none focus:border-bat-gold rounded text-xs font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-bat-gray uppercase tracking-widest mb-1">Quality Rating (1-5)</label>
                  <select
                    value={sleepQuality}
                    onChange={(e) => setSleepQuality(Number(e.target.value))}
                    className="w-full px-2 py-1.5 bg-bat-black border border-bat-border text-bat-white focus:outline-none focus:border-bat-gold rounded text-xs"
                  >
                    <option value="5">5/5 - Full Recovery</option>
                    <option value="4">4/5 - Good</option>
                    <option value="3">3/5 - Average</option>
                    <option value="2">2/5 - Poor</option>
                    <option value="1">1/5 - Insufficient</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[9px] font-bold text-bat-gray uppercase tracking-widest mb-1">Notes</label>
                <textarea
                  value={sleepNotes}
                  onChange={(e) => setSleepNotes(e.target.value)}
                  className="w-full px-3 py-1.5 bg-bat-black border border-bat-border text-bat-white focus:outline-none focus:border-bat-gold rounded text-xs h-16 resize-none"
                  placeholder="Dream log memo..."
                />
              </div>
              <button
                type="submit"
                disabled={submittingSleep}
                className="w-full py-2 bg-bat-gold hover:bg-bat-gold-dim text-bat-black font-bebas text-md tracking-widest rounded"
              >
                RECORD SLEEP
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {/* Quick Finance Modal */}
      {showFinance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 backdrop-blur-xs p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className={modalClass}
          >
            <button onClick={() => setShowFinance(false)} className="absolute right-4 top-4 text-bat-gray hover:text-white">
              <XIcon size={18} />
            </button>
            <div className="flex items-center gap-2 text-bat-gold mb-4 border-b border-bat-border pb-2">
              <FinanceIcon size={20} />
              <span className="font-bebas text-xl tracking-wider">QUICK TRANSACTION (F)</span>
            </div>
            <form onSubmit={handleFinanceSubmit} className="space-y-4 font-mono text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-bat-gray uppercase tracking-widest mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-1.5 bg-bat-black border border-bat-border text-bat-white focus:outline-none focus:border-bat-gold rounded text-xs"
                    placeholder="0.00"
                    step="0.01"
                    min="0.01"
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-bat-gray uppercase tracking-widest mb-1">Category</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-2 py-1.5 bg-bat-black border border-bat-border text-bat-white focus:outline-none focus:border-bat-gold rounded text-xs"
                    required
                  >
                    <option value="">Select Category</option>
                    {financeCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name.toUpperCase()} ({c.type.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-bat-gray uppercase tracking-widest mb-1">Date</label>
                  <input
                    type="date"
                    value={financeDate}
                    onChange={(e) => setFinanceDate(e.target.value)}
                    className="w-full px-2 py-1.5 bg-bat-black border border-bat-border text-bat-white focus:outline-none focus:border-bat-gold rounded text-xs font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-bat-gray uppercase tracking-widest mb-1">Memo</label>
                  <input
                    type="text"
                    value={financeNote}
                    onChange={(e) => setFinanceNote(e.target.value)}
                    className="w-full px-3 py-1.5 bg-bat-black border border-bat-border text-bat-white focus:outline-none focus:border-bat-gold rounded text-xs"
                    placeholder="Memo note..."
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={submittingFinance}
                className="w-full py-2 bg-bat-gold hover:bg-bat-gold-dim text-bat-black font-bebas text-md tracking-widest rounded"
              >
                RECORD TRANSACTION
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
