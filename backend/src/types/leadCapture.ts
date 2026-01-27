// =====================================================
// LEAD CAPTURE & CONVERSATION STATE TYPES
// =====================================================

// Conversation State Machine Types
export type ConversationMode =
  | 'INFO_MODE'
  | 'INTENT_CHECK_MODE'
  | 'LEAD_CAPTURE_MODE'
  | 'QUALIFICATION_MODE'
  | 'BOOKING_MODE'
  | 'CLOSURE_MODE';

export type IntentLevel = 'LOW_INTENT' | 'MEDIUM_INTENT' | 'HIGH_INTENT';

export type LeadCaptureStep = 'ASK_EMAIL' | 'ASK_NAME' | 'ASK_REASON' | 'COMPLETED' | null;

export type BookingStatus = 'NOT_STARTED' | 'LINK_SHARED' | 'COMPLETED' | 'DECLINED';

export type LeadBookingStatus = 'NOT_BOOKED' | 'LINK_SHARED' | 'BOOKED' | 'DECLINED';

// =====================================================
// CONVERSATION SESSION
// =====================================================
export interface ConversationSession {
  id: string;
  chatbot_id: string;
  session_id: string;
  conversation_mode: ConversationMode;
  intent_level: IntentLevel;
  intent_signals: string[];
  lead_capture_step: LeadCaptureStep;
  qualification_step: number;
  qualification_answers: Record<string, string>;
  page_url?: string;
  referrer_url?: string;
  user_agent?: string;
  user_ip?: string;
  message_history: SessionMessage[];
  message_count: number;
  lead_id?: string;
  booking_status: BookingStatus;
  booking_link_clicked_at?: string;
  // Agent-related fields
  visitor_profile_id?: string;
  agent_state?: any;
  conversation_summary?: string;
  tool_calls_count?: number;
  started_at: string;
  last_activity_at: string;
  closed_at?: string;
}

export interface SessionMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface SessionContext {
  page_url?: string;
  referrer_url?: string;
  user_agent?: string;
  user_ip?: string;
}

// =====================================================
// LEAD
// =====================================================
export interface Lead {
  id: string;
  chatbot_id: string;
  email: string;
  name?: string;
  phone?: string;
  reason_for_interest?: string;
  page_url?: string;
  referrer_url?: string;
  intent_level?: IntentLevel;
  qualification_answers: Record<string, string>;
  questions_asked: string[];
  message_count: number;
  conversation_summary?: string;
  booking_status: LeadBookingStatus;
  booking_scheduled_at?: string;
  owner_notified: boolean;
  notification_sent_at?: string;
  notification_method?: string;
  source_session_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateLeadInput {
  chatbot_id: string;
  email: string;
  name?: string;
  phone?: string;
  reason_for_interest?: string;
  page_url?: string;
  referrer_url?: string;
  intent_level?: IntentLevel;
  qualification_answers?: Record<string, string>;
  questions_asked?: string[];
  message_count?: number;
  conversation_summary?: string;
  source_session_id?: string;
}

// =====================================================
// LEAD CAPTURE CONFIGURATION
// =====================================================
export interface LeadCaptureConfig {
  lead_capture_enabled: boolean;
  lead_capture_trigger: IntentLevel | 'ALWAYS';
  require_name: boolean;
  require_reason: boolean;
  booking_enabled: boolean;
  booking_link?: string;
  booking_cta_text: string;
  notification_email?: string;
  notification_webhook_url?: string;
  notify_on_lead: boolean;
  notify_on_booking: boolean;
  intent_keywords: string[];
  high_intent_pages: string[];
  qualification_enabled: boolean;
  qualification_questions: QualificationQuestion[];
  closure_message: string;
  booking_confirmation_message: string;
  // Response settings
  response_tone?: string;
  response_length?: string;
  language?: string;
}

export interface QualificationQuestion {
  id: string;
  question: string;
  required: boolean;
}

// =====================================================
// STATE MACHINE TYPES
// =====================================================
export interface StateTransitionResult {
  next_mode: ConversationMode;
  response: string;
  actions: StateAction[];
  should_capture_lead: boolean;
  should_offer_booking: boolean;
}

export type StateAction =
  | { type: 'CAPTURE_LEAD'; data: Partial<Lead> }
  | { type: 'UPDATE_INTENT'; level: IntentLevel; signals: string[] }
  | { type: 'SEND_NOTIFICATION'; notification_type: NotificationType }
  | { type: 'SHOW_BOOKING'; booking_link: string; cta_text: string }
  | { type: 'SAVE_QUALIFICATION'; question_id: string; answer: string }
  | { type: 'CLOSE_SESSION' };

// =====================================================
// INTENT DETECTION
// =====================================================
export interface IntentDetectionResult {
  level: IntentLevel;
  signals: string[];
  keywords_found: string[];
  page_intent_boost: boolean;
}

// =====================================================
// NOTIFICATION TYPES
// =====================================================
export type NotificationType = 'NEW_LEAD' | 'BOOKING_SCHEDULED' | 'HIGH_INTENT_VISITOR';

export type NotificationDeliveryMethod = 'email' | 'webhook' | 'dashboard';

export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed';

export interface NotificationLog {
  id: string;
  chatbot_id: string;
  lead_id?: string;
  notification_type: NotificationType;
  delivery_method: NotificationDeliveryMethod;
  status: NotificationStatus;
  error_message?: string;
  payload: NotificationPayload;
  created_at: string;
  sent_at?: string;
  delivered_at?: string;
}

export interface NotificationPayload {
  lead_id?: string;
  email?: string;
  name?: string;
  page_url?: string;
  questions_asked?: string[];
  intent_level?: IntentLevel;
  qualification_answers?: Record<string, string>;
  booking_status?: string;
  conversation_summary?: string;
  timestamp: string;
}

// =====================================================
// ENHANCED WEBHOOK REQUEST/RESPONSE
// =====================================================
export interface EnhancedChatRequest {
  message: string;
  session_id: string;
  page_url?: string;
  referrer_url?: string;
}

export interface EnhancedChatResponse {
  response: string;
  sources: string[];
  session_id: string;
  conversation_id: string;
  conversation_mode: ConversationMode;
  intent_level: IntentLevel;
  actions: ClientAction[];
}

export type ClientAction =
  | { type: 'SHOW_EMAIL_INPUT'; prompt: string }
  | { type: 'SHOW_NAME_INPUT'; prompt: string }
  | { type: 'SHOW_REASON_INPUT'; prompt: string }
  | { type: 'SHOW_QUALIFICATION'; question: QualificationQuestion }
  | { type: 'SHOW_BOOKING_LINK'; url: string; cta_text: string }
  | { type: 'CONVERSATION_CLOSED'; message: string }
  | { type: 'NONE' };

// =====================================================
// LEAD CAPTURE STEP RESPONSES
// =====================================================
export interface LeadCaptureStepResult {
  success: boolean;
  next_step: LeadCaptureStep;
  response: string;
  action?: ClientAction;
  lead_data?: Partial<Lead>;
  validation_error?: string;
}

// =====================================================
// CALENDLY INTEGRATION
// =====================================================
export interface CalendlyBookingLink {
  base_url: string;
  prefilled_url: string;
  prefill_params: {
    name?: string;
    email?: string;
  };
}

// =====================================================
// ANALYTICS TYPES
// =====================================================
export interface LeadAnalytics {
  total_leads: number;
  leads_today: number;
  leads_this_week: number;
  leads_this_month: number;
  conversion_rate: number; // leads / conversations
  booking_rate: number; // booked / leads
  high_intent_percentage: number;
  average_messages_before_capture: number;
}

export interface SessionAnalytics {
  total_sessions: number;
  active_sessions: number;
  average_session_duration_minutes: number;
  mode_distribution: Record<ConversationMode, number>;
}
