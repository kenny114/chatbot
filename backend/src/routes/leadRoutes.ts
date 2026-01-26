import { Router } from 'express';
import {
  getLeads,
  getLeadsByChatbot,
  getLead,
  deleteLead,
  getLeadAnalytics,
  getLeadConfig,
  updateLeadConfig,
  exportLeads,
} from '../controllers/leadController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get all leads for authenticated user
router.get('/', getLeads);

// Get single lead
router.get('/:leadId', getLead);

// Delete lead
router.delete('/:leadId', deleteLead);

export default router;

// Additional routes mounted under /api/chatbots/:id
export const chatbotLeadRoutes = Router({ mergeParams: true });

// Get leads for a specific chatbot
chatbotLeadRoutes.get('/leads', authenticateToken, getLeadsByChatbot);

// Get lead analytics for a chatbot
chatbotLeadRoutes.get('/leads/analytics', authenticateToken, getLeadAnalytics);

// Export leads as CSV
chatbotLeadRoutes.get('/leads/export', authenticateToken, exportLeads);

// Get/update lead capture configuration
chatbotLeadRoutes.get('/lead-config', authenticateToken, getLeadConfig);
chatbotLeadRoutes.put('/lead-config', authenticateToken, updateLeadConfig);
