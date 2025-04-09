/**
 * Migration: Add summary fields to notes and transcripts tables
 * Date: April 9, 2025
 * 
 * This migration adds the summary column to the notes and transcripts tables
 * for storing AI-generated summaries of content.
 */

const db = require('../connection');

/**
 * Apply the migration - add summary fields
 */
function up() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Check if summary column exists in notes table
      db.all("PRAGMA table_info(notes)", (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Add summary column to notes table if it doesn't exist
        const hasNoteSummary = rows.some(row => row.name === 'summary');
        if (!hasNoteSummary) {
          console.log('Adding summary column to notes table...');
          db.run('ALTER TABLE notes ADD COLUMN summary TEXT DEFAULT NULL', (err) => {
            if (err) {
              console.error('Error adding summary column to notes table:', err);
              reject(err);
              return;
            }
            console.log('Successfully added summary column to notes table');
          });
        } else {
          console.log('Summary column already exists in notes table');
        }
      });

      // Check if summary column exists in transcripts table
      db.all("PRAGMA table_info(transcripts)", (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Add summary column to transcripts table if it doesn't exist
        const hasTranscriptSummary = rows.some(row => row.name === 'summary');
        if (!hasTranscriptSummary) {
          console.log('Adding summary column to transcripts table...');
          db.run('ALTER TABLE transcripts ADD COLUMN summary TEXT DEFAULT NULL', (err) => {
            if (err) {
              console.error('Error adding summary column to transcripts table:', err);
              reject(err);
              return;
            }
            console.log('Successfully added summary column to transcripts table');
            resolve();
          });
        } else {
          console.log('Summary column already exists in transcripts table');
          resolve();
        }
      });
    });
  });
}

/**
 * Revert the migration - remove summary fields
 * Note: SQLite doesn't support dropping columns directly, so we'd need to 
 * recreate the tables without the summary columns. For simplicity, this
 * is not implemented here.
 */
function down() {
  return new Promise((resolve) => {
    console.log('Down migration not implemented for SQLite (cannot easily drop columns)');
    resolve();
  });
}

module.exports = {
  up,
  down,
  description: 'Add summary fields to notes and transcripts tables'
};