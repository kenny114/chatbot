-- Migration 008: A/B Test Cohorts
-- Stores cohort assignments for gradual agent rollout

CREATE TABLE IF NOT EXISTS ab_test_cohorts (
  chatbot_id UUID PRIMARY KEY REFERENCES chatbots(id) ON DELETE CASCADE,
  cohort VARCHAR(50) NOT NULL CHECK (cohort IN ('agent', 'state_machine')),
  is_manual BOOLEAN DEFAULT FALSE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for cohort queries
CREATE INDEX IF NOT EXISTS idx_ab_test_cohorts_cohort ON ab_test_cohorts(cohort);
CREATE INDEX IF NOT EXISTS idx_ab_test_cohorts_assigned_at ON ab_test_cohorts(assigned_at DESC);

-- Comments
COMMENT ON TABLE ab_test_cohorts IS 'Stores A/B test cohort assignments for agent rollout';
COMMENT ON COLUMN ab_test_cohorts.cohort IS 'Which cohort the chatbot is assigned to: agent or state_machine';
COMMENT ON COLUMN ab_test_cohorts.is_manual IS 'Whether assignment was manual (true) or automatic (false)';
COMMENT ON COLUMN ab_test_cohorts.assigned_at IS 'When cohort was assigned';
