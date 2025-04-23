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
  // Check if summary column exists in notes table
  const notesColumns = db.prepare("PRAGMA table_info(notes)").all();
  
  // Add summary column to notes table if it doesn't exist
  const hasNoteSummary = notesColumns.some(row => row.name === 'summary');
  if (!hasNoteSummary) {
    console.log('Adding summary column to notes table...');
    try {
      db.prepare('ALTER TABLE notes ADD COLUMN summary TEXT DEFAULT NULL').run();
      console.log('Successfully added summary column to notes table');
    } catch (err) {
      console.error('Error adding summary column to notes table:', err);
      throw err;
    }
  } else {
    console.log('Summary column already exists in notes table');
  }

  // Check if summary column exists in transcripts table
  const transcriptsColumns = db.prepare("PRAGMA table_info(transcripts)").all();
  
  // Add summary column to transcripts table if it doesn't exist
  const hasTranscriptSummary = transcriptsColumns.some(row => row.name === 'summary');
  if (!hasTranscriptSummary) {
    console.log('Adding summary column to transcripts table...');
    try {
      db.prepare('ALTER TABLE transcripts ADD COLUMN summary TEXT DEFAULT NULL').run();
      console.log('Successfully added summary column to transcripts table');
    } catch (err) {
      console.error('Error adding summary column to transcripts table:', err);
      throw err;
    }
  } else {
    console.log('Summary column already exists in transcripts table');
  }
}

/**
 * Revert the migration - remove summary fields
 * Note: SQLite doesn't support dropping columns directly, so we'd need to 
 * recreate the tables without the summary columns. For simplicity, this
 * is not implemented here.
 */
function down() {
  console.log('Down migration not implemented for SQLite (cannot easily drop columns)');
  return true;
}

module.exports = {
  up,
  down,
  description: 'Add summary fields to notes and transcripts tables'
};