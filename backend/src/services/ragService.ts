import { openai, CHAT_MODEL, MAX_CONTEXT_CHUNKS } from '../config/openai';
import { supabaseAdmin } from '../config/database';
import { embeddingService } from './embeddingService';

export interface RetrievedContext {
  content: string;
  source_url?: string;
  similarity: number;
}

export class RAGService {
  /**
   * Retrieves relevant context chunks for a query
   * @param chatbotId - The chatbot ID to search within
   * @param query - The user's query
   * @param topK - Number of chunks to retrieve
   * @returns Array of relevant context chunks
   */
  async retrieveContext(
    chatbotId: string,
    query: string,
    topK: number = MAX_CONTEXT_CHUNKS
  ): Promise<RetrievedContext[]> {
    try {
      // Generate embedding for the query
      const queryEmbedding = await embeddingService.generateEmbedding(query);

      // Check if pgvector is available (embedding_vector column exists)
      const { data: chunks, error } = await supabaseAdmin.rpc('match_chunks_pgvector', {
        query_embedding: queryEmbedding,
        match_chatbot_id: chatbotId,
        match_count: topK,
      });

      // Fallback to old method if pgvector RPC doesn't exist
      if (error && error.message.includes('match_chunks_pgvector')) {
        return this.retrieveContextLegacy(chatbotId, queryEmbedding, topK);
      }

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      if (!chunks || chunks.length === 0) {
        return [];
      }

      // Format results
      const topChunks = chunks.map((chunk: any) => ({
        content: chunk.content,
        source_url: chunk.metadata?.source_url,
        similarity: 1 - chunk.distance, // Convert distance to similarity
      }));

      // Always return at least top 3, filter out very low similarity
      return topChunks.filter((chunk: RetrievedContext, idx: number) => idx < 3 || chunk.similarity > 0.2);
    } catch (error) {
      console.error('Context retrieval error:', error);
      // Fallback to legacy method
      const queryEmbedding = await embeddingService.generateEmbedding(query);
      return this.retrieveContextLegacy(chatbotId, queryEmbedding, topK);
    }
  }

  /**
   * Legacy context retrieval (without pgvector)
   * Used as fallback if pgvector is not available
   */
  private async retrieveContextLegacy(
    chatbotId: string,
    queryEmbedding: number[],
    topK: number
  ): Promise<RetrievedContext[]> {
    try {
      const { data: chunks, error } = await supabaseAdmin
        .from('content_chunks')
        .select('content, metadata, embedding')
        .eq('chatbot_id', chatbotId);

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      if (!chunks || chunks.length === 0) {
        return [];
      }

      // Calculate similarity scores
      const chunksWithScores = chunks.map(chunk => {
        let chunkEmbedding = chunk.embedding;
        if (typeof chunkEmbedding === 'string') {
          chunkEmbedding = JSON.parse(chunkEmbedding);
        }

        const similarity = embeddingService.cosineSimilarity(
          queryEmbedding,
          chunkEmbedding
        );

        return {
          content: chunk.content,
          source_url: chunk.metadata?.source_url,
          similarity,
        };
      });

      // Sort by similarity and take top K
      const sortedChunks = chunksWithScores.sort((a, b) => b.similarity - a.similarity);

      // Always return at least the top 3 chunks
      const topChunks = sortedChunks
        .slice(0, topK)
        .filter((chunk, idx) => idx < 3 || chunk.similarity > 0.2);

      return topChunks;
    } catch (error) {
      console.error('Legacy context retrieval error:', error);
      return [];
    }
  }

  /**
   * Generates a response using RAG
   * @param chatbotId - The chatbot ID
   * @param userMessage - The user's message
   * @param chatbotInstructions - Custom instructions for the chatbot
   * @returns Generated response and sources
   */
  async generateResponse(
    chatbotId: string,
    userMessage: string,
    chatbotInstructions: string = ''
  ): Promise<{ response: string; sources: string[] }> {
    try {
      // Retrieve relevant context
      const context = await this.retrieveContext(chatbotId, userMessage);

      if (context.length === 0) {
        return {
          response: "I don't have enough information to answer that question. Could you please rephrase or ask something else about the company?",
          sources: [],
        };
      }

      // Build context string
      const contextString = context
        .map((ctx, idx) => `[${idx + 1}] ${ctx.content}`)
        .join('\n\n');

      // Build system prompt
      const systemPrompt = `You are a helpful AI assistant for a company. Your role is to answer questions based on the company's information provided below.

${chatbotInstructions ? `Additional Instructions: ${chatbotInstructions}\n` : ''}
IMPORTANT RULES:
1. Only answer based on the context provided below
2. If the context doesn't contain the answer, say you don't have that information
3. Be concise and helpful
4. Cite sources by referencing the [number] when relevant
5. Maintain a professional and friendly tone

CONTEXT:
${contextString}`;

      // Generate response using OpenAI
      const completion = await openai.chat.completions.create({
        model: CHAT_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      const response = completion.choices[0].message.content || 'I apologize, but I encountered an error generating a response.';

      // Extract unique sources
      const sources = [...new Set(context.map(ctx => ctx.source_url).filter(Boolean))] as string[];

      return {
        response,
        sources,
      };
    } catch (error) {
      console.error('RAG generation error:', error);
      throw new Error('Failed to generate response');
    }
  }
}

export const ragService = new RAGService();
