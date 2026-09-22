-- ============================================================
-- CIVICFIX: Automatic Priority Score Recalculation
-- Run this in Supabase SQL Editor
-- 
-- Currently recalculate_all_priorities() is defined but never
-- called. This adds a trigger so priority is kept fresh
-- automatically whenever an upvote is added or removed.
-- ============================================================

-- Trigger function: recalculate priority for a single issue
-- Called after every upvote INSERT or DELETE
CREATE OR REPLACE FUNCTION update_issue_priority()
RETURNS TRIGGER AS $$
DECLARE
  target_id UUID;
BEGIN
  -- Determine which issue was affected
  target_id := COALESCE(NEW.issue_id, OLD.issue_id);

  UPDATE issues
  SET priority_score = (
    upvote_count * (
      CASE category
        WHEN 'safety'     THEN 3.0
        WHEN 'water'      THEN 2.5
        WHEN 'roads'      THEN 2.0
        WHEN 'sanitation' THEN 1.8
        WHEN 'lighting'   THEN 1.5
        WHEN 'parks'      THEN 1.0
        ELSE 1.0
      END
    ) / GREATEST(SQRT(EXTRACT(EPOCH FROM (now() - created_at)) / 3600), 1)
  )
  WHERE id = target_id
    AND status IN ('open', 'in_progress');

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to upvotes table
DROP TRIGGER IF EXISTS on_upvote_priority_update ON upvotes;
CREATE TRIGGER on_upvote_priority_update
  AFTER INSERT OR DELETE ON upvotes
  FOR EACH ROW EXECUTE FUNCTION update_issue_priority();

-- One-time backfill: fix all existing issues with score = 0
DO $$
BEGIN
  PERFORM recalculate_all_priorities();
  RAISE NOTICE '✅ Priority scores recalculated for all open/in_progress issues';
END $$;
