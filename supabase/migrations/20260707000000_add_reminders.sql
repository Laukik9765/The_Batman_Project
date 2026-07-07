-- Migration to add reminder preferences to user profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS reminder_enabled BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS reminder_time TEXT DEFAULT '20:00' NOT NULL;
