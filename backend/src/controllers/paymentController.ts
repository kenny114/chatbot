import { Response } from 'express';
import paymentService from '../services/paymentService';
import pool from '../config/database';
import { CreateOrderRequest, CaptureOrderRequest, CreateSubscriptionRequest } from '../types';
import { AuthRequest } from '../middleware/auth';

/**
 * Get all available payment plans
 */
export const getPlans = async (req: AuthRequest, res: Response) => {
  try {
    const plans = await paymentService.getPlans();
    res.json({
      success: true,
      plans
    });
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve payment plans'
    });
  }
};

/**
 * Get a specific payment plan by ID
 */
export const getPlanById = async (req: AuthRequest, res: Response) => {
  try {
    const { planId } = req.params;
    const plan = await paymentService.getPlanById(planId);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Payment plan not found'
      });
    }

    res.json({
      success: true,
      plan
    });
  } catch (error) {
    console.error('Get plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve payment plan'
    });
  }
};

/**
 * Create a PayPal order
 */
export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { plan_id } = req.body as CreateOrderRequest;
    const userId = req.userId; // Auth middleware adds userId to request

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!plan_id) {
      return res.status(400).json({
        success: false,
        message: 'Plan ID is required'
      });
    }

    const order = await paymentService.createOrder(userId, plan_id);

    res.json({
      success: true,
      order
    });
  } catch (error: any) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create order'
    });
  }
};

/**
 * Capture a PayPal order after user approval
 */
export const captureOrder = async (req: AuthRequest, res: Response) => {
  try {
    const { order_id } = req.body as CaptureOrderRequest;

    if (!order_id) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }

    const result = await paymentService.captureOrder(order_id);

    // TODO: Save transaction to database
    // TODO: Update user subscription status
    // TODO: Send confirmation email

    res.json({
      success: true,
      transaction: result
    });
  } catch (error: any) {
    console.error('Capture order error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to capture order'
    });
  }
};

/**
 * Get order details
 */
export const getOrderDetails = async (req: AuthRequest, res: Response) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }

    const order = await paymentService.getOrderDetails(orderId);

    res.json({
      success: true,
      order
    });
  } catch (error: any) {
    console.error('Get order details error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get order details'
    });
  }
};

/**
 * Create a PayPal subscription
 */
export const createSubscription = async (req: AuthRequest, res: Response) => {
  try {
    const { plan_id } = req.body as CreateSubscriptionRequest;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!plan_id) {
      return res.status(400).json({
        success: false,
        message: 'Plan ID is required'
      });
    }

    const subscription = await paymentService.createSubscription(userId, plan_id);

    res.json({
      success: true,
      subscription
    });
  } catch (error: any) {
    console.error('Create subscription error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create subscription'
    });
  }
};

/**
 * Get subscription details
 */
export const getSubscriptionDetails = async (req: AuthRequest, res: Response) => {
  try {
    const { subscriptionId } = req.params;

    if (!subscriptionId) {
      return res.status(400).json({
        success: false,
        message: 'Subscription ID is required'
      });
    }

    const subscription = await paymentService.getSubscriptionDetails(subscriptionId);

    res.json({
      success: true,
      subscription
    });
  } catch (error: any) {
    console.error('Get subscription details error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get subscription details'
    });
  }
};

/**
 * Cancel a subscription
 */
export const cancelSubscription = async (req: AuthRequest, res: Response) => {
  try {
    const { subscriptionId } = req.params;
    const { reason } = req.body;

    if (!subscriptionId) {
      return res.status(400).json({
        success: false,
        message: 'Subscription ID is required'
      });
    }

    const result = await paymentService.cancelSubscription(subscriptionId, reason);

    res.json({
      success: true,
      result
    });
  } catch (error: any) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to cancel subscription'
    });
  }
};

/**
 * Activate a subscription after PayPal approval
 * Called from frontend after user approves the subscription
 */
export const activateSubscription = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { subscription_id, plan_id } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!subscription_id || !plan_id) {
      return res.status(400).json({
        success: false,
        message: 'Subscription ID and Plan ID are required'
      });
    }

    // Get the plan details
    const plan = await paymentService.getPlanById(plan_id);
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found'
      });
    }

    // Calculate billing period (monthly)
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    // Upsert subscription (insert or update if exists)
    const result = await pool.query(
      `INSERT INTO subscriptions (
        user_id, plan_id, plan_name, status,
        paypal_subscription_id, paypal_plan_id,
        current_period_start, current_period_end
      ) VALUES ($1, $2, $3, 'active', $4, $5, $6, $7)
      ON CONFLICT (user_id)
      DO UPDATE SET
        plan_id = $2,
        plan_name = $3,
        status = 'active',
        paypal_subscription_id = $4,
        paypal_plan_id = $5,
        current_period_start = $6,
        current_period_end = $7,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [userId, plan_id, plan.name, subscription_id, plan.paypal_plan_id, now, periodEnd]
    );

    console.log(`Subscription activated for user ${userId}: ${plan.name}`);

    res.json({
      success: true,
      message: 'Subscription activated successfully',
      subscription: result.rows[0]
    });
  } catch (error: any) {
    console.error('Activate subscription error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to activate subscription'
    });
  }
};

/**
 * Handle PayPal webhook events
 */
export const handleWebhook = async (req: AuthRequest, res: Response) => {
  try {
    const event = req.body;

    console.log('PayPal webhook event received:', event.event_type);

    // TODO: Verify webhook signature
    // TODO: Handle different event types and save to database

    switch (event.event_type) {
      // One-time payment events
      case 'PAYMENT.CAPTURE.COMPLETED':
        console.log('Payment completed:', event.resource);
        // TODO: Save transaction to database
        // TODO: Update user subscription status
        break;
      case 'PAYMENT.CAPTURE.DENIED':
        console.log('Payment denied:', event.resource);
        // TODO: Update transaction status in database
        break;

      // Subscription events
      case 'BILLING.SUBSCRIPTION.CREATED':
        console.log('Subscription created:', event.resource);
        // TODO: Save subscription to database
        break;
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
        console.log('Subscription activated:', event.resource);
        // TODO: Activate user's subscription in database
        // TODO: Send welcome email
        break;
      case 'BILLING.SUBSCRIPTION.UPDATED':
        console.log('Subscription updated:', event.resource);
        // TODO: Update subscription in database
        break;
      case 'BILLING.SUBSCRIPTION.CANCELLED':
        console.log('Subscription cancelled:', event.resource);
        // TODO: Mark subscription as cancelled in database
        break;
      case 'BILLING.SUBSCRIPTION.SUSPENDED':
        console.log('Subscription suspended:', event.resource);
        // TODO: Suspend user access
        break;
      case 'BILLING.SUBSCRIPTION.EXPIRED':
        console.log('Subscription expired:', event.resource);
        // TODO: Mark subscription as expired in database
        break;

      default:
        console.log('Unhandled event type:', event.event_type);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({
      success: false,
      message: 'Webhook processing failed'
    });
  }
};
