-- 1. Allow admins to update any issue (Status changes)
CREATE POLICY "Admins can update any issue"
ON public.issues FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 2. Allow admins to delete any issue
CREATE POLICY "Admins can delete any issue"
ON public.issues FOR DELETE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 3. Add `is_suspended` flag to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE;

-- 4. Admins can update any profile (promotion/suspension)
CREATE POLICY "Admins can update any profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 5. Create `issue_logs` table for audit trail
CREATE TABLE IF NOT EXISTS public.issue_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  issue_id UUID REFERENCES public.issues(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id),
  actor_name TEXT,
  old_status TEXT,
  new_status TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. RLS for `issue_logs`
ALTER TABLE public.issue_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can insert issue logs"
ON public.issue_logs FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Admins can read all issue logs"
ON public.issue_logs FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
