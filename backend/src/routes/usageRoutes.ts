import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { getUserUsage, getPlanFeatures } from '../controllers/usageController';

const router = Router();

// Get current user's usage stats and plan info
router.get('/me', authenticateToken, getUserUsage);

// Get current user's plan features
router.get('/features', authenticateToken, getPlanFeatures);

export default router;
