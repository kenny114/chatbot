import { Request, Response } from 'express';
import { analyticsService } from '../services/analyticsService';

// SECURITY: Validate and sanitize query parameters
const ALLOWED_TIME_RANGES = ['1d', '7d', '30d', '90d'];
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

const validateTimeRange = (timeRange: string | undefined): string => {
  if (!timeRange || !ALLOWED_TIME_RANGES.includes(timeRange)) {
    return '7d'; // Default
  }
  return timeRange;
};

const validateLimit = (limit: string | undefined): number => {
  const parsed = parseInt(limit || String(DEFAULT_LIMIT), 10);
  if (isNaN(parsed) || parsed < 1) return DEFAULT_LIMIT;
  if (parsed > MAX_LIMIT) return MAX_LIMIT;
  return parsed;
};

export const analyticsController = {
  /**
   * GET /api/analytics/overview
   * Get analytics overview
   */
  async getOverview(req: any, res: Response) {
    try {
      const userId = req.userId;
      const { chatbotId, timeRange } = req.query;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const overview = await analyticsService.getOverview(
        userId,
        chatbotId as string | undefined,
        validateTimeRange(timeRange as string)
      );

      res.json(overview);
    } catch (error) {
      console.error('Error fetching analytics overview:', error);
      res.status(500).json({ error: 'Failed to fetch analytics overview' });
    }
  },

  /**
   * GET /api/analytics/messages
   * Get messages over time
   */
  async getMessagesOverTime(req: any, res: Response) {
    try {
      const userId = req.userId;
      const { chatbotId, timeRange } = req.query;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const messages = await analyticsService.getMessagesOverTime(
        userId,
        chatbotId as string | undefined,
        validateTimeRange(timeRange as string)
      );

      res.json({ messages });
    } catch (error) {
      console.error('Error fetching messages data:', error);
      res.status(500).json({ error: 'Failed to fetch messages data' });
    }
  },

  /**
   * GET /api/analytics/popular-questions
   * Get most popular questions
   */
  async getPopularQuestions(req: any, res: Response) {
    try {
      const userId = req.userId;
      const { chatbotId, limit } = req.query;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const questions = await analyticsService.getPopularQuestions(
        userId,
        chatbotId as string | undefined,
        validateLimit(limit as string)
      );

      res.json({ questions });
    } catch (error) {
      console.error('Error fetching popular questions:', error);
      res.status(500).json({ error: 'Failed to fetch popular questions' });
    }
  },

  /**
   * GET /api/analytics/response-times
   * Get response times by hour
   */
  async getResponseTimes(req: any, res: Response) {
    try {
      const userId = req.userId;
      const { chatbotId } = req.query;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const responseTimes = await analyticsService.getResponseTimesByHour(
        userId,
        chatbotId as string | undefined
      );

      res.json({ responseTimes });
    } catch (error) {
      console.error('Error fetching response times:', error);
      res.status(500).json({ error: 'Failed to fetch response times' });
    }
  },

  /**
   * GET /api/analytics/conversations
   * Get recent conversations
   */
  async getConversations(req: any, res: Response) {
    try {
      const userId = req.userId;
      const { chatbotId, limit } = req.query;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const conversations = await analyticsService.getRecentConversations(
        userId,
        chatbotId as string | undefined,
        validateLimit(limit as string)
      );

      res.json({ conversations });
    } catch (error) {
      console.error('Error fetching conversations:', error);
      res.status(500).json({ error: 'Failed to fetch conversations' });
    }
  },

  /**
   * POST /api/analytics/satisfaction
   * Record satisfaction rating
   */
  async recordSatisfaction(req: Request, res: Response) {
    try {
      const { conversationId, rating, feedback } = req.body;

      if (!conversationId || !rating) {
        return res.status(400).json({ error: 'Conversation ID and rating are required' });
      }

      if (rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Rating must be between 1 and 5' });
      }

      await analyticsService.recordSatisfaction(conversationId, rating, feedback);

      res.json({ success: true, message: 'Satisfaction rating recorded' });
    } catch (error) {
      console.error('Error recording satisfaction:', error);
      res.status(500).json({ error: 'Failed to record satisfaction' });
    }
  },
};
