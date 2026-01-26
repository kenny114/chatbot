-- Lead Capture & Call Booking Migration
-- This migration adds conversation sessions, leads, and notification features
-- Created: 2026-01-26

-- =====================================================
-- 1. CONVERSATION SESSIONS TABLE
-- Tracks stateful conversation sessions with visitors
-- =====================================================
CREATE TABLE IF NOT EXISTS conversation_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chatbot_id UUID NOT NULL REFERENCES chatbots(id) ON DELETE CASCADE,

    -- Session identification
    session_id VARCHAR(255) NOT NULL,

    -- Conversation state machine
    conversation_mode VARCHAR(30) DEFAULT 'INFO_MODE'
        CHECK (conversation_mode IN (
            'INFO_MODE',
            'INTENT_CHECK_MODE',
            'LEAD_CAPTURE_MODE',
            'BOOKING_MODE',
            'CLOSURE_MODE'
        )),

    -- Intent tracking
    intent_level VARCHAR(20) DEFAULT 'LOW_INTENT'
        CHECK (intent_level IN ('LOW_INTENT', 'MEDIUM_INTENT', 'HIGH_INTENT')),
    intent_signals JSONB DEFAULT '[]',

    -- Lead capture progress
    lead_capture_step VARCHAR(30) DEFAULT NULL
        CHECK (lead_capture_step IS NULL OR lead_capture_step IN ('ASK_EMAIL', 'ASK_NAME', 'ASK_REASON', 'COMPLETED')),

    -- Qualification progress
    qualification_step INTEGER DEFAULT 0,
    qualification_answers JSONB DEFAULT '{}',

    -- Context
    page_url TEXT,
    referrer_url TEXT,
    user_agent TEXT,
    user_ip VARCHAR(45),

    -- Conversation history (limited to last N messages for context)
    message_history JSONB DEFAULT '[]',
    message_count INTEGER DEFAULT 0,

    -- Lead association (set after lead is captured)
    lead_id UUID,

    -- Booking status
    booking_status VARCHAR(30) DEFAULT 'NOT_STARTED'
        CHECK (booking_status IN ('NOT_STARTED', 'LINK_SHARED', 'COMPLETED', 'DECLINED')),
    booking_link_clicked_at TIMESTAMP,

    -- Timestamps
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP,

    -- Unique constraint for session per chatbot
    CONSTRAINT unique_session_per_chatbot UNIQUE(chatbot_id, session_id)
);

CREATE INDEX idx_conversation_sessions_chatbot ON conversation_sessions(chatbot_id);
CREATE INDEX idx_conversation_sessions_session ON conversation_sessions(session_id);
CREATE INDEX idx_conversation_sessions_mode ON conversation_sessions(conversation_mode);
CREATE INDEX idx_conversation_sessions_activity ON conversation_sessions(last_activity_at DESC);

-- =====================================================
-- 2. LEADS TABLE
-- Stores captured leads with full context
-- =====================================================
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chatbot_id UUID NOT NULL REFERENCES chatbots(id) ON DELETE CASCADE,

    -- Contact information
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    phone VARCHAR(50),

    -- Lead context
    reason_for_interest TEXT,
    page_url TEXT,
    referrer_url TEXT,

    -- Intent and qualification
    intent_level VARCHAR(20),
    qualification_answers JSONB DEFAULT '{}',

    -- Conversation summary
    questions_asked JSONB DEFAULT '[]',
    message_count INTEGER DEFAULT 0,
    conversation_summary TEXT,

    -- Booking status
    booking_status VARCHAR(30) DEFAULT 'NOT_BOOKED'
        CHECK (booking_status IN ('NOT_BOOKED', 'LINK_SHARED', 'BOOKED', 'DECLINED')),
    booking_scheduled_at TIMESTAMP,

    -- Notification status
    owner_notified BOOLEAN DEFAULT FALSE,
    notification_sent_at TIMESTAMP,
    notification_method VARCHAR(20),

    -- Source tracking
    source_session_id UUID,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_leads_chatbot ON leads(chatbot_id);
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_created ON leads(created_at DESC);
CREATE INDEX idx_leads_booking_status ON leads(booking_status);
CREATE INDEX idx_leads_notified ON leads(owner_notified);

-- Add foreign key for session after leads table is created
ALTER TABLE conversation_sessions
    ADD CONSTRAINT fk_conversation_sessions_lead
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL;

ALTER TABLE leads
    ADD CONSTRAINT fk_leads_session
    FOREIGN KEY (source_session_id) REFERENCES conversation_sessions(id) ON DELETE SET NULL;

-- =====================================================
-- 3. NOTIFICATION LOG TABLE
-- Track all notifications sent to business owners
-- =====================================================
CREATE TABLE IF NOT EXISTS notification_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chatbot_id UUID NOT NULL REFERENCES chatbots(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,

    -- Notification details
    notification_type VARCHAR(30) NOT NULL
        CHECK (notification_type IN ('NEW_LEAD', 'BOOKING_SCHEDULED', 'HIGH_INTENT_VISITOR')),
    delivery_method VARCHAR(20) NOT NULL
        CHECK (delivery_method IN ('email', 'webhook', 'dashboard')),

    -- Delivery status
    status VARCHAR(20) DEFAULT 'pending'
        CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
    error_message TEXT,

    -- Content
    payload JSONB,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP
);

CREATE INDEX idx_notification_log_chatbot ON notification_log(chatbot_id);
CREATE INDEX idx_notification_log_lead ON notification_log(lead_id);
CREATE INDEX idx_notification_log_status ON notification_log(status);
CREATE INDEX idx_notification_log_created ON notification_log(created_at DESC);

-- =====================================================
-- 4. EXTEND CHATBOT_CUSTOMIZATION TABLE
-- Add lead capture and booking configuration
-- =====================================================
ALTER TABLE chatbot_customization
    -- Lead capture settings
    ADD COLUMN IF NOT EXISTS lead_capture_enabled BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS lead_capture_trigger VARCHAR(30) DEFAULT 'MEDIUM_INTENT'
        CHECK (lead_capture_trigger IN ('LOW_INTENT', 'MEDIUM_INTENT', 'HIGH_INTENT', 'ALWAYS')),
    ADD COLUMN IF NOT EXISTS require_name BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS require_reason BOOLEAN DEFAULT false,

    -- Calendly/Booking settings
    ADD COLUMN IF NOT EXISTS booking_enabled BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS booking_link TEXT,
    ADD COLUMN IF NOT EXISTS booking_cta_text VARCHAR(255) DEFAULT 'Book a Call',

    -- Notification settings
    ADD COLUMN IF NOT EXISTS notification_email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS notification_webhook_url TEXT,
    ADD COLUMN IF NOT EXISTS notify_on_lead BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS notify_on_booking BOOLEAN DEFAULT true,

    -- Intent detection settings
    ADD COLUMN IF NOT EXISTS intent_keywords JSONB DEFAULT '["price", "cost", "quote", "call", "book", "talk", "schedule", "demo", "pricing", "consultation"]',
    ADD COLUMN IF NOT EXISTS high_intent_pages JSONB DEFAULT '[]',

    -- Qualification questions
    ADD COLUMN IF NOT EXISTS qualification_enabled BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS qualification_questions JSONB DEFAULT '[
        {"id": "help_type", "question": "What are you looking to get help with?", "required": true},
        {"id": "timeline", "question": "How soon are you looking to start?", "required": false}
    ]',

    -- Closure messages
    ADD COLUMN IF NOT EXISTS closure_message TEXT DEFAULT 'Thank you! Someone from our team will follow up shortly. Is there anything else I can help you with?',
    ADD COLUMN IF NOT EXISTS booking_confirmation_message TEXT DEFAULT 'Great! Your call has been scheduled. We look forward to speaking with you!',

    -- Response behavior (if not already present)
    ADD COLUMN IF NOT EXISTS response_tone VARCHAR(50),
    ADD COLUMN IF NOT EXISTS response_length VARCHAR(50),
    ADD COLUMN IF NOT EXISTS language VARCHAR(50) DEFAULT 'English';

-- =====================================================
-- 5. UPDATED_AT TRIGGERS FOR NEW TABLES
-- =====================================================

-- Trigger for leads table
DROP TRIGGER IF EXISTS update_leads_updated_at ON leads;
CREATE TRIGGER update_leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for conversation_sessions last_activity_at
CREATE OR REPLACE FUNCTION update_session_activity()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_activity_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_conversation_sessions_activity ON conversation_sessions;
CREATE TRIGGER update_conversation_sessions_activity
    BEFORE UPDATE ON conversation_sessions
    FOR EACH ROW EXECUTE FUNCTION update_session_activity();

-- =====================================================
-- 6. ANALYTICS VIEWS FOR LEADS
-- =====================================================

-- Daily lead counts view
CREATE OR REPLACE VIEW daily_lead_counts AS
SELECT
    chatbot_id,
    DATE(created_at) as date,
    COUNT(*) as lead_count,
    COUNT(CASE WHEN booking_status = 'BOOKED' THEN 1 END) as booked_count,
    COUNT(CASE WHEN intent_level = 'HIGH_INTENT' THEN 1 END) as high_intent_count
FROM leads
GROUP BY chatbot_id, DATE(created_at)
ORDER BY date DESC;

-- Lead conversion funnel view
CREATE OR REPLACE VIEW lead_conversion_funnel AS
SELECT
    cs.chatbot_id,
    COUNT(DISTINCT cs.id) as total_sessions,
    COUNT(DISTINCT CASE WHEN cs.conversation_mode != 'INFO_MODE' THEN cs.id END) as engaged_sessions,
    COUNT(DISTINCT l.id) as leads_captured,
    COUNT(DISTINCT CASE WHEN l.booking_status = 'BOOKED' THEN l.id END) as bookings_made
FROM conversation_sessions cs
LEFT JOIN leads l ON cs.lead_id = l.id
GROUP BY cs.chatbot_id;

-- =====================================================
-- 7. SEED LEAD CAPTURE SETTINGS FOR EXISTING CHATBOTS
-- =====================================================
-- Update existing customization records with default lead capture settings
-- (The ALTER TABLE above already sets defaults, this is just to ensure consistency)

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

COMMENT ON TABLE conversation_sessions IS 'Tracks stateful conversation sessions for lead capture flow';
COMMENT ON TABLE leads IS 'Stores captured leads with full context and qualification data';
COMMENT ON TABLE notification_log IS 'Audit log for all notifications sent to business owners';
