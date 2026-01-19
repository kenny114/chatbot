import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { supabaseAdmin } from '../config/database';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get current user profile with subscription
router.get('/profile', asyncHandler(async (req: any, res: Response) => {
  const userId = req.userId;

  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // Get user data
  const { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .select('id, email, company_name, created_at')
    .eq('id', userId)
    .single();

  if (userError || !user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  // Get subscription data
  const { data: subscription } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();

  res.json({
    user: {
      id: user.id,
      email: user.email,
      company_name: user.company_name,
      created_at: user.created_at,
    },
    subscription: subscription || null,
  });
}));

export default router;
