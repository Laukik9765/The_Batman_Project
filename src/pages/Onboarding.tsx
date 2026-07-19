// Onboarding Wizard: 3 Steps
// Path: src/pages/Onboarding.tsx

import React, { useState, useEffect } from 'react';
import { useAuth } from '../modules/auth/AuthContext';
import { useAppStore } from '../store/appStore';
import { supabase } from '../lib/supabase';
import { BatSignalBg } from '../components/animations/BatSignalBg';
import { BatIcon, CheckIcon, DailyTasksIcon, GoalsIcon, UserIcon } from '../components/ui/Icons';
import { motion, AnimatePresence } from 'framer-motion';

// Common Timezones list
const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Sao_Paulo', 'Europe/London', 'Europe/Paris', 'Europe/Moscow',
  'Asia/Kolkata', 'Asia/Singapore', 'Asia/Tokyo', 'Australia/Sydney'
];

interface OnboardingTask {
  name: string;
  category: 'Health' | 'Mind' | 'Work' | 'Personal' | 'Custom';
  est_minutes: number;
}

export const Onboarding: React.FC = () => {
  const { user } = useAuth();
  const { addToast, fetchUserData, setProfile, profile } = useAppStore();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Step 1 State
  const [fullName, setFullName] = useState('');
  const [timezone, setTimezone] = useState('UTC');

  // Step 2 State (3 Initial Tasks)
  const [tasks, setTasks] = useState<OnboardingTask[]>([
    { name: 'Morning Exercise', category: 'Health', est_minutes: 20 },
    { name: '30 Minutes Reading', category: 'Mind', est_minutes: 30 },
    { name: 'Daily Planning', category: 'Personal', est_minutes: 15 }
  ]);

  // Step 3 State (Optional first goal)
  const [hasGoal, setHasGoal] = useState(false);
  const [goalName, setGoalName] = useState('');
  const [goalCategory, setGoalCategory] = useState<'Fitness' | 'Finance' | 'Learning' | 'Career' | 'Personal' | 'Other'>('Fitness');
  const [goalTargetDate, setGoalTargetDate] = useState('');
  const [goalMotivation, setGoalMotivation] = useState('');

  // Auto-detect timezone
  useEffect(() => {
    try {
      const systemTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (systemTimezone) {
        setTimezone(systemTimezone);
      }
    } catch (e) {
      console.warn('Failed to detect timezone, falling back to UTC.', e);
    }
  }, []);

  // Sync profile details if already loaded
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      if (profile.timezone) setTimezone(profile.timezone);
    }
  }, [profile]);

  const handleNextStep = () => {
    if (step === 1) {
      if (!fullName.trim()) {
        addToast('Please enter your name.', 'danger');
        return;
      }
    }
    if (step === 2) {
      // Validate that at least 3 tasks are defined and have names
      const invalid = tasks.some(t => !t.name.trim());
      if (invalid) {
        addToast('Please define all 3 daily habits.', 'danger');
        return;
      }
    }
    setStep(step + 1);
  };

  const handlePrevStep = () => {
    setStep(step - 1);
  };

  const updateTask = (index: number, field: keyof OnboardingTask, value: any) => {
    setTasks(tasks.map((t, idx) => {
      if (idx === index) {
        return { ...t, [field]: value };
      }
      return t;
    }));
  };

  const handleCompleteOnboarding = async () => {
    if (!user) return;
    setSubmitting(true);

    try {
      // 1. Update Profile setting onboarding_done = true
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          timezone,
          onboarding_done: true
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // 2. Insert initial tasks
      const taskInserts = tasks.map(t => ({
        user_id: user.id,
        name: t.name,
        category: t.category,
        est_minutes: t.est_minutes,
        is_active: true
      }));

      const { error: tasksError } = await supabase
        .from('daily_tasks')
        .insert(taskInserts);

      if (tasksError) throw tasksError;

      // 3. Insert optional goal if checked
      if (hasGoal && goalName.trim() && goalTargetDate) {
        const { error: goalError } = await supabase
          .from('goals')
          .insert([{
            user_id: user.id,
            name: goalName,
            category: goalCategory,
            target_date: goalTargetDate,
            motivation: goalMotivation,
            status: 'active'
          }]);

        if (goalError) throw goalError;
      }

      // Re-fetch store data and reload profile
      await fetchUserData(user.id);
      addToast('Onboarding completed successfully!', 'success');

      // Update state to trigger redirect in router
      if (profile) {
        setProfile({ ...profile, onboarding_done: true, full_name: fullName, timezone });
      }

    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'Onboarding database sync failed.', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-height-100vh flex flex-col justify-center items-center py-12 px-4 relative bg-bat-black">
      <BatSignalBg />

      {/* Onboarding Box */}
      <div className="w-full max-w-xl relative z-10 bat-glass p-8 rounded shadow-[0_10px_35px_rgba(0,0,0,0.8)] bat-glow-gold">
        
        {/* Step Indicator Header */}
        <div className="flex items-center justify-between border-b border-bat-border pb-6 mb-8">
          <div className="flex items-center gap-3">
            <span className="text-bat-gold"><BatIcon size={32} /></span>
            <span className="font-bebas text-2xl tracking-wider text-bat-gold">WELCOME ONBOARDING</span>
          </div>
          <div className="flex gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`w-8 h-2 rounded transition-colors ${
                  s === step ? 'bg-bat-gold' : s < step ? 'bg-bat-gold-dim opacity-55' : 'bg-bat-border'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Wizard Slide Animations */}
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3 text-bat-gold">
                <UserIcon size={24} />
                <h2 className="font-bebas text-2xl tracking-wider">STEP 1 — YOUR PROFILE</h2>
              </div>
              <p className="text-sm text-bat-gray">
                Welcome! Please enter your name and timezone. Daily resets occur at 11:59 PM in your selected timezone.
              </p>

              <div>
                <label className="block text-xs font-bold text-bat-gray uppercase tracking-widest mb-2">
                  Display name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-3 bg-bat-black border border-bat-border text-bat-white focus:outline-none focus:border-bat-gold rounded text-sm transition-colors"
                  placeholder="e.g. Alex Smith"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-bat-gray uppercase tracking-widest mb-2">
                  Timezone
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-4 py-3 bg-bat-black border border-bat-border text-bat-white focus:outline-none focus:border-bat-gold rounded text-sm transition-colors font-mono"
                >
                  {TIMEZONES.includes(timezone) ? null : (
                    <option value={timezone}>{timezone} (Auto-detected)</option>
                  )}
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={handleNextStep}
                  className="px-6 py-2.5 bg-bat-gold hover:bg-bat-gold-dim text-bat-black font-bebas text-md tracking-wider transition-colors rounded"
                >
                  CONTINUE TO HABITS
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3 text-bat-gold">
                <DailyTasksIcon size={24} />
                <h2 className="font-bebas text-2xl tracking-wider">STEP 2 — DEFINE THREE DAILY HABITS</h2>
              </div>
              <p className="text-sm text-bat-gray">
                Building strong habits leads to success. Define your first three core daily habits below.
              </p>

              <div className="space-y-4">
                {tasks.map((task, idx) => (
                  <div key={idx} className="p-4 bg-bat-black border border-bat-border rounded space-y-3">
                    <div className="flex gap-2">
                      <span className="font-mono text-xs text-bat-gold font-bold self-center">#{idx + 1}</span>
                      <input
                        type="text"
                        value={task.name}
                        onChange={(e) => updateTask(idx, 'name', e.target.value)}
                        className="flex-grow px-3 py-2 bg-bat-dark border border-bat-border text-bat-white focus:outline-none focus:border-bat-gold rounded text-sm transition-colors"
                        placeholder="Habit description"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-bat-gray uppercase tracking-widest mb-1">
                          Category
                        </label>
                        <select
                          value={task.category}
                          onChange={(e) => updateTask(idx, 'category', e.target.value)}
                          className="w-full px-2 py-1.5 bg-bat-dark border border-bat-border text-bat-white focus:outline-none focus:border-bat-gold rounded text-xs"
                        >
                          <option value="Health">Health</option>
                          <option value="Mind">Mind</option>
                          <option value="Work">Work</option>
                          <option value="Personal">Personal</option>
                          <option value="Custom">Custom</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-bat-gray uppercase tracking-widest mb-1">
                          Minutes Est.
                        </label>
                        <input
                          type="number"
                          value={task.est_minutes}
                          onChange={(e) => updateTask(idx, 'est_minutes', parseInt(e.target.value) || 0)}
                          className="w-full px-2 py-1 bg-bat-dark border border-bat-border text-bat-white focus:outline-none focus:border-bat-gold rounded text-xs"
                          min="0"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between pt-4">
                <button
                  onClick={handlePrevStep}
                  className="px-5 py-2.5 border border-bat-border text-bat-gray hover:text-bat-white hover:border-bat-gray transition-colors rounded text-sm font-medium"
                >
                  BACK
                </button>
                <button
                  onClick={handleNextStep}
                  className="px-6 py-2.5 bg-bat-gold hover:bg-bat-gold-dim text-bat-black font-bebas text-md tracking-wider transition-colors rounded"
                >
                  CONTINUE TO GOALS
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3 text-bat-gold">
                <GoalsIcon size={24} />
                <h2 className="font-bebas text-2xl tracking-wider">STEP 3 — DEFINE A LONG-TERM GOAL</h2>
              </div>
              <p className="text-sm text-bat-gray">
                Set a long-term goal to stay motivated. (This step is optional).
              </p>

              <div className="flex items-center gap-2 mb-4">
                <input
                  type="checkbox"
                  id="hasGoal"
                  checked={hasGoal}
                  onChange={(e) => setHasGoal(e.target.checked)}
                  className="accent-bat-gold rounded w-4 h-4"
                />
                <label htmlFor="hasGoal" className="text-sm font-semibold text-bat-gold cursor-pointer">
                  Activate long-term objective tracking
                </label>
              </div>

              <AnimatePresence>
                {hasGoal && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden space-y-4 pt-2"
                  >
                    <div>
                      <label className="block text-xs font-bold text-bat-gray uppercase tracking-widest mb-1">
                        Objective Name
                      </label>
                      <input
                        type="text"
                        value={goalName}
                        onChange={(e) => setGoalName(e.target.value)}
                        className="w-full px-4 py-2.5 bg-bat-black border border-bat-border text-bat-white focus:outline-none focus:border-bat-gold rounded text-sm transition-colors"
                        placeholder="e.g. Master Gotham's layout or Save ₹10,000"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-bat-gray uppercase tracking-widest mb-1">
                          Category
                        </label>
                        <select
                          value={goalCategory}
                          onChange={(e) => setGoalCategory(e.target.value as any)}
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
                          value={goalTargetDate}
                          onChange={(e) => setGoalTargetDate(e.target.value)}
                          className="w-full px-3 py-2 bg-bat-black border border-bat-border text-bat-white focus:outline-none focus:border-bat-gold rounded text-sm font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-bat-gray uppercase tracking-widest mb-1">
                        Motivation / "Why is this objective critical?"
                      </label>
                      <textarea
                        value={goalMotivation}
                        onChange={(e) => setGoalMotivation(e.target.value)}
                        className="w-full px-4 py-2 bg-bat-black border border-bat-border text-bat-white focus:outline-none focus:border-bat-gold rounded text-sm transition-colors h-20 resize-none"
                        placeholder="e.g. To secure the city and prepare for the future."
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex justify-between pt-4">
                <button
                  onClick={handlePrevStep}
                  className="px-5 py-2.5 border border-bat-border text-bat-gray hover:text-bat-white hover:border-bat-gray transition-colors rounded text-sm font-medium"
                >
                  BACK
                </button>
                <button
                  onClick={handleCompleteOnboarding}
                  disabled={submitting}
                  className="px-6 py-2.5 bg-bat-gold hover:bg-bat-gold-dim text-bat-black font-bebas text-lg tracking-widest transition-colors rounded flex items-center gap-2"
                >
                  <CheckIcon size={20} />
                  {submitting ? 'INITIALIZING PROTOCOLS...' : 'FINALIZE MATRIX'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
