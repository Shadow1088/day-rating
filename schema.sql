-- Day Rating Database Schema for Supabase (PostgreSQL)
-- Run this in the Supabase SQL Editor

-- Users (default "You" user uses sentinel '__default__' in submissions)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  pin TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity Sets
CREATE TABLE IF NOT EXISTS activity_sets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  deactivated BOOLEAN DEFAULT FALSE,
  global_set BOOLEAN DEFAULT FALSE,
  owner_user_id TEXT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activities (bonus stored inline since it's 1:1)
CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  set_id TEXT NOT NULL REFERENCES activity_sets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  points INTEGER NOT NULL,
  bonus_id TEXT,
  bonus_name TEXT,
  bonus_points INTEGER,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Submissions
CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT '__default__',
  set_id TEXT NOT NULL REFERENCES activity_sets(id),
  date DATE NOT NULL,
  total_points INTEGER NOT NULL,
  note TEXT,
  activities_checked JSONB DEFAULT '[]',
  bonuses_checked JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, set_id, date)
);

-- Rivals
CREATE TABLE IF NOT EXISTS rivals (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  personality JSONB NOT NULL,
  anomaly_chance REAL DEFAULT 0,
  created_at DATE NOT NULL,
  last_generated DATE,
  owner_user_id TEXT REFERENCES users(id)
);

-- Rival Submissions
CREATE TABLE IF NOT EXISTS rival_submissions (
  id TEXT PRIMARY KEY,
  rival_id TEXT NOT NULL REFERENCES rivals(id) ON DELETE CASCADE,
  set_id TEXT NOT NULL REFERENCES activity_sets(id),
  date DATE NOT NULL,
  total_points INTEGER NOT NULL,
  activities_checked JSONB DEFAULT '[]',
  bonuses_checked JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(rival_id, set_id, date)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_submissions_date ON submissions(date);
CREATE INDEX IF NOT EXISTS idx_submissions_user ON submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_set ON submissions(set_id);
CREATE INDEX IF NOT EXISTS idx_activities_set ON activities(set_id);
CREATE INDEX IF NOT EXISTS idx_rival_submissions_rival ON rival_submissions(rival_id);
CREATE INDEX IF NOT EXISTS idx_rival_submissions_date ON rival_submissions(date);

-- Row Level Security: allow all for anon (personal app, no public exposure)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rivals ENABLE ROW LEVEL SECURITY;
ALTER TABLE rival_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for anon" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON activity_sets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON activities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON submissions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON rivals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON rival_submissions FOR ALL USING (true) WITH CHECK (true);
