-- Supabase Database Schema Migration for The Batman Project
-- Date: 2026-06-29
-- Author: Antigravity AI

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL CHECK (char_length(username) >= 3),
    full_name TEXT,
    email TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    timezone TEXT DEFAULT 'UTC',
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    last_active_at TIMESTAMPTZ DEFAULT now(),
    is_suspended BOOLEAN DEFAULT false,
    onboarding_done BOOLEAN DEFAULT false,
    terms_accepted BOOLEAN DEFAULT false,
    terms_accepted_at TIMESTAMPTZ
);

-- Enable RLS for Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Daily Tasks Table
CREATE TABLE IF NOT EXISTS public.daily_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('Health', 'Mind', 'Work', 'Personal', 'Custom')),
    est_minutes INTEGER DEFAULT 0 NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for Daily Tasks
ALTER TABLE public.daily_tasks ENABLE ROW LEVEL SECURITY;

-- 3. Task Completions Table
CREATE TABLE IF NOT EXISTS public.task_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    task_id UUID REFERENCES public.daily_tasks(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    completed BOOLEAN DEFAULT false NOT NULL,
    completed_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, task_id, date)
);

-- Enable RLS for Task Completions
ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;

-- 4. Failure Reasons Table
CREATE TABLE IF NOT EXISTS public.failure_reasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('daily_task', 'goal_task', 'sleep')),
    source_id UUID NOT NULL,
    date DATE NOT NULL,
    reason_text TEXT NOT NULL CHECK (char_length(reason_text) >= 10),
    analyzed BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for Failure Reasons
ALTER TABLE public.failure_reasons ENABLE ROW LEVEL SECURITY;

-- 5. Side Quest Entries Table
CREATE TABLE IF NOT EXISTS public.side_quest_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    content TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for Side Quest Entries
ALTER TABLE public.side_quest_entries ENABLE ROW LEVEL SECURITY;

-- 6. Goals Table
CREATE TABLE IF NOT EXISTS public.goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('Fitness', 'Finance', 'Learning', 'Career', 'Personal', 'Other')),
    target_date DATE NOT NULL,
    motivation TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for Goals
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- 7. Goal Tasks Table
CREATE TABLE IF NOT EXISTS public.goal_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID REFERENCES public.goals(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for Goal Tasks
ALTER TABLE public.goal_tasks ENABLE ROW LEVEL SECURITY;

-- 8. Goal Task Completions Table
CREATE TABLE IF NOT EXISTS public.goal_task_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    goal_task_id UUID REFERENCES public.goal_tasks(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    completed BOOLEAN DEFAULT false NOT NULL,
    completed_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, goal_task_id, date)
);

-- Enable RLS for Goal Task Completions
ALTER TABLE public.goal_task_completions ENABLE ROW LEVEL SECURITY;

-- 9. Sleep Logs Table
CREATE TABLE IF NOT EXISTS public.sleep_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    bedtime TIME NOT NULL,
    wake_time TIME NOT NULL,
    duration_hours DECIMAL(4,2) NOT NULL,
    quality_rating INTEGER NOT NULL CHECK (quality_rating >= 1 AND quality_rating <= 5),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, date)
);

-- Enable RLS for Sleep Logs
ALTER TABLE public.sleep_logs ENABLE ROW LEVEL SECURITY;

-- 10. Finance Categories Table
CREATE TABLE IF NOT EXISTS public.finance_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    color TEXT NOT NULL,
    icon_key TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, name, type)
);

-- Enable RLS for Finance Categories
ALTER TABLE public.finance_categories ENABLE ROW LEVEL SECURITY;

-- 11. Finance Transactions Table
CREATE TABLE IF NOT EXISTS public.finance_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    category_id UUID REFERENCES public.finance_categories(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
    transaction_date DATE NOT NULL,
    note TEXT,
    is_recurring BOOLEAN DEFAULT false NOT NULL,
    recurrence_freq TEXT CHECK (recurrence_freq IN ('daily', 'weekly', 'monthly') OR recurrence_freq IS NULL),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for Finance Transactions
ALTER TABLE public.finance_transactions ENABLE ROW LEVEL SECURITY;

-- 12. AI Chat Messages Table
CREATE TABLE IF NOT EXISTS public.ai_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for AI Chat Messages
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;

-- 13. AI Weekly Reports Table
CREATE TABLE IF NOT EXISTS public.ai_weekly_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    week_start DATE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for AI Weekly Reports
ALTER TABLE public.ai_weekly_reports ENABLE ROW LEVEL SECURITY;

-- 14. Admin Rate Limits Table
CREATE TABLE IF NOT EXISTS public.admin_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address TEXT UNIQUE NOT NULL,
    attempt_count INTEGER DEFAULT 0 NOT NULL,
    locked_until TIMESTAMPTZ,
    last_attempt TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for Admin Rate Limits
ALTER TABLE public.admin_rate_limits ENABLE ROW LEVEL SECURITY;

---------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Default: DENY ALL (enabled by ALTER TABLE ... ENABLE RLS without policy, but we write explicit policies for user ownership)
---------------------------------------------------------

-- Profiles Policies
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Daily Tasks Policies
DROP POLICY IF EXISTS "Users can manage own daily tasks" ON public.daily_tasks;
CREATE POLICY "Users can manage own daily tasks" ON public.daily_tasks
    FOR ALL USING (auth.uid() = user_id);

-- Task Completions Policies
DROP POLICY IF EXISTS "Users can manage own task completions" ON public.task_completions;
CREATE POLICY "Users can manage own task completions" ON public.task_completions
    FOR ALL USING (auth.uid() = user_id);

-- Failure Reasons Policies
DROP POLICY IF EXISTS "Users can manage own failure reasons" ON public.failure_reasons;
CREATE POLICY "Users can manage own failure reasons" ON public.failure_reasons
    FOR ALL USING (auth.uid() = user_id);

-- Side Quest Entries Policies
DROP POLICY IF EXISTS "Users can manage own side quest entries" ON public.side_quest_entries;
CREATE POLICY "Users can manage own side quest entries" ON public.side_quest_entries
    FOR ALL USING (auth.uid() = user_id);

-- Goals Policies
DROP POLICY IF EXISTS "Users can manage own goals" ON public.goals;
CREATE POLICY "Users can manage own goals" ON public.goals
    FOR ALL USING (auth.uid() = user_id);

-- Goal Tasks Policies
DROP POLICY IF EXISTS "Users can manage own goal tasks" ON public.goal_tasks;
CREATE POLICY "Users can manage own goal tasks" ON public.goal_tasks
    FOR ALL USING (auth.uid() = user_id);

-- Goal Task Completions Policies
DROP POLICY IF EXISTS "Users can manage own goal task completions" ON public.goal_task_completions;
CREATE POLICY "Users can manage own goal task completions" ON public.goal_task_completions
    FOR ALL USING (auth.uid() = user_id);

-- Sleep Logs Policies
DROP POLICY IF EXISTS "Users can manage own sleep logs" ON public.sleep_logs;
CREATE POLICY "Users can manage own sleep logs" ON public.sleep_logs
    FOR ALL USING (auth.uid() = user_id);

-- Finance Categories Policies
DROP POLICY IF EXISTS "Users can manage own finance categories" ON public.finance_categories;
CREATE POLICY "Users can manage own finance categories" ON public.finance_categories
    FOR ALL USING (auth.uid() = user_id);

-- Finance Transactions Policies
DROP POLICY IF EXISTS "Users can manage own finance transactions" ON public.finance_transactions;
CREATE POLICY "Users can manage own finance transactions" ON public.finance_transactions
    FOR ALL USING (auth.uid() = user_id);

-- AI Chat Messages Policies
DROP POLICY IF EXISTS "Users can manage own AI chat messages" ON public.ai_chat_messages;
CREATE POLICY "Users can manage own AI chat messages" ON public.ai_chat_messages
    FOR ALL USING (auth.uid() = user_id);

-- AI Weekly Reports Policies
DROP POLICY IF EXISTS "Users can read own AI weekly reports" ON public.ai_weekly_reports;
CREATE POLICY "Users can read own AI weekly reports" ON public.ai_weekly_reports
    FOR SELECT USING (auth.uid() = user_id);

-- Admin Rate Limits Policies
-- By default, deny all to ordinary users. Only accessible via service role bypass or Edge Functions.
DROP POLICY IF EXISTS "Deny all to regular users" ON public.admin_rate_limits;
CREATE POLICY "Deny all to regular users" ON public.admin_rate_limits
    FOR ALL TO public USING (false);

---------------------------------------------------------
-- AUTO PROFILE TRIGGER ON SIGNUP
---------------------------------------------------------

-- Function to allow self account deletion
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void AS $$
BEGIN
    DELETE FROM auth.users WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (
        id, 
        username, 
        full_name, 
        email, 
        role, 
        terms_accepted, 
        terms_accepted_at
    )
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'username', 'bat_' || substring(new.id::text from 1 for 8)),
        COALESCE(new.raw_user_meta_data->>'full_name', 'Gotham Defender'),
        new.email,
        COALESCE(new.raw_user_meta_data->>'role', 'user'),
        COALESCE((new.raw_user_meta_data->>'terms_accepted')::boolean, false),
        CASE WHEN (new.raw_user_meta_data->>'terms_accepted')::boolean = true THEN now() ELSE null END
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to execute on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

---------------------------------------------------------
-- INDEX OPTIMIZATIONS
---------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_daily_tasks_user_id ON public.daily_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_task_completions_user_date ON public.task_completions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_failure_reasons_user_id ON public.failure_reasons(user_id);
CREATE INDEX IF NOT EXISTS idx_side_quest_entries_user_date ON public.side_quest_entries(user_id, date);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON public.goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_tasks_goal_id ON public.goal_tasks(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_task_completions_user_date ON public.goal_task_completions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_sleep_logs_user_date ON public.sleep_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_finance_categories_user_id ON public.finance_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_user_date ON public.finance_transactions(user_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_user_created ON public.ai_chat_messages(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_weekly_reports_user_id ON public.ai_weekly_reports(user_id);
