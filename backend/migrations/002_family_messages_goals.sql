-- ============================================
-- Silver Life AI - Family 기능 마이그레이션
-- Supabase SQL Editor에서 한 번 실행하세요
-- ============================================

-- 1. 가족 메시지 테이블
CREATE TABLE IF NOT EXISTS family_messages (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id   text NOT NULL,
  receiver_id text NOT NULL,
  message     text NOT NULL,
  msg_type    text NOT NULL DEFAULT 'text',  -- 'text' | 'quick_reply'
  is_read     boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fmsg_sender   ON family_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_fmsg_receiver ON family_messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_fmsg_created  ON family_messages(created_at DESC);

-- 2. 공동 건강 목표 테이블
CREATE TABLE IF NOT EXISTS family_goals (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  senior_id   text NOT NULL,
  family_id   text NOT NULL,
  goal_type   text NOT NULL DEFAULT 'steps',  -- 현재는 'steps'만
  target      integer NOT NULL,               -- 목표값 (걸음 수 등)
  period      text NOT NULL DEFAULT 'weekly', -- 'daily' | 'weekly'
  start_date  date NOT NULL DEFAULT CURRENT_DATE,
  end_date    date NOT NULL,
  created_by  text NOT NULL,                  -- 목표 설정한 사람 userId
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fgoal_senior ON family_goals(senior_id, is_active);
CREATE INDEX IF NOT EXISTS idx_fgoal_family ON family_goals(family_id, is_active);
