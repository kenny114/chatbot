-- Migration 006: Add Visitor Profiles and Agent Support
-- This migration adds cross-session visitor memory and agent state tracking

-- =============================================================================
-- VISITOR PROFILES TABLE
-- =============================================================================
-- Stores cross-session visitor information for memory and personalization

CREATE TABLE IF NOT EXISTS visitor_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chatbot_id UUID NOT NULL REFERENCES chatbots(id) ON DELETE CASCADE,

  -- Visitor identification
  visitor_identifier VARCHAR(255) NOT NULL,  -- email hash, fingerprint, or IP hash
  identifier_type VARCHAR(50) NOT NULL CHECK (identifier_type IN ('email', 'fingerprint', 'ip')),

  -- Profile data (null until lead captured)
  email VARCHAR(255),
  name VARCHAR(255),

  -- Behavioral tracking
  profile_data JSONB DEFAULT '{}'::jsonb,  -- {interests: [], preferences: {}, engagement_score: 0}
  conversation_summaries TEXT[] DEFAULT ARRAY[]::TEXT[],  -- Summaries of past sessions
  total_sessions INTEGER DEFAULT 1,
  total_messages INTEGER DEFAULT 0,
  last_interaction TEXT,  -- Last question or key interaction

  -- Relationships
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,

  -- Timestamps
  first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure unique identifier per chatbot
  CONSTRAINT unique_visitor_per_chatbot UNIQUE (chatbot_id, visitor_identifier)
);

-- Indexes for fast lookup
CREATE INDEX idx_visitor_profiles_chatbot_id ON visitor_profiles(chatbot_id);
CREATE INDEX idx_visitor_profiles_identifier ON visitor_profiles(chatbot_id, visitor_identifier);
CREATE INDEX idx_visitor_profiles_email ON visitor_profiles(email) WHERE email IS NOT NULL;
CREATE INDEX idx_visitor_profiles_last_seen ON visitor_profiles(chatbot_id, last_seen_at DESC);

-- =============================================================================
-- ENHANCE CONVERSATION_SESSIONS TABLE
-- =============================================================================
-- Add columns for agent state tracking and visitor profile linking

-- Add visitor profile reference
ALTER TABLE conversation_sessions
  ADD COLUMN IF NOT EXISTS visitor_profile_id UUID REFERENCES visitor_profiles(id) ON DELETE SET NULL;

-- Add agent execution state
ALTER TABLE conversation_sessions
  ADD COLUMN IF NOT EXISTS agent_state JSONB DEFAULT '{}'::jsonb;

-- Add conversation summary for long-term memory
ALTER TABLE conversation_sessions
  ADD COLUMN IF NOT EXISTS conversation_summary TEXT;

-- Add agent-specific metadata
ALTER TABLE conversation_sessions
  ADD COLUMN IF NOT EXISTS tool_calls_count INTEGER DEFAULT 0;

-- Index for visitor profile lookups
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_visitor_profile
  ON conversation_sessions(visitor_profile_id);

-- Index for agent state queries
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_agent_state
  ON conversation_sessions USING GIN (agent_state);

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function to update visitor profile last_seen timestamp
CREATE OR REPLACE FUNCTION update_visitor_profile_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.visitor_profile_id IS NOT NULL THEN
    UPDATE visitor_profiles
    SET
      last_seen_at = NOW(),
      updated_at = NOW(),
      total_messages = total_messages + 1
    WHERE id = NEW.visitor_profile_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update visitor profile on session activity
DROP TRIGGER IF EXISTS trigger_update_visitor_profile_last_seen ON conversation_sessions;
CREATE TRIGGER trigger_update_visitor_profile_last_seen
  AFTER INSERT OR UPDATE OF message_count ON conversation_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_visitor_profile_last_seen();

-- Function to merge visitor profiles (when anonymous becomes known)
CREATE OR REPLACE FUNCTION merge_visitor_profiles(
  source_profile_id UUID,
  target_profile_id UUID
)
RETURNS VOID AS $$
BEGIN
  -- Merge conversation summaries
  UPDATE visitor_profiles
  SET
    conversation_summaries = ARRAY(
      SELECT DISTINCT unnest(conversation_summaries || (
        SELECT conversation_summaries FROM visitor_profiles WHERE id = source_profile_id
      ))
    ),
    total_sessions = total_sessions + (
      SELECT total_sessions FROM visitor_profiles WHERE id = source_profile_id
    ),
    total_messages = total_messages + (
      SELECT total_messages FROM visitor_profiles WHERE id = source_profile_id
    ),
    profile_data = profile_data || (
      SELECT profile_data FROM visitor_profiles WHERE id = source_profile_id
    ),
    updated_at = NOW()
  WHERE id = target_profile_id;

  -- Update all sessions to point to target profile
  UPDATE conversation_sessions
  SET visitor_profile_id = target_profile_id
  WHERE visitor_profile_id = source_profile_id;

  -- Delete source profile
  DELETE FROM visitor_profiles WHERE id = source_profile_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE visitor_profiles IS
  'Stores cross-session visitor information for agent memory and personalization';

COMMENT ON COLUMN visitor_profiles.visitor_identifier IS
  'Hash of email (most reliable), device fingerprint, or IP address for visitor identification';

COMMENT ON COLUMN visitor_profiles.identifier_type IS
  'Type of identifier: email (post-lead), fingerprint (pre-lead), or ip (fallback)';

COMMENT ON COLUMN visitor_profiles.profile_data IS
  'JSONB containing interests, preferences, engagement metrics, and custom data';

COMMENT ON COLUMN visitor_profiles.conversation_summaries IS
  'Array of summarized past conversations for long-term memory retrieval';

COMMENT ON COLUMN conversation_sessions.agent_state IS
  'JSONB storing agent execution state: tool calls, reasoning traces, intermediate results';

COMMENT ON COLUMN conversation_sessions.conversation_summary IS
  'LLM-generated summary of the conversation for future context loading';

COMMENT ON FUNCTION merge_visitor_profiles IS
  'Merges two visitor profiles when anonymous visitor becomes known (e.g., email captured)';

-- =============================================================================
-- MIGRATION VERIFICATION
-- =============================================================================

DO $$
BEGIN
  -- Verify visitor_profiles table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'visitor_profiles') THEN
    RAISE EXCEPTION 'Migration failed: visitor_profiles table not created';
  END IF;

  -- Verify conversation_sessions enhancements
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversation_sessions' AND column_name = 'visitor_profile_id'
  ) THEN
    RAISE EXCEPTION 'Migration failed: visitor_profile_id column not added to conversation_sessions';
  END IF;

  -- Verify indexes
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'visitor_profiles' AND indexname = 'idx_visitor_profiles_chatbot_id'
  ) THEN
    RAISE EXCEPTION 'Migration failed: visitor_profiles indexes not created';
  END IF;

  RAISE NOTICE 'Migration 006 completed successfully';
END $$;
