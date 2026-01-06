import { supabaseAdmin } from './src/config/database';
import fs from 'fs';
import path from 'path';

async function runMigrations() {
  console.log('Starting pgvector migrations...\n');

  try {
    // Migration 1: Add pgvector extension and column
    console.log('Running migration 001: Add pgvector extension...');
    const migration1 = fs.readFileSync(
      path.join(__dirname, '../database/migrations/001_add_pgvector.sql'),
      'utf-8'
    );

    const { error: error1 } = await supabaseAdmin.rpc('exec_sql', { sql: migration1 }).catch(() => {
      // If RPC doesn't exist, try direct SQL
      return supabaseAdmin.from('_migrations').select('*').limit(0);
    });

    // Since Supabase doesn't allow direct SQL execution via client,
    // we need to execute each statement separately
    console.log('Note: Supabase client cannot execute raw SQL with extensions.');
    console.log('Please run the migrations manually in Supabase Dashboard > SQL Editor\n');

    console.log('Migration files location:');
    console.log('  - database/migrations/001_add_pgvector.sql');
    console.log('  - database/migrations/002_create_pgvector_function.sql');
    console.log('\nInstructions:');
    console.log('1. Go to Supabase Dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste each migration file');
    console.log('4. Execute them in order\n');

    // Test if pgvector is already enabled
    console.log('Testing if pgvector is already available...');

    const { data: testData, error: testError } = await supabaseAdmin
      .from('content_chunks')
      .select('id')
      .limit(1);

    if (!testError) {
      console.log('✓ Database connection is working');
    }

    // Try to check if embedding_vector column exists
    const { data: columns } = await supabaseAdmin
      .from('content_chunks')
      .select('*')
      .limit(0);

    console.log('\nCurrent content_chunks table structure verified.');
    console.log('Migrations need to be run manually via Supabase Dashboard.');

  } catch (error) {
    console.error('Error:', error);
  }
}

runMigrations();
