import { Router } from 'express';
import {
  createChatbot,
  getChatbots,
  getChatbot,
  deleteChatbot,
  addUrlSource,
  addTextSource,
  getDataSources,
  getChatbotStatus,
  deleteDataSource,
} from '../controllers/chatbotController';
import { authenticateToken } from '../middleware/auth';
import {
  createChatbotValidation,
  addUrlSourceValidation,
  addTextSourceValidation,
} from '../utils/validation';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Chatbot CRUD
router.post('/', createChatbotValidation, createChatbot);
router.get('/', getChatbots);
router.get('/:id', getChatbot);
router.delete('/:id', deleteChatbot);

// Data sources
router.post('/:id/sources/url', addUrlSourceValidation, addUrlSource);
router.post('/:id/sources/text', addTextSourceValidation, addTextSource);
router.get('/:id/sources', getDataSources);
router.delete('/:id/sources/:sourceId', deleteDataSource);

// Status
router.get('/:id/status', getChatbotStatus);

export default router;
