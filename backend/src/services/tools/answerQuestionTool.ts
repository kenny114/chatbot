/**
 * Answer Question Tool - RAG Retrieval
 * Searches the knowledge base to answer visitor questions
 */

import { DynamicStructuredTool } from 'langchain/tools';
import { z } from 'zod';
import { ragService } from '../ragService';
import { RAGToolResult } from '../../types/agent';

export function createAnswerQuestionTool(chatbotId: string) {
  return new DynamicStructuredTool({
    name: 'answer_question',
    description: `Search the company knowledge base to answer visitor questions accurately.

    This is your PRIMARY TOOL - use it frequently to provide value to visitors.
    The tool performs semantic search across scraped website content and documents,
    returning relevant information with source citations.

    When to use:
    - ANY time a visitor asks a question about the business, product, or service
    - When you need factual information to respond accurately
    - Before making claims about features, pricing, or capabilities

    The tool returns an answer with confidence level and sources. If confidence is low,
    acknowledge uncertainty and offer to connect visitor with a human.`,

    schema: z.object({
      query: z.string().describe('The visitor question or topic to search for. Be specific and include relevant context.'),
      conversation_context: z.string().optional().describe('Optional: Recent conversation context to improve search relevance'),
    }),

    func: async ({ query, conversation_context }) => {
      try {
        console.log(`[AnswerQuestionTool] Searching knowledge base for: "${query}"`);

        // Generate response using RAG service
        const result = await ragService.generateResponse(
          chatbotId,
          query,
          '', // No additional instructions - handled by agent prompt
          {
            tone: 'professional',
            length: 'concise',
          }
        );

        // Get retrieved context for confidence calculation
        const retrievedContext = await ragService.retrieveContext(chatbotId, query, 5);

        // Calculate confidence based on similarity scores
        let confidence: 'low' | 'medium' | 'high' = 'low';
        if (retrievedContext.length > 0) {
          const topSimilarity = retrievedContext[0].similarity;
          if (topSimilarity > 0.7) {
            confidence = 'high';
          } else if (topSimilarity > 0.4) {
            confidence = 'medium';
          }
        }

        const toolResult: RAGToolResult = {
          answer: result.response,
          confidence,
          sources: result.sources,
          chunks_used: retrievedContext.length,
        };

        console.log(`[AnswerQuestionTool] Retrieved ${retrievedContext.length} chunks, confidence: ${confidence}`);

        return JSON.stringify(toolResult);

      } catch (error) {
        console.error('[AnswerQuestionTool] Error:', error);

        const errorResult: RAGToolResult = {
          answer: "I'm having trouble accessing our knowledge base right now. Let me connect you with someone who can help.",
          confidence: 'low',
          sources: [],
          chunks_used: 0,
        };

        return JSON.stringify(errorResult);
      }
    },
  });
}
