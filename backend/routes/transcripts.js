const express = require('express');
const router = express.Router();
const { deleteResource, bulkDeleteResources } = require('../services/deleteService');
const fetch = require('node-fetch');
const { authenticateToken } = require('../middleware/auth');
const db = require('../database/connection');
const { isTagReferenced } = require('../utils/dbUtils');
const linkService = require('../services/linkService');
const embeddingGenerationTask = require('../services/ai/tasks/embeddingGeneration');

/**
 * @route GET /api/transcripts/count
 * @desc Get total count of transcripts for a user
 * @access Private
 */
router.get('/count', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    
    const stmt = db.prepare('SELECT COUNT(*) as count FROM transcripts WHERE user_id = ?');
    const result = stmt.get(userId);
    
    res.json({ count: result.count });
  } catch (error) {
    console.error('Error getting transcripts count:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while getting transcripts count' 
    });
  }
});

/**
 * @route PUT /api/transcripts/:id/title
 * @desc Update transcript title
 * @access Private
 */
router.put('/:id/title', authenticateToken, async (req, res) => {
  try {
    const transcriptId = req.params.id;
    const userId = req.user.id;
    const { title } = req.body;

    // Validate title
    if (!title) {
      return res.status(400).json({ 
        success: false, 
        message: 'Title is required' 
      });
    }

    // Update transcript title
    const updateStmt = db.prepare(`
      UPDATE transcripts 
      SET title = ?, date = CURRENT_TIMESTAMP 
      WHERE id = ? AND user_id = ?
    `);
    
    const result = updateStmt.run(title, transcriptId, userId);
    
    if (result.changes === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Transcript not found or unauthorized' 
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating transcript title:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while updating transcript title' 
    });
  }
});

/**
 * @route PUT /api/transcripts/:id/content
 * @desc Update transcript content
 * @access Private
 */
router.put('/:id/content', authenticateToken, async (req, res) => {
  try {
    const transcriptId = req.params.id;
    const userId = req.user.id;
    const { content } = req.body;

    // Validate content
    if (!content) {
      return res.status(400).json({ 
        success: false, 
        message: 'Content is required' 
      });
    }

    // Update transcript content (note that transcript content is stored in the 'text' field)
    const updateStmt = db.prepare(`
      UPDATE transcripts 
      SET text = ?, date = CURRENT_TIMESTAMP 
      WHERE id = ? AND user_id = ?
    `);
    
    const result = updateStmt.run(content, transcriptId, userId);
    
    if (result.changes === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Transcript not found or unauthorized' 
      });
    }

    // Generate and store embedding for the updated content (don't await to avoid blocking response)
    embeddingGenerationTask.generateAndStoreEmbedding(transcriptId, 'transcript', userId)
      .catch(err => console.error('Error generating embedding for updated transcript:', err));

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating transcript content:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update transcript content' 
    });
  }
});

// AssemblyAI token endpoint
router.post('/assemblyai-token', async (req, res) => {
  try {
    const apiKey = req.body.apiKey;
    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required' });
    }

    const response = await fetch('https://api.assemblyai.com/v2/realtime/token', {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ expires_in: 3600 }) // Token valid for 1 hour
    });

    const data = await response.json();
    
    if (!response.ok) {
      // Check for specific error types
      if (data.error && data.error.includes('paid-only')) {
        return res.status(402).json({ 
          error: 'AssemblyAI requires a credit card for real-time transcription',
          type: 'PAYMENT_REQUIRED',
          link: 'https://app.assemblyai.com/'
        });
      }
      throw new Error(data.error || 'AssemblyAI API error');
    }

    res.json(data);
  } catch (error) {
    console.error('Error generating AssemblyAI token:', error);
    res.status(500).json({ 
      error: error.message,
      type: 'API_ERROR'
    });
  }
});

// Transcription settings routes
router.get('/transcription/settings', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    
    // Use better-sqlite3 API to get all rows directly
    const stmt = db.prepare('SELECT provider_id as provider, api_key, settings as options FROM transcription_settings WHERE user_id = ?');
    const rows = stmt.all(userId);

    // Convert rows to the expected format
    const settings = {};
    rows.forEach(row => {
      settings[row.provider] = {
        apiKey: row.api_key,
        options: row.options ? JSON.parse(row.options) : {}
      };
    });

    res.json(settings);
  } catch (error) {
    console.error('Error fetching transcription settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/transcription/settings', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    const { provider, settings } = req.body;

    if (!provider || !settings) {
      return res.status(400).json({ error: 'Provider and settings are required' });
    }

    const { apiKey, options } = settings;
    const settingsJson = options ? JSON.stringify(options) : null;

    // First check if a record exists
    const existingRecord = db.prepare('SELECT id FROM transcription_settings WHERE user_id = ? AND provider_id = ?')
      .get(userId, provider);

    if (existingRecord) {
      // Update existing record
      const updateStmt = db.prepare(`
        UPDATE transcription_settings 
        SET api_key = ?, settings = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND provider_id = ?
      `);
      
      updateStmt.run(apiKey, settingsJson, userId, provider);
      res.json({ success: true });
    } else {
      // Insert new record
      const insertStmt = db.prepare(`
        INSERT INTO transcription_settings (user_id, provider_id, api_key, settings, language)
        VALUES (?, ?, ?, ?, 'en')
      `);
      
      insertStmt.run(userId, provider, apiKey, settingsJson);
      res.json({ success: true });
    }
  } catch (error) {
    console.error('Error managing transcription settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a single transcript
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const transcriptId = req.params.id;
    const userId = req.user.id;

    await deleteResource('transcript', transcriptId, userId);
    
    // Delete the embedding for this transcript (don't await to avoid blocking response)
    embeddingGenerationTask.deleteEmbedding(transcriptId, 'transcript')
      .catch(err => console.error('Error deleting embedding for transcript:', err));
      
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting transcript:', error);
    res.status(error.message === 'Resource not found or unauthorized' ? 404 : 500)
      .json({ error: error.message || 'Failed to delete transcript' });
  }
});

// Bulk delete transcripts
router.post('/bulk-delete', authenticateToken, async (req, res) => {
  try {
    const { ids } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(ids)) {
      return res.status(400).json({ error: 'Invalid request: ids must be an array' });
    }

    if (!ids || ids.length === 0) {
      return res.status(400).json({ error: 'No transcript IDs provided' });
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

// Get a single transcript by ID
router.get('/:id', authenticateToken, (req, res) => {
  const transcriptId = req.params.id;
  const userId = req.user.id;

  const query = `
    SELECT
      t.id,
      t.title,
      t.text,
      t.summary,
      t.date,
      t.duration,
      t.user_id,
      json_group_array(json_object('id', tag.id, 'name', tag.name)) AS tags
    FROM transcripts t
    LEFT JOIN item_tags it ON t.id = it.item_id AND it.item_type = 'transcript'
    LEFT JOIN tags tag ON it.tag_id = tag.id
    WHERE t.id = ? AND t.user_id = ?
    GROUP BY t.id
  `;

  try {
    // Use better-sqlite3 API
    const stmt = db.prepare(query);
    const row = stmt.get(transcriptId, userId);
    
    if (!row) {
      return res.status(404).json({ error: 'Transcript not found or unauthorized' });
    }
    
    // Parse the JSON tags array
    const transcript = {
      ...row,
      tags: JSON.parse(row.tags).filter(tag => tag.id !== null)
    };
    
    res.json(transcript);
  } catch (error) {
    console.error('Error fetching transcript:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Delete transcript tags with cleanup
router.delete('/:id/tags', authenticateToken, async (req, res) => {
  const transcriptId = req.params.id;
  const userId = req.user.id;

  try {
    // Use better-sqlite3 transaction API
    const deleteTagsTransaction = db.transaction(() => {
      // Delete all tags associated with this transcript
      const deleteItemTagsStmt = db.prepare(`
        DELETE FROM item_tags
        WHERE item_id = ?
          AND item_type = 'transcript'
      `);
      deleteItemTagsStmt.run(transcriptId);

      // Find orphaned tags
      const findOrphanedTagsStmt = db.prepare(`
        SELECT t.id
        FROM tags t
        LEFT JOIN item_tags it ON t.id = it.tag_id
        WHERE it.tag_id IS NULL
      `);
      const orphanedTags = findOrphanedTagsStmt.all();

      // Delete each orphaned tag
      if (orphanedTags.length > 0) {
        const deleteTagStmt = db.prepare('DELETE FROM tags WHERE id = ?');
        for (const tag of orphanedTags) {
          deleteTagStmt.run(tag.id);
        }
      }
    });

    // Execute the transaction
    deleteTagsTransaction();

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting transcript tags:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update transcript title
router.put('/:id/title', authenticateToken, (req, res) => {
  const transcriptId = req.params.id;
  const { title } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
    const updateStmt = db.prepare('UPDATE transcripts SET title = ? WHERE id = ? AND user_id = ?');
    const result = updateStmt.run(title, transcriptId, req.user.id);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Transcript not found or unauthorized' });
    }
    
    res.json({ message: 'Transcript title updated successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Update transcript content
router.put('/:id/content', authenticateToken, async (req, res) => {
  const transcriptId = req.params.id;
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }

  try {
    // Update the transcript using better-sqlite3 API
    const updateStmt = db.prepare('UPDATE transcripts SET text = ? WHERE id = ? AND user_id = ?');
    const updateResult = updateStmt.run(content, transcriptId, req.user.id);

    if (updateResult.changes === 0) {
      return res.status(404).json({ error: 'Transcript not found or unauthorized' });
    }

    // Process links in the updated content
    try {
      await linkService.processLinks(parseInt(transcriptId), 'transcript', content, req.user.id);
    } catch (linkErr) {
      console.error('Error processing links in transcript update:', linkErr);
      // Continue despite link processing errors
    }
    
    // Update embedding for the transcript (don't await to avoid blocking response)
    embeddingGenerationTask.generateAndStoreEmbedding(parseInt(transcriptId), 'transcript', req.user.id)
      .catch(err => console.error('Error updating embedding for transcript:', err));

    res.json({ message: 'Transcript content updated successfully' });
  } catch (err) {
    console.error('Error updating transcript content:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get all transcripts with tags
router.get('/', authenticateToken, (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit) : null;
  const offset = req.query.offset ? parseInt(req.query.offset) : 0;
  const fastMode = req.query.fast === 'true';
  
  try {
    // Get total count for pagination info - this is fast
    // Ensure user_id is treated as an integer
    const userId = parseInt(req.user.id);
    const countStmt = db.prepare('SELECT COUNT(*) as total FROM transcripts WHERE user_id = ?');
    const countRow = countStmt.get(userId);
    
    // If in fast mode, use a simpler query without the expensive tag join
    if (fastMode) {
      // Simple query that avoids the expensive tag join
      let simpleQuery = `
        SELECT
          id,
          text,
          title,
          summary,
          date,
          duration
        FROM transcripts
        WHERE user_id = ?
        ORDER BY date DESC
      `;
      
      // Add pagination if limit is specified
      if (limit !== null) {
        simpleQuery += ` LIMIT ${limit} OFFSET ${offset}`;
      }
      
      const stmt = db.prepare(simpleQuery);
      const rows = stmt.all(userId);
      
      // Add empty tags array to each transcript
      const transcripts = rows.map(row => ({
        ...row,
        tags: []
      }));
      
      return res.json({
        data: transcripts,
        pagination: {
          total: countRow.total,
          limit: limit,
          offset: offset,
          hasMore: limit !== null && offset + limit < countRow.total
        }
      });
    } else {
      // Only use the complex query with tag joins when absolutely necessary
      // Note: We're already using the parsed userId from above
      let query = `
        SELECT
          t.id,
          t.text,
          t.title,
          t.summary,
          t.date,
          t.duration,
          json_group_array(json_object('id', tg.id, 'name', tg.name)) AS tags
        FROM transcripts t
        LEFT JOIN item_tags it ON t.id = it.item_id AND it.item_type = 'transcript'
        LEFT JOIN tags tg ON it.tag_id = tg.id
        WHERE t.user_id = ?
        GROUP BY t.id
        ORDER BY t.date DESC
      `;
      
      // Add pagination if limit is specified
      if (limit !== null) {
        query += ` LIMIT ${limit} OFFSET ${offset}`;
      }
      
      const stmt = db.prepare(query);
      const rows = stmt.all(userId);
      
      // Parse the JSON tags array
      const transcripts = rows.map(row => ({
        ...row,
        tags: JSON.parse(row.tags).filter(tag => tag.id !== null)
      }));
      
      return res.json({
        data: transcripts,
        pagination: {
          total: countRow.total,
          limit: limit,
          offset: offset,
          hasMore: limit !== null && offset + limit < countRow.total
        }
      });
    }
  } catch (error) {
    console.error('Error fetching transcripts:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a new transcript
router.post('/', authenticateToken, async (req, res) => {
  try {
    if (!req.body) {
      return res.status(400).json({ error: 'No request body' });
    }
    
    const text = req.body.text;
    const title = req.body.title;
    const tags = req.body.tags || [];
    const duration = req.body.duration; // Added duration
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (typeof title !== 'string') {
      return res.status(400).json({ error: 'Title must be a string' });
    }

    // Only use 'Untitled Transcript' if title is null or undefined
    const finalTitle = (title === null || title === undefined) ? 'Untitled Transcript' : title;
    
    // Save transcript with provided title using better-sqlite3 API
    const insertStmt = db.prepare('INSERT INTO transcripts (text, title, user_id, duration) VALUES (?, ?, ?, ?)');
    const insertResult = insertStmt.run(text, finalTitle, req.user.id, duration);
    
    const transcriptId = insertResult.lastInsertRowid;
    
    // Process links in transcript text if any
    try {
      await linkService.processLinks(transcriptId, 'transcript', text, req.user.id);
    } catch (linkErr) {
      console.error('Error processing links in transcript:', linkErr);
      // Continue despite link processing errors
    }
    
    // Generate embedding for the new transcript (don't await to avoid blocking response)
    embeddingGenerationTask.generateAndStoreEmbedding(transcriptId, 'transcript', req.user.id)
      .catch(err => console.error('Error generating embedding for new transcript:', err));
    
    // Process tags if any
    if (tags.length > 0) {
      // Insert tags and create associations
      const insertTag = 'INSERT OR IGNORE INTO tags (name) VALUES (?)';
      const insertItemTag = 'INSERT INTO item_tags (item_id, item_type, tag_id) VALUES (?, ?, ?)';

      tags.forEach(tagName => {
        try {
          // Insert tag if it doesn't exist
          const insertTagStmt = db.prepare(insertTag);
          insertTagStmt.run(tagName);
          
          // Get tag ID using better-sqlite3 API
          const getTagStmt = db.prepare('SELECT id FROM tags WHERE name = ?');
          const tag = getTagStmt.get(tagName);
          
          if (tag) {
            // Create item-tag association using better-sqlite3 API
            const insertItemTagStmt = db.prepare(insertItemTag);
            insertItemTagStmt.run(transcriptId, 'transcript', tag.id);
          }
        } catch (error) {
          console.error('Error processing tag:', error);
        }
      });
    }

    // Get the full transcript with tags using better-sqlite3 API
    try {
      const getTranscriptStmt = db.prepare(`
        SELECT
          t.id,
          t.text,
          t.title,
          t.date,
          t.duration,
          json_group_array(json_object('id', tg.id, 'name', tg.name)) AS tags
        FROM transcripts t
        LEFT JOIN item_tags it ON t.id = it.item_id AND it.item_type = 'transcript'
        LEFT JOIN tags tg ON it.tag_id = tg.id
        WHERE t.id = ?
        GROUP BY t.id
      `);
      
      const row = getTranscriptStmt.get(transcriptId);
      
      if (!row) {
        return res.status(404).json({ error: 'Failed to fetch created transcript' });
      }
      
      const response = {
        ...row,
        tags: JSON.parse(row.tags).filter(tag => tag.id !== null)
      };
      
      res.status(201).json(response);
    } catch (error) {
      console.error('Error fetching created transcript:', error);
      return res.status(500).json({ error: 'Failed to fetch transcript' });
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
