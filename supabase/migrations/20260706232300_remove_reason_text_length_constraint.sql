-- Migration to remove the 10-character minimum constraint on failure reasons
ALTER TABLE public.failure_reasons DROP CONSTRAINT IF EXISTS failure_reasons_reason_text_check;
