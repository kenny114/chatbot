export interface User {
  id: string;
  email: string;
  password_hash: string;
  company_name: string;
  created_at: string;
}

export interface Chatbot {
  id: string;
  user_id: string;
  name: string;
  description: string;
  instructions: string;
  webhook_url: string;
  status: 'processing' | 'ready' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface DataSource {
  id: string;
  chatbot_id: string;
  type: 'url' | 'text';
  source_url?: string;
  content?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface ContentChunk {
  id: string;
  chatbot_id: string;
  data_source_id: string;
  content: string;
  embedding: number[];
  metadata: {
    source_url?: string;
    chunk_index: number;
    total_chunks: number;
  };
  created_at: string;
}

export interface Conversation {
  id: string;
  chatbot_id: string;
  user_message: string;
  bot_response: string;
  sources_used: string[];
  created_at: string;
}

export interface ChatRequest {
  message: string;
  conversation_id?: string;
}

export interface ChatResponse {
  response: string;
  sources: string[];
  conversation_id: string;
}

export interface PaymentPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  description: string;
  shortDescription: string;
  features: string[];
  excludedFeatures?: string[];
  message_limit: number;      // -1 for unlimited, 0 for none (preview only)
  chatbot_limit: number;      // -1 for unlimited
  preview_messages: number;   // Manual test messages allowed (Free plan)
  live_embed: boolean;        // Can embed on live website
  lead_capture: boolean;      // Can capture leads
  branding_removal: boolean;  // Can remove "Powered by" branding
  analytics_access: 'none' | 'preview' | 'full';
  business_hours: boolean;    // Can set business hours behavior
  paypal_plan_id?: string;    // PayPal subscription plan ID
  cta_text: string;           // Call-to-action button text
  cta_action: 'upgrade' | 'subscribe' | 'contact';
  highlighted?: boolean;      // Show as recommended/popular
}

export interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: 'active' | 'cancelled' | 'expired';
  paypal_subscription_id: string;
  current_period_start: string;
  current_period_end: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentTransaction {
  id: string;
  user_id: string;
  subscription_id?: string;
  paypal_order_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  created_at: string;
  updated_at: string;
}

export interface CreateOrderRequest {
  plan_id: string;
}

export interface CreateOrderResponse {
  order_id: string;
  approval_url: string;
}

export interface CaptureOrderRequest {
  order_id: string;
}

export interface CreateSubscriptionRequest {
  plan_id: string;
}

export interface CreateSubscriptionResponse {
  subscription_id: string;
  approval_url: string;
}

export interface SubscriptionDetails {
  subscription_id: string;
  status: string;
  plan_id: string;
  start_time: string;
  subscriber: any;
}

// JWT payload interface
export interface JWTPayload {
  userId: string;
  email: string;
}

// Extend Express Request type to include user from JWT
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

// Export lead capture types
export * from './leadCapture';
