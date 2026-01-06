-- Create pgvector similarity search function
-- This function performs fast similarity search using pgvector

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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION match_chunks_pgvector TO authenticated, anon;
