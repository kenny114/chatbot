import { Request, Response } from 'express';
import { chatbotService } from '../services/chatbotService';
import { ragService } from '../services/ragService';
import { analyticsService } from '../services/analyticsService';
import { customizationService } from '../services/customizationService';
import { sessionService } from '../services/sessionService';
import { conversationStateMachineService } from '../services/conversationStateMachineService';
import { leadCaptureService } from '../services/leadCaptureService';
import { notificationService } from '../services/notificationService';
import { calendlyService } from '../services/calendlyService';
import { AgentOrchestrator } from '../services/agentOrchestrator';
import { visitorProfileService } from '../services/visitorProfileService';
import { shadowModeService } from '../services/shadowModeService';
import { abTestService } from '../services/abTestService';
import { abTestMetricsService } from '../services/abTestMetricsService';
import { shouldUseAgent, shouldUseShadowMode } from '../config/agent';
import { asyncHandler } from '../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';
import {
  EnhancedChatResponse,
  ClientAction,
  LeadCaptureConfig,
  SessionMessage,
  CreateLeadInput,
} from '../types/leadCapture';

/**
 * Get lead capture configuration from customization settings
 */
async function getLeadCaptureConfig(chatbotId: string): Promise<LeadCaptureConfig> {
  const customization = await customizationService.getCustomization(chatbotId);

  // Get extended lead capture settings (if available)
  const extendedQuery = `
    SELECT
      lead_capture_enabled, lead_capture_trigger, require_name, require_reason,
      booking_enabled, booking_link, booking_cta_text,
      notification_email, notification_webhook_url, notify_on_lead, notify_on_booking,
      intent_keywords, high_intent_pages, qualification_enabled, qualification_questions,
      closure_message, booking_confirmation_message,
      response_tone, response_length, language
    FROM chatbot_customization
    WHERE chatbot_id = $1
  `;

  const pool = (await import('../config/database')).default;
  const result = await pool.query(extendedQuery, [chatbotId]);

  if (result.rows.length === 0) {
    // Return defaults
    return {
      lead_capture_enabled: false,
      lead_capture_trigger: 'MEDIUM_INTENT',
      require_name: false,
      require_reason: false,
      booking_enabled: false,
      booking_link: undefined,
      booking_cta_text: 'Book a Call',
      notification_email: undefined,
      notification_webhook_url: undefined,
      notify_on_lead: true,
      notify_on_booking: true,
      intent_keywords: ['price', 'cost', 'quote', 'call', 'book', 'talk', 'schedule', 'demo'],
      high_intent_pages: [],
      qualification_enabled: false,
      qualification_questions: [],
      closure_message: 'Thank you! Someone from our team will follow up shortly.',
      booking_confirmation_message: 'Great! Your call has been scheduled.',
      response_tone: customization?.responseTone || 'professional',
      response_length: customization?.responseLength || 'concise',
      language: customization?.language || 'English',
    };
  }

  const row = result.rows[0];
  return {
    lead_capture_enabled: row.lead_capture_enabled || false,
    lead_capture_trigger: row.lead_capture_trigger || 'MEDIUM_INTENT',
    require_name: row.require_name || false,
    require_reason: row.require_reason || false,
    booking_enabled: row.booking_enabled || false,
    booking_link: row.booking_link,
    booking_cta_text: row.booking_cta_text || 'Book a Call',
    notification_email: row.notification_email,
    notification_webhook_url: row.notification_webhook_url,
    notify_on_lead: row.notify_on_lead !== false,
    notify_on_booking: row.notify_on_booking !== false,
    intent_keywords: row.intent_keywords || ['price', 'cost', 'quote', 'call', 'book', 'talk', 'schedule', 'demo'],
    high_intent_pages: row.high_intent_pages || [],
    qualification_enabled: row.qualification_enabled || false,
    qualification_questions: row.qualification_questions || [],
    closure_message: row.closure_message || 'Thank you! Someone from our team will follow up shortly.',
    booking_confirmation_message: row.booking_confirmation_message || 'Great! Your call has been scheduled.',
    response_tone: row.response_tone || 'professional',
    response_length: row.response_length || 'concise',
    language: row.language || 'English',
  };
}

/**
 * Handle chat query with state machine integration
 */
export const handleChatQuery = asyncHandler(async (req: Request, res: Response) => {
  const { chatbotId } = req.params;
  const { message, session_id, page_url, referrer_url } = req.body;

  // Validate message
  if (!message || typeof message !== 'string') {
    res.status(400).json({ error: 'Message is required' });
    return;
  }

  // Get chatbot (no user auth required for webhooks)
  const chatbot = await chatbotService.getChatbot(chatbotId);

  // Check if chatbot is ready
  if (chatbot.status !== 'ready') {
    res.status(503).json({
      error: 'Chatbot is not ready yet. Please try again later.',
      status: chatbot.status,
    });
    return;
  }

  // Track start time for response time measurement
  const startTime = Date.now();

  // Get or generate session ID
  const sessionId = session_id || `session_${Date.now()}_${uuidv4().slice(0, 8)}`;

  // Get or create conversation session
  const session = await sessionService.getOrCreateSession(chatbotId, sessionId, {
    page_url,
    referrer_url,
    user_agent: req.get('user-agent'),
    user_ip: req.ip,
  });

  // Get lead capture configuration
  const config = await getLeadCaptureConfig(chatbotId);

  // Check execution mode: agent, shadow, or state machine
  const useAgent = shouldUseAgent(chatbotId);
  const useShadowMode = shouldUseShadowMode(chatbotId);

  // Track metrics (for A/B testing)
  let actualCohort: 'agent' | 'state_machine' | null = null;
  let toolCallsCount = 0;
  let hadError = false;
  let usedFallback = false;

  let stateResult;

  if (useShadowMode) {
    // SHADOW MODE: Run both systems in parallel, compare, return state machine result
    console.log(`[WebhookController] Shadow mode active for chatbot: ${chatbotId}`);

    const shadowStartTime = Date.now();

    try {
      // Execute BOTH in parallel
      const [agentResult, stateMachineResult] = await Promise.allSettled([
        // Agent execution
        (async () => {
          const agentStart = Date.now();
          try {
            const visitorProfile = await visitorProfileService.getOrCreateProfile(
              chatbotId,
              {
                email: session.lead_id ? await getLeadEmail(session.lead_id) : undefined,
                sessionId: session.session_id,
                userAgent: req.get('user-agent'),
                userIp: req.ip,
              }
            );

            const orchestrator = new AgentOrchestrator(
              chatbotId,
              config,
              chatbot.instructions,
              session,
              visitorProfile
            );

            const agentResponse = await orchestrator.executeConversationTurn(message);
            return {
              result: agentResponse,
              executionTimeMs: Date.now() - agentStart,
            };
          } catch (error) {
            console.error('[ShadowMode] Agent execution error:', error);
            throw error;
          }
        })(),
        // State machine execution
        (async () => {
          const smStart = Date.now();
          const result = await conversationStateMachineService.processMessage(
            session,
            message,
            config,
            chatbot.instructions
          );
          return {
            result,
            executionTimeMs: Date.now() - smStart,
          };
        })(),
      ]);

      // State machine result (always use this in shadow mode)
      if (stateMachineResult.status === 'fulfilled') {
        stateResult = stateMachineResult.value.result;

        // Log comparison if agent also succeeded
        if (agentResult.status === 'fulfilled') {
          shadowModeService.logComparison(
            chatbotId,
            session.session_id,
            message,
            stateMachineResult.value,
            agentResult.value
          ).catch(err => console.error('[ShadowMode] Logging error:', err));

          console.log(
            `[ShadowMode] Completed - Agent: ${agentResult.value.executionTimeMs}ms, ` +
            `StateMachine: ${stateMachineResult.value.executionTimeMs}ms`
          );
        } else {
          console.warn('[ShadowMode] Agent failed:', agentResult.reason);
        }
      } else {
        console.error('[ShadowMode] State machine failed:', stateMachineResult.reason);
        throw stateMachineResult.reason;
      }

    } catch (error) {
      console.error('[ShadowMode] Critical error, falling back to state machine only:', error);
      stateResult = await conversationStateMachineService.processMessage(
        session,
        message,
        config,
        chatbot.instructions
      );
    }

  } else if (useAgent) {
    // Check if A/B testing is enabled
    const rolloutPercentage = parseInt(process.env.AGENT_ROLLOUT_PERCENTAGE || '0', 10);
    const useABTesting = rolloutPercentage > 0 && rolloutPercentage < 100;

    let useAgentForThisChatbot = true;
    let cohortInfo = '';

    if (useABTesting) {
      // A/B TESTING MODE: Use cohort assignment
      useAgentForThisChatbot = await abTestService.isInAgentCohort(chatbotId);
      cohortInfo = useAgentForThisChatbot ? ' [A/B Cohort: agent]' : ' [A/B Cohort: state_machine]';
      console.log(`[WebhookController] A/B testing active (${rolloutPercentage}% rollout)${cohortInfo} for chatbot: ${chatbotId}`);
    } else {
      // Regular agent mode (100% rollout or flag-based)
      console.log(`[WebhookController] Using LangChain agent (full rollout) for chatbot: ${chatbotId}`);
    }

    if (useAgentForThisChatbot) {
      // AGENT EXECUTION
      actualCohort = 'agent';

      try {
        const visitorProfile = await visitorProfileService.getOrCreateProfile(
          chatbotId,
          {
            email: session.lead_id ? await getLeadEmail(session.lead_id) : undefined,
            sessionId: session.session_id,
            userAgent: req.get('user-agent'),
            userIp: req.ip,
          }
        );

        const orchestrator = new AgentOrchestrator(
          chatbotId,
          config,
          chatbot.instructions,
          session,
          visitorProfile
        );

        const agentResponse = await orchestrator.executeConversationTurn(message);
        toolCallsCount = agentResponse.tool_calls_count || 0;

        stateResult = {
          response: agentResponse.response,
          nextMode: agentResponse.conversation_mode,
          actions: agentResponse.actions.map((action: any) => ({
            type: action.type === 'SHOW_BOOKING_LINK' ? 'OFFER_BOOKING' : action.type,
            ...action,
          })),
          should_capture_lead: false,
          should_offer_booking: agentResponse.actions.some((a: any) => a.type === 'SHOW_BOOKING_LINK'),
        };

        console.log(`[WebhookController] Agent completed with ${agentResponse.tool_calls_count} tool calls${cohortInfo}`);

      } catch (error) {
        console.error(`[WebhookController] Agent execution failed${cohortInfo}, falling back to state machine:`, error);
        hadError = true;
        usedFallback = true;
        actualCohort = 'state_machine'; // Fallback to state machine

        stateResult = await conversationStateMachineService.processMessage(
          session,
          message,
          config,
          chatbot.instructions
        );
      }
    } else {
      // STATE MACHINE EXECUTION (A/B control cohort)
      actualCohort = 'state_machine';

      console.log(`[WebhookController] Using state machine${cohortInfo} for chatbot: ${chatbotId}`);
      stateResult = await conversationStateMachineService.processMessage(
        session,
        message,
        config,
        chatbot.instructions
      );
    }

  } else {
    // STATE MACHINE MODE: Use existing state machine
    stateResult = await conversationStateMachineService.processMessage(
      session,
      message,
      config,
      chatbot.instructions
    );
  }

  // Extract qualification updates from actions
  const qualificationActions = stateResult.actions.filter(a => a.type === 'SAVE_QUALIFICATION');
  let newQualificationStep = session.qualification_step;
  const newQualificationAnswers = { ...session.qualification_answers };

  for (const action of qualificationActions) {
    if (action.type === 'SAVE_QUALIFICATION') {
      if (action.question_id === '__step__') {
        newQualificationStep = parseInt(action.answer, 10);
      } else {
        newQualificationAnswers[action.question_id] = action.answer;
      }
    }
  }

  // Update session with new state
  await sessionService.updateSession(session.id, {
    conversation_mode: stateResult.next_mode,
    intent_level: stateResult.actions.find(a => a.type === 'UPDATE_INTENT')?.level || session.intent_level,
    intent_signals: stateResult.actions.find(a => a.type === 'UPDATE_INTENT')?.signals || session.intent_signals,
    qualification_step: newQualificationStep,
    qualification_answers: newQualificationAnswers,
  });

  // Add messages to history
  const userMessage: SessionMessage = {
    role: 'user',
    content: message,
    timestamp: new Date().toISOString(),
  };
  const botMessage: SessionMessage = {
    role: 'assistant',
    content: stateResult.response,
    timestamp: new Date().toISOString(),
  };
  await sessionService.addMessageToHistory(session.id, userMessage);
  await sessionService.addMessageToHistory(session.id, botMessage);

  // Handle lead capture action
  let leadId: string | undefined;
  const captureAction = stateResult.actions.find(a => a.type === 'CAPTURE_LEAD');
  if (captureAction && captureAction.type === 'CAPTURE_LEAD' && captureAction.data.email) {
    // Check if lead already exists
    const emailExists = await leadCaptureService.emailExists(chatbotId, captureAction.data.email);

    if (!emailExists) {
      // Create lead
      const leadInput: CreateLeadInput = {
        chatbot_id: chatbotId,
        email: captureAction.data.email,
        name: captureAction.data.name,
        reason_for_interest: captureAction.data.reason_for_interest,
        page_url: session.page_url,
        referrer_url: session.referrer_url,
        intent_level: session.intent_level,
        qualification_answers: session.qualification_answers,
        questions_asked: session.message_history
          .filter(m => m.role === 'user')
          .map(m => m.content),
        message_count: session.message_count,
        source_session_id: session.id,
      };

      const lead = await leadCaptureService.createLead(leadInput);
      leadId = lead.id;

      // Update session with lead ID
      await sessionService.updateSession(session.id, { lead_id: lead.id });

      // Send notification (async, don't block response)
      notificationService.notifyNewLead(chatbotId, lead, config).catch(err => {
        console.error('Error sending lead notification:', err);
      });
    }
  }

  // Calculate response time
  const responseTimeMs = Date.now() - startTime;

  // Track A/B test metrics (if in A/B mode)
  if (actualCohort !== null && !useShadowMode) {
    try {
      const isFirstMessage = session.message_count === 0;
      const leadCaptured = !!captureAction;
      const bookingOffered = stateResult.should_offer_booking || false;

      if (isFirstMessage) {
        // Initialize metrics for new session
        await abTestMetricsService.initializeSession(
          chatbotId,
          session.session_id,
          actualCohort,
          responseTimeMs,
          toolCallsCount
        );
      } else {
        // Update metrics for existing session
        await abTestMetricsService.updateSession(session.session_id, {
          response_time_ms: responseTimeMs,
          tool_calls: toolCallsCount,
          had_error: hadError,
          used_fallback: usedFallback,
          lead_captured: leadCaptured,
          booking_offered: bookingOffered,
        });
      }
    } catch (metricsError) {
      console.error('[ABTestMetrics] Error tracking metrics:', metricsError);
      // Don't let metrics errors break the response
    }
  }

  // Generate conversation ID for analytics
  const conversationId = uuidv4();

  // Build client action
  let clientAction: ClientAction = { type: 'NONE' };

  if (stateResult.should_offer_booking && config.booking_enabled && config.booking_link) {
    // Get lead data for prefilling
    const leadData = leadId ? await leadCaptureService.getLeadById(leadId) : undefined;
    const bookingLink = calendlyService.generateBookingLink(config.booking_link, leadData || undefined);

    clientAction = {
      type: 'SHOW_BOOKING_LINK',
      url: bookingLink.prefilled_url,
      cta_text: config.booking_cta_text,
    };
  } else if (stateResult.next_mode === 'QUALIFICATION_MODE' && config.qualification_questions && config.qualification_questions.length > 0) {
    // Find the current question based on step
    const questionIndex = newQualificationStep < config.qualification_questions.length ? newQualificationStep : 0;
    const currentQuestion = config.qualification_questions[questionIndex];
    clientAction = {
      type: 'SHOW_QUALIFICATION',
      question: currentQuestion,
    };
  } else if (stateResult.next_mode === 'LEAD_CAPTURE_MODE' && stateResult.should_capture_lead) {
    clientAction = {
      type: 'SHOW_EMAIL_INPUT',
      prompt: 'Please enter your email address',
    };
  } else if (stateResult.next_mode === 'CLOSURE_MODE') {
    clientAction = {
      type: 'CONVERSATION_CLOSED',
      message: config.closure_message,
    };
  }

  // Track conversation for analytics (async, don't block response)
  analyticsService.trackConversation({
    chatbotId,
    userIdentifier: sessionId,
    userIp: req.ip,
    userAgent: req.get('user-agent'),
    userMessage: message,
    botResponse: stateResult.response,
    sourcesUsed: [], // Sources are embedded in response from state machine
    responseTimeMs,
  }).catch((error) => {
    console.error('Error tracking analytics:', error);
  });

  // Build enhanced response
  const response: EnhancedChatResponse = {
    response: stateResult.response,
    sources: [],
    session_id: sessionId,
    conversation_id: conversationId,
    conversation_mode: stateResult.next_mode || session.conversation_mode || 'INFO_MODE',
    intent_level: session.intent_level,
    actions: [clientAction],
  };

  res.status(200).json(response);
});

/**
 * Legacy endpoint for backward compatibility
 * This handles requests without session management
 */
export const handleLegacyChatQuery = asyncHandler(async (req: Request, res: Response) => {
  const { chatbotId } = req.params;
  const { message } = req.body;

  // Get chatbot (no user auth required for webhooks)
  const chatbot = await chatbotService.getChatbot(chatbotId);

  // Check if chatbot is ready
  if (chatbot.status !== 'ready') {
    res.status(503).json({
      error: 'Chatbot is not ready yet. Please try again later.',
      status: chatbot.status,
    });
    return;
  }

  // Track start time for response time measurement
  const startTime = Date.now();

  // Get customization settings for behavior
  const customization = await customizationService.getCustomization(chatbotId);
  const behaviorSettings = customization ? {
    tone: customization.responseTone,
    length: customization.responseLength,
    language: customization.language,
  } : undefined;

  // Generate response using RAG
  const { response, sources } = await ragService.generateResponse(
    chatbotId,
    message,
    chatbot.instructions,
    behaviorSettings
  );

  // Calculate response time
  const responseTimeMs = Date.now() - startTime;

  // Generate conversation ID
  const conversationId = uuidv4();

  // Track conversation for analytics (async, don't block response)
  analyticsService.trackConversation({
    chatbotId,
    userIdentifier: req.ip || 'anonymous',
    userIp: req.ip,
    userAgent: req.get('user-agent'),
    userMessage: message,
    botResponse: response,
    sourcesUsed: sources,
    responseTimeMs,
  }).catch((error) => {
    console.error('Error tracking analytics:', error);
  });

  res.status(200).json({
    response,
    sources,
    conversationId,
  });
});

/**
 * Mark booking as clicked/completed
 */
export const handleBookingClick = asyncHandler(async (req: Request, res: Response) => {
  const { chatbotId } = req.params;
  const { session_id } = req.body;

  if (!session_id) {
    res.status(400).json({ error: 'Session ID is required' });
    return;
  }

  const session = await sessionService.getSession(chatbotId, session_id);
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  // Update booking status
  await sessionService.updateSession(session.id, {
    booking_status: 'LINK_SHARED',
    booking_link_clicked_at: new Date().toISOString(),
  });

  // Update lead if exists
  if (session.lead_id) {
    await leadCaptureService.updateBookingStatus(session.lead_id, 'LINK_SHARED');
  }

  res.status(200).json({ success: true });
});

/**
 * End a conversation session
 */
export const handleSessionEnd = asyncHandler(async (req: Request, res: Response) => {
  const { chatbotId } = req.params;
  const { session_id } = req.body;

  if (!session_id) {
    res.status(400).json({ error: 'Session ID is required' });
    return;
  }

  const session = await sessionService.getSession(chatbotId, session_id);
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  await sessionService.closeSession(session.id);

  res.status(200).json({ success: true });
});

/**
 * Helper function to get lead email from lead ID
 */
async function getLeadEmail(leadId: string): Promise<string | undefined> {
  try {
    const lead = await leadCaptureService.getLeadById(leadId);
    return lead?.email;
  } catch (error) {
    console.error('[WebhookController] Error getting lead email:', error);
    return undefined;
  }
}
