import express from 'express';
import {
  getPlans,
  getPlanById,
  createOrder,
  captureOrder,
  getOrderDetails,
  createSubscription,
  getSubscriptionDetails,
  cancelSubscription,
  activateSubscription,
  handleWebhook
} from '../controllers/paymentController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Public routes
router.get('/plans', getPlans);
router.get('/plans/:planId', getPlanById);

// Protected routes (require authentication)
router.post('/orders', authenticateToken, createOrder);
router.post('/orders/:orderId/capture', authenticateToken, captureOrder);
router.get('/orders/:orderId', authenticateToken, getOrderDetails);

// Subscription routes (require authentication)
router.post('/subscriptions', authenticateToken, createSubscription);
router.post('/subscriptions/activate', authenticateToken, activateSubscription);
router.get('/subscriptions/:subscriptionId', authenticateToken, getSubscriptionDetails);
router.post('/subscriptions/:subscriptionId/cancel', authenticateToken, cancelSubscription);

// Webhook route (no auth, PayPal will send events here)
router.post('/webhook', handleWebhook);

export default router;
