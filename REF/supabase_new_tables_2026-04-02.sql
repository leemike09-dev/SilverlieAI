-- ================================
-- Silver Life AI — 신규 테이블 (2026-04-02)
-- Supabase SQL Editor에서 실행
-- ================================

-- 1. 약 목록
CREATE TABLE IF NOT EXISTS medications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  dosage TEXT DEFAULT '',
  times TEXT[] DEFAULT '{}',
  color TEXT DEFAULT '#4CAF50',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. 복용 기록
CREATE TABLE IF NOT EXISTS medication_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  medication_id TEXT NOT NULL,
  medication_name TEXT NOT NULL,
  scheduled_time TEXT NOT NULL,
  date DATE NOT NULL,
  taken BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. 가족 연결
CREATE TABLE IF NOT EXISTS family_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  senior_id TEXT NOT NULL,
  senior_name TEXT NOT NULL,
  family_id TEXT,
  family_name TEXT,
  link_code TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. users 테이블에 role 컬럼 추가 (senior / family)
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'senior';
