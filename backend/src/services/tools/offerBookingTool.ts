/**
 * Offer Booking Tool
 * Generates and offers a Calendly/booking link to the visitor
 */

import { DynamicStructuredTool } from 'langchain/tools';
import { z } from 'zod';
import { calendlyService } from '../calendlyService';
import { sessionService } from '../sessionService';
import { leadCaptureService } from '../leadCaptureService';
import { BookingToolResult } from '../../types/agent';
import { LeadCaptureConfig } from '../../types/leadCapture';

export function createOfferBookingTool(
  chatbotId: string,
  sessionId: string,
  config: LeadCaptureConfig
) {
  return new DynamicStructuredTool({
    name: 'offer_booking',
    description: `Generate and offer a booking link for the visitor to schedule a call.

    Use this tool when:
    - Lead has been captured (email + name)
    - Qualification questions are complete (if enabled)
    - Visitor is ready to speak with the team

    The tool generates a prefilled Calendly/booking link with the visitor's
    information, making it easy for them to schedule a time.

    Present the booking as a BENEFIT, not a requirement:
    - "I can connect you with our team for a personalized walkthrough"
    - "Would you like to schedule a quick call to discuss your needs?"
    - NOT: "You need to book a call" or "Required next step"

    The booking link is prefilled with their email and name for convenience.`,

    schema: z.object({
      reason: z.string().optional().describe('Why offering booking (for logging purposes)'),
    }),

    func: async ({ reason }) => {
      try {
        console.log(`[OfferBookingTool] Generating booking link for session: ${sessionId}`);

        // Check if booking is enabled
        if (!config.booking_enabled || !config.booking_link) {
          const result: BookingToolResult = {
            available: false,
            message: 'Booking is not currently available. Someone from our team will reach out to you directly.',
          };

          console.log(`[OfferBookingTool] Booking not configured`);
          return JSON.stringify(result);
        }

        // Get session to find lead data
        const session = await sessionService.getSessionById(sessionId);

        if (!session) {
          throw new Error('Session not found');
        }

        // Get lead data for prefilling if available
        let leadData;
        if (session.lead_id) {
          leadData = await leadCaptureService.getLeadById(session.lead_id);
        }

        // Generate prefilled booking link
        const bookingLink = calendlyService.generateBookingLink(
          config.booking_link,
          leadData ? {
            email: leadData.email,
            name: leadData.name || '',
            reason_for_interest: leadData.reason_for_interest || '',
          } : undefined
        );

        // Track booking offer in session
        await sessionService.updateSession(sessionId, {
          booking_status: 'LINK_SHARED',
          conversation_mode: 'BOOKING_MODE',
        });

        const ctaText = config.booking_cta_text || 'Schedule a Call';

        const result: BookingToolResult = {
          available: true,
          booking_url: bookingLink.prefilled_url,
          cta_text: ctaText,
          message: `${ctaText}? Here's a link to pick a time that works for you: ${bookingLink.prefilled_url}`,
        };

        console.log(`[OfferBookingTool] Booking link generated: ${bookingLink.prefilled_url}`);

        return JSON.stringify(result);

      } catch (error) {
        console.error('[OfferBookingTool] Error:', error);

        const errorResult: BookingToolResult = {
          available: false,
          message: "I'm having trouble generating the booking link. Someone from our team will reach out to schedule a time with you directly.",
        };

        return JSON.stringify(errorResult);
      }
    },
  });
}
