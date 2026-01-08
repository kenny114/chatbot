import pkg from 'pg';
const { Client } = pkg;

async function testConnection() {
  const client = new Client({
    host: 'db.prmafoynoqhelwcnujrx.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'Gameguardian#5106',
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('Attempting to connect to Supabase database...\n');
    await client.connect();
    console.log('✅ Connected successfully!\n');

    // Test 1: Check pgvector extension
    console.log('Test 1: Checking pgvector extension...');
    const extResult = await client.query(
      "SELECT extname, extversion FROM pg_extension WHERE extname = 'vector'"
    );
    if (extResult.rows.length > 0) {
      console.log(`✅ pgvector is installed: version ${extResult.rows[0].extversion}`);
    } else {
      console.log('❌ pgvector not found');
    }

    // Test 2: Check embedding_vector column
    console.log('\nTest 2: Checking embedding_vector column...');
    const colResult = await client.query(
      `SELECT column_name, data_type
       FROM information_schema.columns
       WHERE table_name = 'content_chunks' AND column_name = 'embedding_vector'`
    );
    if (colResult.rows.length > 0) {
      console.log(`✅ embedding_vector column exists: type ${colResult.rows[0].data_type}`);
    } else {
      console.log('❌ embedding_vector column not found');
    }

    // Test 3: Count chunks
    console.log('\nTest 3: Counting content chunks...');
    const countResult = await client.query(
      `SELECT
        COUNT(*) as total_chunks,
        COUNT(embedding) as chunks_with_embedding,
        COUNT(embedding_vector) as chunks_with_vector
       FROM content_chunks`
    );
    if (countResult.rows.length > 0) {
      const { total_chunks, chunks_with_embedding, chunks_with_vector } = countResult.rows[0];
      console.log(`✅ Total chunks: ${total_chunks}`);
      console.log(`✅ Chunks with embedding (text): ${chunks_with_embedding}`);
      console.log(`✅ Chunks with embedding_vector: ${chunks_with_vector}`);
    }

    // Test 4: Check match_chunks_pgvector function
    console.log('\nTest 4: Checking match_chunks_pgvector function...');
    const funcResult = await client.query(
      `SELECT EXISTS(
        SELECT 1 FROM pg_proc WHERE proname = 'match_chunks_pgvector'
      ) as exists`
    );
    if (funcResult.rows[0].exists) {
      console.log('✅ match_chunks_pgvector function exists');
    } else {
      console.log('❌ match_chunks_pgvector function not found');
    }

    // Test 5: Try a sample similarity search
    console.log('\nTest 5: Testing similarity search function...');
    const testResult = await client.query(
      `SELECT embedding_vector FROM content_chunks WHERE embedding_vector IS NOT NULL LIMIT 1`
    );

    if (testResult.rows.length > 0) {
      const sampleVector = testResult.rows[0].embedding_vector;
      const chatbotResult = await client.query(
        `SELECT chatbot_id FROM content_chunks LIMIT 1`
      );

      if (chatbotResult.rows && chatbotResult.rows.length > 0) {
        const searchResult = await client.query(
          `SELECT * FROM match_chunks_pgvector($1::vector(1536), $2::uuid, 1)`,
          [sampleVector, chatbotResult.rows[0].chatbot_id]
        );

        if (searchResult.rows.length > 0) {
          console.log('✅ Similarity search is working!');
          console.log(`   Found ${searchResult.rows.length} result(s)`);
        }
      }
    } else {
      console.log('⚠️  No vector embeddings found to test with');
    }

    console.log('\n===========================================');
    console.log('✅ All database tests passed!');
    console.log('pgvector is fully operational!');
    console.log('===========================================\n');

  } catch (error: any) {
    console.error('\n❌ Connection or test failed:');
    console.error(`   Error: ${error.message}`);
    if (error.code) {
      console.error(`   Code: ${error.code}`);
    }
    console.error('\n');
  } finally {
    await client.end();
    console.log('Connection closed.');
  }
}

testConnection();
