// Sleep Tracker Module
// Path: src/pages/SleepTracker.tsx

import React, { useState, useEffect } from 'react';
import { useAppStore, SleepLog } from '../store/appStore';
import { supabase } from '../lib/supabase';
import { 
  PlusIcon, 
  TrashIcon, 
  XIcon,
  AIMentorIcon,
  SleepIcon,
  BatIcon,
  WarningIcon
} from '../components/ui/Icons';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceArea, ReferenceLine, Cell } from 'recharts';

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

const format24To12String = (time24: string) => {
  if (!time24) return '';
  const { hour, minute, ampm } = parse24To12(time24);
  return `${hour}:${minute} ${ampm}`;
};

export const SleepTracker: React.FC = () => {
  const {
    sleepLogs,
    logSleep,
    submitFailureReason,
    addToast
  } = useAppStore();

  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [bedHour, setBedHour] = useState(10);
  const [bedMinute, setBedMinute] = useState('00');
  const [bedAmPm, setBedAmPm] = useState<'AM' | 'PM'>('PM');

  const [wakeHour, setWakeHour] = useState(6);
  const [wakeMinute, setWakeMinute] = useState('00');
  const [wakeAmPm, setWakeAmPm] = useState<'AM' | 'PM'>('AM');

  const bedtime = format12To24(bedHour, bedMinute, bedAmPm);
  const wakeTime = format12To24(wakeHour, wakeMinute, wakeAmPm);
  const [duration, setDuration] = useState(8.0);
  const [qualityRating, setQualityRating] = useState(4);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // AI Analysis state
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  // Deviation Modal State (for under 6h or over 10h sleep)
  const [showDeviationModal, setShowDeviationModal] = useState(false);
  const [deviationReason, setDeviationReason] = useState('');
  const [pendingSleepLogId, setPendingSleepLogId] = useState<string | null>(null);
  const [deviationHours, setDeviationHours] = useState(0);

  // Auto-calculate sleep duration when bedtime or wakeTime changes
  useEffect(() => {
    if (!bedtime || !wakeTime) return;
    
    // Parse time
    const [bedH, bedM] = bedtime.split(':').map(Number);
    const [wakeH, wakeM] = wakeTime.split(':').map(Number);
    
    let bedDate = new Date(2000, 0, 1, bedH, bedM);
    let wakeDate = new Date(2000, 0, 1, wakeH, wakeM);
    
    // If wake time is earlier than bedtime, assume it crossed midnight
    if (wakeDate < bedDate) {
      wakeDate.setDate(wakeDate.getDate() + 1);
    }
    
    const diffMs = wakeDate.getTime() - bedDate.getTime();
    const diffHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
    setDuration(diffHours);
  }, [bedtime, wakeTime]);

  const handleSleepSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // 1. Write sleep log
      await logSleep(date, bedtime, wakeTime, duration, qualityRating, notes);
      
      // Fetch the log that was just created/updated to get its ID (we match on date)
      // Wait, we can get it from the store after update
      const updatedLogs = useAppStore.getState().sleepLogs;
      const loggedItem = updatedLogs.find(l => l.date === date);

      // Reset form variables
      setNotes('');
      
      // 2. Check if duration is < 6 hours or > 10 hours
      if (duration < 6.0 || duration > 10.0) {
        setDeviationHours(duration);
        setPendingSleepLogId(loggedItem?.id || 'temp-id');
        setShowDeviationModal(true);
      } else {
        addToast('Sleep telemetry encrypted.', 'success');
      }
    } catch (err) {
      console.error(err);
      addToast('Failed to save sleep telemetry.', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeviationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deviationReason.trim().length < 10) {
      addToast('Please input a valid explanation (min 10 characters).', 'danger');
      return;
    }

    if (pendingSleepLogId) {
      await submitFailureReason('sleep', pendingSleepLogId, date, deviationReason);
    }

    setShowDeviationModal(false);
    setDeviationReason('');
    setPendingSleepLogId(null);
    addToast('Deviation telemetry logged in files.', 'success');
  };

  const handleTriggerSleepAnalysis = async () => {
    setLoadingAnalysis(true);
    setAiAnalysis(null);

    try {
      const logsContext = sleepLogs.slice(0, 7).map(s => 
        `- Date: ${s.date}, Bedtime: ${format24To12String(s.bedtime)}, Waketime: ${format24To12String(s.wake_time)}, Duration: ${s.duration_hours}h, Quality: ${s.quality_rating}/5, Notes: "${s.notes || ''}"`
      ).join('\n');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          message: "Perform a sleep analysis based on my logs. Check my consistency, average hours, quality score, and recommend actions (sleep more, less, maintain schedule). Flag any chronic irregular cycles.",
          customContext: `Active sleep telemetry (last 7 days):\n${logsContext || 'None logged.'}`
        }),
      });

      const result = await response.json();
      if (response.ok && result.reply) {
        setAiAnalysis(result.reply);
        addToast('Alfred sleep analysis decrypted.', 'success');
      } else {
        setAiAnalysis("Sir, I could not finalize the sleep patterns extraction. Confirm connection beacons.");
      }
    } catch (e) {
      console.error(e);
      setAiAnalysis("Network anomaly. Sleep analysis aborted.");
    } finally {
      setLoadingAnalysis(false);
    }
  };

  // Recharts sleep logs data (last 30 days, sorted chronologically)
  const chartData = [...sleepLogs]
    .slice(0, 30)
    .reverse()
    .map(log => ({
      date: log.date.substring(5), // MM-DD format
      duration: parseFloat(log.duration_hours as any),
      quality: log.quality_rating
    }));

  return (
    <div className="space-y-6">
      
      {/* Deviation Explanation Modal */}
      <AnimatePresence>
        {showDeviationModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-bat-dark border border-bat-border rounded shadow-[0_0_40px_rgba(0,0,0,0.8)] w-full max-w-md p-6 bat-glow-gold"
            >
              <div className="flex items-center gap-2 text-bat-gold mb-4">
                <WarningIcon size={24} />
                <h3 className="font-bebas text-2xl tracking-wider">SLEEP DEVIATION DETECTED</h3>
              </div>
              
              <p className="text-sm text-bat-white leading-relaxed mb-4">
                You logged <span className="text-bat-gold font-bold">{deviationHours} hours</span> of sleep, which is outside the recommended 6–10 hour envelope.
              </p>
              
              <form onSubmit={handleDeviationSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-bat-gray uppercase tracking-widest mb-1.5">
                    What caused this sleep duration deviation? (Required — min 10 chars)
                  </label>
                  <textarea
                    value={deviationReason}
                    onChange={(e) => setDeviationReason(e.target.value)}
                    className="w-full px-4 py-2.5 bg-bat-black border border-bat-border text-bat-white focus:outline-none focus:border-bat-gold rounded text-sm transition-colors h-24 resize-none"
                    placeholder="e.g. Gotham City security breach forced all-night operations..."
                    required
                  />
                  <div className="text-[10px] text-bat-gray font-mono text-right mt-1">
                    {deviationReason.length}/10 MIN CHARS
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={deviationReason.length < 10}
                  className="w-full py-2.5 bg-bat-gold hover:bg-bat-gold-dim text-bat-black font-bebas text-lg tracking-widest transition-colors rounded"
                >
                  TRANSMIT EXPLANATION
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sleep Logging Form (Left) */}
        <div className="lg:col-span-1">
          <div className="bat-glass p-6 rounded">
            <div className="flex items-center gap-2 text-bat-gold mb-6 border-b border-bat-border pb-3">
              <SleepIcon size={24} />
              <h3 className="font-bebas text-2xl tracking-wider">LOG SLEEP PATTERN</h3>
            </div>

            <form onSubmit={handleSleepSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-bat-gray uppercase tracking-widest mb-1">
                  Log Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-bat-black border border-bat-border text-bat-white focus:outline-none focus:border-bat-gold rounded text-xs font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-bat-gray uppercase tracking-widest mb-1.5">
                    Bedtime
                  </label>
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
                        className={`px-2 text-[9px] font-mono font-bold transition-all border-r border-bat-border ${
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
                        className={`px-2 text-[9px] font-mono font-bold transition-all ${
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
                  <label className="block text-xs font-bold text-bat-gray uppercase tracking-widest mb-1.5">
                    Wake Time
                  </label>
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
                        className={`px-2 text-[9px] font-mono font-bold transition-all border-r border-bat-border ${
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
                        className={`px-2 text-[9px] font-mono font-bold transition-all ${
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

              <div className="p-3 bg-bat-black border border-bat-border rounded flex justify-between items-center">
                <span className="text-xs font-mono text-bat-gray uppercase">DURATIONS CALCULATED:</span>
                <span className="text-sm font-mono font-bold text-bat-gold">{duration} HOURS</span>
              </div>

              {/* Bat quality rating */}
              <div>
                <label className="block text-xs font-bold text-bat-gray uppercase tracking-widest mb-2">
                  Recuperation Quality
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button
                      type="button"
                      key={val}
                      onClick={() => setQualityRating(val)}
                      className={`p-1.5 rounded transition-all focus:outline-none ${
                        val <= qualityRating 
                          ? 'text-bat-gold scale-110 drop-shadow-[0_0_4px_rgba(245,197,24,0.5)]' 
                          : 'text-bat-border hover:text-bat-gold-dim'
                      }`}
                    >
                      <BatIcon size={24} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-bat-gray uppercase tracking-widest mb-1">
                  Mental Notes (Notes / Dream log)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2 bg-bat-black border border-bat-border text-bat-white focus:outline-none focus:border-bat-gold rounded text-xs transition-colors h-20 resize-none font-mono"
                  placeholder="Record mental state post sleep..."
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-bat-gold hover:bg-bat-gold-dim text-bat-black font-bebas text-lg tracking-widest transition-colors rounded uppercase"
              >
                {submitting ? 'RECORDING TELEMETRY...' : 'LOG SLEEP PATTERN'}
              </button>
            </form>
          </div>
        </div>

        {/* Visualizations & AI (Right) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Duration Line Graph with Reference Zones */}
          <div className="bat-glass p-6 rounded">
            <h3 className="font-bebas text-xl text-bat-gold tracking-wider mb-6">30-DAY SLEEP DURATION & RECOMMENDED ZONES</h3>
            
            {chartData.length === 0 ? (
              <div className="p-8 text-center text-xs text-bat-gray font-mono uppercase border border-dashed border-bat-border rounded">
                NO SLEEP RECORDS FOUND.
              </div>
            ) : (
              <div className="w-full h-64 font-mono text-[9px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    {/* Y-axis */}
                    <YAxis domain={[0, 14]} stroke="#8888A0" />
                    {/* X-axis */}
                    <XAxis dataKey="date" stroke="#8888A0" />
                    
                    {/* Color zone overlays using ReferenceArea */}
                    {/* Under 6h sleep: Red area */}
                    <ReferenceArea y1={0} y2={6} fill="#E84040" fillOpacity={0.06} />
                    {/* 6h - 7h sleep: Yellow area */}
                    <ReferenceArea y1={6} y2={7} fill="#F5C518" fillOpacity={0.04} />
                    {/* 7h - 9h sleep: Recommended Green area */}
                    <ReferenceArea y1={7} y2={9} fill="#40C870" fillOpacity={0.06} />
                    {/* Over 9h sleep: Orange area */}
                    <ReferenceArea y1={9} y2={14} fill="#C49A10" fillOpacity={0.04} />

                    {/* Standard Reference limits */}
                    <ReferenceLine y={7} stroke="#40C870" strokeDasharray="3 3" label={{ value: 'MIN (7h)', fill: '#40C870', fontSize: 9, position: 'insideBottomLeft' }} />
                    <ReferenceLine y={9} stroke="#C49A10" strokeDasharray="3 3" label={{ value: 'MAX (9h)', fill: '#C49A10', fontSize: 9, position: 'insideTopLeft' }} />

                    <Tooltip
                      contentStyle={{ backgroundColor: '#12121A', borderColor: '#2A2A3A', borderRadius: '4px' }}
                      itemStyle={{ color: '#E8E8F0', fontFamily: 'monospace' }}
                    />
                    
                    <Line 
                      type="monotone" 
                      dataKey="duration" 
                      stroke="#F5C518" 
                      strokeWidth={2.5} 
                      dot={{ fill: '#0A0A0F', strokeWidth: 2, r: 4 }} 
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Sleep Quality bar chart */}
            <div className="bat-glass p-6 rounded">
              <h3 className="font-bebas text-lg text-bat-gold tracking-wide mb-4">SLEEP QUALITY RATINGS</h3>
              {chartData.length === 0 ? (
                <div className="p-8 text-center text-xs text-bat-gray font-mono uppercase">NO DATA</div>
              ) : (
                <div className="w-full h-44 font-mono text-[9px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <XAxis dataKey="date" stroke="#8888A0" />
                      <YAxis domain={[0, 5]} stroke="#8888A0" tickCount={6} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#12121A', borderColor: '#2A2A3A', borderRadius: '4px' }}
                        itemStyle={{ color: '#E8E8F0', fontFamily: 'monospace' }}
                      />
                      <Bar dataKey="quality" fill="#C49A10" radius={[2, 2, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.quality >= 4 ? '#40C870' : entry.quality >= 3 ? '#F5C518' : '#E84040'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* AI analysis card */}
            <div className="bat-glass p-6 rounded flex flex-col justify-between">
              <div>
                <h3 className="font-bebas text-lg text-bat-gold tracking-wide mb-4">RECUPERATION DIAGNOSTICS</h3>
                <p className="text-xs text-bat-gray leading-normal mb-4 font-mono">
                  Alfred can audit sleep logs to identify schedule anomalies and suggest changes.
                </p>
              </div>
              <button
                onClick={handleTriggerSleepAnalysis}
                disabled={loadingAnalysis}
                className="w-full py-2 bg-bat-dark border border-bat-border hover:border-bat-gold text-bat-gold font-mono text-xs rounded transition-all flex items-center justify-center gap-2"
              >
                <AIMentorIcon size={14} />
                {loadingAnalysis ? 'AUDITING CYCLES...' : 'DECRYPT SLEEP TRENDS'}
              </button>
            </div>

          </div>

          {/* AI Output Card (if generated) */}
          <AnimatePresence>
            {aiAnalysis && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                className="bat-glass p-6 rounded relative border-l-4 border-bat-gold"
              >
                <div className="flex items-center gap-2 text-bat-gold mb-3">
                  <AIMentorIcon size={18} />
                  <span className="font-bebas text-lg tracking-wider">ALFRED'S TELEMETRY BRIEFING</span>
                </div>
                <p className="text-xs font-mono text-bat-white leading-relaxed whitespace-pre-wrap">
                  {aiAnalysis}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

        </div>

      </div>

    </div>
  );
};
