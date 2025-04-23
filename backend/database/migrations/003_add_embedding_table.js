/**
 * Migration: Add embeddings table for semantic search
 * Date: April 21, 2025
 * 
 * This migration adds a virtual table using sqlite-vec for storing
 * vector embeddings of notes and transcripts content.
 */

const db = require('../connection');

/**
 * Apply the migration - create embeddings virtual table
 */
function up() {
  try {
    // Create the embeddings virtual table using sqlite-vec
    // Note: Virtual tables cannot be indexed directly in SQLite
    db.prepare(`CREATE VIRTUAL TABLE IF NOT EXISTS embeddings USING vec0(
      item_id INTEGER NOT NULL,
      item_type TEXT NOT NULL CHECK(item_type IN ('note', 'transcript')),
      user_id INTEGER NOT NULL,
      content_embedding FLOAT[384]
    )`).run();

    console.log('Embeddings table created successfully');
  } catch (err) {
    console.error('Error creating embeddings table or indexes:', err.message);
    throw err;
  }
}

/**
 * Revert the migration - drop the embeddings table
 */
function down() {
  try {
    // Drop the embeddings table
    db.prepare(`DROP TABLE IF EXISTS embeddings`).run();
    console.log('Embeddings table dropped successfully');
  } catch (err) {
    console.error('Error dropping embeddings table:', err.message);
    throw err;
  }
}

module.exports = {
  up,
  down,
  description: 'Add embeddings table for semantic search'
};
