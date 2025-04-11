/**
 * Migration: Add links table for bi-directional linking between notes and transcripts
 * Date: April 10, 2025
 * 
 * This migration adds a new links table to support bi-directional linking
 * between notes and transcripts.
 */

const db = require('../connection');

/**
 * Apply the migration - create links table
 */
function up() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Create the links table
      db.run(`CREATE TABLE IF NOT EXISTS links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_id INTEGER NOT NULL,
        source_type TEXT NOT NULL CHECK(source_type IN ('note', 'transcript')),
        target_id INTEGER NOT NULL,
        target_type TEXT NOT NULL CHECK(target_type IN ('note', 'transcript')),
        link_text TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(source_id, source_type, target_id, target_type)
      )`, (err) => {
        if (err) {
          console.error('Error creating links table:', err.message);
          reject(err);
          return;
        }

        // Create indexes for efficient lookups
        db.run(`CREATE INDEX IF NOT EXISTS idx_links_source 
          ON links(source_id, source_type)`, (err) => {
          if (err) {
            console.error('Error creating source index:', err.message);
            reject(err);
            return;
          }

          db.run(`CREATE INDEX IF NOT EXISTS idx_links_target 
            ON links(target_id, target_type)`, (err) => {
            if (err) {
              console.error('Error creating target index:', err.message);
              reject(err);
              return;
            }

            console.log('Links table and indexes created successfully');
            resolve();
          });
        });
      });
    });
  });
}

/**
 * Revert the migration - drop the links table
 */
function down() {
  return new Promise((resolve, reject) => {
    // Drop the links table
    db.run(`DROP TABLE IF EXISTS links`, (err) => {
      if (err) {
        console.error('Error dropping links table:', err.message);
        reject(err);
        return;
      }
      console.log('Links table dropped successfully');
      resolve();
    });
  });
}

module.exports = {
  up,
  down,
  description: 'Add links table for bi-directional linking'
};
