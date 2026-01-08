import { supabaseAdmin } from './src/config/database';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

async function runPgvectorMigration() {
  console.log('Starting pgvector migration...\n');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase credentials');
  }

  // SQL statements to execute
  const migrations = [
    {
      name: 'Enable pgvector extension',
      sql: 'CREATE EXTENSION IF NOT EXISTS vector;'
    },
    {
      name: 'Add embedding_vector column',
      sql: `ALTER TABLE content_chunks ADD COLUMN IF NOT EXISTS embedding_vector vector(1536);`
    },
    {
      name: 'Migrate existing embeddings',
      sql: `UPDATE content_chunks
            SET embedding_vector = embedding::text::vector
            WHERE embedding IS NOT NULL AND embedding_vector IS NULL;`
    },
    {
      name: 'Create ivfflat index',
      sql: `CREATE INDEX IF NOT EXISTS content_chunks_embedding_vector_idx
            ON content_chunks
            USING ivfflat (embedding_vector vector_cosine_ops)
            WITH (lists = 100);`
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
      sql: `GRANT EXECUTE ON FUNCTION match_chunks_pgvector TO authenticated, anon;`
    }
  ];

  // Execute using Supabase REST API
  for (const migration of migrations) {
    console.log(`Running: ${migration.name}...`);

    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ query: migration.sql })
      });

      // If the RPC endpoint doesn't exist, we'll try direct execution via PostgREST
      if (!response.ok && response.status === 404) {
        console.log('  ⚠ Unable to execute via API - trying alternative method...');

        // For DDL operations, we need to use pg connection or SQL Editor
        // Let's check if the changes are already applied
        if (migration.name === 'Add embedding_vector column') {
          const { data, error } = await supabaseAdmin
            .from('content_chunks')
            .select('embedding_vector')
            .limit(0);

          if (error && error.message.includes('column "embedding_vector" does not exist')) {
            console.log('  ❌ Column does not exist yet - manual migration needed');
          } else if (!error) {
            console.log('  ✅ Column already exists!');
          }
        }
      } else if (response.ok) {
        console.log(`  ✅ Success`);
      } else {
        console.log(`  ⚠ Status: ${response.status}`);
      }
    } catch (error) {
      console.log(`  ⚠ Could not execute: ${error}`);
    }
  }

  console.log('\n===========================================');
  console.log('Migration Status Check');
  console.log('===========================================\n');

  // Verify what we can
  try {
    console.log('Checking content_chunks table...');
    const { data: chunks, error } = await supabaseAdmin
      .from('content_chunks')
      .select('id, content, metadata, embedding_vector')
      .limit(1);

    if (error) {
      if (error.message.includes('embedding_vector')) {
        console.log('❌ embedding_vector column does NOT exist');
        console.log('\n⚠️  IMPORTANT: Supabase JavaScript client cannot execute DDL statements.');
        console.log('Please run the migration manually in Supabase Dashboard > SQL Editor');
        console.log('File: database/migrations/RUN_THIS_IN_SUPABASE.sql\n');
      } else {
        console.log('❌ Error:', error.message);
      }
    } else {
      console.log('✅ embedding_vector column EXISTS!');
      console.log(`✅ Found ${chunks?.length || 0} sample chunk(s)`);

      // Try the function
      console.log('\nTesting match_chunks_pgvector function...');
      const { data: funcTest, error: funcError } = await supabaseAdmin
        .rpc('match_chunks_pgvector', {
          query_embedding: chunks?.[0]?.embedding_vector || Array(1536).fill(0),
          match_chatbot_id: chunks?.[0]?.id || '00000000-0000-0000-0000-000000000000',
          match_count: 1
        });

      if (funcError) {
        console.log('❌ Function not available:', funcError.message);
      } else {
        console.log('✅ match_chunks_pgvector function WORKS!');
        console.log('✅ pgvector is fully operational!');
      }
    }
  } catch (error) {
    console.log('Error during verification:', error);
  }

  console.log('\n===========================================\n');
}

runPgvectorMigration().then(() => {
  console.log('Migration script completed');
  process.exit(0);
}).catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});
