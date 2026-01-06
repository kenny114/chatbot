import { supabaseAdmin } from './src/config/database';

async function checkDetailed() {
  try {
    // Get all data sources with full details
    const { data: sources, error } = await supabaseAdmin
      .from('data_sources')
      .select('*')
      .order('created_at', { ascending: false });

    console.log('\n=== DATA SOURCES (DETAILED) ===');
    if (sources && sources.length > 0) {
      sources.forEach((source, idx) => {
        console.log(`\nData Source ${idx + 1}:`);
        console.log(`  ID: ${source.id}`);
        console.log(`  Chatbot ID: ${source.chatbot_id}`);
        console.log(`  Type: ${source.type}`);
        console.log(`  URL: ${source.source_url}`);
        console.log(`  Status: ${source.status}`);
        console.log(`  Error: ${source.error_message || 'None'}`);
        console.log(`  Created: ${source.created_at}`);
        console.log(`  Updated: ${source.updated_at}`);
      });
    } else {
      console.log('No data sources found');
    }

    // Get content chunks count
    const { count } = await supabaseAdmin
      .from('content_chunks')
      .select('*', { count: 'exact', head: true });

    console.log(`\n=== CONTENT CHUNKS ===`);
    console.log(`Total chunks: ${count || 0}`);

    if (error) console.error('Error:', error);

  } catch (error) {
    console.error('Error checking data:', error);
  } finally {
    process.exit(0);
  }
}

checkDetailed();
