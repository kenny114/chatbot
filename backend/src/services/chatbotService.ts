import { v4 as uuidv4 } from 'uuid';
import { supabaseAdmin } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { crawlerService } from './crawlerService';
import { embeddingService } from './embeddingService';
import { Chatbot, DataSource } from '../types';

export class ChatbotService {
  /**
   * Creates a new chatbot
   */
  async createChatbot(
    userId: string,
    name: string,
    description: string = '',
    instructions: string = ''
  ): Promise<Chatbot> {
    try {
      const chatbotId = uuidv4();
      const webhookUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/api/webhooks/${chatbotId}/query`;

      const { data: chatbot, error } = await supabaseAdmin
        .from('chatbots')
        .insert({
          id: chatbotId,
          user_id: userId,
          name,
          description,
          instructions,
          webhook_url: webhookUrl,
          status: 'processing',
        })
        .select()
        .single();

      if (error || !chatbot) {
        throw new AppError('Failed to create chatbot', 500);
      }

      return chatbot;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Chatbot creation error:', error);
      throw new AppError('Failed to create chatbot', 500);
    }
  }

  /**
   * Gets all chatbots for a user
   */
  async getChatbots(userId: string): Promise<Chatbot[]> {
    try {
      const { data: chatbots, error } = await supabaseAdmin
        .from('chatbots')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new AppError('Failed to fetch chatbots', 500);
      }

      return chatbots || [];
    } catch (error) {
      console.error('Fetch chatbots error:', error);
      throw new AppError('Failed to fetch chatbots', 500);
    }
  }

  /**
   * Gets a single chatbot by ID
   */
  async getChatbot(chatbotId: string, userId?: string): Promise<Chatbot> {
    try {
      const query = supabaseAdmin
        .from('chatbots')
        .select('*')
        .eq('id', chatbotId);

      if (userId) {
        query.eq('user_id', userId);
      }

      const { data: chatbot, error } = await query.single();

      if (error || !chatbot) {
        throw new AppError('Chatbot not found', 404);
      }

      return chatbot;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Fetch chatbot error:', error);
      throw new AppError('Failed to fetch chatbot', 500);
    }
  }

  /**
   * Deletes a chatbot
   */
  async deleteChatbot(chatbotId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('chatbots')
        .delete()
        .eq('id', chatbotId)
        .eq('user_id', userId);

      if (error) {
        throw new AppError('Failed to delete chatbot', 500);
      }
    } catch (error) {
      console.error('Delete chatbot error:', error);
      throw new AppError('Failed to delete chatbot', 500);
    }
  }

  /**
   * Adds a URL data source and processes it
   */
  async addUrlSource(chatbotId: string, url: string): Promise<DataSource> {
    try {
      // Create data source record
      const { data: dataSource, error: insertError } = await supabaseAdmin
        .from('data_sources')
        .insert({
          chatbot_id: chatbotId,
          type: 'url',
          source_url: url,
          status: 'processing',
        })
        .select()
        .single();

      if (insertError || !dataSource) {
        throw new AppError('Failed to create data source', 500);
      }

      // Process URL in background (in production, use a job queue)
      this.processUrlSource(dataSource.id, chatbotId, url).catch(error => {
        console.error('URL processing error:', error);
      });

      return dataSource;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Add URL source error:', error);
      throw new AppError('Failed to add URL source', 500);
    }
  }

  /**
   * Processes a URL data source
   */
  private async processUrlSource(dataSourceId: string, chatbotId: string, url: string): Promise<void> {
    try {
      // Crawl the website
      console.log(`Starting crawl for URL: ${url}`);
      const crawlResults = await crawlerService.crawlWebsite(url);
      console.log(`Crawl completed. Found ${crawlResults.length} pages`);

      // Check if any content was found
      if (crawlResults.length === 0) {
        throw new Error('No content found. The website may be blocking crawlers or contains no text content.');
      }

      let totalChunksInserted = 0;

      // Process each page
      for (const page of crawlResults) {
        console.log(`Processing page: ${page.url} (${page.text.length} characters)`);

        // Chunk the text
        const chunks = embeddingService.chunkText(page.text, page.url);
        console.log(`Created ${chunks.length} chunks from page`);

        if (chunks.length === 0) continue;

        // Generate embeddings
        const embeddings = await embeddingService.generateEmbeddingsBatch(
          chunks.map(c => c.content)
        );

        // Store chunks with embeddings
        const chunksToInsert = chunks.map((chunk, index) => ({
          chatbot_id: chatbotId,
          data_source_id: dataSourceId,
          content: chunk.content,
          embedding: embeddings[index],
          metadata: chunk.metadata,
        }));

        await supabaseAdmin.from('content_chunks').insert(chunksToInsert);
        totalChunksInserted += chunksToInsert.length;
      }

      console.log(`Total chunks inserted: ${totalChunksInserted}`);

      if (totalChunksInserted === 0) {
        throw new Error('No text chunks were created. The content may be too short or not extractable.');
      }

      // Update data source status
      await supabaseAdmin
        .from('data_sources')
        .update({ status: 'completed' })
        .eq('id', dataSourceId);

      console.log(`Data source ${dataSourceId} completed successfully`);

      // Update chatbot status to ready if all sources are processed
      await this.updateChatbotStatus(chatbotId);
    } catch (error) {
      console.error('Process URL error:', error);
      // Update data source with error
      await supabaseAdmin
        .from('data_sources')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('id', dataSourceId);
    }
  }

  /**
   * Adds a text data source and processes it
   */
  async addTextSource(chatbotId: string, content: string): Promise<DataSource> {
    try {
      // Create data source record
      const { data: dataSource, error: insertError } = await supabaseAdmin
        .from('data_sources')
        .insert({
          chatbot_id: chatbotId,
          type: 'text',
          content,
          status: 'processing',
        })
        .select()
        .single();

      if (insertError || !dataSource) {
        throw new AppError('Failed to create data source', 500);
      }

      // Process text in background
      this.processTextSource(dataSource.id, chatbotId, content).catch(error => {
        console.error('Text processing error:', error);
      });

      return dataSource;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error('Add text source error:', error);
      throw new AppError('Failed to add text source', 500);
    }
  }

  /**
   * Processes a text data source
   */
  private async processTextSource(dataSourceId: string, chatbotId: string, content: string): Promise<void> {
    try {
      // Chunk the text
      const chunks = embeddingService.chunkText(content);

      // Generate embeddings
      const embeddings = await embeddingService.generateEmbeddingsBatch(
        chunks.map(c => c.content)
      );

      // Store chunks with embeddings
      const chunksToInsert = chunks.map((chunk, index) => ({
        chatbot_id: chatbotId,
        data_source_id: dataSourceId,
        content: chunk.content,
        embedding: embeddings[index],
        metadata: chunk.metadata,
      }));

      await supabaseAdmin.from('content_chunks').insert(chunksToInsert);

      // Update data source status
      await supabaseAdmin
        .from('data_sources')
        .update({ status: 'completed' })
        .eq('id', dataSourceId);

      // Update chatbot status
      await this.updateChatbotStatus(chatbotId);
    } catch (error) {
      console.error('Process text error:', error);
      // Update data source with error
      await supabaseAdmin
        .from('data_sources')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('id', dataSourceId);
    }
  }

  /**
   * Updates chatbot status based on data sources
   */
  private async updateChatbotStatus(chatbotId: string): Promise<void> {
    try {
      const { data: sources } = await supabaseAdmin
        .from('data_sources')
        .select('status')
        .eq('chatbot_id', chatbotId);

      if (!sources || sources.length === 0) {
        return;
      }

      const allCompleted = sources.every(s => s.status === 'completed');
      const anyFailed = sources.some(s => s.status === 'failed');

      let status: 'processing' | 'ready' | 'failed' = 'processing';
      if (allCompleted) {
        status = 'ready';
      } else if (anyFailed && sources.every(s => s.status !== 'processing')) {
        status = 'failed';
      }

      await supabaseAdmin
        .from('chatbots')
        .update({ status })
        .eq('id', chatbotId);
    } catch (error) {
      console.error('Update chatbot status error:', error);
    }
  }

  /**
   * Deletes a data source and its associated content chunks
   */
  async deleteDataSource(dataSourceId: string): Promise<void> {
    try {
      // Delete associated content chunks first (CASCADE should handle this, but being explicit)
      await supabaseAdmin
        .from('content_chunks')
        .delete()
        .eq('data_source_id', dataSourceId);

      // Delete the data source
      const { error } = await supabaseAdmin
        .from('data_sources')
        .delete()
        .eq('id', dataSourceId);

      if (error) {
        throw new AppError('Failed to delete data source', 500);
      }
    } catch (error) {
      console.error('Delete data source error:', error);
      throw new AppError('Failed to delete data source', 500);
    }
  }

  /**
   * Gets data sources for a chatbot
   */
  async getDataSources(chatbotId: string): Promise<DataSource[]> {
    try {
      const { data: sources, error } = await supabaseAdmin
        .from('data_sources')
        .select('*')
        .eq('chatbot_id', chatbotId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new AppError('Failed to fetch data sources', 500);
      }

      return sources || [];
    } catch (error) {
      console.error('Fetch data sources error:', error);
      throw new AppError('Failed to fetch data sources', 500);
    }
  }
}

export const chatbotService = new ChatbotService();
