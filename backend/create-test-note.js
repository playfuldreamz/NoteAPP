// Test script to create a sample note in the database
const db = require('./database/connection');
const crypto = require('crypto');

function createTestNote() {
  console.log('Creating test note in the database...');
  
  // Generate a unique ID for the note (just for testing)
  const noteId = crypto.randomBytes(12).toString('hex');
  const userId = crypto.randomBytes(12).toString('hex');
  
  // Check if test note already exists
  const checkStmt = db.prepare('SELECT id FROM notes WHERE id = ?');
  const existingNote = checkStmt.get(noteId);
  
  if (existingNote) {
    console.log(`Note with ID ${noteId} already exists.`);
    
    // Update the existing note
    const updateStmt = db.prepare(`
      UPDATE notes 
      SET title = ?, content = ?, timestamp = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    updateStmt.run(
      'DSPy Planning', 
      'Initial thoughts on DSPy integration:\n\n' +
      '1. Need to set up the DSPy service as a separate microservice\n' +
      '2. Implement communication between Node.js backend and Python service\n' +
      '3. Design agent workflows for note summarization, insights extraction\n' +
      '4. Add tools for searching and retrieving content\n\n' +
      'Key questions:\n' +
      '- Which LLM provider should we use? (OpenAI, Google, or Anthropic)\n' +
      '- How to optimize token usage for large documents?\n' +
      '- Should we implement caching for repeated queries?\n' +
      '- How to handle error states gracefully?',
      noteId
    );
    
    console.log(`Updated test note with ID: ${noteId}`);
  } else {
    // Create a new test note
    const insertStmt = db.prepare(`
      INSERT INTO notes (id, title, content, user_id, timestamp)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    
    insertStmt.run(
      noteId,
      'DSPy Planning',
      'Initial thoughts on DSPy integration:\n\n' +
      '1. Need to set up the DSPy service as a separate microservice\n' +
      '2. Implement communication between Node.js backend and Python service\n' +
      '3. Design agent workflows for note summarization, insights extraction\n' +
      '4. Add tools for searching and retrieving content\n\n' +
      'Key questions:\n' +
      '- Which LLM provider should we use? (OpenAI, Google, or Anthropic)\n' +
      '- How to optimize token usage for large documents?\n' +
      '- Should we implement caching for repeated queries?\n' +
      '- How to handle error states gracefully?',
      userId
    );
    
    console.log(`Created new test note with ID: ${noteId}`);
  }
  
  // Verify the note exists
  const verifyStmt = db.prepare('SELECT id, title FROM notes WHERE id = ?');
  const result = verifyStmt.get(noteId);
  console.log('Verified note:', result);
}

createTestNote();
