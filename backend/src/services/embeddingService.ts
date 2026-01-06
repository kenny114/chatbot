import { openai, EMBEDDING_MODEL, CHUNK_SIZE, CHUNK_OVERLAP } from '../config/openai';

export interface TextChunk {
  content: string;
  metadata: {
    source_url?: string;
    chunk_index: number;
    total_chunks: number;
  };
}

export class EmbeddingService {
  /**
   * Splits text into chunks with overlap to maintain context
   * @param text - The text to chunk
   * @param sourceUrl - Optional source URL for metadata
   */
  chunkText(text: string, sourceUrl?: string): TextChunk[] {
    // Simple word-based chunking (can be improved with sentence boundaries)
    const words = text.split(/\s+/);
    const chunks: TextChunk[] = [];

    const wordsPerChunk = CHUNK_SIZE;
    const overlapWords = CHUNK_OVERLAP;

    for (let i = 0; i < words.length; i += (wordsPerChunk - overlapWords)) {
      const chunkWords = words.slice(i, i + wordsPerChunk);
      const content = chunkWords.join(' ').trim();

      if (content.length < 50) continue; // Skip very small chunks

      chunks.push({
        content,
        metadata: {
          source_url: sourceUrl,
          chunk_index: chunks.length,
          total_chunks: 0, // Will be updated after all chunks are created
        },
      });

      if (i + wordsPerChunk >= words.length) break;
    }

    // Update total_chunks for all chunks
    chunks.forEach(chunk => {
      chunk.metadata.total_chunks = chunks.length;
    });

    return chunks;
  }

  /**
   * Generates embeddings for a single text
   * @param text - The text to embed
   * @returns Embedding vector
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('Embedding generation error:', error);
      throw new Error('Failed to generate embedding');
    }
  }

  /**
   * Generates embeddings for multiple texts in batch
   * @param texts - Array of texts to embed
   * @returns Array of embedding vectors
   */
  async generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
    try {
      // OpenAI supports batch requests up to 2048 texts
      const batchSize = 100;
      const embeddings: number[][] = [];

      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        const response = await openai.embeddings.create({
          model: EMBEDDING_MODEL,
          input: batch,
        });

        embeddings.push(...response.data.map(d => d.embedding));
      }

      return embeddings;
    } catch (error) {
      console.error('Batch embedding generation error:', error);
      throw new Error('Failed to generate embeddings in batch');
    }
  }

  /**
   * Calculates cosine similarity between two vectors
   * @param vecA - First vector
   * @param vecB - Second vector
   * @returns Similarity score (0-1)
   */
  cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

export const embeddingService = new EmbeddingService();
