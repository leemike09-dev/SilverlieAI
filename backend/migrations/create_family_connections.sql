-- Family Connections Table Schema
-- Run this SQL in Supabase to create the family_connections table

CREATE TABLE family_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  relationship VARCHAR(50) NOT NULL, -- 'mother', 'father', 'son', 'daughter', 'sibling', 'spouse', 'other'
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  UNIQUE(user_id, family_id), -- 중복 연결 방지
  CHECK (user_id != family_id) -- 자기 자신과 연결 불가
);

-- Indexes for better query performance
CREATE INDEX idx_family_user_id ON family_connections(user_id);
CREATE INDEX idx_family_family_id ON family_connections(family_id);
CREATE INDEX idx_family_status ON family_connections(status);
CREATE INDEX idx_family_created_at ON family_connections(created_at);

-- Row Level Security (Optional but Recommended)
ALTER TABLE family_connections ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own family connections
CREATE POLICY "Users can view their family connections"
  ON family_connections
  FOR SELECT
  USING (auth.uid()::text = user_id::text OR auth.uid()::text = family_id::text);

-- Policy: Users can create family invitations
CREATE POLICY "Users can create family invitations"
  ON family_connections
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id::text);

-- Policy: Users can update connection status
CREATE POLICY "Users can update connection status"
  ON family_connections
  FOR UPDATE
  USING (auth.uid()::text = family_id::text); -- Only invitee can accept/reject

-- Policy: Users can delete their connections
CREATE POLICY "Users can delete their connections"
  ON family_connections
  FOR DELETE
  USING (auth.uid()::text = user_id::text OR auth.uid()::text = family_id::text);
