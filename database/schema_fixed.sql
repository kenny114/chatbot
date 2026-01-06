-- Drop existing tables if they exist (be careful in production!)
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS content_chunks CASCADE;
DROP TABLE IF EXISTS data_sources CASCADE;
DROP TABLE IF EXISTS chatbots CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Users table (NO RLS for backend service role)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX idx_users_email ON users(email);

-- Chatbots table
CREATE TABLE chatbots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  instructions TEXT,
  webhook_url TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for chatbots
CREATE INDEX idx_chatbots_user_id ON chatbots(user_id);
CREATE INDEX idx_chatbots_status ON chatbots(status);

-- Data sources table
CREATE TABLE data_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chatbot_id UUID NOT NULL REFERENCES chatbots(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('url', 'text')),
  source_url TEXT,
  content TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for data sources
CREATE INDEX idx_data_sources_chatbot_id ON data_sources(chatbot_id);
CREATE INDEX idx_data_sources_status ON data_sources(status);

-- Content chunks table with embeddings
CREATE TABLE content_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chatbot_id UUID NOT NULL REFERENCES chatbots(id) ON DELETE CASCADE,
  data_source_id UUID NOT NULL REFERENCES data_sources(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(1536), -- OpenAI text-embedding-3-small produces 1536-dimensional vectors
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for content chunks
CREATE INDEX idx_content_chunks_chatbot_id ON content_chunks(chatbot_id);
CREATE INDEX idx_content_chunks_data_source_id ON content_chunks(data_source_id);

-- Create vector similarity search index (using HNSW for fast approximate nearest neighbor search)
CREATE INDEX idx_content_chunks_embedding ON content_chunks USING hnsw (embedding vector_cosine_ops);

-- Conversations table (for analytics)
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chatbot_id UUID NOT NULL REFERENCES chatbots(id) ON DELETE CASCADE,
  user_message TEXT NOT NULL,
  bot_response TEXT NOT NULL,
  sources_used JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for conversations
CREATE INDEX idx_conversations_chatbot_id ON conversations(chatbot_id);
CREATE INDEX idx_conversations_created_at ON conversations(created_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chatbots_updated_at BEFORE UPDATE ON chatbots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_data_sources_updated_at BEFORE UPDATE ON data_sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- NO RLS POLICIES - Using service role key for all operations
-- This is simpler for backend-only access and avoids auth.uid() issues
