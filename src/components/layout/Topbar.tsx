// Header with Notification Bell and Hamburger toggle
// Path: src/components/layout/Topbar.tsx

import React, { useState, useEffect } from 'react';
import { useAppStore, Goal } from '../../store/appStore';
import { BellIcon, XIcon } from '../ui/Icons';
import { motion, AnimatePresence } from 'framer-motion';

interface TopbarProps {
  pageTitle: string;
  onMenuToggle: () => void;
  onNavigate: (path: string) => void;
}

interface InAppNotification {
  id: string;
  title: string;
  message: string;
  type: 'report' | 'deadline';
  linkPath: string;
}

export const Topbar: React.FC<TopbarProps> = ({ 
  pageTitle, 
  onMenuToggle, 
  onNavigate 
}) => {
  const { weeklyReports, goals, dailyTasks, taskCompletions, profile } = useAppStore();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // Generate in-app notifications dynamically from state
  useEffect(() => {
    const list: InAppNotification[] = [];

    // 1. Weekly Report ready (if there are reports)
    if (weeklyReports.length > 0) {
      const latestReport = weeklyReports[0];
      list.push({
        id: `report-${latestReport.id}`,
        title: 'Weekly Report Compiled',
        message: `Alfred's analysis for week starting ${latestReport.week_start} is ready.`,
        type: 'report',
        linkPath: '/ai-mentor'
      });
    }

    // 2. Goal deadlines approaching (active goals with target date in <= 3 days)
    const now = new Date();
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(now.getDate() + 3);

    goals.forEach((goal) => {
      if (goal.status === 'active' && goal.target_date) {
        const target = new Date(goal.target_date);
        const timeDiff = target.getTime() - now.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

        if (daysDiff >= 0 && daysDiff <= 3) {
          list.push({
            id: `goal-deadline-${goal.id}`,
            title: 'Goal Deadline Approaching',
            message: `"${goal.name}" is due in ${daysDiff} days. Keep up the great work to finish on time.`,
            type: 'deadline',
            linkPath: '/goals'
          });
        }
      }
    });

    // 3. Daily Checklist Incomplete Reminder
    const reminderTimeStr = profile?.reminder_time || '20:00';
    const [remHour, remMin] = reminderTimeStr.split(':').map(Number);
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // Show in-app warning if past/at reminder time
    const timeReached = currentHour > remHour || (currentHour === remHour && currentMinute >= remMin);

    if (timeReached) {
      const activeTasks = dailyTasks.filter(t => t.is_active);
      if (activeTasks.length > 0) {
        const todayStr = now.toISOString().split('T')[0];
        const completedTodayCount = taskCompletions.filter(
          c => c.date === todayStr && c.completed
        ).length;
        const incompleteCount = activeTasks.length - completedTodayCount;

        if (incompleteCount > 0) {
          list.push({
            id: 'daily-reminder-tasks',
            title: 'Reminder: Incomplete Tasks',
            message: `Alfred: "Sir, you still have ${incompleteCount} incomplete daily habits for today."`,
            type: 'deadline',
            linkPath: '/daily-tasks'
          });
        }
      }
    }

    setNotifications(list);
  }, [weeklyReports, goals, dailyTasks, taskCompletions, profile]);

  const handleNotificationClick = (notif: InAppNotification) => {
    onNavigate(notif.linkPath);
    setShowDropdown(false);
  };

  const removeNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <header className="h-16 bg-bat-dark border-b border-bat-border flex items-center justify-between px-6 sticky top-0 z-30">
      
      {/* Mobile Toggle & Page Title */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuToggle}
          className="md:hidden text-bat-gray hover:text-bat-white focus:outline-none"
          aria-label="Toggle menu"
        >
          {/* Hamburger SVG icon */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        <h2 className="font-bebas text-lg sm:text-2xl text-bat-white tracking-widest uppercase truncate max-w-[150px] xs:max-w-[250px] sm:max-w-none">
          {pageTitle}
        </h2>
      </div>

      {/* Notifications indicator */}
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="p-2 text-bat-gray hover:text-bat-gold transition-colors relative focus:outline-none"
          aria-label="View notifications"
        >
          <BellIcon size={22} />
          {notifications.length > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-bat-gold rounded-full shadow-[0_0_8px_rgba(245,197,24,0.7)]" />
          )}
        </button>

        {/* Notifications Dropdown */}
        <AnimatePresence>
          {showDropdown && (
            <>
              {/* Backscreen close layer */}
              <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
              
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 mt-2 w-80 bg-bat-dark border border-bat-border rounded shadow-[0_4px_25px_rgba(0,0,0,0.8)] z-20 overflow-hidden bat-glow-gold"
              >
                <div className="px-4 py-3 bg-bat-black border-b border-bat-border flex justify-between items-center">
                  <span className="font-bebas text-lg tracking-wider text-bat-gold">NOTIFICATIONS</span>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-bat-surface text-bat-white">
                    {notifications.length} NEW
                  </span>
                </div>

                <div className="max-h-64 overflow-y-auto no-scrollbar divide-y divide-bat-border">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-bat-gray font-mono">
                      No new notifications.
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className="p-4 hover:bg-bat-surface transition-colors cursor-pointer flex justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className={`text-xs font-bold font-bebas tracking-wide ${
                            notif.type === 'report' ? 'text-bat-info' : 'text-bat-gold'
                          }`}>
                            {notif.title}
                          </div>
                          <div className="text-xs text-bat-white leading-normal">
                            {notif.message}
                          </div>
                        </div>
                        <button
                          onClick={(e) => removeNotification(notif.id, e)}
                          className="text-bat-gray hover:text-bat-white self-start transition-colors"
                          aria-label="Clear notification"
                        >
                          <XIcon size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

    </header>
  );
};
