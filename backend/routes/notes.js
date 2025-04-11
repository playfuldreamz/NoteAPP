const express = require('express');
const router = express.Router();
const { deleteResource, bulkDeleteResources } = require('../services/deleteService');
const { authenticateToken } = require('../middleware/auth');
const db = require('../database/connection');
const { isTagReferenced } = require('../utils/dbUtils');
const linkService = require('../services/linkService');

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
  
  db.all(query, [req.user.id], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    // Parse the JSON tags array
    const notes = rows.map(row => ({
      ...row,
      tags: JSON.parse(row.tags).filter(tag => tag.id !== null)
    }));
    
    // Get total count for pagination info
    db.get('SELECT COUNT(*) as total FROM notes WHERE user_id = ?', [req.user.id], (countErr, countRow) => {
      if (countErr) {
        res.status(500).json({ error: countErr.message });
        return;
      }
      
      res.json({
        data: notes,
        pagination: {
          total: countRow.total,
          limit: limit,
          offset: offset,
          hasMore: limit !== null && offset + limit < countRow.total
        }
      });
    });
  });
});

// Get a single note by ID
router.get('/:id', authenticateToken, (req, res) => {
  const noteId = req.params.id;
  const userId = req.user.id;

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

  db.get(query, [noteId, userId], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!row) {
      return res.status(404).json({ error: 'Note not found or unauthorized' });
    }
    
    // Parse the JSON tags array
    const note = {
      ...row,
      tags: JSON.parse(row.tags).filter(tag => tag.id !== null)
    };
    
    res.json(note);
  });
});

// Create new note
router.post('/', authenticateToken, async (req, res) => {
  const { content, title, transcript } = req.body;
  
  try {
    // Insert the note using a Promise for cleaner async flow
    const insertResult = await new Promise((resolve, reject) => {
      db.run('INSERT INTO notes (content, title, transcript, user_id) VALUES (?, ?, ?, ?)', 
        [content, title, transcript, req.user.id], 
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        });
    });
    
    // Process links if content exists
    if (content) {
      try {
        await linkService.processLinks(insertResult.id, 'note', content, req.user.id);
      } catch (linkErr) {
        console.error('Error processing links:', linkErr);
        // Continue despite link processing errors - don't fail the whole request
      }
    }
    
    res.status(201).json({ id: insertResult.id, content, title, transcript });
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

    await db.run('BEGIN TRANSACTION');
    try {
      await bulkDeleteResources('note', ids, userId, { manageTransaction: false });
      await db.run('COMMIT');
      res.json({ success: true });
    } catch (error) {
      await db.run('ROLLBACK');
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

    // Delete all tags associated with this note
    await db.run(
      'DELETE FROM item_tags WHERE item_id = ? AND item_type = ? AND EXISTS (SELECT 1 FROM notes WHERE id = ? AND user_id = ?)',
      [noteId, 'note', noteId, userId]
    );

    // Clean up any orphaned tags
    await db.run(
      'DELETE FROM tags WHERE id NOT IN (SELECT tag_id FROM item_tags)'
    );

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

  db.run(
    'UPDATE notes SET title = ? WHERE id = ? AND user_id = ?',
    [title, noteId, req.user.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Note not found or unauthorized' });
      }
      res.json({ message: 'Note title updated successfully' });
    }
  );
});

// Update note content
router.put('/:id/content', authenticateToken, async (req, res) => {
  const noteId = req.params.id;
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }

  try {
    // Update the note using a Promise
    const updateResult = await new Promise((resolve, reject) => {
      db.run(
        'UPDATE notes SET content = ? WHERE id = ? AND user_id = ?',
        [content, noteId, req.user.id],
        function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });

    if (updateResult.changes === 0) {
      return res.status(404).json({ error: 'Note not found or unauthorized' });
    }

    // Process links in the updated content
    try {
      await linkService.processLinks(parseInt(noteId), 'note', content, req.user.id);
    } catch (linkErr) {
      console.error('Error processing links:', linkErr);
      // Continue despite link processing errors
    }

    res.json({ message: 'Note content updated successfully' });
  } catch (err) {
    console.error('Error updating note content:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
