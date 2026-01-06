-- Migration: Add pgvector extension and convert embeddings to vector type
-- This must be run on Supabase database

-- Step 1: Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Step 2: Add new vector column to content_chunks
ALTER TABLE content_chunks
ADD COLUMN embedding_vector vector(1536);

-- Step 3: Copy existing embeddings from text/json to vector format
-- This converts the JSON array string to actual vector type
UPDATE content_chunks
SET embedding_vector = embedding::text::vector
WHERE embedding IS NOT NULL;

-- Step 4: Create index for fast similarity search
CREATE INDEX IF NOT EXISTS content_chunks_embedding_vector_idx
ON content_chunks
USING ivfflat (embedding_vector vector_cosine_ops)
WITH (lists = 100);

-- Step 5: (Optional) After verifying data, you can drop the old embedding column:
-- ALTER TABLE content_chunks DROP COLUMN embedding;
-- ALTER TABLE content_chunks RENAME COLUMN embedding_vector TO embedding;

-- Note: Keep both columns for now to allow rollback if needed
