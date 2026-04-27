-- ============================================
-- Silver Life AI - 알림 테이블
-- Supabase SQL Editor에서 한 번 실행하세요
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
  id          uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     text    NOT NULL,
  title       text    NOT NULL,
  body        text,
  is_read     boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
