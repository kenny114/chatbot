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
  getDataSourceChunks,
} from '../controllers/chatbotController';
import { customizationController } from '../controllers/customizationController';
import {
  getLeadsByChatbot,
  getLeadAnalytics,
  getLeadConfig,
  updateLeadConfig,
  exportLeads,
} from '../controllers/leadController';
import { authenticateToken } from '../middleware/auth';
import { loadUserPlan, loadUsageStats, enforceChatbotLimit } from '../middleware/planEnforcement';
import {
  createChatbotValidation,
  addUrlSourceValidation,
  addTextSourceValidation,
} from '../utils/validation';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Chatbot CRUD
router.post('/', loadUserPlan, loadUsageStats, enforceChatbotLimit, createChatbotValidation, createChatbot);
router.get('/', getChatbots);
router.get('/:id', getChatbot);
router.delete('/:id', deleteChatbot);

// Data sources
router.post('/:id/sources/url', addUrlSourceValidation, addUrlSource);
router.post('/:id/sources/text', addTextSourceValidation, addTextSource);
router.get('/:id/sources', getDataSources);
router.get('/:chatbotId/sources/:sourceId/chunks', getDataSourceChunks);
router.delete('/:id/sources/:sourceId', deleteDataSource);

// Status
router.get('/:id/status', getChatbotStatus);

// Customization
router.get('/:id/customization', customizationController.getCustomization);
router.put('/:id/customization', customizationController.updateCustomization);
router.delete('/:id/customization', customizationController.resetCustomization);

// Lead capture
router.get('/:id/leads', getLeadsByChatbot);
router.get('/:id/leads/analytics', getLeadAnalytics);
router.get('/:id/leads/export', exportLeads);
router.get('/:id/lead-config', getLeadConfig);
router.put('/:id/lead-config', updateLeadConfig);

export default router;
