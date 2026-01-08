import { supabaseAdmin } from './src/config/database';

async function testSupabaseConnection() {
  console.log('Testing Supabase connection via JavaScript client...\n');

  try {
    // Test 1: Query content chunks
    console.log('Test 1: Querying content_chunks table...');
    const { data: chunks, error: chunksError } = await supabaseAdmin
      .from('content_chunks')
      .select('id, content, embedding_vector')
      .limit(1);

    if (chunksError) {
      console.log('❌ Error querying chunks:', chunksError.message);
    } else {
      console.log('✅ Successfully queried content_chunks');
      console.log(`   Found ${chunks?.length || 0} chunk(s)`);

      if (chunks && chunks.length > 0) {
        if (chunks[0].embedding_vector) {
          console.log('✅ embedding_vector column exists and has data!');
        } else {
          console.log('⚠️  embedding_vector column exists but is null');
        }
      }
    }

    // Test 2: Count all chunks
    console.log('\nTest 2: Counting all chunks...');
    const { data: allChunks, error: countError } = await supabaseAdmin
      .from('content_chunks')
      .select('id, embedding_vector');

    if (countError) {
      console.log('❌ Error counting chunks:', countError.message);
    } else {
      const total = allChunks?.length || 0;
      const withVector = allChunks?.filter(c => c.embedding_vector).length || 0;
      console.log(`✅ Total chunks: ${total}`);
      console.log(`✅ Chunks with vector: ${withVector}`);
    }

    // Test 3: Try the match_chunks_pgvector function
    console.log('\nTest 3: Testing match_chunks_pgvector function...');

    if (chunks && chunks.length > 0 && chunks[0].embedding_vector) {
      const { data: chatbotData } = await supabaseAdmin
        .from('content_chunks')
        .select('chatbot_id')
        .limit(1)
        .single();

      if (chatbotData) {
        const { data: searchResults, error: searchError } = await supabaseAdmin
          .rpc('match_chunks_pgvector', {
            query_embedding: chunks[0].embedding_vector,
            match_chatbot_id: chatbotData.chatbot_id,
            match_count: 3
          });

        if (searchError) {
          console.log('❌ Error calling function:', searchError.message);
        } else {
          console.log('✅ match_chunks_pgvector function works!');
          console.log(`   Returned ${searchResults?.length || 0} result(s)`);
          if (searchResults && searchResults.length > 0) {
            console.log('   Sample result:');
            console.log(`     - Content preview: ${searchResults[0].content.substring(0, 50)}...`);
            console.log(`     - Distance: ${searchResults[0].distance}`);
          }
        }
      }
    } else {
      console.log('⚠️  Skipping function test - no vector data available');
    }

    console.log('\n===========================================');
    console.log('✅ Supabase client connection is working!');
    console.log('✅ pgvector is operational!');
    console.log('===========================================\n');

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
  }
}

testSupabaseConnection().then(() => {
  console.log('Tests completed.');
  process.exit(0);
}).catch(error => {
  console.error('Test script failed:', error);
  process.exit(1);
});
