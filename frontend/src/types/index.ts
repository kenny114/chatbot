export interface User {
  id: string;
  email: string;
  companyName: string;
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

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
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
  message_limit: number;
  chatbot_limit: number;
  preview_messages: number;
  live_embed: boolean;
  lead_capture: boolean;
  branding_removal: boolean;
  analytics_access: 'none' | 'preview' | 'full';
  business_hours: boolean;
  paypal_plan_id?: string;
  cta_text: string;
  cta_action: 'upgrade' | 'subscribe' | 'contact';
  highlighted?: boolean;
}
