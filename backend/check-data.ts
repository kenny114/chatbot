import { supabaseAdmin } from './src/config/database';

async function checkData() {
  try {
    // Get all chatbots
    const { data: chatbots, error: chatbotsError } = await supabaseAdmin
      .from('chatbots')
      .select('*');

    console.log('\n=== CHATBOTS ===');
    console.log(`Found ${chatbots?.length || 0} chatbots`);
    if (chatbots && chatbots.length > 0) {
      chatbots.forEach(bot => {
        console.log(`  - ${bot.name} (${bot.id}): ${bot.status}`);
      });
    }

    // Get all data sources
    const { data: sources, error: sourcesError } = await supabaseAdmin
      .from('data_sources')
      .select('*');

    console.log('\n=== DATA SOURCES ===');
    console.log(`Found ${sources?.length || 0} data sources`);
    if (sources && sources.length > 0) {
      sources.forEach(source => {
        console.log(`  - ${source.type}: ${source.source_url || 'text'} - Status: ${source.status}`);
        if (source.error_message) {
          console.log(`    Error: ${source.error_message}`);
        }
      });
    }

    // Get content chunks
    const { data: chunks, error: chunksError } = await supabaseAdmin
      .from('content_chunks')
      .select('id, chatbot_id, content, metadata');

    console.log('\n=== CONTENT CHUNKS ===');
    console.log(`Found ${chunks?.length || 0} content chunks`);
    if (chunks && chunks.length > 0) {
      chunks.slice(0, 3).forEach((chunk, idx) => {
        console.log(`\n  Chunk ${idx + 1}:`);
        console.log(`    Chatbot ID: ${chunk.chatbot_id}`);
        console.log(`    Content (first 100 chars): ${chunk.content?.substring(0, 100)}...`);
        console.log(`    Metadata:`, chunk.metadata);
      });
    }

    if (chatbotsError) console.error('Chatbots error:', chatbotsError);
    if (sourcesError) console.error('Sources error:', sourcesError);
    if (chunksError) console.error('Chunks error:', chunksError);

  } catch (error) {
    console.error('Error checking data:', error);
  } finally {
    process.exit(0);
  }
}

checkData();
