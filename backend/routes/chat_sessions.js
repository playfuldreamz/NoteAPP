/**
 * Chat Sessions API Routes
 * 
 * These routes handle CRUD operations for chat sessions and messages,
 * with user-specific access control.
 */

const express = require('express');
const router = express.Router();
const db = require('../database/connection');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * GET /api/chat-sessions
 * Get all chat sessions for the current user
 */
router.get('/', (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get all chat sessions for this user
    const sessionStmt = db.prepare(`
      SELECT id, title, created_at AS createdAt, updated_at AS updatedAt 
      FROM chat_sessions
      WHERE user_id = ?
      ORDER BY updated_at DESC
    `);
    const sessions = sessionStmt.all(userId);
    
    // For each session, get the messages
    const messageStmt = db.prepare(`
      SELECT id, role, content, timestamp 
      FROM chat_messages 
      WHERE session_id = ?
      ORDER BY id ASC
    `);
    
    // Map sessions with their messages
    const sessionsWithMessages = sessions.map(session => {
      const messages = messageStmt.all(session.id);
      return {
        id: session.id,
        title: session.title,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        messages
      };
    });
    
    res.json(sessionsWithMessages);
  } catch (err) {
    console.error('Error getting chat sessions:', err);
    res.status(500).json({ error: 'Failed to get chat sessions' });
  }
});

/**
 * POST /api/chat-sessions
 * Create a new chat session
 */
router.post('/', (req, res) => {
  try {
    const userId = req.user.id;
    const { id, title = 'New Chat' } = req.body;
    
    const now = new Date().toISOString();
    
    // Insert the new session
    const stmt = db.prepare(`
      INSERT INTO chat_sessions (id, user_id, title, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run(id, userId, title, now, now);
    
    // Return the new session
    res.status(201).json({
      id,
      title,
      createdAt: now,
      updatedAt: now,
      messages: []
    });
  } catch (err) {
    console.error('Error creating chat session:', err);
    res.status(500).json({ error: 'Failed to create chat session' });
  }
});

/**
 * PUT /api/chat-sessions/:id
 * Update a chat session title
 */
router.put('/:id', (req, res) => {
  try {
    const userId = req.user.id;
    const sessionId = req.params.id;
    const { title } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    // Check if the session belongs to the user
    const checkStmt = db.prepare(`
      SELECT id FROM chat_sessions 
      WHERE id = ? AND user_id = ?
    `);
    const session = checkStmt.get(sessionId, userId);
    
    if (!session) {
      return res.status(404).json({ error: 'Chat session not found' });
    }
    
    // Update the session
    const now = new Date().toISOString();
    const updateStmt = db.prepare(`
      UPDATE chat_sessions 
      SET title = ?, updated_at = ? 
      WHERE id = ?
    `);
    
    updateStmt.run(title, now, sessionId);
    
    res.json({ 
      id: sessionId,
      title,
      updatedAt: now
    });
  } catch (err) {
    console.error('Error updating chat session:', err);
    res.status(500).json({ error: 'Failed to update chat session' });
  }
});

/**
 * DELETE /api/chat-sessions/:id
 * Delete a chat session
 */
router.delete('/:id', (req, res) => {
  try {
    const userId = req.user.id;
    const sessionId = req.params.id;
    
    // Check if the session belongs to the user
    const checkStmt = db.prepare(`
      SELECT id FROM chat_sessions 
      WHERE id = ? AND user_id = ?
    `);
    const session = checkStmt.get(sessionId, userId);
    
    if (!session) {
      return res.status(404).json({ error: 'Chat session not found' });
    }
    
    // Delete all messages from the session
    // SQLite cascade should handle this, but we'll do it explicitly to be safe
    const deleteMessagesStmt = db.prepare(`
      DELETE FROM chat_messages 
      WHERE session_id = ?
    `);
    
    deleteMessagesStmt.run(sessionId);
    
    // Delete the session
    const deleteSessionStmt = db.prepare(`
      DELETE FROM chat_sessions 
      WHERE id = ?
    `);
    
    deleteSessionStmt.run(sessionId);
    
    res.json({ message: 'Chat session deleted successfully' });
  } catch (err) {
    console.error('Error deleting chat session:', err);
    res.status(500).json({ error: 'Failed to delete chat session' });
  }
});

/**
 * POST /api/chat-sessions/:id/messages
 * Add a message to a chat session
 */
router.post('/:id/messages', async (req, res) => {
  try {
    const userId = req.user.id;
    const sessionId = req.params.id;
    const { role, content } = req.body;
    
    if (!role || !content) {
      return res.status(400).json({ error: 'Role and content are required' });
    }
    
    if (role !== 'user' && role !== 'assistant') {
      return res.status(400).json({ error: 'Role must be either "user" or "assistant"' });
    }
    
    // Check if the session belongs to the user
    const checkStmt = db.prepare(`
      SELECT * FROM chat_sessions 
      WHERE id = ? AND user_id = ?
    `);
    const session = checkStmt.get(sessionId, userId);
    
    if (!session) {
      return res.status(404).json({ error: 'Chat session not found' });
    }
    
    // Insert the message
    const timestamp = new Date().toISOString();
    const insertMessageStmt = db.prepare(`
      INSERT INTO chat_messages (session_id, role, content, timestamp)
      VALUES (?, ?, ?, ?)
    `);
    
    const result = insertMessageStmt.run(sessionId, role, content, timestamp);
    
    // Update the session's updated_at timestamp
    const updateSessionStmt = db.prepare(`
      UPDATE chat_sessions 
      SET updated_at = ? 
      WHERE id = ?
    `);
    
    updateSessionStmt.run(timestamp, sessionId);      // Update title if it's still "New Chat" and this is a user message
    let updatedTitle = session.title;
    if (session.title === 'New Chat' && role === 'user') {
      // Get count of messages to check if this is among the first messages
      const countStmt = db.prepare(`
        SELECT COUNT(*) as count FROM chat_messages 
        WHERE session_id = ?
      `);
      const { count } = countStmt.get(sessionId);
      
      if (count <= 2) {  // If this is the first or second message
        try {
          // Try to use AI to generate a title
          const AIConfigManager = require('../services/ai/config');
          const AIProviderFactory = require('../services/ai/factory');
          const SummarizationTask = require('../services/ai/tasks/summarization');
          
          try {
            const config = await AIConfigManager.getUserConfig(userId);
            
            // Check if the user has an AI provider configured
            if (config && config.provider && config.provider !== 'none') {
              const provider = await AIProviderFactory.createProvider(config.provider, config);
              const summarizationTask = new SummarizationTask(provider);
              
              // Pass true to indicate this is for a chat title specifically
              updatedTitle = await summarizationTask.summarize(content, true);
              console.log('Generated AI title for chat:', updatedTitle);
            } else {
              console.log('User has no AI provider configured, using message content');
              // Use message content as fallback
              updatedTitle = content.length > 60 ? content.substring(0, 57) + '...' : content;
            }
          } catch (aiError) {
            console.warn('AI title generation failed, using message content as fallback:', aiError.message);
            // Fallback to using the content as the title
            updatedTitle = content.length > 60 ? content.substring(0, 57) + '...' : content;
          }
        } catch (error) {
          console.error('Error in title generation process:', error);
          // Use message content as title if any error occurred
          updatedTitle = content.length > 60 ? content.substring(0, 57) + '...' : content;
        }
        
        const updateTitleStmt = db.prepare(`
          UPDATE chat_sessions 
          SET title = ? 
          WHERE id = ?
        `);
        
        updateTitleStmt.run(updatedTitle, sessionId);
      }
    }
    
    // Get all messages for the session
    const getMessagesStmt = db.prepare(`
      SELECT id, role, content, timestamp 
      FROM chat_messages 
      WHERE session_id = ?
      ORDER BY id ASC
    `);
    
    const messages = getMessagesStmt.all(sessionId);
    
    // Return the updated session with all messages
    res.status(201).json({
      id: sessionId,
      title: updatedTitle,
      createdAt: session.created_at,
      updatedAt: timestamp,
      messages
    });
  } catch (err) {
    console.error('Error adding message to chat session:', err);
    res.status(500).json({ error: 'Failed to add message to chat session' });
  }
});

module.exports = router;
