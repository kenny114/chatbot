-- Platform Features Migration
-- This migration adds analytics, customization, and subscription management features
-- Created: 2026-01-09

-- =====================================================
-- 1. CHATBOT CUSTOMIZATION TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS chatbot_customization (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chatbot_id UUID NOT NULL REFERENCES chatbots(id) ON DELETE CASCADE,

    -- Widget Appearance Settings
    widget_position VARCHAR(20) DEFAULT 'bottom-right',
    primary_color VARCHAR(7) DEFAULT '#6366f1',
    accent_color VARCHAR(7) DEFAULT '#10b981',
    widget_title VARCHAR(255) DEFAULT 'Chat with us',
    welcome_message TEXT DEFAULT 'Hello! How can I help you today?',
    avatar_url TEXT,

    -- Behavior Settings
    auto_open BOOLEAN DEFAULT false,
    auto_open_delay INTEGER DEFAULT 5000,
    show_timestamp BOOLEAN DEFAULT true,
    enable_sound BOOLEAN DEFAULT true,
    collect_email BOOLEAN DEFAULT false,

    -- Advanced Settings
    custom_css TEXT,
    custom_js TEXT,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_chatbot_customization UNIQUE(chatbot_id)
);

CREATE INDEX idx_chatbot_customization_chatbot_id ON chatbot_customization(chatbot_id);

-- =====================================================
-- 2. CONVERSATION ANALYTICS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS conversation_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chatbot_id UUID NOT NULL REFERENCES chatbots(id) ON DELETE CASCADE,

    -- User Information
    user_identifier VARCHAR(255),
    user_ip VARCHAR(45),
    user_agent TEXT,

    -- Conversation Data
    user_message TEXT NOT NULL,
    bot_response TEXT NOT NULL,
    sources_used JSONB,

    -- Performance Metrics
    response_time_ms INTEGER,
    tokens_used INTEGER,

    -- Feedback
    satisfaction_rating INTEGER CHECK (satisfaction_rating BETWEEN 1 AND 5),
    feedback_text TEXT,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Indexes for analytics queries
    CONSTRAINT valid_satisfaction_rating CHECK (satisfaction_rating IS NULL OR (satisfaction_rating >= 1 AND satisfaction_rating <= 5))
);

CREATE INDEX idx_conversation_analytics_chatbot_id ON conversation_analytics(chatbot_id);
CREATE INDEX idx_conversation_analytics_created_at ON conversation_analytics(created_at DESC);
CREATE INDEX idx_conversation_analytics_chatbot_date ON conversation_analytics(chatbot_id, created_at DESC);

-- =====================================================
-- 3. USAGE TRACKING TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS usage_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Event Details
    event_type VARCHAR(50) NOT NULL,
    chatbot_id UUID REFERENCES chatbots(id) ON DELETE SET NULL,

    -- Metadata
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_usage_tracking_user_id ON usage_tracking(user_id);
CREATE INDEX idx_usage_tracking_event_type ON usage_tracking(event_type);
CREATE INDEX idx_usage_tracking_created_at ON usage_tracking(created_at DESC);
CREATE INDEX idx_usage_tracking_user_date ON usage_tracking(user_id, created_at DESC);

-- =====================================================
-- 4. SUBSCRIPTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Plan Information
    plan_id VARCHAR(50) NOT NULL,
    plan_name VARCHAR(100) NOT NULL,

    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete')),

    -- PayPal Integration
    paypal_subscription_id VARCHAR(255) UNIQUE,
    paypal_plan_id VARCHAR(255),

    -- Billing Cycle
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    cancel_at_period_end BOOLEAN DEFAULT false,
    canceled_at TIMESTAMP,

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_user_subscription UNIQUE(user_id)
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_paypal_subscription_id ON subscriptions(paypal_subscription_id);

-- =====================================================
-- 5. PAYMENT TRANSACTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,

    -- Transaction Details
    paypal_order_id VARCHAR(255) UNIQUE,
    paypal_payment_id VARCHAR(255),

    -- Amount
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',

    -- Status
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),

    -- Metadata
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX idx_payment_transactions_subscription_id ON payment_transactions(subscription_id);
CREATE INDEX idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX idx_payment_transactions_created_at ON payment_transactions(created_at DESC);

-- =====================================================
-- 6. EXTEND DATA_SOURCES TABLE
-- =====================================================
-- Add file upload support to data_sources table
ALTER TABLE data_sources
    ADD COLUMN IF NOT EXISTS file_url TEXT,
    ADD COLUMN IF NOT EXISTS file_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS file_size INTEGER,
    ADD COLUMN IF NOT EXISTS file_type VARCHAR(50);

-- Update type constraint if it exists
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'data_sources_type_check'
        AND table_name = 'data_sources'
    ) THEN
        ALTER TABLE data_sources DROP CONSTRAINT data_sources_type_check;
    END IF;

    -- Add new constraint
    ALTER TABLE data_sources
        ADD CONSTRAINT data_sources_type_check
        CHECK (type IN ('url', 'text', 'file'));
END $$;

-- =====================================================
-- 7. EXTEND USERS TABLE
-- =====================================================
-- Add additional user fields
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS avatar_url TEXT,
    ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;

-- =====================================================
-- 8. CREATE UPDATED_AT TRIGGER FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_chatbot_customization_updated_at BEFORE UPDATE ON chatbot_customization
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_transactions_updated_at BEFORE UPDATE ON payment_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 9. CREATE ANALYTICS VIEWS
-- =====================================================

-- Daily message counts view
CREATE OR REPLACE VIEW daily_message_counts AS
SELECT
    chatbot_id,
    DATE(created_at) as date,
    COUNT(*) as message_count,
    AVG(response_time_ms) as avg_response_time,
    COUNT(DISTINCT user_identifier) as unique_users
FROM conversation_analytics
GROUP BY chatbot_id, DATE(created_at)
ORDER BY date DESC;

-- Popular questions view
CREATE OR REPLACE VIEW popular_questions AS
SELECT
    chatbot_id,
    user_message,
    COUNT(*) as question_count,
    AVG(response_time_ms) as avg_response_time,
    AVG(satisfaction_rating) as avg_rating
FROM conversation_analytics
GROUP BY chatbot_id, user_message
ORDER BY question_count DESC;

-- User subscription usage view
CREATE OR REPLACE VIEW user_subscription_usage AS
SELECT
    u.id as user_id,
    u.email,
    s.plan_name,
    s.status,
    COUNT(DISTINCT c.id) as chatbots_count,
    COUNT(DISTINCT ca.id) as messages_count
FROM users u
LEFT JOIN subscriptions s ON u.id = s.user_id
LEFT JOIN chatbots c ON u.id = c.user_id
LEFT JOIN conversation_analytics ca ON c.id = ca.chatbot_id
    AND ca.created_at >= s.current_period_start
    AND ca.created_at <= s.current_period_end
GROUP BY u.id, u.email, s.plan_name, s.status;

-- =====================================================
-- 10. SEED DEFAULT CUSTOMIZATION FOR EXISTING CHATBOTS
-- =====================================================
INSERT INTO chatbot_customization (chatbot_id)
SELECT id FROM chatbots
WHERE id NOT IN (SELECT chatbot_id FROM chatbot_customization)
ON CONFLICT (chatbot_id) DO NOTHING;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

COMMENT ON TABLE chatbot_customization IS 'Stores chatbot widget customization settings';
COMMENT ON TABLE conversation_analytics IS 'Tracks all chatbot conversations for analytics';
COMMENT ON TABLE usage_tracking IS 'Tracks user actions and usage events';
COMMENT ON TABLE subscriptions IS 'Manages user subscription plans';
COMMENT ON TABLE payment_transactions IS 'Records all payment transactions';
