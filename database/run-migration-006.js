const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres.prmafoynoqhelwcnujrx:Gameguardian%235106@aws-1-us-east-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  console.log('Connecting to database...');

  try {
    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', '006_add_visitor_profiles.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('Running migration 006_add_visitor_profiles.sql...');

    // Run migration
    await pool.query(migrationSQL);

    console.log('Migration completed successfully!');

    // Verify tables were created
    const tablesCheck = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('visitor_profiles')
    `);

    console.log('\nVerification - Tables created:');
    tablesCheck.rows.forEach(row => {
      console.log('  ✓', row.table_name);
    });

    // Check new columns in conversation_sessions
    const columnsCheck = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'conversation_sessions'
      AND column_name IN ('visitor_profile_id', 'agent_state', 'conversation_summary', 'tool_calls_count')
    `);

    console.log('\nVerification - New columns in conversation_sessions:');
    columnsCheck.rows.forEach(row => {
      console.log('  ✓', row.column_name);
    });

    // Check indexes
    const indexesCheck = await pool.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'visitor_profiles'
      AND indexname LIKE 'idx_visitor_profiles%'
    `);

    console.log('\nVerification - Indexes created:');
    indexesCheck.rows.forEach(row => {
      console.log('  ✓', row.indexname);
    });

    // Check functions
    const functionsCheck = await pool.query(`
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_schema = 'public'
      AND routine_name IN ('update_visitor_profile_last_seen', 'merge_visitor_profiles')
    `);

    console.log('\nVerification - Functions created:');
    functionsCheck.rows.forEach(row => {
      console.log('  ✓', row.routine_name);
    });

    console.log('\n✅ Migration 006 completed and verified successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.position) {
      console.error('Error at position:', error.position);
    }
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
