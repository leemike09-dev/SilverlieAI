-- ================================================================
-- Silver Life AI — 전체 DB 초기화 SQL
-- Supabase SQL Editor에서 전체 선택 후 Run
-- 2026-04-02
-- ================================================================

-- ────────────────────────────────────────────
-- 1. users (회원)
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  email         TEXT    UNIQUE NOT NULL,
  name          TEXT    NOT NULL,
  password_hash TEXT    NOT NULL,
  language      TEXT    DEFAULT 'ko',
  role          TEXT    DEFAULT 'senior',   -- 'senior' | 'family'
  age           INT,
  height        FLOAT,
  weight        FLOAT,
  interests     TEXT[],
  created_at    TIMESTAMP DEFAULT NOW()
);

-- ────────────────────────────────────────────
-- 2. health_records (건강 기록)
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS health_records (
  id                       UUID  DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                  TEXT  NOT NULL,
  date                     DATE  NOT NULL,
  blood_pressure_systolic  INT,
  blood_pressure_diastolic INT,
  heart_rate               INT,
  blood_sugar              FLOAT,
  weight                   FLOAT,
  steps                    INT,
  notes                    TEXT,
  source                   TEXT  DEFAULT 'manual',
  created_at               TIMESTAMP DEFAULT NOW()
);

-- ────────────────────────────────────────────
-- 3. medications (약 목록)
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS medications (
  id         UUID   DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    TEXT   NOT NULL,
  name       TEXT   NOT NULL,
  dosage     TEXT   DEFAULT '',
  times      TEXT[] DEFAULT '{}',
  color      TEXT   DEFAULT '#4CAF50',
  created_at TIMESTAMP DEFAULT NOW()
);

-- ────────────────────────────────────────────
-- 4. medication_logs (복용 기록)
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS medication_logs (
  id               UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          TEXT    NOT NULL,
  medication_id    TEXT    NOT NULL,
  medication_name  TEXT    NOT NULL,
  scheduled_time   TEXT    NOT NULL,
  date             DATE    NOT NULL,
  taken            BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMP DEFAULT NOW()
);

-- ────────────────────────────────────────────
-- 5. family_links (가족 연결)
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS family_links (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  senior_id   TEXT NOT NULL,
  senior_name TEXT NOT NULL,
  family_id   TEXT,
  family_name TEXT,
  link_code   TEXT UNIQUE NOT NULL,
  status      TEXT DEFAULT 'pending',   -- 'pending' | 'linked'
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ────────────────────────────────────────────
-- 6. notifications (알림)
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    TEXT    NOT NULL,
  title      TEXT    NOT NULL,
  body       TEXT,
  is_read    BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ────────────────────────────────────────────
-- 7. community_groups (커뮤니티 그룹) — 향후 사용
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS community_groups (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  category    TEXT,
  created_by  TEXT,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ────────────────────────────────────────────
-- 8. group_memberships (그룹 멤버십) — 향후 사용
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS group_memberships (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id   UUID REFERENCES community_groups(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL,
  joined_at  TIMESTAMP DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- ────────────────────────────────────────────
-- 9. community_posts (커뮤니티 게시글) — 향후 사용
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS community_posts (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id    UUID REFERENCES community_groups(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL,
  author_name TEXT NOT NULL,
  content     TEXT NOT NULL,
  likes       INT  DEFAULT 0,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ────────────────────────────────────────────
-- 10. community_comments (댓글) — 향후 사용
-- ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS community_comments (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id     UUID REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL,
  author_name TEXT NOT NULL,
  content     TEXT NOT NULL,
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ================================================================
-- 완료! 총 10개 테이블 생성
-- ================================================================
