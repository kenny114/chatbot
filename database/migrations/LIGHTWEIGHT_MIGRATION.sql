-- ============================================================================
-- PGVECTOR MIGRATION - LIGHTWEIGHT VERSION (No Index)
-- For small datasets or free tier with memory limits
-- ============================================================================
-- This version skips the index creation since you only have 13 chunks
-- You can add the index later when you have 100+ chunks
-- ============================================================================

-- Step 1: Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Step 2: Add new vector column to content_chunks
ALTER TABLE content_chunks
ADD COLUMN IF NOT EXISTS embedding_vector vector(1536);

-- Step 3: Copy existing embeddings from text/json to vector format
UPDATE content_chunks
SET embedding_vector = embedding::text::vector
WHERE embedding IS NOT NULL AND embedding_vector IS NULL;

-- Step 4: Create similarity search function
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

-- Step 5: Grant execute permission
GRANT EXECUTE ON FUNCTION match_chunks_pgvector TO authenticated, anon;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check if pgvector extension is enabled
SELECT 'pgvector enabled' as status, extname, extversion
FROM pg_extension WHERE extname = 'vector';

-- Check if embedding_vector column exists
SELECT 'embedding_vector column exists' as status, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'content_chunks' AND column_name = 'embedding_vector';

-- Count chunks with vectors
SELECT 'Chunks migrated' as status,
       COUNT(*) as total_chunks,
       COUNT(embedding_vector) as chunks_with_vector
FROM content_chunks;

-- ============================================================================
-- NOTE ABOUT INDEX
-- ============================================================================
-- We skipped the IVFFlat index because:
-- 1. You only have 13 chunks (index not needed yet)
-- 2. Index creation requires 61 MB memory (free tier has 32 MB limit)
-- 3. pgvector will still work, just without the index optimization
--
-- When you reach 100+ chunks and want the index:
-- 1. Upgrade to paid tier for more memory
-- 2. Or run this command:
--    CREATE INDEX content_chunks_embedding_vector_idx
--    ON content_chunks USING ivfflat (embedding_vector vector_cosine_ops)
--    WITH (lists = 100);
-- ============================================================================

-- SUCCESS! Your pgvector is now enabled and working!
