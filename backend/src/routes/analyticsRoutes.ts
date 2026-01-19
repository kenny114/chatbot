import express from 'express';
import { analyticsController } from '../controllers/analyticsController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// All analytics routes require authentication
router.use(authenticateToken);

// GET /api/analytics/overview - Get analytics overview
router.get('/overview', analyticsController.getOverview);

// GET /api/analytics/messages - Get messages over time
router.get('/messages', analyticsController.getMessagesOverTime);

// GET /api/analytics/popular-questions - Get popular questions
router.get('/popular-questions', analyticsController.getPopularQuestions);

// GET /api/analytics/response-times - Get response times by hour
router.get('/response-times', analyticsController.getResponseTimes);

// GET /api/analytics/conversations - Get recent conversations
router.get('/conversations', analyticsController.getConversations);

// POST /api/analytics/satisfaction - Record satisfaction rating
router.post('/satisfaction', analyticsController.recordSatisfaction);

export default router;
