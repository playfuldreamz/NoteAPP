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

async function setupMigrationTable() {
  return new Promise((resolve, reject) => {
    db.run(`CREATE TABLE IF NOT EXISTS ${MIGRATION_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

async function getAppliedMigrations() {
  return new Promise((resolve, reject) => {
    db.all(`SELECT name FROM ${MIGRATION_TABLE}`, (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows.map(row => row.name));
    });
  });
}

async function recordMigration(name) {
  return new Promise((resolve, reject) => {
    db.run(`INSERT INTO ${MIGRATION_TABLE} (name) VALUES (?)`, [name], (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

async function runMigrations() {
  try {
    console.log('Setting up migration tracking table...');
    await setupMigrationTable();
    
    console.log('Fetching applied migrations...');
    const appliedMigrations = await getAppliedMigrations();
    
    // Get all migration files
    const migrationFiles = fs.readdirSync(__dirname)
      .filter(file => file.endsWith('.js') && file !== 'runner.js')
      .sort(); // Sort to ensure order
    
    console.log(`Found ${migrationFiles.length} migration files`);
    
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
        await migration.up();
        await recordMigration(file);
        console.log(`Successfully applied migration: ${file}`);
      } catch (err) {
        console.error(`Failed to apply migration ${file}:`, err);
        process.exit(1);
      }
    }
    
    console.log('All migrations completed successfully!');
  } catch (err) {
    console.error('Error running migrations:', err);
    process.exit(1);
  } finally {
    db.close();
  }
}

// Run the migrations
runMigrations();