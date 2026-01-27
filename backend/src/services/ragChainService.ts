/**
 * RAG Chain Service
 * LangChain integration for enhanced conversational RAG retrieval
 */

import { ChatOpenAI } from '@langchain/openai';
import { OpenAIEmbeddings } from '@langchain/openai';
import { ConversationalRetrievalQAChain } from 'langchain/chains';
import { BaseMessage, HumanMessage, AIMessage } from '@langchain/core/messages';
import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase';
import { createClient } from '@supabase/supabase-js';
import { ragService } from './ragService';
import { AGENT_CONFIG } from '../config/agent';

class RAGChainService {
  private chains: Map<string, ConversationalRetrievalQAChain> = new Map();

  /**
   * Get or create a conversational retrieval chain for a chatbot
   */
  async getChain(chatbotId: string): Promise<ConversationalRetrievalQAChain> {
    // Return cached chain if exists
    if (this.chains.has(chatbotId)) {
      return this.chains.get(chatbotId)!;
    }

    // Create new chain
    const chain = await this.createRetrievalChain(chatbotId);
    this.chains.set(chatbotId, chain);

    return chain;
  }

  /**
   * Create a conversational retrieval QA chain
   */
  private async createRetrievalChain(chatbotId: string): Promise<ConversationalRetrievalQAChain> {
    try {
      // Initialize OpenAI embeddings
      const embeddings = new OpenAIEmbeddings({
        modelName: 'text-embedding-3-small',
        openAIApiKey: process.env.OPENAI_API_KEY,
      });

      // Initialize Supabase client
      const supabaseClient = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      // Create vector store with chatbot-specific filter
      const vectorStore = await SupabaseVectorStore.fromExistingIndex(
        embeddings,
        {
          client: supabaseClient,
          tableName: 'content_chunks',
          queryName: 'match_chunks_pgvector',
          filter: { chatbot_id: chatbotId },
        }
      );

      // Create retriever with MMR (Maximum Marginal Relevance) for diversity
      const retriever = vectorStore.asRetriever({
        k: AGENT_CONFIG.RAG_TOP_K,
        searchType: 'mmr', // Diversify results
        searchKwargs: {
          fetchK: 20, // Fetch 20, return diverse top K
          lambda: 0.5, // Diversity parameter (0 = max diversity, 1 = max relevance)
        },
      });

      // Initialize LLM
      const llm = new ChatOpenAI({
        modelName: AGENT_CONFIG.MODEL,
        temperature: 0.7,
        maxTokens: 500,
        openAIApiKey: process.env.OPENAI_API_KEY,
      });

      // Create conversational retrieval chain
      const chain = ConversationalRetrievalQAChain.fromLLM(
        llm,
        retriever,
        {
          returnSourceDocuments: true,
          verbose: AGENT_CONFIG.LOG_LEVEL === 'debug',
          qaChainOptions: {
            type: 'stuff', // Simple stuffing strategy for short contexts
          },
        }
      );

      console.log(`[RAGChainService] Created retrieval chain for chatbot: ${chatbotId}`);

      return chain;

    } catch (error) {
      console.error('[RAGChainService] Error creating retrieval chain:', error);
      throw error;
    }
  }

  /**
   * Query with conversation history
   */
  async queryWithHistory(
    chatbotId: string,
    question: string,
    chatHistory: BaseMessage[]
  ): Promise<{
    answer: string;
    sources: string[];
    chunks_used: number;
  }> {
    try {
      const chain = await this.getChain(chatbotId);

      // Convert chat history to tuple format for LangChain
      const historyTuples: [string, string][] = [];
      for (let i = 0; i < chatHistory.length - 1; i += 2) {
        if (chatHistory[i] instanceof HumanMessage && chatHistory[i + 1] instanceof AIMessage) {
          historyTuples.push([
            chatHistory[i].content as string,
            chatHistory[i + 1].content as string,
          ]);
        }
      }

      // Query the chain
      const result = await chain.call({
        question,
        chat_history: historyTuples,
      });

      // Extract sources from documents
      const sources: string[] = result.sourceDocuments
        ? Array.from(new Set(
            result.sourceDocuments
              .map((doc: any) => doc.metadata?.source_url)
              .filter((url: any): url is string => typeof url === 'string' && url.length > 0)
          ))
        : [];

      return {
        answer: result.text,
        sources,
        chunks_used: result.sourceDocuments?.length || 0,
      };

    } catch (error) {
      console.error('[RAGChainService] Error querying with history:', error);

      // Fallback to basic RAG service
      console.log('[RAGChainService] Falling back to basic RAG service');
      const fallbackResult = await ragService.generateResponse(
        chatbotId,
        question,
        '',
        { tone: 'professional', length: 'concise' }
      );

      return {
        answer: fallbackResult.response,
        sources: fallbackResult.sources,
        chunks_used: 0,
      };
    }
  }

  /**
   * Clear cached chain (e.g., when chatbot knowledge base is updated)
   */
  clearChain(chatbotId: string): void {
    this.chains.delete(chatbotId);
    console.log(`[RAGChainService] Cleared cached chain for chatbot: ${chatbotId}`);
  }

  /**
   * Clear all cached chains
   */
  clearAllChains(): void {
    this.chains.clear();
    console.log('[RAGChainService] Cleared all cached chains');
  }
}

export const ragChainService = new RAGChainService();
