import {
  ConversationSession,
  ConversationMode,
  IntentLevel,
  LeadCaptureConfig,
  StateTransitionResult,
  StateAction,
  ClientAction,
  SessionMessage,
  QualificationQuestion,
} from '../types/leadCapture';
import { ragService } from './ragService';
import { intentDetectionService } from './intentDetectionService';
import { sessionService } from './sessionService';

// Number of helpful exchanges before considering lead capture
const MIN_EXCHANGES_BEFORE_CAPTURE = 2;

// Prompts for different states
const STATE_PROMPTS = {
  INTENT_CHECK: "That's great that you're interested! Would you like me to help connect you with our team, or do you have more questions I can answer first?",
  LEAD_CAPTURE_EMAIL: "I'd be happy to help you further. To connect you with the right person, could you share your email address?",
  LEAD_CAPTURE_NAME: "Thanks! And what name should we use when reaching out to you?",
  LEAD_CAPTURE_REASON: "Perfect! One last thing - what are you primarily looking for help with?",
  QUALIFICATION_TRANSITION: "Great! Just a couple quick questions to help us prepare for your conversation.",
  BOOKING_OFFER: "Would you like to schedule a quick call with our team to discuss this further?",
  CLOSURE_DEFAULT: "Thank you! Someone from our team will follow up shortly. Is there anything else I can help you with?",
};

export const conversationStateMachineService = {
  /**
   * Process a message through the state machine
   */
  async processMessage(
    session: ConversationSession,
    message: string,
    config: LeadCaptureConfig,
    chatbotInstructions: string = ''
  ): Promise<StateTransitionResult> {
    const actions: StateAction[] = [];
    let response = '';
    let nextMode = session.conversation_mode;
    let shouldCaptureLead = false;
    let shouldOfferBooking = false;

    // Detect intent for all modes
    const intentResult = intentDetectionService.detectIntent(
      message,
      session.page_url || '',
      session.intent_signals,
      config.intent_keywords,
      config.high_intent_pages
    );

    // Update intent if it increased
    if (this.isHigherIntent(intentResult.level, session.intent_level)) {
      actions.push({
        type: 'UPDATE_INTENT',
        level: intentResult.level,
        signals: intentResult.signals,
      });
    }

    // Process based on current mode
    switch (session.conversation_mode) {
      case 'INFO_MODE':
        const infoResult = await this.handleInfoMode(
          session,
          message,
          config,
          chatbotInstructions,
          intentResult.level,
          intentResult.signals
        );
        response = infoResult.response;
        nextMode = infoResult.nextMode;
        shouldCaptureLead = infoResult.shouldCaptureLead;
        break;

      case 'INTENT_CHECK_MODE':
        const intentCheckResult = this.handleIntentCheckMode(
          session,
          message,
          config,
          intentResult.level
        );
        response = intentCheckResult.response;
        nextMode = intentCheckResult.nextMode;
        shouldCaptureLead = intentCheckResult.shouldCaptureLead;
        break;

      case 'LEAD_CAPTURE_MODE':
        const captureResult = await this.handleLeadCaptureMode(
          session,
          message,
          config
        );
        response = captureResult.response;
        nextMode = captureResult.nextMode;
        shouldOfferBooking = captureResult.shouldOfferBooking;
        if (captureResult.action) {
          actions.push(captureResult.action);
        }
        if (captureResult.qualificationStep !== undefined) {
          actions.push({
            type: 'SAVE_QUALIFICATION',
            question_id: '__step__',
            answer: String(captureResult.qualificationStep),
          });
        }
        break;

      case 'QUALIFICATION_MODE':
        const qualResult = await this.handleQualificationMode(
          session,
          message,
          config
        );
        response = qualResult.response;
        nextMode = qualResult.nextMode;
        shouldOfferBooking = qualResult.shouldOfferBooking;
        if (qualResult.qualificationStep !== undefined) {
          actions.push({
            type: 'SAVE_QUALIFICATION',
            question_id: '__step__',
            answer: String(qualResult.qualificationStep),
          });
        }
        if (qualResult.qualificationAnswers) {
          Object.entries(qualResult.qualificationAnswers).forEach(([qId, answer]) => {
            actions.push({
              type: 'SAVE_QUALIFICATION',
              question_id: qId,
              answer: answer as string,
            });
          });
        }
        break;

      case 'BOOKING_MODE':
        const bookingResult = this.handleBookingMode(session, message, config);
        response = bookingResult.response;
        nextMode = bookingResult.nextMode;
        shouldOfferBooking = bookingResult.shouldOfferBooking || false;
        break;

      case 'CLOSURE_MODE':
        const closureResult = await this.handleClosureMode(
          session,
          message,
          config,
          chatbotInstructions
        );
        response = closureResult.response;
        nextMode = closureResult.nextMode;
        break;
    }

    return {
      next_mode: nextMode,
      response,
      actions,
      should_capture_lead: shouldCaptureLead,
      should_offer_booking: shouldOfferBooking,
    };
  },

  /**
   * Handle INFO_MODE - Answer questions using RAG
   */
  async handleInfoMode(
    session: ConversationSession,
    message: string,
    config: LeadCaptureConfig,
    chatbotInstructions: string,
    intentLevel: IntentLevel,
    signals: string[]
  ): Promise<{
    response: string;
    nextMode: ConversationMode;
    shouldCaptureLead: boolean;
  }> {
    // Generate RAG response with conversation context
    const behaviorSettings = {
      tone: config.response_tone,
      length: config.response_length,
      language: config.language,
    };

    // Build context from message history for better responses
    const conversationContext = this.buildConversationContext(session.message_history);

    // Generate response
    const ragResult = await ragService.generateResponse(
      session.chatbot_id,
      conversationContext + message,
      chatbotInstructions + '\n\nAfter answering, offer a clear next step when appropriate (e.g., "Would you like more details or to schedule a call?").',
      behaviorSettings
    );

    let response = ragResult.response;
    let nextMode: ConversationMode = 'INFO_MODE';
    let shouldCaptureLead = false;

    // Check if we should transition to lead capture
    const shouldTransition = this.shouldTransitionToLeadCapture(
      session,
      config,
      intentLevel,
      signals
    );

    if (shouldTransition) {
      // Check for explicit booking request
      if (intentDetectionService.isExplicitBookingRequest(message)) {
        nextMode = 'LEAD_CAPTURE_MODE';
        shouldCaptureLead = true;
        response += '\n\n' + STATE_PROMPTS.LEAD_CAPTURE_EMAIL;
      } else if (intentLevel === 'HIGH_INTENT' || intentLevel === 'MEDIUM_INTENT') {
        // Move to intent check for medium/high intent
        nextMode = 'INTENT_CHECK_MODE';
        response += '\n\n' + STATE_PROMPTS.INTENT_CHECK;
      }
    }

    return { response, nextMode, shouldCaptureLead };
  },

  /**
   * Handle INTENT_CHECK_MODE - Confirm user interest
   */
  handleIntentCheckMode(
    session: ConversationSession,
    message: string,
    config: LeadCaptureConfig,
    intentLevel: IntentLevel
  ): {
    response: string;
    nextMode: ConversationMode;
    shouldCaptureLead: boolean;
  } {
    const normalizedMessage = message.toLowerCase();

    // Check for positive response (wants to connect)
    const positivePatterns = [
      /\b(yes|yeah|sure|ok|okay|please|definitely|absolutely)\b/i,
      /\b(connect|talk|call|schedule|book)\b/i,
      /\b(that would be|sounds) (great|good|nice|helpful)/i,
    ];

    // Check for negative response (more questions)
    const negativePatterns = [
      /\b(no|not yet|maybe later|first|question|more info)\b/i,
      /\b(wait|hold on|before that)\b/i,
    ];

    const isPositive = positivePatterns.some(p => p.test(normalizedMessage));
    const isNegative = negativePatterns.some(p => p.test(normalizedMessage));

    if (isPositive && !isNegative && config.lead_capture_enabled) {
      return {
        response: STATE_PROMPTS.LEAD_CAPTURE_EMAIL,
        nextMode: 'LEAD_CAPTURE_MODE',
        shouldCaptureLead: true,
      };
    } else if (isNegative || (!isPositive && !isNegative)) {
      // Return to info mode for more questions
      return {
        response: "No problem! What else would you like to know?",
        nextMode: 'INFO_MODE',
        shouldCaptureLead: false,
      };
    }

    // Default: ask again
    return {
      response: STATE_PROMPTS.INTENT_CHECK,
      nextMode: 'INTENT_CHECK_MODE',
      shouldCaptureLead: false,
    };
  },

  /**
   * Handle LEAD_CAPTURE_MODE - Collect contact information
   */
  async handleLeadCaptureMode(
    session: ConversationSession,
    message: string,
    config: LeadCaptureConfig
  ): Promise<{
    response: string;
    nextMode: ConversationMode;
    shouldOfferBooking: boolean;
    action?: StateAction;
    qualificationStep?: number;
    clientAction?: ClientAction;
  }> {
    const currentStep = session.lead_capture_step || 'ASK_EMAIL';

    switch (currentStep) {
      case 'ASK_EMAIL': {
        const email = this.extractEmail(message);
        if (email) {
          // Valid email captured
          const nextStep = config.require_name ? 'ASK_NAME' :
                          config.require_reason ? 'ASK_REASON' : 'COMPLETED';

          if (nextStep === 'COMPLETED') {
            return this.completeLeadCapture(session, config, { email });
          }

          return {
            response: nextStep === 'ASK_NAME' ? STATE_PROMPTS.LEAD_CAPTURE_NAME : STATE_PROMPTS.LEAD_CAPTURE_REASON,
            nextMode: 'LEAD_CAPTURE_MODE',
            shouldOfferBooking: false,
            action: { type: 'CAPTURE_LEAD', data: { email } },
          };
        } else {
          // Invalid email
          return {
            response: "I didn't quite catch that. Could you please share your email address so we can follow up with you?",
            nextMode: 'LEAD_CAPTURE_MODE',
            shouldOfferBooking: false,
          };
        }
      }

      case 'ASK_NAME': {
        const name = message.trim();
        if (name.length > 1) {
          const nextStep = config.require_reason ? 'ASK_REASON' : 'COMPLETED';

          if (nextStep === 'COMPLETED') {
            return this.completeLeadCapture(session, config, { name });
          }

          return {
            response: STATE_PROMPTS.LEAD_CAPTURE_REASON,
            nextMode: 'LEAD_CAPTURE_MODE',
            shouldOfferBooking: false,
            action: { type: 'CAPTURE_LEAD', data: { name } },
          };
        }

        return {
          response: "I didn't catch your name. What name should we use?",
          nextMode: 'LEAD_CAPTURE_MODE',
          shouldOfferBooking: false,
        };
      }

      case 'ASK_REASON': {
        return this.completeLeadCapture(session, config, { reason_for_interest: message.trim() });
      }

      default:
        return this.completeLeadCapture(session, config, {});
    }
  },

  /**
   * Complete lead capture and move to qualification, booking, or closure
   */
  completeLeadCapture(
    session: ConversationSession,
    config: LeadCaptureConfig,
    finalData: { email?: string; name?: string; reason_for_interest?: string }
  ): {
    response: string;
    nextMode: ConversationMode;
    shouldOfferBooking: boolean;
    action: StateAction;
    qualificationStep?: number;
    clientAction?: ClientAction;
  } {
    const action: StateAction = {
      type: 'CAPTURE_LEAD',
      data: { ...finalData },
    };

    // Check if qualification is enabled and there are questions
    if (config.qualification_enabled && config.qualification_questions && config.qualification_questions.length > 0) {
      const firstQuestion = config.qualification_questions[0];
      return {
        response: `${STATE_PROMPTS.QUALIFICATION_TRANSITION}\n\n${firstQuestion.question}`,
        nextMode: 'QUALIFICATION_MODE',
        shouldOfferBooking: false,
        action,
        qualificationStep: 0,
        clientAction: {
          type: 'SHOW_QUALIFICATION',
          question: firstQuestion,
        },
      };
    }

    if (config.booking_enabled && config.booking_link) {
      return {
        response: `Thank you! ${STATE_PROMPTS.BOOKING_OFFER}`,
        nextMode: 'BOOKING_MODE',
        shouldOfferBooking: true,
        action,
      };
    }

    return {
      response: config.closure_message || STATE_PROMPTS.CLOSURE_DEFAULT,
      nextMode: 'CLOSURE_MODE',
      shouldOfferBooking: false,
      action,
    };
  },

  /**
   * Handle QUALIFICATION_MODE - Collect qualification answers
   */
  async handleQualificationMode(
    session: ConversationSession,
    message: string,
    config: LeadCaptureConfig
  ): Promise<{
    response: string;
    nextMode: ConversationMode;
    shouldOfferBooking: boolean;
    qualificationStep?: number;
    qualificationAnswers?: Record<string, string>;
    clientAction?: ClientAction;
  }> {
    const questions = config.qualification_questions || [];
    const currentStep = session.qualification_step || 0;

    // If no questions configured, skip to next stage
    if (questions.length === 0) {
      return this.transitionAfterQualification(config);
    }

    // Save the answer for the current question (user just responded)
    const currentQuestion = questions[currentStep];
    const newAnswers: Record<string, string> = {
      ...session.qualification_answers,
      [currentQuestion.id]: message.trim(),
    };

    const nextStep = currentStep + 1;

    // Check if there are more questions
    if (nextStep < questions.length) {
      const nextQuestion = questions[nextStep];
      return {
        response: nextQuestion.question,
        nextMode: 'QUALIFICATION_MODE',
        shouldOfferBooking: false,
        qualificationStep: nextStep,
        qualificationAnswers: newAnswers,
        clientAction: {
          type: 'SHOW_QUALIFICATION',
          question: nextQuestion,
        },
      };
    }

    // All questions answered - move to booking or closure
    const result = this.transitionAfterQualification(config);
    return {
      ...result,
      qualificationStep: nextStep,
      qualificationAnswers: newAnswers,
    };
  },

  /**
   * Transition to booking or closure after qualification
   */
  transitionAfterQualification(config: LeadCaptureConfig): {
    response: string;
    nextMode: ConversationMode;
    shouldOfferBooking: boolean;
  } {
    if (config.booking_enabled && config.booking_link) {
      return {
        response: `Thank you for sharing that! ${STATE_PROMPTS.BOOKING_OFFER}`,
        nextMode: 'BOOKING_MODE',
        shouldOfferBooking: true,
      };
    }

    return {
      response: config.closure_message || STATE_PROMPTS.CLOSURE_DEFAULT,
      nextMode: 'CLOSURE_MODE',
      shouldOfferBooking: false,
    };
  },

  /**
   * Handle BOOKING_MODE - Offer and track booking
   */
  handleBookingMode(
    session: ConversationSession,
    message: string,
    config: LeadCaptureConfig
  ): {
    response: string;
    nextMode: ConversationMode;
    shouldOfferBooking?: boolean;
  } {
    const normalizedMessage = message.toLowerCase();

    // Check if user wants to book
    const wantsToBook = /\b(yes|yeah|sure|ok|book|schedule|please)\b/i.test(normalizedMessage);
    const declines = /\b(no|not now|later|maybe|skip)\b/i.test(normalizedMessage);

    if (wantsToBook && !declines) {
      return {
        response: `Great! A new tab has been opened for you to schedule your call. We look forward to speaking with you!`,
        nextMode: 'CLOSURE_MODE',
        shouldOfferBooking: true,
      };
    } else if (declines) {
      return {
        response: config.closure_message || STATE_PROMPTS.CLOSURE_DEFAULT,
        nextMode: 'CLOSURE_MODE',
      };
    }

    // Ask again
    return {
      response: STATE_PROMPTS.BOOKING_OFFER,
      nextMode: 'BOOKING_MODE',
    };
  },

  /**
   * Handle CLOSURE_MODE - End conversation or restart
   */
  async handleClosureMode(
    session: ConversationSession,
    message: string,
    config: LeadCaptureConfig,
    chatbotInstructions: string
  ): Promise<{
    response: string;
    nextMode: ConversationMode;
  }> {
    // Check if user has more questions
    const hasQuestion = /\?/.test(message) ||
                       /\b(what|how|when|where|why|can|could|would|is|are|do|does)\b/i.test(message);

    if (hasQuestion) {
      // User has more questions - go back to info mode
      const behaviorSettings = {
        tone: config.response_tone,
        length: config.response_length,
        language: config.language,
      };

      const ragResult = await ragService.generateResponse(
        session.chatbot_id,
        message,
        chatbotInstructions,
        behaviorSettings
      );

      return {
        response: ragResult.response,
        nextMode: 'INFO_MODE',
      };
    }

    // User is done
    return {
      response: "You're welcome! Feel free to reach out anytime you have questions.",
      nextMode: 'CLOSURE_MODE',
    };
  },

  /**
   * Check if should transition to lead capture
   */
  shouldTransitionToLeadCapture(
    session: ConversationSession,
    config: LeadCaptureConfig,
    intentLevel: IntentLevel,
    signals: string[]
  ): boolean {
    // Lead capture must be enabled
    if (!config.lead_capture_enabled) return false;

    // Check minimum exchanges
    if (session.message_count < MIN_EXCHANGES_BEFORE_CAPTURE) return false;

    // Already captured or in capture mode
    if (session.lead_id || session.conversation_mode === 'LEAD_CAPTURE_MODE') return false;

    // Check trigger condition
    const triggerMet = this.meetsIntentTrigger(
      intentLevel,
      config.lead_capture_trigger
    );

    return triggerMet;
  },

  /**
   * Check if intent meets trigger threshold
   */
  meetsIntentTrigger(
    currentIntent: IntentLevel,
    trigger: IntentLevel | 'ALWAYS'
  ): boolean {
    if (trigger === 'ALWAYS') return true;

    const intentOrder: IntentLevel[] = ['LOW_INTENT', 'MEDIUM_INTENT', 'HIGH_INTENT'];
    const currentIndex = intentOrder.indexOf(currentIntent);
    const triggerIndex = intentOrder.indexOf(trigger);

    return currentIndex >= triggerIndex;
  },

  /**
   * Check if new intent is higher than current
   */
  isHigherIntent(newIntent: IntentLevel, currentIntent: IntentLevel): boolean {
    const intentOrder: IntentLevel[] = ['LOW_INTENT', 'MEDIUM_INTENT', 'HIGH_INTENT'];
    return intentOrder.indexOf(newIntent) > intentOrder.indexOf(currentIntent);
  },

  /**
   * Extract email from message
   */
  extractEmail(message: string): string | null {
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const match = message.match(emailRegex);
    return match ? match[0].toLowerCase() : null;
  },

  /**
   * Build conversation context string from history
   */
  buildConversationContext(history: SessionMessage[]): string {
    if (history.length === 0) return '';

    const recentHistory = history.slice(-5); // Last 5 messages for context
    const contextParts = recentHistory.map(msg =>
      `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
    );

    return 'Previous conversation:\n' + contextParts.join('\n') + '\n\nCurrent message: ';
  },

  /**
   * Get client action based on state transition
   */
  getClientAction(
    nextMode: ConversationMode,
    session: ConversationSession,
    config: LeadCaptureConfig
  ): ClientAction {
    switch (nextMode) {
      case 'LEAD_CAPTURE_MODE':
        const step = session.lead_capture_step || 'ASK_EMAIL';
        if (step === 'ASK_EMAIL') {
          return { type: 'SHOW_EMAIL_INPUT', prompt: STATE_PROMPTS.LEAD_CAPTURE_EMAIL };
        } else if (step === 'ASK_NAME') {
          return { type: 'SHOW_NAME_INPUT', prompt: STATE_PROMPTS.LEAD_CAPTURE_NAME };
        } else if (step === 'ASK_REASON') {
          return { type: 'SHOW_REASON_INPUT', prompt: STATE_PROMPTS.LEAD_CAPTURE_REASON };
        }
        break;

      case 'BOOKING_MODE':
        if (config.booking_link) {
          return {
            type: 'SHOW_BOOKING_LINK',
            url: config.booking_link,
            cta_text: config.booking_cta_text,
          };
        }
        break;

      case 'CLOSURE_MODE':
        return {
          type: 'CONVERSATION_CLOSED',
          message: config.closure_message || STATE_PROMPTS.CLOSURE_DEFAULT,
        };
    }

    return { type: 'NONE' };
  },
};
