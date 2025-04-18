/**
 * Migration Script
 * 
 * This script handles the migration from SQLite to Supabase.
 * It creates the necessary tables in Supabase and migrates the data.
 */

require('dotenv').config();
const { migrateAllData } = require('./utils/dataMigration');

// Check if required environment variables are set
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error(`Error: Missing required environment variables: ${missingEnvVars.join(', ')}`);
  console.error('Please set these variables in your .env file');
  process.exit(1);
}

// Import migration functions
const createTables = require('./database/migrate-to-supabase');

// Run the migration
async function runMigration() {
  try {
    console.log('Starting migration from SQLite to Supabase...');
    
    // Step 1: Create tables in Supabase
    console.log('Step 1: Creating tables in Supabase...');
    await createTables();
    
    // Step 2: Migrate data from SQLite to Supabase
    console.log('Step 2: Migrating data from SQLite to Supabase...');
    await migrateAllData();
    
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration();
