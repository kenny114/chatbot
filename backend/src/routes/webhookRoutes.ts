import { Router } from 'express';
import {
  handleChatQuery,
  handleLegacyChatQuery,
  handleBookingClick,
  handleSessionEnd,
} from '../controllers/webhookController';
import { chatValidation } from '../utils/validation';
import { webhookLimiter } from '../middleware/rateLimiter';

const router = Router();

// Public webhook endpoint with state machine (no authentication required)
router.post('/:chatbotId/query', webhookLimiter, chatValidation, handleChatQuery);

// Legacy endpoint for backward compatibility
router.post('/:chatbotId/query/legacy', webhookLimiter, chatValidation, handleLegacyChatQuery);

// Booking tracking endpoint
router.post('/:chatbotId/booking-click', webhookLimiter, handleBookingClick);

// Session end endpoint
router.post('/:chatbotId/session-end', webhookLimiter, handleSessionEnd);

export default router;
