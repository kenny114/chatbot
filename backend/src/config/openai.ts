import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  throw new Error('Missing OPENAI_API_KEY environment variable');
}

export const openai = new OpenAI({
  apiKey
});

// Configuration constants
export const EMBEDDING_MODEL = 'text-embedding-3-small';
export const CHAT_MODEL = 'gpt-4-turbo-preview';
export const CHUNK_SIZE = 800; // tokens per chunk
export const CHUNK_OVERLAP = 100; // overlap between chunks
export const MAX_CONTEXT_CHUNKS = 5; // number of chunks to retrieve for RAG
