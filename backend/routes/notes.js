const express = require('express');
const router = express.Router();
const { deleteResource, bulkDeleteResources } = require('../services/deleteService');
const { authenticateToken } = require('../middleware/auth');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

// Delete a single note
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await deleteResource('note', parseInt(id), userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(error.message === 'Resource not found or unauthorized' ? 404 : 500)
      .json({ error: error.message || 'Failed to delete note' });
  }
});

// Bulk delete notes
router.post('/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(ids)) {
      return res.status(400).json({ error: 'Invalid request: ids must be an array' });
    }

    await bulkDeleteResources('note', ids, userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error bulk deleting notes:', error);
    res.status(error.message === 'One or more resources not found or unauthorized' ? 404 : 500)
      .json({ error: error.message || 'Failed to delete notes' });
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

module.exports = router;
