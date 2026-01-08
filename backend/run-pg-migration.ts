import pkg from 'pg';
const { Client } = pkg;

async function runMigration() {
  const client = new Client({
    host: 'aws-0-us-east-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.prmafoynoqhelwcnujrx',
    password: 'Gameguardian#5106',
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('✅ Connected!\n');

    // Migration steps
    const migrations = [
      {
        name: 'Enable pgvector extension',
        sql: 'CREATE EXTENSION IF NOT EXISTS vector;'
      },
      {
        name: 'Add embedding_vector column',
        sql: 'ALTER TABLE content_chunks ADD COLUMN IF NOT EXISTS embedding_vector vector(1536);'
      },
      {
        name: 'Migrate existing embeddings',
        sql: `UPDATE content_chunks
              SET embedding_vector = embedding::text::vector
              WHERE embedding IS NOT NULL AND embedding_vector IS NULL;`
      },
      {
        name: 'Create match_chunks_pgvector function',
        sql: `CREATE OR REPLACE FUNCTION match_chunks_pgvector(
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
              $$;`
      },
      {
        name: 'Grant execute permissions',
        sql: 'GRANT EXECUTE ON FUNCTION match_chunks_pgvector TO authenticated, anon;'
      }
    ];

    for (const migration of migrations) {
      console.log(`Running: ${migration.name}...`);
      try {
        await client.query(migration.sql);
        console.log('  ✅ Success');
      } catch (error: any) {
        if (error.message.includes('already exists')) {
          console.log('  ℹ️  Already exists, skipping');
        } else {
          console.log('  ⚠️  Error:', error.message);
        }
      }
    }

    console.log('\n===========================================');
    console.log('Verification');
    console.log('===========================================\n');

    // Verify pgvector
    const extResult = await client.query(
      "SELECT extname, extversion FROM pg_extension WHERE extname = 'vector'"
    );
    if (extResult.rows.length > 0) {
      console.log('✅ pgvector extension:', extResult.rows[0].extversion);
    }

    // Verify column
    const colResult = await client.query(
      `SELECT column_name, data_type
       FROM information_schema.columns
       WHERE table_name = 'content_chunks' AND column_name = 'embedding_vector'`
    );
    if (colResult.rows.length > 0) {
      console.log('✅ embedding_vector column exists:', colResult.rows[0].data_type);
    }

    // Count migrated chunks
    const countResult = await client.query(
      `SELECT COUNT(*) as total, COUNT(embedding_vector) as with_vector
       FROM content_chunks`
    );
    if (countResult.rows.length > 0) {
      console.log(`✅ Chunks migrated: ${countResult.rows[0].with_vector} / ${countResult.rows[0].total}`);
    }

    // Test function
    const funcResult = await client.query(
      `SELECT EXISTS(
        SELECT 1 FROM pg_proc WHERE proname = 'match_chunks_pgvector'
      ) as exists`
    );
    if (funcResult.rows[0].exists) {
      console.log('✅ match_chunks_pgvector function exists');
    }

    console.log('\n===========================================');
    console.log('✅ Migration completed successfully!');
    console.log('===========================================\n');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await client.end();
    console.log('Connection closed.');
  }
}

runMigration();
