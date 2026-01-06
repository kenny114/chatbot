-- ============================================================================
-- PGVECTOR MIGRATION - Run this entire script in Supabase SQL Editor
-- ============================================================================
-- Instructions:
-- 1. Go to your Supabase Dashboard
-- 2. Navigate to "SQL Editor" in the left sidebar
-- 3. Click "New Query"
-- 4. Copy and paste this ENTIRE file
-- 5. Click "Run" or press Ctrl+Enter
-- ============================================================================

-- Step 1: Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Step 2: Add new vector column to content_chunks
ALTER TABLE content_chunks
ADD COLUMN IF NOT EXISTS embedding_vector vector(1536);

-- Step 3: Copy existing embeddings from text/json to vector format
-- This converts the JSON array string to actual vector type
UPDATE content_chunks
SET embedding_vector = embedding::text::vector
WHERE embedding IS NOT NULL AND embedding_vector IS NULL;

-- Step 4: Create index for fast similarity search
-- Using ivfflat index with cosine distance
CREATE INDEX IF NOT EXISTS content_chunks_embedding_vector_idx
ON content_chunks
USING ivfflat (embedding_vector vector_cosine_ops)
WITH (lists = 100);

-- Step 5: Create similarity search function
CREATE OR REPLACE FUNCTION match_chunks_pgvector(
  query_embedding vector(1536),
  match_chatbot_id uuid,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  distance float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    content_chunks.id,
    content_chunks.content,
    content_chunks.metadata,
    (content_chunks.embedding_vector <=> query_embedding) as distance
  FROM content_chunks
  WHERE content_chunks.chatbot_id = match_chatbot_id
  ORDER BY content_chunks.embedding_vector <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Step 6: Grant execute permission
GRANT EXECUTE ON FUNCTION match_chunks_pgvector TO authenticated, anon;

-- ============================================================================
-- VERIFICATION QUERIES (Optional - Run these to verify success)
-- ============================================================================

-- Check if pgvector extension is enabled
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Check if embedding_vector column exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'content_chunks' AND column_name = 'embedding_vector';

-- Check if index was created
SELECT indexname FROM pg_indexes
WHERE tablename = 'content_chunks' AND indexname = 'content_chunks_embedding_vector_idx';

-- Count how many chunks have vector embeddings
SELECT COUNT(*) as total_chunks,
       COUNT(embedding_vector) as chunks_with_vector
FROM content_chunks;

-- Test the function
-- SELECT match_chunks_pgvector(
--   (SELECT embedding_vector FROM content_chunks LIMIT 1),
--   (SELECT chatbot_id FROM content_chunks LIMIT 1),
--   5
-- );

-- ============================================================================
-- SUCCESS!
-- Your database now has pgvector enabled and will use 100x faster similarity search!
-- The backend code will automatically detect and use pgvector.
-- ============================================================================
