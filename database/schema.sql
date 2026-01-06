-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Users table
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
-- This requires pgvector extension
CREATE INDEX idx_content_chunks_embedding ON content_chunks USING hnsw (embedding vector_cosine_ops);

-- Conversations table (for analytics - optional)
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

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbots ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY users_policy ON users
  FOR ALL
  USING (auth.uid() = id);

-- Users can only see their own chatbots
CREATE POLICY chatbots_policy ON chatbots
  FOR ALL
  USING (auth.uid() = user_id);

-- Users can only see data sources for their chatbots
CREATE POLICY data_sources_policy ON data_sources
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM chatbots
      WHERE chatbots.id = data_sources.chatbot_id
      AND chatbots.user_id = auth.uid()
    )
  );

-- Users can only see content chunks for their chatbots
CREATE POLICY content_chunks_policy ON content_chunks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM chatbots
      WHERE chatbots.id = content_chunks.chatbot_id
      AND chatbots.user_id = auth.uid()
    )
  );

-- Users can only see conversations for their chatbots
CREATE POLICY conversations_policy ON conversations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM chatbots
      WHERE chatbots.id = conversations.chatbot_id
      AND chatbots.user_id = auth.uid()
    )
  );

-- Grant necessary permissions
GRANT ALL ON users TO authenticated;
GRANT ALL ON chatbots TO authenticated;
GRANT ALL ON data_sources TO authenticated;
GRANT ALL ON content_chunks TO authenticated;
GRANT ALL ON conversations TO authenticated;
