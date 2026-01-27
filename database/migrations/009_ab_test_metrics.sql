-- Migration 009: A/B Test Metrics
-- Tracks performance metrics for agent vs state machine comparison

CREATE TABLE IF NOT EXISTS ab_test_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chatbot_id UUID NOT NULL REFERENCES chatbots(id) ON DELETE CASCADE,
  session_id VARCHAR(255) NOT NULL,
  cohort VARCHAR(50) NOT NULL CHECK (cohort IN ('agent', 'state_machine')),

  -- Conversation metrics
  message_count INTEGER DEFAULT 1,
  total_response_time_ms INTEGER NOT NULL,
  avg_response_time_ms INTEGER NOT NULL,

  -- Lead capture metrics
  lead_captured BOOLEAN DEFAULT FALSE,
  lead_capture_time_seconds INTEGER, -- Time from first message to lead capture
  lead_capture_message_count INTEGER, -- Number of messages before lead capture

  -- Booking metrics
  booking_offered BOOLEAN DEFAULT FALSE,
  booking_clicked BOOLEAN DEFAULT FALSE,

  -- Agent-specific metrics
  total_tool_calls INTEGER DEFAULT 0,
  agent_errors INTEGER DEFAULT 0,
  fallback_used BOOLEAN DEFAULT FALSE,

  -- Cost tracking (estimated)
  estimated_cost_usd FLOAT DEFAULT 0.0,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_ab_test_metrics_chatbot_id ON ab_test_metrics(chatbot_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_metrics_cohort ON ab_test_metrics(cohort);
CREATE INDEX IF NOT EXISTS idx_ab_test_metrics_session_id ON ab_test_metrics(session_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_metrics_created_at ON ab_test_metrics(created_at DESC);

-- Composite index for cohort-based queries
CREATE INDEX IF NOT EXISTS idx_ab_test_metrics_chatbot_cohort
  ON ab_test_metrics(chatbot_id, cohort, created_at DESC);

-- Comments
COMMENT ON TABLE ab_test_metrics IS 'Performance metrics for A/B testing agent vs state machine';
COMMENT ON COLUMN ab_test_metrics.cohort IS 'Which system handled this conversation: agent or state_machine';
COMMENT ON COLUMN ab_test_metrics.lead_capture_time_seconds IS 'Time in seconds from first message to successful lead capture';
COMMENT ON COLUMN ab_test_metrics.estimated_cost_usd IS 'Estimated API cost in USD for this conversation';
