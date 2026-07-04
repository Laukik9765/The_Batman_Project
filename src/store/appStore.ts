// Zustand App Store for State Management
// Path: src/store/appStore.ts

import { create } from 'zustand';
import { supabase } from '../lib/supabase';

// TypeScript interfaces matching our DB schema
export interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  email: string;
  role: 'user' | 'admin';
  timezone: string;
  is_suspended: boolean;
  onboarding_done: boolean;
  terms_accepted: boolean;
  terms_accepted_at: string | null;
}

export interface DailyTask {
  id: string;
  user_id: string;
  name: string;
  category: 'Health' | 'Mind' | 'Work' | 'Personal' | 'Custom';
  est_minutes: number;
  is_active: boolean;
  created_at: string;
}

export interface TaskCompletion {
  id: string;
  user_id: string;
  task_id: string;
  date: string;
  completed: boolean;
  completed_at: string;
}

export interface FailureReason {
  id: string;
  user_id: string;
  source_type: 'daily_task' | 'goal_task' | 'sleep';
  source_id: string;
  date: string;
  reason_text: string;
  analyzed: boolean;
  created_at: string;
}

export interface SideQuestEntry {
  id: string;
  user_id: string;
  date: string;
  content: string;
  tags: string[];
  created_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  name: string;
  category: 'Fitness' | 'Finance' | 'Learning' | 'Career' | 'Personal' | 'Other';
  target_date: string;
  motivation: string;
  status: 'active' | 'completed' | 'abandoned';
  created_at: string;
  // UI helper
  progress?: number;
}

export interface GoalTask {
  id: string;
  goal_id: string;
  user_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface GoalTaskCompletion {
  id: string;
  user_id: string;
  goal_task_id: string;
  date: string;
  completed: boolean;
  completed_at: string;
}

export interface SleepLog {
  id: string;
  user_id: string;
  date: string;
  bedtime: string;
  wake_time: string;
  duration_hours: number;
  quality_rating: number;
  notes: string | null;
  created_at: string;
}

export interface FinanceCategory {
  id: string;
  user_id: string;
  name: string;
  type: 'income' | 'expense';
  color: string;
  icon_key: string;
}

export interface FinanceTransaction {
  id: string;
  user_id: string;
  category_id: string;
  amount: number;
  transaction_date: string;
  note: string | null;
  is_recurring: boolean;
  recurrence_freq: 'daily' | 'weekly' | 'monthly' | null;
  created_at: string;
  finance_categories?: FinanceCategory;
}

export interface AIChatMessage {
  id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface AIWeeklyReport {
  id: string;
  user_id: string;
  week_start: string;
  content: string;
  created_at: string;
}

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'danger' | 'info';
}

interface AppState {
  profile: Profile | null;
  dailyTasks: DailyTask[];
  taskCompletions: TaskCompletion[];
  failureReasons: FailureReason[];
  sideQuests: SideQuestEntry[];
  goals: Goal[];
  goalTasks: GoalTask[];
  goalTaskCompletions: GoalTaskCompletion[];
  sleepLogs: SleepLog[];
  financeCategories: FinanceCategory[];
  financeTransactions: FinanceTransaction[];
  chatMessages: AIChatMessage[];
  weeklyReports: AIWeeklyReport[];
  
  toasts: ToastMessage[];
  loading: boolean;
  
  // Actions
  setProfile: (profile: Profile | null) => void;
  addToast: (message: string, type: 'success' | 'danger' | 'info') => void;
  removeToast: (id: string) => void;
  
  fetchUserData: (userId: string) => Promise<void>;
  clearStore: () => void;

  // Daily Tasks Actions
  addDailyTask: (name: string, category: DailyTask['category'], est_minutes: number) => Promise<void>;
  updateDailyTask: (id: string, updates: Partial<DailyTask>) => Promise<void>;
  deleteDailyTask: (id: string) => Promise<void>;
  toggleTaskCompletion: (taskId: string, date: string, completed: boolean) => Promise<void>;

  // Failure Reasons Actions
  submitFailureReason: (source_type: FailureReason['source_type'], source_id: string, date: string, reason_text: string) => Promise<void>;

  // Side Quests Actions
  addSideQuest: (content: string, tags: string[], date: string) => Promise<void>;
  deleteSideQuest: (id: string) => Promise<void>;

  // Goals Actions
  addGoal: (name: string, category: Goal['category'], target_date: string, motivation: string) => Promise<void>;
  updateGoal: (id: string, updates: Partial<Goal>) => Promise<void>;
  addGoalTask: (goalId: string, name: string) => Promise<void>;
  toggleGoalTaskCompletion: (goalTaskId: string, date: string, completed: boolean) => Promise<void>;

  // Sleep Logging Actions
  logSleep: (date: string, bedtime: string, wake_time: string, duration_hours: number, quality_rating: number, notes: string) => Promise<void>;

  // Finance Actions
  addFinanceCategory: (name: string, type: 'income' | 'expense', color: string, icon_key: string) => Promise<void>;
  addFinanceTransaction: (amount: number, category_id: string, date: string, note: string, is_recurring: boolean, freq: FinanceTransaction['recurrence_freq']) => Promise<void>;
  deleteFinanceTransaction: (id: string) => Promise<void>;

  // AI Chat Actions
  addChatMessage: (role: 'user' | 'assistant', content: string) => AIChatMessage;
}

export const useAppStore = create<AppState>((set, get) => ({
  profile: null,
  dailyTasks: [],
  taskCompletions: [],
  failureReasons: [],
  sideQuests: [],
  goals: [],
  goalTasks: [],
  goalTaskCompletions: [],
  sleepLogs: [],
  financeCategories: [],
  financeTransactions: [],
  chatMessages: [],
  weeklyReports: [],
  toasts: [],
  loading: false,

  setProfile: (profile) => set({ profile }),

  addToast: (message, type) => {
    const id = Math.random().toString(36).substring(7);
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    setTimeout(() => get().removeToast(id), 4000);
  },

  removeToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },

  clearStore: () => {
    set({
      profile: null,
      dailyTasks: [],
      taskCompletions: [],
      failureReasons: [],
      sideQuests: [],
      goals: [],
      goalTasks: [],
      goalTaskCompletions: [],
      sleepLogs: [],
      financeCategories: [],
      financeTransactions: [],
      chatMessages: [],
      weeklyReports: [],
      toasts: [],
    });
  },

  fetchUserData: async (userId) => {
    set({ loading: true });
    try {
      // 1. Fetch Profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (profile) {
        set({ profile });
        
        // Parallel retrieval of related metrics
        const [
          tasksRes, completionsRes, failuresRes, sideQuestsRes, 
          goalsRes, goalTasksRes, goalTaskCompletionsRes,
          sleepRes, financeCatsRes, financeTransRes, chatRes, reportsRes
        ] = await Promise.all([
          supabase.from('daily_tasks').select('*').eq('user_id', userId),
          supabase.from('task_completions').select('*').eq('user_id', userId),
          supabase.from('failure_reasons').select('*').eq('user_id', userId),
          supabase.from('side_quest_entries').select('*').eq('user_id', userId).order('date', { ascending: false }),
          supabase.from('goals').select('*').eq('user_id', userId),
          supabase.from('goal_tasks').select('*').eq('user_id', userId),
          supabase.from('goal_task_completions').select('*').eq('user_id', userId),
          supabase.from('sleep_logs').select('*').eq('user_id', userId).order('date', { ascending: false }),
          supabase.from('finance_categories').select('*').eq('user_id', userId),
          supabase.from('finance_transactions').select(`
            *,
            finance_categories (
              name,
              type,
              color,
              icon_key
            )
          `).eq('user_id', userId).order('transaction_date', { ascending: false }),
          supabase.from('ai_chat_messages').select('*').eq('user_id', userId).order('created_at', { ascending: true }),
          supabase.from('ai_weekly_reports').select('*').eq('user_id', userId).order('week_start', { ascending: false }),
        ]);

        set({
          dailyTasks: tasksRes.data || [],
          taskCompletions: completionsRes.data || [],
          failureReasons: failuresRes.data || [],
          sideQuests: sideQuestsRes.data || [],
          goals: goalsRes.data || [],
          goalTasks: goalTasksRes.data || [],
          goalTaskCompletions: goalTaskCompletionsRes.data || [],
          sleepLogs: sleepRes.data || [],
          financeCategories: financeCatsRes.data || [],
          financeTransactions: financeTransRes.data || [],
          chatMessages: chatRes.data || [],
          weeklyReports: reportsRes.data || [],
        });
      }
    } catch (err: any) {
      console.error('Error fetching user data:', err);
      get().addToast('Error syncing user data with the mainframe.', 'danger');
    } finally {
      set({ loading: false });
    }
  },

  // Daily Tasks
  addDailyTask: async (name, category, est_minutes) => {
    const profile = get().profile;
    if (!profile) return;
    try {
      const { data, error } = await supabase
        .from('daily_tasks')
        .insert([{ user_id: profile.id, name, category, est_minutes }])
        .select()
        .single();

      if (error) throw error;
      set((state) => ({ dailyTasks: [...state.dailyTasks, data] }));
      get().addToast('Habit added to your checklist.', 'success');
    } catch (error) {
      console.error(error);
      get().addToast('Failed to write task.', 'danger');
    }
  },

  updateDailyTask: async (id, updates) => {
    try {
      const { error } = await supabase
        .from('daily_tasks')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      set((state) => ({
        dailyTasks: state.dailyTasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
      }));
      get().addToast('Checklist updated.', 'success');
    } catch (error) {
      console.error(error);
      get().addToast('Failed to update task.', 'danger');
    }
  },

  deleteDailyTask: async (id) => {
    try {
      const { error } = await supabase.from('daily_tasks').delete().eq('id', id);
      if (error) throw error;
      set((state) => ({ dailyTasks: state.dailyTasks.filter((t) => t.id !== id) }));
      get().addToast('Habit purged.', 'info');
    } catch (error) {
      console.error(error);
      get().addToast('Failed to delete task.', 'danger');
    }
  },

  toggleTaskCompletion: async (taskId, date, completed) => {
    const profile = get().profile;
    if (!profile) return;
    try {
      const existing = get().taskCompletions.find((c) => c.task_id === taskId && c.date === date);

      if (existing) {
        if (completed === false) {
          const { error } = await supabase.from('task_completions').delete().eq('id', existing.id);
          if (error) throw error;
          set((state) => ({
            taskCompletions: state.taskCompletions.filter((c) => c.id !== existing.id),
          }));
        } else {
          const { data, error } = await supabase
            .from('task_completions')
            .update({ completed, completed_at: new Date().toISOString() })
            .eq('id', existing.id)
            .select()
            .single();
          if (error) throw error;
          set((state) => ({
            taskCompletions: state.taskCompletions.map((c) => (c.id === existing.id ? data : c)),
          }));
        }
      } else if (completed) {
        const { data, error } = await supabase
          .from('task_completions')
          .insert([{ user_id: profile.id, task_id: taskId, date, completed, completed_at: new Date().toISOString() }])
          .select()
          .single();
        if (error) throw error;
        set((state) => ({ taskCompletions: [...state.taskCompletions, data] }));
      }
    } catch (error) {
      console.error(error);
      get().addToast('Signal error. Failed to toggle completion.', 'danger');
    }
  },

  // Failure Reasons
  submitFailureReason: async (source_type, source_id, date, reason_text) => {
    const profile = get().profile;
    if (!profile) return;
    try {
      const { data, error } = await supabase
        .from('failure_reasons')
        .insert([{ user_id: profile.id, source_type, source_id, date, reason_text }])
        .select()
        .single();
      if (error) throw error;
      set((state) => ({ failureReasons: [...state.failureReasons, data] }));
      get().addToast('Incident report logged.', 'success');
    } catch (error) {
      console.error(error);
      get().addToast('Failed to file incident report.', 'danger');
    }
  },

  // Side Quests
  addSideQuest: async (content, tags, date) => {
    const profile = get().profile;
    if (!profile) return;
    try {
      const { data, error } = await supabase
        .from('side_quest_entries')
        .insert([{ user_id: profile.id, content, tags, date }])
        .select()
        .single();
      if (error) throw error;
      set((state) => ({ sideQuests: [data, ...state.sideQuests] }));
      get().addToast('Journal record encrypted.', 'success');
    } catch (error) {
      console.error(error);
      get().addToast('Failed to lock log.', 'danger');
    }
  },

  deleteSideQuest: async (id) => {
    try {
      const { error } = await supabase.from('side_quest_entries').delete().eq('id', id);
      if (error) throw error;
      set((state) => ({ sideQuests: state.sideQuests.filter((sq) => sq.id !== id) }));
      get().addToast('Journal entry shredded.', 'info');
    } catch (error) {
      console.error(error);
      get().addToast('Failed to shred entry.', 'danger');
    }
  },

  // Goals
  addGoal: async (name, category, target_date, motivation) => {
    const profile = get().profile;
    if (!profile) return;
    try {
      const { data, error } = await supabase
        .from('goals')
        .insert([{ user_id: profile.id, name, category, target_date, motivation }])
        .select()
        .single();
      if (error) throw error;
      set((state) => ({ goals: [...state.goals, data] }));
      get().addToast('Objective established.', 'success');
    } catch (error) {
      console.error(error);
      get().addToast('Failed to initialize objective.', 'danger');
    }
  },

  updateGoal: async (id, updates) => {
    try {
      const { error } = await supabase
        .from('goals')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
      set((state) => ({
        goals: state.goals.map((g) => (g.id === id ? { ...g, ...updates } : g)),
      }));
      get().addToast('Objective parameters modified.', 'success');
    } catch (error) {
      console.error(error);
      get().addToast('Failed to modify parameters.', 'danger');
    }
  },

  addGoalTask: async (goalId, name) => {
    const profile = get().profile;
    if (!profile) return;
    try {
      const { data, error } = await supabase
        .from('goal_tasks')
        .insert([{ goal_id: goalId, user_id: profile.id, name }])
        .select()
        .single();
      if (error) throw error;
      set((state) => ({ goalTasks: [...state.goalTasks, data] }));
      get().addToast('Sub-task linked to objective.', 'success');
    } catch (error) {
      console.error(error);
      get().addToast('Failed to link sub-task.', 'danger');
    }
  },

  toggleGoalTaskCompletion: async (goalTaskId, date, completed) => {
    const profile = get().profile;
    if (!profile) return;
    try {
      const existing = get().goalTaskCompletions.find((c) => c.goal_task_id === goalTaskId && c.date === date);

      if (existing) {
        if (completed === false) {
          const { error } = await supabase.from('goal_task_completions').delete().eq('id', existing.id);
          if (error) throw error;
          set((state) => ({
            goalTaskCompletions: state.goalTaskCompletions.filter((c) => c.id !== existing.id),
          }));
        } else {
          const { data, error } = await supabase
            .from('goal_task_completions')
            .update({ completed, completed_at: new Date().toISOString() })
            .eq('id', existing.id)
            .select()
            .single();
          if (error) throw error;
          set((state) => ({
            goalTaskCompletions: state.goalTaskCompletions.map((c) => (c.id === existing.id ? data : c)),
          }));
        }
      } else if (completed) {
        const { data, error } = await supabase
          .from('goal_task_completions')
          .insert([{ user_id: profile.id, goal_task_id: goalTaskId, date, completed, completed_at: new Date().toISOString() }])
          .select()
          .single();
        if (error) throw error;
        set((state) => ({ goalTaskCompletions: [...state.goalTaskCompletions, data] }));
      }
    } catch (error) {
      console.error(error);
      get().addToast('Failed to toggle objective checkpoint.', 'danger');
    }
  },

  // Sleep Logs
  logSleep: async (date, bedtime, wake_time, duration_hours, quality_rating, notes) => {
    const profile = get().profile;
    if (!profile) return;
    try {
      const existing = get().sleepLogs.find((s) => s.date === date);
      const payload = {
        user_id: profile.id,
        date,
        bedtime,
        wake_time,
        duration_hours,
        quality_rating,
        notes: notes || null,
      };

      if (existing) {
        const { data, error } = await supabase
          .from('sleep_logs')
          .update(payload)
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        set((state) => ({
          sleepLogs: state.sleepLogs.map((s) => (s.id === existing.id ? data : s)),
        }));
        get().addToast('Sleep cycle updated.', 'success');
      } else {
        const { data, error } = await supabase
          .from('sleep_logs')
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        set((state) => ({ sleepLogs: [data, ...state.sleepLogs] }));
        get().addToast('Sleep cycle recorded.', 'success');
      }
    } catch (error) {
      console.error(error);
      get().addToast('Failed to encrypt sleep telemetry.', 'danger');
    }
  },

  // Finance Categories
  addFinanceCategory: async (name, type, color, icon_key) => {
    const profile = get().profile;
    if (!profile) return;
    try {
      const { data, error } = await supabase
        .from('finance_categories')
        .insert([{ user_id: profile.id, name, type, color, icon_key }])
        .select()
        .single();
      if (error) throw error;
      set((state) => ({ financeCategories: [...state.financeCategories, data] }));
      get().addToast('Ledger category created.', 'success');
    } catch (error) {
      console.error(error);
      get().addToast('Category creation aborted.', 'danger');
    }
  },

  // Finance Transactions
  addFinanceTransaction: async (amount, category_id, date, note, is_recurring, freq) => {
    const profile = get().profile;
    if (!profile) return;
    try {
      const { data, error } = await supabase
        .from('finance_transactions')
        .insert([{
          user_id: profile.id,
          category_id,
          amount,
          transaction_date: date,
          note: note || null,
          is_recurring,
          recurrence_freq: is_recurring ? freq : null
        }])
        .select(`
          *,
          finance_categories (
            name,
            type,
            color,
            icon_key
          )
        `)
        .single();

      if (error) throw error;
      set((state) => ({ financeTransactions: [data, ...state.financeTransactions] }));
      get().addToast('Transaction written to ledger.', 'success');
    } catch (error) {
      console.error(error);
      get().addToast('Ledger write aborted.', 'danger');
    }
  },

  deleteFinanceTransaction: async (id) => {
    try {
      const { error } = await supabase.from('finance_transactions').delete().eq('id', id);
      if (error) throw error;
      set((state) => ({ financeTransactions: state.financeTransactions.filter((f) => f.id !== id) }));
      get().addToast('Transaction purged from history.', 'info');
    } catch (error) {
      console.error(error);
      get().addToast('Purge operation aborted.', 'danger');
    }
  },

  // AI Chat
  addChatMessage: (role, content) => {
    const newMessage: AIChatMessage = {
      id: Math.random().toString(36).substring(7),
      user_id: get().profile?.id || '',
      role,
      content,
      created_at: new Date().toISOString(),
    };
    set((state) => ({ chatMessages: [...state.chatMessages, newMessage] }));
    return newMessage;
  },
}));
