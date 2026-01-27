/**
 * Capture Lead Tool
 * Collects visitor contact information (email and name)
 */

import { DynamicStructuredTool } from 'langchain/tools';
import { z } from 'zod';
import { leadCaptureService } from '../leadCaptureService';
import { sessionService } from '../sessionService';
import { CaptureLeadToolResult } from '../../types/agent';
import { LeadCaptureConfig } from '../../types/leadCapture';

export function createCaptureLeadTool(
  chatbotId: string,
  sessionId: string,
  config: LeadCaptureConfig
) {
  return new DynamicStructuredTool({
    name: 'capture_lead',
    description: `Capture visitor contact information (email and name).

    IMPORTANT GUIDELINES - Read carefully:
    1. ONLY use this tool when ALL of these conditions are met:
       - Visitor has engaged meaningfully (minimum 2 helpful exchanges)
       - Visitor shows medium/high intent OR explicitly requests connection
       - You've offered value first (answered questions, provided information)

    2. TIMING IS CRITICAL:
       - TOO EARLY (first message): Pushy and reduces conversion
       - TOO LATE (after 10+ messages): Missed opportunity
       - JUST RIGHT (after 2-3 helpful exchanges with clear interest)

    3. ASK FOR PERMISSION FIRST:
       - "Would it help to connect you with our team?"
       - "I can have someone reach out to discuss this further. Would that be useful?"
       - NEVER capture without implicit/explicit consent

    4. EXTRACTION:
       - The tool will try to extract email/name from the visitor's message
       - If not present, it will prompt the visitor to provide it
       - Handle the multi-step flow naturally

    The tool returns:
    - success: true (complete), 'partial' (more info needed), or false (error)
    - requires_input: 'email' or 'name' if more info needed
    - prompt_message: What to ask the visitor next`,

    schema: z.object({
      visitor_message: z.string().describe('The visitor message that may contain email/name or is confirming they want to be contacted'),
      reason_for_interest: z.string().optional().describe('Brief summary of what the visitor is interested in (for context)'),
    }),

    func: async ({ visitor_message, reason_for_interest }) => {
      try {
        console.log(`[CaptureLeadTool] Attempting lead capture for session: ${sessionId}`);

        // Get current session to check if lead already captured
        const session = await sessionService.getSessionById(sessionId);

        if (session?.lead_id) {
          console.log(`[CaptureLeadTool] Lead already captured for this session`);

          const result: CaptureLeadToolResult = {
            success: true,
            lead_id: session.lead_id,
            message: 'Lead information already captured.',
          };

          return JSON.stringify(result);
        }

        // Extract email using regex
        const email = extractEmail(visitor_message);

        if (!email) {
          // No email found - prompt for it
          const result: CaptureLeadToolResult = {
            success: false,
            requires_input: 'email',
            prompt_message: "I'd be happy to connect you with our team. Could you share your email address?",
          };

          console.log(`[CaptureLeadTool] No email found, prompting visitor`);
          return JSON.stringify(result);
        }

        // Check if email already exists for this chatbot
        const emailExists = await leadCaptureService.emailExists(chatbotId, email);

        if (emailExists) {
          const result: CaptureLeadToolResult = {
            success: false,
            error: 'duplicate_email',
            message: "Thanks! We already have your information. Someone from our team will follow up soon.",
          };

          console.log(`[CaptureLeadTool] Email already exists: ${email}`);
          return JSON.stringify(result);
        }

        // Try to extract name
        const name = extractName(visitor_message);

        if (!name && config.require_name) {
          // Store email temporarily in session state, prompt for name
          await sessionService.updateSession(sessionId, {
            agent_state: {
              ...(session?.agent_state || {}),
              partial_lead: { email },
            },
          });

          const result: CaptureLeadToolResult = {
            success: 'partial',
            captured: ['email'],
            requires_input: 'name',
            prompt_message: "Thanks! And what name should we use when reaching out?",
          };

          console.log(`[CaptureLeadTool] Email captured, prompting for name`);
          return JSON.stringify(result);
        }

        // Create full lead
        const lead = await leadCaptureService.createLead({
          chatbot_id: chatbotId,
          email,
          name: name || undefined,
          reason_for_interest,
          page_url: session?.page_url || undefined,
          referrer_url: session?.referrer_url || undefined,
          intent_level: session?.intent_level || 'MEDIUM_INTENT',
          qualification_answers: session?.qualification_answers || {},
          questions_asked: session?.message_history
            .filter(m => m.role === 'user')
            .map(m => m.content) || [],
          message_count: session?.message_count || 0,
          source_session_id: sessionId,
        });

        // Update session with lead ID
        await sessionService.updateSession(sessionId, {
          lead_id: lead.id,
          conversation_mode: config.qualification_enabled ? 'QUALIFICATION_MODE' : 'BOOKING_MODE',
        });

        console.log(`[CaptureLeadTool] Lead created successfully: ${lead.id}`);

        // Note: Notification is triggered asynchronously by the orchestrator, not here

        const result: CaptureLeadToolResult = {
          success: true,
          lead_id: lead.id,
          next_action: config.qualification_enabled ? 'qualification' : 'booking_or_closure',
          message: name ? `Perfect, ${name}! I've got your information.` : "Perfect! I've got your information.",
        };

        return JSON.stringify(result);

      } catch (error) {
        console.error('[CaptureLeadTool] Error:', error);

        const errorResult: CaptureLeadToolResult = {
          success: false,
          error: 'execution_error',
          message: "I'm having trouble saving your information. Let me try another way to help you.",
        };

        return JSON.stringify(errorResult);
      }
    },
  });
}

/**
 * Extract email from message using regex
 */
function extractEmail(message: string): string | null {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const match = message.match(emailRegex);
  return match ? match[0].toLowerCase() : null;
}

/**
 * Extract name from message using heuristics
 * Looks for patterns like "my name is John", "I'm John Smith", etc.
 */
function extractName(message: string): string | null {
  const patterns = [
    /(?:my name is|i'm|i am|this is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)$/,  // Just a name by itself
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      const name = match[1].trim();
      // Validate: name should be 2-50 characters and not contain numbers
      if (name.length >= 2 && name.length <= 50 && !/\d/.test(name)) {
        return name;
      }
    }
  }

  return null;
}
