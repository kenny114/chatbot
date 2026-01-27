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
    const migrationPath = path.join(__dirname, 'migrations', '008_ab_test_cohorts.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('Running migration 008_ab_test_cohorts.sql...');

    // Run migration
    await pool.query(migrationSQL);

    console.log('Migration completed successfully!');

    // Verify table was created
    const tablesCheck = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'ab_test_cohorts'
    `);

    console.log('\nVerification - Tables created:');
    tablesCheck.rows.forEach(row => {
      console.log('  ✓', row.table_name);
    });

    // Check indexes
    const indexesCheck = await pool.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'ab_test_cohorts'
      AND indexname LIKE 'idx_ab_test%'
    `);

    console.log('\nVerification - Indexes created:');
    indexesCheck.rows.forEach(row => {
      console.log('  ✓', row.indexname);
    });

    console.log('\n✅ Migration 008 completed and verified successfully!');

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
