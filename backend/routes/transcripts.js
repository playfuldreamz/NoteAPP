const express = require('express');
const router = express.Router();
const { deleteResource, bulkDeleteResources } = require('../services/deleteService');
const fetch = require('node-fetch');
const { authenticateToken } = require('../middleware/auth');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

// Delete a single transcript
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await deleteResource('transcript', parseInt(id), userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting transcript:', error);
    res.status(error.message === 'Resource not found or unauthorized' ? 404 : 500)
      .json({ error: error.message || 'Failed to delete transcript' });
  }
});

// Bulk delete transcripts
router.post('/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(ids)) {
      return res.status(400).json({ error: 'Invalid request: ids must be an array' });
    }

    await bulkDeleteResources('transcript', ids, userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error bulk deleting transcripts:', error);
    res.status(error.message === 'One or more resources not found or unauthorized' ? 404 : 500)
      .json({ error: error.message || 'Failed to delete transcripts' });
  }
});

// Validate Deepgram API key
router.post('/deepgram-token', async (req, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey) {
      return res.status(400).json({ 
        success: false,
        error: 'API key is required' 
      });
    }

    // Test the API key by making a request to Deepgram's API
    const response = await fetch('https://api.deepgram.com/v1/projects', {
      headers: {
        'Authorization': `Token ${apiKey}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Deepgram API error:', data);
      return res.status(401).json({ 
        success: false,
        error: 'Invalid API key',
        type: 'InvalidAPIKeyError',
        link: 'https://developers.deepgram.com/docs/authentication'
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error validating Deepgram API key:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to validate API key',
      type: 'ValidationError',
      link: 'https://developers.deepgram.com/docs/authentication'
    });
  }
});

// Update transcript title
router.put('/:id/title', authenticateToken, (req, res) => {
  const transcriptId = req.params.id;
  const { title } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  db.run(
    'UPDATE transcripts SET title = ? WHERE id = ? AND user_id = ?',
    [title, transcriptId, req.user.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Transcript not found or unauthorized' });
      }
      res.json({ message: 'Transcript title updated successfully' });
    }
  );
});

module.exports = router;
