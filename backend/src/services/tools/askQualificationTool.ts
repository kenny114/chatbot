/**
 * Ask Qualification Tool
 * Asks pre-configured qualification questions after lead capture
 */

import { DynamicStructuredTool } from 'langchain/tools';
import { z } from 'zod';
import { sessionService } from '../sessionService';
import { QualificationToolResult } from '../../types/agent';
import { LeadCaptureConfig } from '../../types/leadCapture';

export function createAskQualificationTool(
  sessionId: string,
  config: LeadCaptureConfig
) {
  return new DynamicStructuredTool({
    name: 'ask_qualification',
    description: `Ask qualification questions to better understand the lead's needs.

    Use this tool AFTER successfully capturing lead information (email/name).

    The tool manages a multi-step qualification flow:
    1. Saves the visitor's answer to the previous question
    2. Returns the next question in the sequence
    3. Indicates when all questions are complete

    Qualification questions are configured per chatbot and help:
    - Understand the lead's specific needs
    - Gather context for sales team
    - Improve call quality and relevance

    Ask questions ONE AT A TIME in a natural conversational flow.
    Don't rush - make it feel like a helpful conversation, not an interrogation.`,

    schema: z.object({
      answer: z.string().optional().describe('Visitor answer to the previous qualification question'),
    }),

    func: async ({ answer }) => {
      try {
        console.log(`[AskQualificationTool] Processing qualification for session: ${sessionId}`);

        const questions = config.qualification_questions || [];

        if (questions.length === 0) {
          const result: QualificationToolResult = {
            completed: true,
            message: 'No qualification questions configured',
          };

          return JSON.stringify(result);
        }

        // Get current session to track progress
        const session = await sessionService.getSessionById(sessionId);

        if (!session) {
          throw new Error('Session not found');
        }

        const currentStep = session.qualification_step || 0;
        const qualificationAnswers = session.qualification_answers || {};

        // Save answer if provided (not the first call)
        if (answer && currentStep > 0) {
          const prevQuestion = questions[currentStep - 1];

          await sessionService.updateSession(sessionId, {
            qualification_answers: {
              ...qualificationAnswers,
              [prevQuestion.id]: answer,
            },
          });

          console.log(`[AskQualificationTool] Saved answer for question ${currentStep - 1}`);
        }

        // Check if there are more questions
        if (currentStep < questions.length) {
          const nextQuestion = questions[currentStep];

          // Update step counter
          await sessionService.updateSession(sessionId, {
            qualification_step: currentStep + 1,
          });

          const result: QualificationToolResult = {
            completed: false,
            question: nextQuestion.question,
            progress: `${currentStep + 1}/${questions.length}`,
          };

          console.log(`[AskQualificationTool] Asking question ${currentStep + 1}/${questions.length}`);

          return JSON.stringify(result);
        }

        // All questions answered
        await sessionService.updateSession(sessionId, {
          conversation_mode: 'BOOKING_MODE', // Move to booking or closure
        });

        const result: QualificationToolResult = {
          completed: true,
          next_action: 'offer_booking',
          message: 'Thanks for providing that information! It helps our team prepare for your call.',
        };

        console.log(`[AskQualificationTool] All ${questions.length} questions completed`);

        return JSON.stringify(result);

      } catch (error) {
        console.error('[AskQualificationTool] Error:', error);

        const errorResult: QualificationToolResult = {
          completed: true,
          message: 'Unable to complete qualification questions. Let me connect you with the team directly.',
        };

        return JSON.stringify(errorResult);
      }
    },
  });
}
