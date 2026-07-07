// Profile, Data Export, and Account Deletion Page
// Path: src/pages/Profile.tsx

import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { useAuth } from '../modules/auth/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  UserIcon, 
  CheckIcon, 
  WarningIcon, 
  TrashIcon,
  BellIcon
} from '../components/ui/Icons';
import { motion, AnimatePresence } from 'framer-motion';

export const Profile: React.FC = () => {
  const { profile, setProfile, addToast } = useAppStore();
  const { logout } = useAuth();
  
  const [fullName, setFullName] = useState('');
  const [timezone, setTimezone] = useState('UTC');
  const [saving, setSaving] = useState(false);

  // Reminders states
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('20:00');
  const [savingReminders, setSavingReminders] = useState(false);

  // Account deletion states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setTimezone(profile.timezone || 'UTC');
      setReminderEnabled(profile.reminder_enabled || false);
      setReminderTime(profile.reminder_time || '20:00');
    }
  }, [profile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          timezone
        })
        .eq('id', profile.id);

      if (error) throw error;
      
      setProfile({
        ...profile,
        full_name: fullName,
        timezone
      });
      addToast('Vigilante identity record modified.', 'success');
    } catch (e: any) {
      console.error(e);
      addToast(e.message || 'Failed to update credentials record.', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleReminder = async (checked: boolean) => {
    if (checked) {
      if (!('Notification' in window)) {
        addToast('Notifications are not supported by this browser.', 'danger');
        return;
      }
      
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        addToast('Notification permission denied. Please enable it in browser settings.', 'danger');
        setReminderEnabled(false);
        return;
      }
    }
    setReminderEnabled(checked);
  };

  const handleSaveReminders = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setSavingReminders(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          reminder_enabled: reminderEnabled,
          reminder_time: reminderTime
        })
        .eq('id', profile.id);

      if (error) throw error;

      setProfile({
        ...profile,
        reminder_enabled: reminderEnabled,
        reminder_time: reminderTime
      });
      addToast('Tactical reminder protocols updated.', 'success');
    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'Failed to update reminder database record.', 'danger');
    } finally {
      setSavingReminders(false);
    }
  };

  const handleSendTestNotification = () => {
    if (!('Notification' in window)) {
      addToast('Notifications are not supported by this browser.', 'danger');
      return;
    }

    if (Notification.permission !== 'granted') {
      addToast('Please authorize notification permissions first.', 'danger');
      return;
    }

    try {
      new Notification('Bat-Signal: Tactical Alert', {
        body: 'Alfred: "Sir, this is a test of your daily checklist alert system. Complete all daily tasks."',
        icon: '/favicon.svg'
      });
      addToast('Test signal transmitted successfully.', 'success');
    } catch (err) {
      console.error('Notification constructor error:', err);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification('Bat-Signal: Tactical Alert', {
            body: 'Alfred: "Sir, this is a test of your daily checklist alert system. Complete all daily tasks."',
            icon: '/favicon.svg'
          });
          addToast('Test signal transmitted via Service Worker.', 'success');
        }).catch((swErr) => {
          console.error(swErr);
          addToast('Failed to trigger notification.', 'danger');
        });
      } else {
        addToast('Failed to trigger notification.', 'danger');
      }
    }
  };

  // Data Export - GDPR compliant local backup download
  const handleExportData = () => {
    if (!profile) return;
    
    try {
      const state = useAppStore.getState();
      
      // Compile user portfolio data
      const exportDossier = {
        exported_at: new Date().toISOString(),
        profile: state.profile,
        daily_tasks: state.dailyTasks,
        task_completions: state.taskCompletions,
        failure_reasons: state.failureReasons,
        goals: state.goals,
        goal_tasks: state.goalTasks,
        goal_task_completions: state.goalTaskCompletions,
        sleep_logs: state.sleepLogs,
        finance_categories: state.financeCategories,
        finance_transactions: state.financeTransactions,
        weekly_reports: state.weeklyReports
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportDossier, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `batman_dossier_export_${profile.username}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      addToast('Intelligence dossier exported successfully.', 'success');
    } catch (err) {
      console.error(err);
      addToast('Data extraction failed.', 'danger');
    }
  };

  // GDPR Account Deletion - hard database wipe
  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    if (deleteConfirmationText !== 'DELETE PERMANENTLY') {
      addToast('Wipe phrase invalid.', 'danger');
      return;
    }

    try {
      // Call SEC DEFINER database function to safely delete the authenticated user
      const { error } = await supabase.rpc('delete_user_account');
      
      if (error) throw error;

      addToast('Identity purged from records. System shutdown initiated.', 'info');
      // Sign out and clear local state
      logout();
    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'Wipe operation aborted by server.', 'danger');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-mono text-xs">
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Profile Details (Left) */}
        <div className="md:col-span-2 space-y-6">
          <div className="bat-glass p-6 rounded">
            <div className="flex items-center gap-2 text-bat-gold mb-6 border-b border-bat-border pb-3">
              <UserIcon size={24} />
              <h3 className="font-bebas text-2xl tracking-wider">IDENTITY METRICS</h3>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-bat-gray uppercase tracking-widest mb-1">
                    System Username
                  </label>
                  <input
                    type="text"
                    value={profile?.username || ''}
                    className="w-full px-4 py-2.5 bg-bat-black border border-bat-border text-bat-gray rounded text-xs focus:outline-none cursor-not-allowed"
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-bat-gray uppercase tracking-widest mb-1">
                    Secured Email
                  </label>
                  <input
                    type="text"
                    value={profile?.email || ''}
                    className="w-full px-4 py-2.5 bg-bat-black border border-bat-border text-bat-gray rounded text-xs focus:outline-none cursor-not-allowed"
                    disabled
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-bat-gray uppercase tracking-widest mb-1">
                  Operational display Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-bat-black border border-bat-border text-bat-white focus:outline-none focus:border-bat-gold rounded text-xs transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-bat-gray uppercase tracking-widest mb-1">
                  Active Operational Timezone
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3 py-2 bg-bat-black border border-bat-border text-bat-white focus:outline-none focus:border-bat-gold rounded text-xs"
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                  <option value="America/Chicago">America/Chicago (CST)</option>
                  <option value="America/Denver">America/Denver (MST)</option>
                  <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                  <option value="Europe/London">Europe/London</option>
                  <option value="Europe/Paris">Europe/Paris</option>
                  <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                  <option value="Asia/Singapore">Asia/Singapore</option>
                  <option value="Asia/Tokyo">Asia/Tokyo</option>
                  <option value="Australia/Sydney">Australia/Sydney</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="bg-bat-gold hover:bg-bat-gold-dim text-bat-black font-bebas text-lg px-6 py-2.5 tracking-widest transition-colors rounded uppercase"
              >
                {saving ? 'MODIFYING DOSSIER...' : 'SAVE CHANGES'}
              </button>
            </form>
          </div>
        </div>

        {/* Data Options (Right) */}
        <div className="space-y-6">
          
          {/* Tactical Reminder Protocols Card */}
          <div className="bat-glass p-6 rounded border-l-4 border-bat-gold flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-bat-gold mb-3">
                <BellIcon size={20} />
                <h3 className="font-bebas text-xl tracking-wider">TACTICAL REMINDERS</h3>
              </div>
              <p className="text-[10px] text-bat-gray leading-relaxed mb-4 font-mono">
                Alfred: "Sir, configure the daily alert system to verify that all Gotham defense checklist checkpoints are completed."
              </p>
              
              <form onSubmit={handleSaveReminders} className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-bat-white font-bold uppercase tracking-wider font-mono">Enable Reminders</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={reminderEnabled} 
                      onChange={(e) => handleToggleReminder(e.target.checked)} 
                    />
                    <div className="w-9 h-5 bg-bat-black border border-bat-border rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-bat-gray peer-checked:after:bg-bat-gold after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-bat-gold peer-checked:bg-opacity-20 peer-checked:border-bat-gold"></div>
                  </label>
                </div>

                {reminderEnabled && (
                  <div>
                    <label className="block text-[9px] font-bold text-bat-gray uppercase tracking-widest mb-1 font-mono">
                      Daily Alert Time
                    </label>
                    <input
                      type="time"
                      value={reminderTime}
                      onChange={(e) => setReminderTime(e.target.value)}
                      className="w-full px-3 py-1.5 bg-bat-black border border-bat-border text-bat-white focus:outline-none focus:border-bat-gold rounded text-xs transition-colors font-mono"
                      required
                    />
                  </div>
                )}

                <div className="flex gap-2 pt-2 font-mono">
                  <button
                    type="submit"
                    disabled={savingReminders}
                    className="flex-1 py-2 bg-bat-gold hover:bg-bat-gold-dim text-bat-black font-bold rounded transition-colors text-center text-[10px] uppercase font-bold"
                  >
                    {savingReminders ? 'SAVING...' : 'APPLY SETTINGS'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSendTestNotification}
                    className="py-2 px-3 bg-bat-black border border-bat-border hover:border-bat-gold text-bat-gold font-bold rounded transition-colors text-center text-[10px] uppercase font-bold"
                  >
                    TEST SIGNAL
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Data Export Card */}
          <div className="bat-glass p-6 rounded flex flex-col justify-between h-48">
            <div>
              <h3 className="font-bebas text-xl text-bat-gold tracking-wider mb-2">GDPR DECIPHER TOOL</h3>
              <p className="text-[10px] text-bat-gray leading-relaxed mb-4">
                Download a complete raw backup copy of all compiled records, transactions, logs, and objectives.
              </p>
            </div>
            <button
              onClick={handleExportData}
              className="w-full py-2 bg-bat-black border border-bat-border hover:border-bat-gold text-bat-gold font-bold rounded transition-colors text-center uppercase"
            >
              EXPORT INTELLIGENCE DOSSIER
            </button>
          </div>

          {/* Delete Account Card */}
          <div className="bat-glass p-6 rounded border-l-4 border-bat-danger flex flex-col justify-between h-48">
            <div>
              <h3 className="font-bebas text-xl text-bat-danger tracking-wider mb-2">PURGE IDENTITY</h3>
              <p className="text-[10px] text-bat-gray leading-relaxed mb-4">
                Execute account deletion protocol. Irreversibly wipes all credentials, reports, and logs.
              </p>
            </div>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-2 bg-bat-danger bg-opacity-10 border border-bat-danger text-bat-danger hover:bg-opacity-20 font-bold rounded transition-colors text-center uppercase"
            >
              PURGE MAINFRAME RECORD
            </button>
          </div>

        </div>

      </div>

      {/* Wipe Confirmation Modal overlay */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-bat-dark border border-bat-border rounded shadow-[0_0_50px_rgba(0,0,0,0.9)] w-full max-w-md p-6 bat-glow-gold"
            >
              <div className="flex items-center gap-2 text-bat-danger mb-4">
                <WarningIcon size={24} />
                <h3 className="font-bebas text-2xl tracking-wider">EXECUTE PURGE PROTOCOL</h3>
              </div>

              <p className="text-xs text-bat-white leading-relaxed mb-4">
                This operation is <span className="text-bat-danger font-bold uppercase">irreversible</span>. It will wipe all logs and credentials.
              </p>

              <form onSubmit={handleDeleteAccount} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-bat-gray uppercase tracking-widest mb-1">
                    Type "DELETE PERMANENTLY" to authorize
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmationText}
                    onChange={(e) => setDeleteConfirmationText(e.target.value)}
                    className="w-full px-4 py-2.5 bg-bat-black border border-bat-border text-bat-white focus:outline-none focus:border-bat-gold rounded text-xs font-mono uppercase"
                    placeholder="CONFIRM PHRASE"
                    required
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmationText('');
                    }}
                    className="flex-1 py-2 border border-bat-border text-bat-gray hover:text-bat-white hover:border-bat-gray rounded font-bold uppercase"
                  >
                    ABORT
                  </button>
                  <button
                    type="submit"
                    disabled={deleteConfirmationText !== 'DELETE PERMANENTLY'}
                    className="flex-1 py-2 bg-bat-danger hover:bg-opacity-95 text-white disabled:opacity-50 disabled:cursor-not-allowed rounded font-bold uppercase"
                  >
                    PURGE RECORD
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
