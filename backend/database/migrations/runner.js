/**
 * Database Migration Runner
 * 
 * This script runs all migrations in the migrations folder in sequential order.
 * Usage: node runner.js
 */

const fs = require('fs');
const path = require('path');
const db = require('../connection');

// Migration tracking table
const MIGRATION_TABLE = 'migrations';

function setupMigrationTable() {
  try {
    db.prepare(`CREATE TABLE IF NOT EXISTS ${MIGRATION_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`).run();
    return true;
  } catch (err) {
    console.error('Error creating migration table:', err.message);
    throw err;
  }
}

function getAppliedMigrations() {
  try {
    const rows = db.prepare(`SELECT name FROM ${MIGRATION_TABLE}`).all();
    return rows.map(row => row.name);
  } catch (err) {
    console.error('Error fetching applied migrations:', err.message);
    throw err;
  }
}

function recordMigration(name) {
  try {
    db.prepare(`INSERT INTO ${MIGRATION_TABLE} (name) VALUES (?)`).run(name);
    return true;
  } catch (err) {
    console.error('Error recording migration:', err.message);
    throw err;
  }
}

function runMigrations() {
  try {
    console.log('Setting up migration tracking table...');
    setupMigrationTable();
    
    console.log('Fetching applied migrations...');
    const appliedMigrations = getAppliedMigrations();
    
    // Get all migration files
    const migrationFiles = fs.readdirSync(__dirname)
      .filter(file => file.endsWith('.js') && file !== 'runner.js')
      .sort(); // Sort to ensure order
    
    console.log(`Found ${migrationFiles.length} migration files`);
    
    // Use a transaction for all migrations
    db.prepare('BEGIN TRANSACTION').run();
    
    for (const file of migrationFiles) {
      if (appliedMigrations.includes(file)) {
        console.log(`Migration ${file} already applied, skipping`);
        continue;
      }
      
      console.log(`Applying migration: ${file}`);
      const migration = require(path.join(__dirname, file));
      
      if (typeof migration.up !== 'function') {
        console.warn(`Warning: Migration ${file} does not have an up() function`);
        continue;
      }
      
      try {
        migration.up();
        recordMigration(file);
        console.log(`Successfully applied migration: ${file}`);
      } catch (err) {
        console.error(`Failed to apply migration ${file}:`, err);
        db.prepare('ROLLBACK').run();
        process.exit(1);
      }
    }
    
    // Commit the transaction if all migrations succeeded
    db.prepare('COMMIT').run();
    console.log('All migrations completed successfully!');
  } catch (err) {
    console.error('Error running migrations:', err);
    // Ensure we rollback if there was an error
    try { db.prepare('ROLLBACK').run(); } catch (e) { /* ignore */ }
    process.exit(1);
  } finally {
    db.close();
  }
}

// Run the migrations
runMigrations();