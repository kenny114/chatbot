import { Response } from 'express';
import pool from '../config/database';
import { asyncHandler } from '../middleware/errorHandler';
import { PlanRequest } from '../middleware/planEnforcement';
import { PLAN_FEATURES, DEFAULT_PLAN_ID, PlanId } from '../config/plans';

export const getUserUsage = asyncHandler(async (req: PlanRequest, res: Response) => {
  const userId = req.userId;

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    // Get user's subscription
    const subscriptionResult = await pool.query(
      `SELECT plan_id, plan_name, status, current_period_end
       FROM subscriptions
       WHERE user_id = $1`,
      [userId]
    );

    const subscription = subscriptionResult.rows[0];
    const planId = (subscription?.plan_id || DEFAULT_PLAN_ID) as PlanId;
    const planFeatures = PLAN_FEATURES[planId] || PLAN_FEATURES[DEFAULT_PLAN_ID];

    // Count chatbots
    const chatbotsResult = await pool.query(
      'SELECT COUNT(*) FROM chatbots WHERE user_id = $1',
      [userId]
    );
    const chatbotsUsed = parseInt(chatbotsResult.rows[0].count);

    // Count live messages this month
    const messagesResult = await pool.query(
      `SELECT COUNT(*) FROM conversation_analytics
       WHERE chatbot_id IN (SELECT id FROM chatbots WHERE user_id = $1)
       AND created_at >= date_trunc('month', CURRENT_DATE)`,
      [userId]
    );
    const messagesUsed = parseInt(messagesResult.rows[0].count);

    // Count preview messages this month
    const previewResult = await pool.query(
      `SELECT COUNT(*) FROM usage_tracking
       WHERE user_id = $1
       AND event_type = 'preview_message'
       AND created_at >= date_trunc('month', CURRENT_DATE)`,
      [userId]
    );
    const previewMessagesUsed = parseInt(previewResult.rows[0].count);

    res.status(200).json({
      // Current usage
      usage: {
        chatbotsUsed,
        messagesUsed,
        previewMessagesUsed,
      },

      // Plan limits
      limits: {
        chatbotLimit: planFeatures.chatbot_limit,
        messageLimit: planFeatures.message_limit,
        previewMessageLimit: planFeatures.preview_messages,
      },

      // Plan info
      plan: {
        id: planId,
        name: subscription?.plan_name || 'Free',
        status: subscription?.status || 'active',
        currentPeriodEnd: subscription?.current_period_end || null,
      },

      // Feature access
      features: {
        liveEmbed: planFeatures.live_embed,
        leadCapture: planFeatures.lead_capture,
        brandingRemoval: planFeatures.branding_removal,
        analyticsAccess: planFeatures.analytics_access,
        businessHours: planFeatures.business_hours,
      },

      // Calculated states
      isAtChatbotLimit: planFeatures.chatbot_limit !== -1 && chatbotsUsed >= planFeatures.chatbot_limit,
      isAtPreviewLimit: planFeatures.preview_messages !== -1 && previewMessagesUsed >= planFeatures.preview_messages,
      canGoLive: planFeatures.live_embed,
    });
  } catch (error) {
    console.error('Error fetching usage:', error);
    res.status(500).json({ error: 'Failed to fetch usage data' });
  }
});

/**
 * Get plan-specific feature access for current user
 */
export const getPlanFeatures = asyncHandler(async (req: PlanRequest, res: Response) => {
  const userId = req.userId;

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    // Get user's subscription
    const subscriptionResult = await pool.query(
      `SELECT plan_id, plan_name, status
       FROM subscriptions
       WHERE user_id = $1 AND status = 'active'`,
      [userId]
    );

    const subscription = subscriptionResult.rows[0];
    const planId = (subscription?.plan_id || DEFAULT_PLAN_ID) as PlanId;
    const planFeatures = PLAN_FEATURES[planId] || PLAN_FEATURES[DEFAULT_PLAN_ID];

    res.status(200).json({
      plan: {
        id: planId,
        name: subscription?.plan_name || 'Free',
        status: subscription?.status || 'active',
      },
      features: planFeatures,
    });
  } catch (error) {
    console.error('Error fetching plan features:', error);
    res.status(500).json({ error: 'Failed to fetch plan features' });
  }
});
