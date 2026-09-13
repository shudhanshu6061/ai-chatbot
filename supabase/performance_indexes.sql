-- =====================================================================
-- PRODUCTION DATABASE PERFORMANCE INDEXES & PGVECTOR OPTIMIZATION
-- =====================================================================
-- Ensure these indexes are applied in the Supabase SQL Editor.
-- They accelerate user-isolated queries, descending date sorts, and vector search.

-- 1. CONVERSATIONS INDEXES
-- Optimizes: SELECT * FROM conversations WHERE user_id = $1 ORDER BY updated_at DESC
CREATE INDEX IF NOT EXISTS idx_conversations_user_updated
  ON conversations (user_id, updated_at DESC);

-- 2. MESSAGES INDEXES
-- Optimizes: SELECT * FROM messages WHERE conversation_id = $1 AND user_id = $2 ORDER BY created_at ASC
CREATE INDEX IF NOT EXISTS idx_messages_conv_user_created
  ON messages (conversation_id, user_id, created_at ASC);

-- Optimizes: Single message ownership check by id and user_id
CREATE INDEX IF NOT EXISTS idx_messages_id_user
  ON messages (id, user_id);

-- 3. DOCUMENTS INDEXES
-- Optimizes: SELECT * FROM documents WHERE user_id = $1 ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_documents_user_created
  ON documents (user_id, created_at DESC);

-- Optimizes: Single document ownership check by id and user_id
CREATE INDEX IF NOT EXISTS idx_documents_id_user
  ON documents (id, user_id);

-- 4. DOCUMENT CHUNKS INDEXES
-- Optimizes: SELECT * FROM document_chunks WHERE document_id = $1 AND user_id = $2 ORDER BY chunk_index ASC
CREATE INDEX IF NOT EXISTS idx_document_chunks_doc_user_chunk
  ON document_chunks (document_id, user_id, chunk_index ASC);

-- Optimizes: DELETE FROM document_chunks WHERE document_id = $1 AND user_id = $2
CREATE INDEX IF NOT EXISTS idx_document_chunks_doc_user
  ON document_chunks (document_id, user_id);

-- 5. PGVECTOR HNSW COSINE SIMILARITY INDEX (768 dimensions for gemini-embedding-001)
-- Note: Requires extension vector (pgvector)
-- HNSW provides sub-millisecond approximate nearest neighbors search.
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding_hnsw
  ON document_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- 6. MATCH_DOCUMENT_CHUNKS RPC FUNCTION (Optimized)
-- Validates: isolated by match_user_id, orders by cosine distance (<=>)
CREATE OR REPLACE FUNCTION match_document_chunks (
  query_embedding vector(768),
  match_user_id uuid,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  chunk_index int,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.content,
    dc.chunk_index,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM document_chunks dc
  WHERE dc.user_id = match_user_id
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
