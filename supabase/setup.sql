-- ============================================
-- CIVICFIX COMPLETE DATABASE SETUP
-- Copy and paste this ENTIRE file into Supabase SQL Editor
-- ============================================

-- Enable PostGIS for geographic queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================
-- PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'citizen' CHECK (role IN ('citizen', 'admin')),
  language TEXT DEFAULT 'en' CHECK (language IN ('en', 'am')),
  notify_sms BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- ISSUES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('roads', 'water', 'sanitation', 'lighting', 'safety', 'parks')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority_score FLOAT DEFAULT 0,
  lat FLOAT,
  lng FLOAT,
  location GEOGRAPHY(POINT, 4326) GENERATED ALWAYS AS (
    CASE WHEN lat IS NOT NULL AND lng IS NOT NULL 
    THEN ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    ELSE NULL END
  ) STORED,
  address TEXT,
  images TEXT[] DEFAULT '{}',
  reporter_id UUID REFERENCES profiles NOT NULL,
  assigned_to UUID REFERENCES profiles,
  upvote_count INT DEFAULT 0,
  comment_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_issues_location ON issues USING GIST (location);
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues (status);
CREATE INDEX IF NOT EXISTS idx_issues_priority ON issues (priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_issues_category ON issues (category);
CREATE INDEX IF NOT EXISTS idx_issues_reporter ON issues (reporter_id);

-- ============================================
-- UPVOTES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS upvotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID REFERENCES issues ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(issue_id, user_id)
);

-- Trigger to update upvote count
CREATE OR REPLACE FUNCTION update_upvote_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE issues SET upvote_count = upvote_count + 1 WHERE id = NEW.issue_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE issues SET upvote_count = upvote_count - 1 WHERE id = OLD.issue_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_upvote_change ON upvotes;
CREATE TRIGGER on_upvote_change
  AFTER INSERT OR DELETE ON upvotes
  FOR EACH ROW EXECUTE FUNCTION update_upvote_count();

-- ============================================
-- COMMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID REFERENCES issues ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  is_official BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comments_issue ON comments (issue_id);

-- Trigger to update comment count
CREATE OR REPLACE FUNCTION update_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE issues SET comment_count = comment_count + 1 WHERE id = NEW.issue_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE issues SET comment_count = comment_count - 1 WHERE id = OLD.issue_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_comment_change ON comments;
CREATE TRIGGER on_comment_change
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_comment_count();

-- ============================================
-- STATUS HISTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID REFERENCES issues ON DELETE CASCADE NOT NULL,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES profiles NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_status_history_issue ON status_history (issue_id);

-- ============================================
-- PRIORITY ENGINE FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION recalculate_all_priorities()
RETURNS void AS $$
BEGIN
  UPDATE issues SET priority_score = (
    upvote_count * (
      CASE category
        WHEN 'safety' THEN 3.0
        WHEN 'water' THEN 2.5
        WHEN 'roads' THEN 2.0
        WHEN 'sanitation' THEN 1.8
        WHEN 'lighting' THEN 1.5
        WHEN 'parks' THEN 1.0
        ELSE 1.0
      END
    ) / GREATEST(SQRT(EXTRACT(EPOCH FROM (now() - created_at))/3600), 1)
  )
  WHERE status IN ('open', 'in_progress');
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- DUPLICATE DETECTION FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION find_nearby_duplicates(
  p_lat FLOAT, 
  p_lng FLOAT, 
  p_category TEXT
) RETURNS SETOF issues AS $$
  SELECT * FROM issues
  WHERE category = p_category
    AND status IN ('open', 'in_progress')
    AND ST_DWithin(
      location,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      50
    )
  ORDER BY upvote_count DESC
  LIMIT 5;
$$ LANGUAGE sql;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE upvotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Public profiles are viewable" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Issues are viewable by everyone" ON issues;
DROP POLICY IF EXISTS "Authenticated users can create issues" ON issues;
DROP POLICY IF EXISTS "Admins can update issues" ON issues;
DROP POLICY IF EXISTS "Upvotes are viewable" ON upvotes;
DROP POLICY IF EXISTS "Users can add upvotes" ON upvotes;
DROP POLICY IF EXISTS "Users can remove own upvotes" ON upvotes;
DROP POLICY IF EXISTS "Comments are viewable" ON comments;
DROP POLICY IF EXISTS "Users can add comments" ON comments;
DROP POLICY IF EXISTS "Users can update own comments" ON comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON comments;
DROP POLICY IF EXISTS "Status history is viewable" ON status_history;
DROP POLICY IF EXISTS "Admins can add status history" ON status_history;

-- Profiles policies
CREATE POLICY "Public profiles are viewable" ON profiles
  FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Issues policies
CREATE POLICY "Issues are viewable by everyone" ON issues
  FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create issues" ON issues
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Admins can update issues" ON issues
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Upvotes policies
CREATE POLICY "Upvotes are viewable" ON upvotes
  FOR SELECT USING (true);
CREATE POLICY "Users can add upvotes" ON upvotes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove own upvotes" ON upvotes
  FOR DELETE USING (auth.uid() = user_id);

-- Comments policies
CREATE POLICY "Comments are viewable" ON comments
  FOR SELECT USING (true);
CREATE POLICY "Users can add comments" ON comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own comments" ON comments
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON comments
  FOR DELETE USING (auth.uid() = user_id);

-- Status history policies
CREATE POLICY "Status history is viewable" ON status_history
  FOR SELECT USING (true);
CREATE POLICY "Admins can add status history" ON status_history
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================
-- REALTIME (Enable in Supabase Dashboard)
-- ============================================
-- Go to Database → Replication and enable realtime for:
-- - issues
-- - comments

-- ============================================
-- STORAGE BUCKET (Create in Supabase Dashboard)
-- ============================================
-- Go to Storage and create a bucket named: issue-images
-- Make it public

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ CivicFix database setup complete!';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Enable Realtime for issues and comments tables';
  RAISE NOTICE '2. Create storage bucket: issue-images';
  RAISE NOTICE '3. Run: npm run dev';
END $$;
