import { createClient } from '@supabase/supabase-js';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

// Client for user-facing operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for backend operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// PostgreSQL connection pool for direct database access
// Extract project ref from Supabase URL (e.g., https://prmafoynoqhelwcnujrx.supabase.co)
const projectRef = supabaseUrl.replace('https://', '').split('.')[0];

// Construct connection string
// Note: You need to add DATABASE_PASSWORD to your .env file
// Get it from Supabase Dashboard -> Project Settings -> Database -> Connection string
const databaseUrl = process.env.DATABASE_URL ||
  `postgresql://postgres.${projectRef}:${process.env.DATABASE_PASSWORD}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Test connection
pool.on('connect', () => {
  console.log('PostgreSQL pool connected');
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL error:', err);
});

export default pool;
