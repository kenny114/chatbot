import { Router } from 'express';
import { handleChatQuery } from '../controllers/webhookController';
import { chatValidation } from '../utils/validation';
import { webhookLimiter } from '../middleware/rateLimiter';

const router = Router();

// Public webhook endpoint (no authentication required)
router.post('/:chatbotId/query', webhookLimiter, chatValidation, handleChatQuery);

export default router;
