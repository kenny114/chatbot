/**
 * Analyze Intent Tool
 * Evaluates visitor's purchase/booking intent level
 */

import { DynamicStructuredTool } from 'langchain/tools';
import { z } from 'zod';
import { intentDetectionService } from '../intentDetectionService';
import { IntentToolResult } from '../../types/agent';
import { LeadCaptureConfig } from '../../types/leadCapture';

export function createAnalyzeIntentTool(config: LeadCaptureConfig) {
  return new DynamicStructuredTool({
    name: 'analyze_intent',
    description: `Evaluate the visitor's intent level based on their messages and behavior.

    Use this tool when you notice intent signals such as:
    - Pricing questions ("how much", "cost", "pricing")
    - Timeline mentions ("need it by", "when can we start", "urgent")
    - Booking requests ("schedule", "demo", "call", "talk to sales")
    - Commitment language ("ready to", "want to", "interested in")

    Returns:
    - Intent level: LOW, MEDIUM, or HIGH_INTENT
    - Signals: Keywords and page context that influenced the score
    - Recommendation: What action to take next

    Use this to decide when to capture leads or offer booking. Generally:
    - LOW_INTENT: Focus on being helpful, answer questions
    - MEDIUM_INTENT: Consider lead capture after 2-3 helpful exchanges
    - HIGH_INTENT: Capture lead or offer booking if not done already`,

    schema: z.object({
      recent_messages: z.array(z.string()).describe('Last 2-3 visitor messages to analyze for intent signals'),
      page_url: z.string().optional().describe('Current page URL (e.g., /pricing, /contact)'),
    }),

    func: async ({ recent_messages, page_url }) => {
      try {
        console.log(`[AnalyzeIntentTool] Analyzing ${recent_messages.length} messages`);

        const combinedText = recent_messages.join(' ');

        // Detect intent using existing service
        const intentResult = intentDetectionService.detectIntent(
          combinedText,
          page_url || '',
          [], // Previous signals (agent tracks these in state)
          config.intent_keywords || [],
          config.high_intent_pages || []
        );

        // Analyze readiness indicators
        const readiness = intentDetectionService.analyzeReadiness(combinedText);

        // Generate recommendation
        let recommendation = '';
        switch (intentResult.level) {
          case 'HIGH_INTENT':
            recommendation = 'Strong buying signals detected. Consider capturing lead or offering booking if not done already.';
            break;
          case 'MEDIUM_INTENT':
            recommendation = 'Moderate interest detected. Continue building rapport, consider lead capture after 2-3 helpful exchanges.';
            break;
          case 'LOW_INTENT':
            recommendation = 'Low intent - visitor is browsing or researching. Focus on providing value and building trust.';
            break;
          default:
            recommendation = 'Continue being helpful and answering questions.';
        }

        const toolResult: IntentToolResult = {
          intent_level: intentResult.level,
          signals: intentResult.signals,
          keywords_found: intentResult.keywords_found,
          readiness_indicators: readiness.indicators,
          recommendation,
        };

        console.log(`[AnalyzeIntentTool] Intent level: ${intentResult.level}, signals: ${intentResult.signals.length}`);

        return JSON.stringify(toolResult);

      } catch (error) {
        console.error('[AnalyzeIntentTool] Error:', error);

        const errorResult: IntentToolResult = {
          intent_level: 'LOW_INTENT',
          signals: [],
          keywords_found: [],
          readiness_indicators: [],
          recommendation: 'Unable to analyze intent, continue conversation normally.',
        };

        return JSON.stringify(errorResult);
      }
    },
  });
}
