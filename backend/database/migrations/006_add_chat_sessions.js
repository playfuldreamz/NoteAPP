/**
 * Migration: Add chat sessions and messages tables
 * Date: May 4, 2025
 * 
 * This migration adds tables for storing user chat sessions and messages
 * to enable persistent chat history across devices.
 */

module.exports = {
  up: function(db) {
    // Create chat_sessions table
    db.prepare(`CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )`).run();

    // Create chat_messages table
    db.prepare(`CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      role TEXT CHECK(role IN ('user', 'assistant')) NOT NULL,
      content TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
    )`).run();

    // Add indexes for efficient queries
    db.prepare('CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id)').run();
    db.prepare('CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id)').run();
    
    console.log('Created chat sessions and messages tables');
    
    return Promise.resolve();
  },
  
  down: function(db) {
    // Drop the chat_messages table first due to foreign key constraint
    db.prepare('DROP TABLE IF EXISTS chat_messages').run();
    db.prepare('DROP TABLE IF EXISTS chat_sessions').run();
    db.prepare('DROP INDEX IF EXISTS idx_chat_sessions_user_id').run();
    db.prepare('DROP INDEX IF EXISTS idx_chat_messages_session_id').run();
    
    console.log('Dropped chat sessions and messages tables');
    
    return Promise.resolve();
  },
  
  description: 'Add chat sessions and messages tables for persistent user chat history'
};
