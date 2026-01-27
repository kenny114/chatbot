/**
 * Agent Orchestrator
 * Main controller for LangChain agent initialization and execution
 */

import { ChatOpenAI } from '@langchain/openai';
import { AgentExecutor, createOpenAIFunctionsAgent } from 'langchain/agents';
import { BufferWindowMemory } from 'langchain/memory';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { HumanMessage, AIMessage, BaseMessage } from '@langchain/core/messages';
import { StructuredTool } from '@langchain/core/tools';

// Import tools
import { createAnswerQuestionTool } from './tools/answerQuestionTool';
import { createAnalyzeIntentTool } from './tools/analyzeIntentTool';
import { createCaptureLeadTool } from './tools/captureLeadTool';
import { createAskQualificationTool } from './tools/askQualificationTool';
import { createOfferBookingTool } from './tools/offerBookingTool';
import { createSendNotificationTool } from './tools/sendNotificationTool';
import { createUpdateVisitorProfileTool } from './tools/updateVisitorProfileTool';

// Import services
import { sessionService } from './sessionService';
import { notificationService } from './notificationService';
import { visitorProfileService } from './visitorProfileService';
import { ragService } from './ragService';

// Import types
import {
  AgentResponse,
  AgentState,
  ToolCallRecord,
  VisitorProfile,
} from '../types/agent';
import {
  LeadCaptureConfig,
  ConversationMode,
  IntentLevel,
  ConversationSession,
} from '../types/leadCapture';
import { AGENT_CONFIG } from '../config/agent';

export class AgentOrchestrator {
  private chatbotId: string;
  private sessionId: string;
  private config: LeadCaptureConfig;
  private chatbotInstructions: string;
  private session: ConversationSession;
  private visitorProfile: VisitorProfile | null;

  // LangChain components
  private llm: ChatOpenAI;
  private memory: BufferWindowMemory;
  private tools: StructuredTool[];
  private agent: AgentExecutor | null = null;
  private agentState: AgentState;

  constructor(
    chatbotId: string,
    config: LeadCaptureConfig,
    chatbotInstructions: string,
    session: ConversationSession,
    visitorProfile: VisitorProfile | null = null
  ) {
    this.chatbotId = chatbotId;
    this.sessionId = session.session_id;
    this.config = config;
    this.chatbotInstructions = chatbotInstructions;
    this.session = session;
    this.visitorProfile = visitorProfile;

    // Initialize LLM
    this.llm = new ChatOpenAI({
      modelName: AGENT_CONFIG.MODEL,
      temperature: AGENT_CONFIG.TEMPERATURE,
      maxTokens: AGENT_CONFIG.MAX_TOKENS,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    // Initialize agent state
    this.agentState = session.agent_state || {
      tool_calls: [],
      reasoning_steps: [],
      current_goal: null,
      captured_data: {},
      total_tokens_used: 0,
      total_cost: 0,
      execution_time_ms: 0,
      fallback_triggered: false,
      error_count: 0,
    };

    // Load tools
    this.tools = this.initializeTools();

    // Load memory
    this.memory = this.loadMemory();
  }

  /**
   * Initialize all available tools for the agent
   */
  private initializeTools(): StructuredTool[] {
    const tools: StructuredTool[] = [];

    // 1. Answer Question Tool (RAG) - Most frequently used
    tools.push(createAnswerQuestionTool(this.chatbotId));

    // 2. Analyze Intent Tool
    tools.push(createAnalyzeIntentTool(this.config));

    // 3. Capture Lead Tool (only if enabled)
    if (this.config.lead_capture_enabled) {
      tools.push(createCaptureLeadTool(this.chatbotId, this.sessionId, this.config));
    }

    // 4. Ask Qualification Tool (only if enabled)
    if (this.config.qualification_enabled && this.config.qualification_questions?.length > 0) {
      tools.push(createAskQualificationTool(this.sessionId, this.config));
    }

    // 5. Offer Booking Tool (only if enabled)
    if (this.config.booking_enabled && this.config.booking_link) {
      tools.push(createOfferBookingTool(this.chatbotId, this.sessionId, this.config));
    }

    // 6. Send Notification Tool
    tools.push(createSendNotificationTool(this.chatbotId, this.config));

    // 7. Update Visitor Profile Tool (only if enabled)
    if (AGENT_CONFIG.ENABLE_VISITOR_PROFILES) {
      tools.push(createUpdateVisitorProfileTool(this.sessionId));
    }

    console.log(`[AgentOrchestrator] Initialized ${tools.length} tools`);

    return tools;
  }

  /**
   * Load conversation memory from session
   */
  private loadMemory(): BufferWindowMemory {
    const memory = new BufferWindowMemory({
      k: AGENT_CONFIG.CONVERSATION_WINDOW,
      memoryKey: 'chat_history',
      returnMessages: true,
      inputKey: 'input',
      outputKey: 'output',
    });

    // Load session message history
    for (const msg of this.session.message_history || []) {
      if (msg.role === 'user') {
        memory.chatHistory.addMessage(new HumanMessage(msg.content));
      } else {
        memory.chatHistory.addMessage(new AIMessage(msg.content));
      }
    }

    console.log(`[AgentOrchestrator] Loaded ${this.session.message_history?.length || 0} messages into memory`);

    return memory;
  }

  /**
   * Build dynamic system prompt with context
   */
  private buildSystemPrompt(): ChatPromptTemplate {
    let systemMessage = `You are an intelligent AI assistant for ${this.chatbotInstructions}.

YOUR PRIMARY OBJECTIVES (in priority order):
1. Answer visitor questions accurately using the knowledge base (use answer_question tool frequently)
2. Build rapport and understand visitor needs through natural conversation
3. Identify high-intent visitors who would benefit from human connection
4. Capture lead information when timing feels natural (MINIMUM 2 helpful exchanges first)
5. Facilitate call bookings for qualified prospects

CONVERSATION FLOW PRINCIPLES:
- Be helpful first, never pushy or sales-focused
- Ask clarifying questions to understand visitor context
- Use the answer_question tool to provide accurate, value-driven responses
- Detect intent signals naturally: pricing questions, timeline mentions, explicit requests
- CRITICAL: Wait for at least 2-3 meaningful exchanges before considering lead capture
- Offer bookings as a benefit: "I can connect you with our team for personalized help"
- NEVER capture leads on first message unless visitor explicitly requests immediate contact

LEAD CAPTURE GUIDELINES:
- Minimum ${AGENT_CONFIG.MIN_EXCHANGES_BEFORE_CAPTURE} helpful exchanges before considering lead capture
- Look for natural signals: "how much", "when can we start", "can we talk", "pricing", "demo"
- Ask permission: "Would it help to connect you with our team?"
- If visitor declines, return to being helpful immediately
- Use capture_lead tool only when visitor shows clear interest AND engagement

CURRENT CONFIGURATION:
- Lead capture: ${this.config.lead_capture_enabled ? 'ENABLED' : 'DISABLED'}
- Booking: ${this.config.booking_enabled ? 'ENABLED' : 'DISABLED'}
- Qualification: ${this.config.qualification_enabled ? 'ENABLED' : 'DISABLED'}
- Response tone: ${this.config.response_tone || 'professional'}
- Response length: ${this.config.response_length || 'concise'}`;

    // Add visitor profile context if available
    if (this.visitorProfile && this.visitorProfile.total_sessions > 1) {
      const visitorContext = visitorProfileService.buildVisitorContext(this.visitorProfile);
      systemMessage += `\n\nVISITOR PROFILE (from previous sessions):
${visitorContext}

Use this context to provide personalized, continuous conversations. Reference their past interests naturally.`;
    }

    // Add qualification questions context
    if (this.config.qualification_enabled && this.config.qualification_questions?.length > 0) {
      systemMessage += `\n\nQUALIFICATION QUESTIONS (ask AFTER capturing lead):
${this.config.qualification_questions.map((q, i) => `${i + 1}. ${q.question}`).join('\n')}`;
    }

    return ChatPromptTemplate.fromMessages([
      ['system', systemMessage],
      new MessagesPlaceholder('chat_history'),
      ['human', '{input}'],
      new MessagesPlaceholder('agent_scratchpad'),
    ]);
  }

  /**
   * Initialize the agent executor
   */
  private async createAgent(): Promise<AgentExecutor> {
    const prompt = this.buildSystemPrompt();

    const agent = await createOpenAIFunctionsAgent({
      llm: this.llm,
      tools: this.tools,
      prompt,
    });

    return new AgentExecutor({
      agent,
      tools: this.tools,
      memory: this.memory,
      maxIterations: AGENT_CONFIG.MAX_ITERATIONS,
      returnIntermediateSteps: AGENT_CONFIG.TRACK_INTERMEDIATE_STEPS,
      verbose: AGENT_CONFIG.LOG_LEVEL === 'debug',
    });
  }

  /**
   * Execute a conversation turn with the agent
   */
  async executeConversationTurn(userMessage: string): Promise<AgentResponse> {
    const startTime = Date.now();

    try {
      console.log(`[AgentOrchestrator] Processing message for session: ${this.sessionId}`);

      // Initialize agent if not done yet
      if (!this.agent) {
        this.agent = await this.createAgent();
      }

      // Execute agent with timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Agent execution timeout')), AGENT_CONFIG.TIMEOUT_MS);
      });

      const agentPromise = this.agent.invoke({
        input: userMessage,
      });

      const result = await Promise.race([agentPromise, timeoutPromise]) as any;

      // Extract tool calls from intermediate steps
      if (result.intermediateSteps) {
        for (const step of result.intermediateSteps) {
          const toolCall: ToolCallRecord = {
            tool_name: step.action?.tool || 'unknown',
            input: step.action?.toolInput || {},
            output: step.observation || '',
            success: true,
            timestamp: new Date(),
            duration_ms: 0,
          };
          this.agentState.tool_calls.push(toolCall);
        }
      }

      // Update execution metrics
      this.agentState.execution_time_ms = Date.now() - startTime;

      // Parse response and build client response
      const agentResponse = await this.buildResponse(result.output, userMessage);

      // Save agent state to session
      await this.saveAgentState();

      console.log(`[AgentOrchestrator] Completed in ${this.agentState.execution_time_ms}ms`);

      return agentResponse;

    } catch (error) {
      console.error('[AgentOrchestrator] Execution error:', error);

      this.agentState.error_count++;
      this.agentState.fallback_triggered = true;

      // Fallback to RAG-only response
      if (AGENT_CONFIG.FALLBACK_TO_RAG_ON_ERROR) {
        return this.fallbackResponse(userMessage, error);
      }

      throw error;
    }
  }

  /**
   * Build structured response from agent output
   */
  private async buildResponse(agentOutput: string, userMessage: string): Promise<AgentResponse> {
    // Get updated session to check state changes
    const updatedSession = await sessionService.getSessionById(this.sessionId);

    // Infer conversation mode from tool calls and session state
    const conversationMode = this.inferConversationMode(updatedSession);
    const intentLevel = updatedSession?.intent_level || this.session.intent_level;

    // Build client actions based on mode and tool calls
    const actions = this.buildClientActions(conversationMode, updatedSession);

    return {
      response: agentOutput,
      sources: [], // Sources would be in tool results if answer_question was called
      conversation_mode: conversationMode,
      intent_level: intentLevel,
      actions,
      agent_state: this.agentState,
      tool_calls_count: this.agentState.tool_calls.length,
      agent_used: true,
      fallback_used: false,
    };
  }

  /**
   * Infer conversation mode from session state
   */
  private inferConversationMode(session: ConversationSession | null): ConversationMode {
    if (!session) return 'INFO_MODE';

    // Check explicit mode set by tools
    if (session.conversation_mode) {
      return session.conversation_mode;
    }

    // Infer from state
    if (session.lead_id) {
      if (session.qualification_step > 0 && this.config.qualification_enabled) {
        return 'QUALIFICATION_MODE';
      }
      if (this.config.booking_enabled) {
        return 'BOOKING_MODE';
      }
      return 'CLOSURE_MODE';
    }

    if (session.intent_level === 'HIGH_INTENT' && session.message_count >= AGENT_CONFIG.MIN_EXCHANGES_BEFORE_CAPTURE) {
      return 'INTENT_CHECK_MODE';
    }

    return 'INFO_MODE';
  }

  /**
   * Build client actions for frontend
   */
  private buildClientActions(mode: ConversationMode, session: ConversationSession | null): any[] {
    const actions: any[] = [];

    // Check if any tool indicated a specific action
    const lastToolCall = this.agentState.tool_calls[this.agentState.tool_calls.length - 1];

    if (lastToolCall?.tool_name === 'offer_booking' && lastToolCall.success) {
      try {
        const result = JSON.parse(lastToolCall.output);
        if (result.available) {
          actions.push({
            type: 'SHOW_BOOKING_LINK',
            url: result.booking_url,
            cta_text: result.cta_text,
          });
        }
      } catch (e) {
        // Parse error, ignore
      }
    }

    return actions;
  }

  /**
   * Fallback to RAG-only response on agent error
   */
  private async fallbackResponse(userMessage: string, error: any): Promise<AgentResponse> {
    console.log('[AgentOrchestrator] Using RAG fallback');

    try {
      const ragResult = await ragService.generateResponse(
        this.chatbotId,
        userMessage,
        this.chatbotInstructions,
        {
          tone: this.config.response_tone || 'professional',
          length: this.config.response_length || 'concise',
        }
      );

      return {
        response: ragResult.response,
        sources: ragResult.sources,
        conversation_mode: this.session.conversation_mode || 'INFO_MODE',
        intent_level: this.session.intent_level || 'LOW_INTENT',
        actions: [],
        agent_state: this.agentState,
        tool_calls_count: 0,
        agent_used: false,
        fallback_used: true,
        error: error instanceof Error ? error.message : 'Unknown error',
      };

    } catch (fallbackError) {
      console.error('[AgentOrchestrator] Fallback also failed:', fallbackError);

      return {
        response: "I'm having trouble processing your request right now. Please try again in a moment, or contact us directly.",
        sources: [],
        conversation_mode: 'INFO_MODE',
        intent_level: 'LOW_INTENT',
        actions: [],
        agent_state: this.agentState,
        tool_calls_count: 0,
        agent_used: false,
        fallback_used: true,
        error: 'Complete failure',
      };
    }
  }

  /**
   * Save agent state to session
   */
  private async saveAgentState(): Promise<void> {
    await sessionService.updateSession(this.sessionId, {
      agent_state: this.agentState,
      tool_calls_count: this.agentState.tool_calls.length,
    });
  }
}
