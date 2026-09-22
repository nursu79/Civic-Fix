-- SQL Migration to add Sub-City & Field Dispatch columns to public.issues

ALTER TABLE public.issues 
ADD COLUMN IF NOT EXISTS subcity TEXT DEFAULT 'Bole',
ADD COLUMN IF NOT EXISTS assigned_unit TEXT,
ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMP WITH TIME ZONE;

-- Add index on subcity for fast sub-city filtering in department dashboards
CREATE INDEX IF NOT EXISTS idx_issues_subcity ON public.issues(subcity);
