# Database Migrations

## pgvector Setup

These migrations add pgvector support for fast similarity search.

### Prerequisites
- Supabase project with pgvector extension available
- Or PostgreSQL database with pgvector installed

### Running Migrations

#### Option 1: Via Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run each migration file in order:
   - `001_add_pgvector.sql`
   - `002_create_pgvector_function.sql`

#### Option 2: Via psql
```bash
psql -h your-supabase-host -U postgres -d postgres -f 001_add_pgvector.sql
psql -h your-supabase-host -U postgres -d postgres -f 002_create_pgvector_function.sql
```

### Migration Details

**001_add_pgvector.sql**
- Enables pgvector extension
- Adds `embedding_vector` column with vector(1536) type
- Copies existing embeddings to new column
- Creates IVFFlat index for fast similarity search

**002_create_pgvector_function.sql**
- Creates `match_chunks_pgvector` RPC function
- Enables fast similarity search from application code

### Rollback

If you need to rollback:
```sql
-- Drop the function
DROP FUNCTION IF EXISTS match_chunks_pgvector;

-- Drop the index
DROP INDEX IF EXISTS content_chunks_embedding_vector_idx;

-- Drop the new column
ALTER TABLE content_chunks DROP COLUMN IF EXISTS embedding_vector;
```

### Performance Impact

- **Before pgvector**: O(n) - loads all chunks into memory, calculates similarity in Node.js
- **After pgvector**: O(log n) - uses index for fast similarity search in database

Expected speed improvement: **10-100x** depending on dataset size.

### Testing

After running migrations, test with:
```sql
-- Test the function
SELECT match_chunks_pgvector(
  '[0.1, 0.2, ...]'::vector(1536),  -- Sample embedding
  'your-chatbot-id'::uuid,
  5
);
```

The application will automatically detect and use pgvector if available, with automatic fallback to legacy method if not.
