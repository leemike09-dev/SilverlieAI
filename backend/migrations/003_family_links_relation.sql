-- ============================================
-- Silver Life AI - family_links relation 컬럼 추가
-- Supabase SQL Editor에서 실행하세요
-- ============================================

ALTER TABLE family_links
  ADD COLUMN IF NOT EXISTS relation TEXT DEFAULT '';
