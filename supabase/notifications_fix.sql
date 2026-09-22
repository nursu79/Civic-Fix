-- SQL Migration to fix notifications table constraints & RLS policies in Supabase

-- 1. Drop existing type check constraint if present and expand allowed types
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('status_change', 'upvote', 'comment', 'follow', 'system', 'escalation', 'escalation_response'));

-- 2. Allow authenticated users to insert notifications (enables cross-user notifications for escalations & admin responses)
DROP POLICY IF EXISTS "Allow authenticated users to insert notifications" ON public.notifications;
CREATE POLICY "Allow authenticated users to insert notifications" 
ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);

-- 3. Allow authenticated users to view their own notifications
DROP POLICY IF EXISTS "Allow users to select their notifications" ON public.notifications;
CREATE POLICY "Allow users to select their notifications" 
ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 4. Allow authenticated users to update (e.g. mark as read) their own notifications
DROP POLICY IF EXISTS "Allow users to update their notifications" ON public.notifications;
CREATE POLICY "Allow users to update their notifications" 
ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
