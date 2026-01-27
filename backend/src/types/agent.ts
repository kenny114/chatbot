/**
 * TypeScript Type Definitions for LangChain Agent System
 */

import { BaseMessage } from 'langchain/schema';
import { Tool } from 'langchain/tools';
import {
  IntentLevel,
  ConversationMode,
  ConversationSession,
  SessionMessage,
} from './leadCapture';

// =============================================================================
// VISITOR PROFILE TYPES
// =============================================================================

export type VisitorIdentifierType = 'email' | 'fingerprint' | 'ip';

export interface VisitorProfile {
  id: string;
  chatbot_id: string;
  visitor_identifier: string;
  identifier_type: VisitorIdentifierType;

  // Personal info (null until lead captured)
  email: string | null;
  name: string | null;

  // Behavioral data
  profile_data: VisitorProfileData;
  conversation_summaries: string[];
  total_sessions: number;
  total_messages: number;
  last_interaction: string | null;

  // Relationships
  lead_id: string | null;

  // Timestamps
  first_seen_at: Date;
  last_seen_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface VisitorProfileData {
  interests: string[];
  preferences: Record<string, unknown>;
  engagement_score: number; // 0-100
  last_topics: string[];
  behavioral_signals: string[];
}

export interface CreateVisitorProfileInput {
  chatbot_id: string;
  visitor_identifier: string;
  identifier_type: VisitorIdentifierType;
  email?: string;
  name?: string;
  profile_data?: Partial<VisitorProfileData>;
}

export interface UpdateVisitorProfileInput {
  interests?: string[];
  notes?: string;
  last_interaction?: string;
  engagement_score?: number;
}

// =============================================================================
// AGENT STATE TYPES
// =============================================================================

export interface AgentState {
  // Tool execution history
  tool_calls: ToolCallRecord[];

  // Reasoning traces
  reasoning_steps: ReasoningStep[];

  // Conversation state
  current_goal: string | null;
  captured_data: Record<string, unknown>;

  // Metrics
  total_tokens_used: number;
  total_cost: number;
  execution_time_ms: number;

  // Flags
  fallback_triggered: boolean;
  error_count: number;
}

export interface ToolCallRecord {
  tool_name: string;
  input: Record<string, unknown>;
  output: string;
  success: boolean;
  error?: string;
  timestamp: Date;
  duration_ms: number;
}

export interface ReasoningStep {
  step: number;
  thought: string;
  action: string;
  observation: string;
  timestamp: Date;
}

// =============================================================================
// AGENT EXECUTION TYPES
// =============================================================================

export interface AgentExecutionContext {
  chatbot_id: string;
  session_id: string;
  visitor_profile?: VisitorProfile;
  conversation_history: BaseMessage[];
  config: AgentConfiguration;
  chatbot_instructions: string;
}

export interface AgentConfiguration {
  // LLM settings
  model: string;
  temperature: number;
  max_tokens: number;

  // Execution limits
  max_iterations: number;
  max_tool_retries: number;
  timeout_ms: number;

  // Memory settings
  conversation_window: number;
  enable_visitor_profiles: boolean;

  // Safety settings
  enable_guardrails: boolean;
  enable_fallback: boolean;
  fallback_to_rag_on_error: boolean;

  // Tool settings
  rag_top_k: number;
  min_exchanges_before_capture: number;
}

export interface AgentResponse {
  // Response to user
  response: string;
  sources?: string[];

  // Conversation state (for backward compatibility with state machine)
  conversation_mode: ConversationMode;
  intent_level: IntentLevel;

  // Actions for frontend
  actions: ClientAction[];

  // Agent metadata
  agent_state: AgentState;
  tool_calls_count: number;

  // Flags
  agent_used: boolean;
  fallback_used: boolean;
  error?: string;
}

export interface ClientAction {
  type: 'SHOW_EMAIL_INPUT' | 'SHOW_NAME_INPUT' | 'SHOW_QUALIFICATION' | 'SHOW_BOOKING_LINK' | 'CONVERSATION_CLOSED' | 'NONE';

  // Email/Name capture
  prompt?: string;
  field_name?: string;

  // Qualification
  question?: {
    id: string;
    question: string;
    required: boolean;
  };
  question_number?: number;
  total_questions?: number;

  // Booking
  url?: string;
  cta_text?: string;

  // Closure
  message?: string;
}

// =============================================================================
// TOOL RESULT TYPES
// =============================================================================

export interface RAGToolResult {
  answer: string;
  confidence: 'low' | 'medium' | 'high';
  sources: string[];
  chunks_used: number;
}

export interface IntentToolResult {
  intent_level: IntentLevel;
  signals: string[];
  keywords_found: string[];
  readiness_indicators: string[];
  recommendation: string;
}

export interface CaptureLeadToolResult {
  success: boolean | 'partial';
  captured?: ('email' | 'name')[];
  requires_input?: 'email' | 'name';
  prompt_message?: string;
  lead_id?: string;
  next_action?: 'qualification' | 'booking_or_closure';
  error?: string;
  message?: string;
}

export interface QualificationToolResult {
  completed: boolean;
  question?: string;
  progress?: string;
  next_action?: 'offer_booking';
  message?: string;
}

export interface BookingToolResult {
  available: boolean;
  booking_url?: string;
  cta_text?: string;
  message: string;
}

export interface NotificationToolResult {
  success: boolean;
  message: string;
  error?: string;
}

export interface VisitorProfileToolResult {
  success: boolean;
  message: string;
  profile_id?: string;
}

// =============================================================================
// TOOL INPUT SCHEMAS (For Zod validation)
// =============================================================================

export interface AnswerQuestionInput {
  query: string;
  conversation_context?: string;
}

export interface AnalyzeIntentInput {
  recent_messages: string[];
  page_url?: string;
}

export interface CaptureLeadInput {
  visitor_message: string;
  reason_for_interest?: string;
}

export interface AskQualificationInput {
  answer?: string;
}

export interface OfferBookingInput {
  reason?: string;
}

export interface SendNotificationInput {
  lead_id: string;
  urgency: 'high' | 'urgent';
  reason: string;
}

export interface UpdateVisitorProfileInput {
  interests?: string[];
  notes?: string;
}

// =============================================================================
// AGENT ORCHESTRATOR TYPES
// =============================================================================

export interface OrchestratorOptions {
  chatbot_id: string;
  config: AgentConfiguration;
  chatbot_instructions: string;
  session: ConversationSession;
  visitor_profile?: VisitorProfile;
}

// ConversationSession type is imported from leadCapture.ts

// SessionMessage type is imported from leadCapture.ts

// =============================================================================
// ERROR TYPES
// =============================================================================

export class AgentExecutionError extends Error {
  constructor(
    message: string,
    public code: string,
    public recoverable: boolean = true,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AgentExecutionError';
  }
}

export class ToolExecutionError extends Error {
  constructor(
    message: string,
    public tool_name: string,
    public input: Record<string, unknown>,
    public recoverable: boolean = true
  ) {
    super(message);
    this.name = 'ToolExecutionError';
  }
}

export class AgentTimeoutError extends Error {
  constructor(
    public timeout_ms: number,
    public iterations_completed: number
  ) {
    super(`Agent execution exceeded ${timeout_ms}ms timeout after ${iterations_completed} iterations`);
    this.name = 'AgentTimeoutError';
  }
}

// =============================================================================
// METRICS TYPES
// =============================================================================

export interface AgentMetrics {
  // Execution metrics
  total_conversations: number;
  avg_response_time_ms: number;
  p50_response_time_ms: number;
  p95_response_time_ms: number;
  p99_response_time_ms: number;

  // Tool usage
  tool_execution_count: Record<string, number>;
  tool_success_rate: Record<string, number>;
  avg_tools_per_conversation: number;

  // Quality metrics
  lead_capture_rate: number;
  booking_conversion_rate: number;
  fallback_rate: number;
  error_rate: number;

  // Cost metrics
  total_tokens_used: number;
  avg_tokens_per_message: number;
  total_cost_usd: number;
  cost_per_conversation: number;

  // Agent-specific
  avg_reasoning_steps: number;
  visitor_profile_hit_rate: number;

  // Timestamps
  period_start: Date;
  period_end: Date;
}

export interface ConversationMetrics {
  conversation_id: string;
  chatbot_id: string;
  duration_ms: number;
  message_count: number;
  tool_calls_count: number;
  tools_used: string[];
  lead_captured: boolean;
  booking_offered: boolean;
  booking_clicked: boolean;
  intent_level: IntentLevel;
  fallback_used: boolean;
  error_occurred: boolean;
  cost_usd: number;
  tokens_used: number;
  timestamp: Date;
}

// =============================================================================
// LANGCHAIN INTEGRATION TYPES
// =============================================================================

export interface LangChainTool {
  name: string;
  description: string;
  schema: any; // Zod schema
  func: (input: any) => Promise<string>;
}

export interface AgentMemory {
  chat_history: BaseMessage[];
  visitor_context?: string;
  session_summary?: string;
}
