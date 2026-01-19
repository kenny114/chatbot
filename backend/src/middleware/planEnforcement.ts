import { Response, NextFunction } from 'express';
import pool from '../config/database';
import { AuthRequest } from './auth';
import { PLAN_IDS, PLAN_FEATURES, DEFAULT_PLAN_ID, PlanId, UPGRADE_PROMPTS } from '../config/plans';

// Extended request with plan info
export interface PlanRequest extends AuthRequest {
  userPlan?: {
    planId: PlanId;
    planName: string;
    status: string;
    features: typeof PLAN_FEATURES[PlanId];
  };
  usage?: {
    chatbotsUsed: number;
    messagesUsed: number;
    previewMessagesUsed: number;
  };
}

/**
 * Middleware to load user's subscription plan
 * Attaches plan info to request for use in subsequent middleware/handlers
 */
export const loadUserPlan = async (
  req: PlanRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId;

    if (!userId) {
      // No user ID - default to free plan
      req.userPlan = {
        planId: DEFAULT_PLAN_ID,
        planName: 'Free',
        status: 'active',
        features: PLAN_FEATURES[DEFAULT_PLAN_ID]
      };
      next();
      return;
    }

    // Get user's subscription
    const result = await pool.query(
      `SELECT plan_id, plan_name, status
       FROM subscriptions
       WHERE user_id = $1 AND status = 'active'`,
      [userId]
    );

    if (result.rows.length > 0) {
      const subscription = result.rows[0];
      const planId = subscription.plan_id as PlanId;

      req.userPlan = {
        planId,
        planName: subscription.plan_name,
        status: subscription.status,
        features: PLAN_FEATURES[planId] || PLAN_FEATURES[DEFAULT_PLAN_ID]
      };
    } else {
      // No active subscription - default to free plan
      req.userPlan = {
        planId: DEFAULT_PLAN_ID,
        planName: 'Free',
        status: 'active',
        features: PLAN_FEATURES[DEFAULT_PLAN_ID]
      };
    }

    next();
  } catch (error) {
    console.error('Error loading user plan:', error);
    // On error, default to free plan to avoid blocking the user
    req.userPlan = {
      planId: DEFAULT_PLAN_ID,
      planName: 'Free',
      status: 'active',
      features: PLAN_FEATURES[DEFAULT_PLAN_ID]
    };
    next();
  }
};

/**
 * Middleware to load current usage stats
 */
export const loadUsageStats = async (
  req: PlanRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId;

    if (!userId) {
      req.usage = { chatbotsUsed: 0, messagesUsed: 0, previewMessagesUsed: 0 };
      next();
      return;
    }

    // Get chatbot count
    const chatbotsResult = await pool.query(
      'SELECT COUNT(*) FROM chatbots WHERE user_id = $1',
      [userId]
    );

    // Get live messages this month (from conversation_analytics)
    const messagesResult = await pool.query(
      `SELECT COUNT(*) FROM conversation_analytics
       WHERE chatbot_id IN (SELECT id FROM chatbots WHERE user_id = $1)
       AND created_at >= date_trunc('month', CURRENT_DATE)`,
      [userId]
    );

    // Get preview messages this month (from usage_tracking with event_type = 'preview_message')
    const previewResult = await pool.query(
      `SELECT COUNT(*) FROM usage_tracking
       WHERE user_id = $1
       AND event_type = 'preview_message'
       AND created_at >= date_trunc('month', CURRENT_DATE)`,
      [userId]
    );

    req.usage = {
      chatbotsUsed: parseInt(chatbotsResult.rows[0].count),
      messagesUsed: parseInt(messagesResult.rows[0].count),
      previewMessagesUsed: parseInt(previewResult.rows[0].count)
    };

    next();
  } catch (error) {
    console.error('Error loading usage stats:', error);
    req.usage = { chatbotsUsed: 0, messagesUsed: 0, previewMessagesUsed: 0 };
    next();
  }
};

/**
 * Middleware to enforce chatbot creation limit
 */
export const enforceChatbotLimit = async (
  req: PlanRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Ensure plan and usage are loaded
    if (!req.userPlan || !req.usage) {
      res.status(500).json({ error: 'Plan data not loaded' });
      return;
    }

    const { chatbot_limit } = req.userPlan.features;
    const { chatbotsUsed } = req.usage;

    // -1 means unlimited
    if (chatbot_limit !== -1 && chatbotsUsed >= chatbot_limit) {
      res.status(403).json({
        error: 'Chatbot limit reached',
        code: 'CHATBOT_LIMIT_EXCEEDED',
        upgrade: UPGRADE_PROMPTS.chatbot_limit,
        current: chatbotsUsed,
        limit: chatbot_limit
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Error enforcing chatbot limit:', error);
    res.status(500).json({ error: 'Failed to check chatbot limit' });
  }
};

/**
 * Middleware to enforce preview message limit (Free plan)
 */
export const enforcePreviewMessageLimit = async (
  req: PlanRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.userPlan || !req.usage) {
      res.status(500).json({ error: 'Plan data not loaded' });
      return;
    }

    const { preview_messages } = req.userPlan.features;
    const { previewMessagesUsed } = req.usage;

    // -1 means unlimited
    if (preview_messages !== -1 && previewMessagesUsed >= preview_messages) {
      res.status(403).json({
        error: 'Preview message limit reached',
        code: 'PREVIEW_MESSAGE_LIMIT_EXCEEDED',
        upgrade: UPGRADE_PROMPTS.message_limit,
        current: previewMessagesUsed,
        limit: preview_messages
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Error enforcing preview message limit:', error);
    res.status(500).json({ error: 'Failed to check message limit' });
  }
};

/**
 * Middleware to enforce live embed access (Business+ only)
 */
export const requireLiveEmbed = (
  req: PlanRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.userPlan) {
    res.status(500).json({ error: 'Plan data not loaded' });
    return;
  }

  if (!req.userPlan.features.live_embed) {
    res.status(403).json({
      error: 'Live embed not available on Free plan',
      code: 'FEATURE_NOT_AVAILABLE',
      upgrade: UPGRADE_PROMPTS.live_embed
    });
    return;
  }

  next();
};

/**
 * Middleware to enforce lead capture access (Business+ only)
 */
export const requireLeadCapture = (
  req: PlanRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.userPlan) {
    res.status(500).json({ error: 'Plan data not loaded' });
    return;
  }

  if (!req.userPlan.features.lead_capture) {
    res.status(403).json({
      error: 'Lead capture not available on Free plan',
      code: 'FEATURE_NOT_AVAILABLE',
      upgrade: UPGRADE_PROMPTS.lead_capture
    });
    return;
  }

  next();
};

/**
 * Helper to check if user has a specific feature
 */
export const hasFeature = (req: PlanRequest, feature: keyof typeof PLAN_FEATURES['free']): boolean => {
  if (!req.userPlan) return false;
  const value = req.userPlan.features[feature];
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') return true; // All string values (preview, full) are truthy
  return false;
};

/**
 * Track preview message usage
 */
export const trackPreviewMessage = async (userId: string, chatbotId: string): Promise<void> => {
  try {
    await pool.query(
      `INSERT INTO usage_tracking (user_id, event_type, chatbot_id, metadata)
       VALUES ($1, 'preview_message', $2, '{}')`,
      [userId, chatbotId]
    );
  } catch (error) {
    console.error('Error tracking preview message:', error);
  }
};
