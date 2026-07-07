import { useAppStore } from '../store/appStore';

let timerId: any = null;

export const startReminderEngine = () => {
  if (timerId) {
    clearInterval(timerId);
  }

  // Run check immediately on init, then periodically
  checkReminders();
  timerId = setInterval(checkReminders, 30000);
};

export const stopReminderEngine = () => {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
};

const checkReminders = () => {
  const store = useAppStore.getState();
  const profile = store.profile;

  // Verify reminders are enabled and we have active profile settings
  if (!profile || !profile.reminder_enabled || !profile.reminder_time) {
    return;
  }

  // Verify permission
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  // Check if we already notified the user today
  const todayStr = new Date().toISOString().split('T')[0];
  const lastSentDate = localStorage.getItem('last_bat_reminder_sent_date');
  if (lastSentDate === todayStr) {
    return;
  }

  // Parse configured reminder time
  const [remHour, remMin] = profile.reminder_time.split(':').map(Number);
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  // Trigger if we are past or exactly at the configured time
  if (currentHour < remHour || (currentHour === remHour && currentMinute < remMin)) {
    return;
  }

  // Check daily tasks completion status for today
  const activeTasks = store.dailyTasks.filter(t => t.is_active);
  if (activeTasks.length === 0) {
    return;
  }

  const completedTodayCount = store.taskCompletions.filter(
    c => c.date === todayStr && c.completed
  ).length;

  const incompleteCount = activeTasks.length - completedTodayCount;

  if (incompleteCount > 0) {
    // Send browser push notification
    try {
      new Notification('Bat-Signal: Daily Checklist Reminder', {
        body: `Alfred: "Sir, you still have ${incompleteCount} incomplete daily checklist checkpoints. Do not neglect your training."`,
        icon: '/favicon.svg',
        tag: 'batman-daily-reminder', // Prevents duplicates
        requireInteraction: true
      });
      localStorage.setItem('last_bat_reminder_sent_date', todayStr);
    } catch (err) {
      console.error('Failed to trigger daily reminder notification:', err);
      // Fallback via service worker if constructor fails in browser environment
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.showNotification('Bat-Signal: Daily Checklist Reminder', {
            body: `Alfred: "Sir, you still have ${incompleteCount} incomplete daily checklist checkpoints. Do not neglect your training."`,
            icon: '/favicon.svg',
            tag: 'batman-daily-reminder',
            requireInteraction: true
          });
          localStorage.setItem('last_bat_reminder_sent_date', todayStr);
        }).catch((swErr) => {
          console.error('Service worker reminder fallback failed:', swErr);
        });
      }
    }
  }
};
