/**
 * Send Notification Tool
 * Alerts business owner about high-value leads or urgent requests
 */

import { DynamicStructuredTool } from 'langchain/tools';
import { z } from 'zod';
import { notificationService } from '../notificationService';
import { leadCaptureService } from '../leadCaptureService';
import { NotificationToolResult } from '../../types/agent';
import { LeadCaptureConfig } from '../../types/leadCapture';

export function createSendNotificationTool(
  chatbotId: string,
  config: LeadCaptureConfig
) {
  return new DynamicStructuredTool({
    name: 'send_notification',
    description: `Send immediate notification to business owner about a high-value lead or urgent request.

    Use this tool SPARINGLY - only in specific situations:
    1. HIGH intent visitors with urgent timelines ("need it today", "time-sensitive")
    2. High-value opportunities (large teams, significant budget mentions)
    3. Explicit requests for immediate contact ("can someone call me now?")

    DO NOT use for:
    - Every lead capture (notifications are sent automatically)
    - Low/medium intent visitors
    - Normal booking requests

    The tool sends an email/webhook notification to alert the owner that they should
    prioritize this lead for immediate follow-up.

    Use good judgment - overuse will train owners to ignore notifications.`,

    schema: z.object({
      lead_id: z.string().describe('The lead ID to send notification about'),
      urgency: z.enum(['high', 'urgent']).describe('Notification urgency level'),
      reason: z.string().describe('Clear explanation of why this notification is being sent'),
    }),

    func: async ({ lead_id, urgency, reason }) => {
      try {
        console.log(`[SendNotificationTool] Sending ${urgency} notification for lead: ${lead_id}`);
        console.log(`[SendNotificationTool] Reason: ${reason}`);

        // Get lead data
        const lead = await leadCaptureService.getLeadById(lead_id);

        if (!lead) {
          throw new Error('Lead not found');
        }

        // Send notification (email and/or webhook)
        const success = await notificationService.notifyNewLead(
          chatbotId,
          lead,
          config
        );

        if (success) {
          const result: NotificationToolResult = {
            success: true,
            message: 'Business owner has been notified and will prioritize your request.',
          };

          console.log(`[SendNotificationTool] Notification sent successfully`);
          return JSON.stringify(result);

        } else {
          const result: NotificationToolResult = {
            success: false,
            message: 'Notification queued (will retry if failed).',
          };

          console.warn(`[SendNotificationTool] Notification failed but queued for retry`);
          return JSON.stringify(result);
        }

      } catch (error) {
        console.error('[SendNotificationTool] Error:', error);

        const errorResult: NotificationToolResult = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          message: 'Unable to send notification, but your information has been saved.',
        };

        return JSON.stringify(errorResult);
      }
    },
  });
}
