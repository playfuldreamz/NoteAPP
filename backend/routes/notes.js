const express = require('express');
const router = express.Router();
const { deleteResource, bulkDeleteResources } = require('../services/deleteService');
const { authenticateToken } = require('../middleware/auth');
const db = require('../database/connection');
const { isTagReferenced } = require('../utils/dbUtils');
const linkService = require('../services/linkService');
const embeddingGenerationTask = require('../services/ai/tasks/embeddingGeneration');
const { isDspyServiceRequest } = require('../utils/dspyUtils');

/**
 * @route GET /api/notes/count
 * @desc Get total count of notes for a user
 * @access Private
 */
router.get('/count', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    
    const stmt = db.prepare('SELECT COUNT(*) as count FROM notes WHERE user_id = ?');
    const result = stmt.get(userId);
    
    res.json({ count: result.count });
  } catch (error) {
    console.error('Error getting notes count:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while getting notes count' 
    });
  }
});

/**
 * @route PUT /api/notes/:id/title
 * @desc Update note title
 * @access Private
 */
router.put('/:id/title', authenticateToken, async (req, res) => {
  try {
    const noteId = req.params.id;
    const userId = req.user.id;
    const { title } = req.body;

    // Validate title
    if (!title) {
      return res.status(400).json({ 
        success: false, 
        message: 'Title is required' 
      });
    }

    // Update note title
    const updateStmt = db.prepare(`
      UPDATE notes 
      SET title = ?, timestamp = CURRENT_TIMESTAMP 
      WHERE id = ? AND user_id = ?
    `);
    
    const result = updateStmt.run(title, noteId, userId);
    
    if (result.changes === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Note not found or unauthorized' 
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating note title:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while updating note title' 
    });
  }
});

/**
 * @route PUT /api/notes/:id/content
 * @desc Update note content
 * @access Private
 */
router.put('/:id/content', authenticateToken, async (req, res) => {
  try {
    const noteId = req.params.id;
    const userId = req.user.id;
    const { content } = req.body;

    // Validate content
    if (!content) {
      return res.status(400).json({ 
        success: false, 
        message: 'Content is required' 
      });
    }

    // Update note content
    const updateStmt = db.prepare(`
      UPDATE notes 
      SET content = ?, timestamp = CURRENT_TIMESTAMP 
      WHERE id = ? AND user_id = ?
    `);
    
    const result = updateStmt.run(content, noteId, userId);
    
    if (result.changes === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Note not found or unauthorized' 
      });
    }

    // Generate and store embedding for the updated content (don't await to avoid blocking response)
    embeddingGenerationTask.generateAndStoreEmbedding(noteId, 'note', userId)
      .catch(err => console.error('Error generating embedding for updated note:', err));

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating note content:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update note content' 
    });
  }
});

// Get all notes with tags
router.get('/', authenticateToken, (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit) : null;
  const offset = req.query.offset ? parseInt(req.query.offset) : 0;
  
  let query = `
    SELECT
      n.id,
      n.content,
      n.title,
      n.transcript,
      n.summary,
      n.timestamp,
      n.user_id,
      json_group_array(json_object('id', t.id, 'name', t.name)) AS tags
    FROM notes n
    LEFT JOIN item_tags it ON n.id = it.item_id AND it.item_type = 'note'
    LEFT JOIN tags t ON it.tag_id = t.id
    WHERE n.user_id = ?
    GROUP BY n.id
    ORDER BY n.timestamp DESC
  `;
  
  // Add pagination if limit is specified
  if (limit !== null) {
    query += ` LIMIT ${limit} OFFSET ${offset}`;
  }
  
  try {
    // Use better-sqlite3 API to get notes
    const stmt = db.prepare(query);
    const rows = stmt.all(req.user.id);
    
    // Parse the JSON tags array
    const notes = rows.map(row => ({
      ...row,
      tags: JSON.parse(row.tags).filter(tag => tag.id !== null)
    }));
    
    // Get total count for pagination info
    const countStmt = db.prepare('SELECT COUNT(*) as total FROM notes WHERE user_id = ?');
    const countRow = countStmt.get(req.user.id);
    
    res.json({
      data: notes,
      pagination: {
        total: countRow.total,
        limit: limit,
        offset: offset,
        hasMore: limit !== null && offset + limit < countRow.total
      }
    });
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get a single note by ID - works for both authenticated users and DSPy service
router.get('/:id', authenticateToken, (req, res) => {
  const noteId = req.params.id;
  const userId = req.user.id;
  
  // Handle DSPy service requests with special logging
  if (req.user.isDspyService) {
    console.log(`DSPy service requesting note ${noteId} for user ${userId}`);
  }

  const query = `
    SELECT
      n.id,
      n.content,
      n.title,
      n.transcript,
      n.summary,
      n.timestamp,
      n.user_id,
      json_group_array(json_object('id', t.id, 'name', t.name)) AS tags
    FROM notes n
    LEFT JOIN item_tags it ON n.id = it.item_id AND it.item_type = 'note'
    LEFT JOIN tags t ON it.tag_id = t.id
    WHERE n.id = ? AND n.user_id = ?
    GROUP BY n.id
  `;

  try {
    // Use better-sqlite3 API
    const stmt = db.prepare(query);
    const row = stmt.get(noteId, userId);
    
    if (!row) {
      return res.status(404).json({ error: 'Note not found or unauthorized' });
    }
    
    // Parse the JSON tags array
    const note = {
      ...row,
      tags: JSON.parse(row.tags).filter(tag => tag.id !== null)
    };
    
    res.json(note);
  } catch (error) {
    console.error('Error fetching note:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Create new note
router.post('/', authenticateToken, async (req, res) => {
  const { content, title, transcript } = req.body;
  
  try {
    // Insert the note using better-sqlite3 API
    const insertStmt = db.prepare('INSERT INTO notes (content, title, transcript, user_id) VALUES (?, ?, ?, ?)');
    const insertResult = insertStmt.run(content, title, transcript, req.user.id);
    const noteId = insertResult.lastInsertRowid;
    
    // Process links if content exists
    if (content) {
      try {
        await linkService.processLinks(noteId, 'note', content, req.user.id);
      } catch (linkErr) {
        console.error('Error processing links:', linkErr);
        // Continue despite link processing errors - don't fail the whole request
      }
      
      // Generate embedding for the new note (don't await to avoid blocking response)
      embeddingGenerationTask.generateAndStoreEmbedding(noteId, 'note', req.user.id)
        .catch(err => console.error('Error generating embedding for new note:', err));
    }
    
    res.status(201).json({ id: noteId, content, title, transcript });
  } catch (err) {
    console.error('Error creating note:', err);
    res.status(500).json({ error: err.message });
  }
});

// Bulk delete notes
router.post('/bulk-delete', authenticateToken, async (req, res) => {
  try {
    const { ids } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(ids)) {
      return res.status(400).json({ error: 'Invalid request: ids must be an array' });
    }

    // Use better-sqlite3 transaction API
    const transaction = db.transaction(() => {
      bulkDeleteResources('note', ids, userId, { manageTransaction: false });
    });
    
    try {
      transaction();
      res.json({ success: true });
    } catch (error) {
      console.error('Error bulk deleting notes:', error);
      res.status(error.message === 'One or more resources not found or unauthorized' ? 404 : 500)
        .json({ error: error.message || 'Failed to delete notes' });
    }
  } catch (error) {
    console.error('Error in bulk delete transaction:', error);
    res.status(500).json({ error: 'Failed to process bulk delete request' });
  }
});

// Delete single note and its tags
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const noteId = req.params.id;
    const userId = req.user.id;
    
    // Delete the note and its associated tags
    await deleteResource('note', noteId, userId);
    
    // Delete the embedding for this note (don't await to avoid blocking response)
    embeddingGenerationTask.deleteEmbedding(noteId, 'note')
      .catch(err => console.error('Error deleting embedding for note:', err));
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(error.message === 'Resource not found or unauthorized' ? 404 : 500)
      .json({ error: error.message || 'Failed to delete note' });
  }
});

// Delete note tags and clean up orphaned tags
router.delete('/:id/tags', authenticateToken, async (req, res) => {
  try {
    const noteId = req.params.id;
    const userId = req.user.id;

    // Delete all tags associated with this note using better-sqlite3 API
    const deleteItemTagsStmt = db.prepare(
      'DELETE FROM item_tags WHERE item_id = ? AND item_type = ? AND EXISTS (SELECT 1 FROM notes WHERE id = ? AND user_id = ?)'
    );
    deleteItemTagsStmt.run(noteId, 'note', noteId, userId);

    // Clean up any orphaned tags using better-sqlite3 API
    const cleanupTagsStmt = db.prepare(
      'DELETE FROM tags WHERE id NOT IN (SELECT tag_id FROM item_tags)'
    );
    cleanupTagsStmt.run();

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting note tags:', error);
    res.status(500).json({ error: error.message || 'Failed to delete note tags' });
  }
});

// Update note title
router.put('/:id/title', authenticateToken, (req, res) => {
  const noteId = req.params.id;
  const { title } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
    const updateStmt = db.prepare('UPDATE notes SET title = ? WHERE id = ? AND user_id = ?');
    const result = updateStmt.run(title, noteId, req.user.id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Note not found or unauthorized' });
    }
    
    res.json({ message: 'Note title updated successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Update note content
router.put('/:id/content', authenticateToken, async (req, res) => {
  const noteId = req.params.id;
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }

  try {
    // Update the note using better-sqlite3 API
    const updateStmt = db.prepare('UPDATE notes SET content = ? WHERE id = ? AND user_id = ?');
    const result = updateStmt.run(content, noteId, req.user.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Note not found or unauthorized' });
    }

    // Process links in the updated content
    try {
      await linkService.processLinks(parseInt(noteId), 'note', content, req.user.id);
    } catch (linkErr) {
      console.error('Error processing links:', linkErr);
      // Continue despite link processing errors
    }
    
    // Update embedding for the note (don't await to avoid blocking response)
    embeddingGenerationTask.generateAndStoreEmbedding(parseInt(noteId), 'note', req.user.id)
      .catch(err => console.error('Error updating embedding for note:', err));

    res.json({ message: 'Note content updated successfully' });
  } catch (err) {
    console.error('Error updating note content:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
