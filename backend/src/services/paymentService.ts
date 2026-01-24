import paypalClient from '../config/paypal';
import * as paypal from '@paypal/checkout-server-sdk';
import { v4 as uuidv4 } from 'uuid';
import { CreateOrderRequest, CreateOrderResponse, CreateSubscriptionResponse, PaymentPlan } from '../types';

// Payment Plans - Three-tier structure: Free, Pro, Custom
// Add your PayPal Plan IDs from PayPal Dashboard > Products > Plans
const PAYMENT_PLANS: PaymentPlan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    currency: 'USD',
    description: 'Build Only',
    shortDescription: 'Build and configure your AI assistant. Upgrade to go live.',
    features: [
      'Website scraping to import content',
      'Upload documents and FAQs',
      'Select industry and tone',
      'Customize name, colors, avatar, greeting'
    ],
    excludedFeatures: [
      'Test chat preview',
      'Live website embed',
      'Real visitor conversations',
      'Lead capture',
      'Branding removal',
      'Analytics'
    ],
    message_limit: 0,           // No live messages
    chatbot_limit: 1,
    preview_messages: 0,        // No preview testing
    live_embed: false,
    lead_capture: false,
    branding_removal: false,
    analytics_access: 'none',
    business_hours: false,
    paypal_plan_id: undefined,  // Free plan - no PayPal
    cta_text: 'Get Started Free',
    cta_action: 'upgrade',
    highlighted: false
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 45,
    currency: 'USD',
    description: '$45/month',
    shortDescription: 'Go live and turn website visitors into qualified leads.',
    features: [
      'Live website embed',
      'Unlimited website scraping',
      'Unlimited customer conversations',
      'Branding removal',
      'Business hours behavior',
      'Conversation Insights & analytics',
      'Lead capture with qualification',
      'Instant lead notifications',
      'Priority email support'
    ],
    message_limit: -1,          // Unlimited
    chatbot_limit: 3,
    preview_messages: -1,       // Unlimited testing
    live_embed: true,
    lead_capture: true,
    branding_removal: true,
    analytics_access: 'full',
    business_hours: true,
    paypal_plan_id: 'P-18P894864X127040SNFQOK4Q',
    cta_text: 'Get Pro',
    cta_action: 'subscribe',
    highlighted: true           // Recommended plan
  },
  {
    id: 'custom',
    name: 'Custom',
    price: 0,
    currency: 'USD',
    description: 'Contact Us',
    shortDescription: 'Tailored AI solutions for advanced business needs.',
    features: [
      'Everything in Pro',
      'Advanced lead qualification',
      'Phone number capture & SMS',
      'Calendar booking integration',
      'CRM integrations (HubSpot, Salesforce)',
      'Multi-channel bots (WhatsApp, Instagram)',
      'White-label solution',
      'Custom conversation workflows',
      'Dedicated support & onboarding'
    ],
    message_limit: -1,          // Unlimited
    chatbot_limit: -1,          // Unlimited
    preview_messages: -1,
    live_embed: true,
    lead_capture: true,
    branding_removal: true,
    analytics_access: 'full',
    business_hours: true,
    paypal_plan_id: undefined,  // Contact us - no self-serve
    cta_text: 'Contact Sales',
    cta_action: 'contact',
    highlighted: false
  }
];

export class PaymentService {
  /**
   * Get all available payment plans
   */
  async getPlans(): Promise<PaymentPlan[]> {
    return PAYMENT_PLANS;
  }

  /**
   * Get a specific payment plan by ID
   */
  async getPlanById(planId: string): Promise<PaymentPlan | null> {
    return PAYMENT_PLANS.find(plan => plan.id === planId) || null;
  }

  /**
   * Create a PayPal order for a subscription plan
   */
  async createOrder(userId: string, planId: string): Promise<CreateOrderResponse> {
    const plan = await this.getPlanById(planId);

    if (!plan) {
      throw new Error('Payment plan not found');
    }

    const client = paypalClient.getClient();
    const request = new paypal.orders.OrdersCreateRequest();

    request.prefer("return=representation");
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: uuidv4(),
        description: `${plan.name} Plan - AI Chatbot Platform`,
        custom_id: JSON.stringify({ userId, planId }),
        amount: {
          currency_code: plan.currency,
          value: plan.price.toFixed(2)
        }
      }],
      application_context: {
        return_url: `${process.env.FRONTEND_URL}/payment/success`,
        cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
        brand_name: 'AI Chatbot Platform',
        user_action: 'PAY_NOW'
      }
    } as any);

    try {
      const response = await client.execute(request);
      const orderId = response.result.id || '';

      // Find approval URL
      const approvalUrl = response.result.links?.find(
        (link: any) => link.rel === 'approve'
      )?.href || '';

      return {
        order_id: orderId,
        approval_url: approvalUrl
      };
    } catch (error) {
      console.error('PayPal order creation error:', error);
      throw new Error('Failed to create PayPal order');
    }
  }

  /**
   * Capture an approved PayPal order
   */
  async captureOrder(orderId: string) {
    const client = paypalClient.getClient();
    const request = new paypal.orders.OrdersCaptureRequest(orderId);
    request.requestBody({} as any);

    try {
      const response = await client.execute(request);

      if (response.result.status === 'COMPLETED') {
        // Extract custom data (userId, planId)
        const customData = response.result.purchase_units?.[0]?.payments?.captures?.[0]?.custom_id;
        let userId = '';
        let planId = '';

        if (customData) {
          try {
            const parsed = JSON.parse(customData);
            userId = parsed.userId;
            planId = parsed.planId;
          } catch (e) {
            console.error('Failed to parse custom data:', e);
          }
        }

        return {
          status: 'completed',
          orderId,
          userId,
          planId,
          transactionId: response.result.purchase_units?.[0]?.payments?.captures?.[0]?.id,
          amount: response.result.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value,
          currency: response.result.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.currency_code
        };
      } else {
        throw new Error('Payment capture failed');
      }
    } catch (error) {
      console.error('PayPal order capture error:', error);
      throw new Error('Failed to capture PayPal order');
    }
  }

  /**
   * Get order details
   */
  async getOrderDetails(orderId: string) {
    const client = paypalClient.getClient();
    const request = new paypal.orders.OrdersGetRequest(orderId);

    try {
      const response = await client.execute(request);
      return response.result;
    } catch (error) {
      console.error('PayPal get order error:', error);
      throw new Error('Failed to get order details');
    }
  }

  /**
   * Create a PayPal subscription
   * Note: Subscriptions are handled directly via PayPal buttons in frontend
   * This method is for backend-initiated subscriptions if needed
   */
  async createSubscription(userId: string, planId: string): Promise<CreateSubscriptionResponse> {
    const plan = await this.getPlanById(planId);

    if (!plan) {
      throw new Error('Payment plan not found');
    }

    if (!plan.paypal_plan_id) {
      throw new Error('PayPal plan ID not configured for this plan');
    }

    // Note: The old @paypal/checkout-server-sdk doesn't support subscriptions API
    // Subscriptions should be created via frontend PayPal buttons
    throw new Error('Subscriptions are created via PayPal buttons. Use the frontend integration.');
  }

  /**
   * Get subscription details
   * Note: Not supported in old SDK, use PayPal REST API directly if needed
   */
  async getSubscriptionDetails(subscriptionId: string) {
    throw new Error('Use PayPal REST API directly for subscription details');
  }

  /**
   * Cancel a subscription
   * Note: Not supported in old SDK, use PayPal REST API directly if needed
   */
  async cancelSubscription(subscriptionId: string, reason?: string) {
    throw new Error('Use PayPal REST API directly to cancel subscriptions');
  }
}

export default new PaymentService();
