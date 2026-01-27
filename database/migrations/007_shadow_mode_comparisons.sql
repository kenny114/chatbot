-- Migration 007: Shadow Mode Comparisons Table
-- Stores side-by-side comparisons of agent vs state machine decisions

CREATE TABLE IF NOT EXISTS shadow_mode_comparisons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chatbot_id UUID NOT NULL REFERENCES chatbots(id) ON DELETE CASCADE,
  session_id VARCHAR(255) NOT NULL,
  user_message TEXT NOT NULL,

  -- State Machine Result
  state_machine_response TEXT NOT NULL,
  state_machine_mode VARCHAR(50) NOT NULL,
  state_machine_intent_level VARCHAR(50),
  state_machine_execution_time_ms INTEGER NOT NULL,

  -- Agent Result
  agent_response TEXT NOT NULL,
  agent_mode VARCHAR(50) NOT NULL,
  agent_intent_level VARCHAR(50),
  agent_tool_calls JSONB DEFAULT '[]'::jsonb,
  agent_tools_count INTEGER DEFAULT 0,
  agent_execution_time_ms INTEGER NOT NULL,
  agent_fallback_used BOOLEAN DEFAULT FALSE,
  agent_error TEXT,

  -- Comparison Metrics
  response_similarity FLOAT DEFAULT 0.0,
  mode_matches BOOLEAN DEFAULT FALSE,
  intent_matches BOOLEAN DEFAULT FALSE,
  decision_alignment_score INTEGER DEFAULT 0, -- 0-100

  -- Metadata
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_shadow_comparisons_chatbot_id ON shadow_mode_comparisons(chatbot_id);
CREATE INDEX idx_shadow_comparisons_timestamp ON shadow_mode_comparisons(chatbot_id, timestamp DESC);
CREATE INDEX idx_shadow_comparisons_alignment ON shadow_mode_comparisons(chatbot_id, decision_alignment_score);
CREATE INDEX idx_shadow_comparisons_session ON shadow_mode_comparisons(session_id);

-- GIN index for tool_calls JSONB queries
CREATE INDEX idx_shadow_comparisons_tool_calls ON shadow_mode_comparisons USING GIN (agent_tool_calls);

-- Comments
COMMENT ON TABLE shadow_mode_comparisons IS
  'Stores parallel execution results of agent vs state machine for comparison and tuning';

COMMENT ON COLUMN shadow_mode_comparisons.decision_alignment_score IS
  'Overall alignment score (0-100): 50pts for mode match, 25pts for intent match, 25pts for response similarity';

COMMENT ON COLUMN shadow_mode_comparisons.response_similarity IS
  'Word overlap similarity between responses (0.0-1.0)';

-- Verification
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shadow_mode_comparisons') THEN
    RAISE EXCEPTION 'Migration failed: shadow_mode_comparisons table not created';
  END IF;

  RAISE NOTICE 'Migration 007 completed successfully';
END $$;
