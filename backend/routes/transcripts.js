const express = require('express');
const router = express.Router();
const { deleteResource, bulkDeleteResources } = require('../services/deleteService');
const fetch = require('node-fetch');
const { authenticateToken } = require('../middleware/auth');
const db = require('../database/connection');
const { isTagReferenced } = require('../utils/dbUtils');

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
  const userId = req.user.id;
  
  db.all(
    'SELECT provider_id as provider, api_key, settings as options FROM transcription_settings WHERE user_id = ?',
    [userId],
    (err, rows) => {
      if (err) {
        console.error('Error fetching transcription settings:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      // Convert rows to the expected format
      const settings = {};
      rows.forEach(row => {
        settings[row.provider] = {
          apiKey: row.api_key,
          options: row.options ? JSON.parse(row.options) : {}
        };
      });

      res.json({ settings });
    }
  );
});

router.put('/transcription/settings', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { provider, settings } = req.body;

  if (!provider || !settings) {
    return res.status(400).json({ error: 'Provider and settings are required' });
  }

  const { apiKey, options } = settings;
  const settingsJson = options ? JSON.stringify(options) : null;

  // First check if a record exists
  db.get(
    'SELECT id FROM transcription_settings WHERE user_id = ? AND provider_id = ?',
    [userId, provider],
    (err, row) => {
      if (err) {
        console.error('Error checking transcription settings:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }

      if (row) {
        // Update existing record
        db.run(
          `UPDATE transcription_settings 
           SET api_key = ?, settings = ?, updated_at = CURRENT_TIMESTAMP
           WHERE user_id = ? AND provider_id = ?`,
          [apiKey, settingsJson, userId, provider],
          function(err) {
            if (err) {
              console.error('Error updating transcription settings:', err);
              return res.status(500).json({ error: 'Internal server error' });
            }
            res.json({ success: true });
          }
        );
      } else {
        // Insert new record
        db.run(
          `INSERT INTO transcription_settings (user_id, provider_id, api_key, settings, language)
           VALUES (?, ?, ?, ?, 'en')`,
          [userId, provider, apiKey, settingsJson],
          function(err) {
            if (err) {
              console.error('Error inserting transcription settings:', err);
              return res.status(500).json({ error: 'Internal server error' });
            }
            res.json({ success: true });
          }
        );
      }
    }
  );
});

// Delete a single transcript
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const transcriptId = req.params.id;
    const userId = req.user.id;

    await deleteResource('transcript', transcriptId, userId);
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

// Delete transcript tags with cleanup
router.delete('/:id/tags', authenticateToken, (req, res) => {
  const transcriptId = req.params.id;
  const userId = req.user.id;

  db.serialize(() => {
    // Begin transaction
    db.run('BEGIN TRANSACTION');

    // Delete all tags associated with this transcript
    db.run(
      `DELETE FROM item_tags
       WHERE item_id = ?
         AND item_type = 'transcript'`,
      [transcriptId],
      function(err) {
        if (err) {
          db.run('ROLLBACK');
          return res.status(500).json({ error: err.message });
        }

        // Find and delete orphaned tags
        db.all(
          `SELECT t.id
           FROM tags t
           LEFT JOIN item_tags it ON t.id = it.tag_id
           WHERE it.tag_id IS NULL`,
          (err, orphanedTags) => {
            if (err) {
              db.run('ROLLBACK');
              return res.status(500).json({ error: err.message });
            }

            // Delete each orphaned tag
            const deletePromises = orphanedTags.map(tag => {
              return new Promise((resolve, reject) => {
                db.run(
                  'DELETE FROM tags WHERE id = ?',
                  [tag.id],
                  function(err) {
                    if (err) return reject(err);
                    resolve();
                  }
                );
              });
            });

            Promise.all(deletePromises)
              .then(() => {
                db.run('COMMIT');
                res.json({ success: true });
              })
              .catch(err => {
                db.run('ROLLBACK');
                res.status(500).json({ error: err.message });
              });
          }
        );
      }
    );
  });
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

// Update transcript content
router.put('/:id/content', authenticateToken, (req, res) => {
  const transcriptId = req.params.id;
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }

  db.run(
    'UPDATE transcripts SET text = ? WHERE id = ? AND user_id = ?',
    [content, transcriptId, req.user.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Transcript not found or unauthorized' });
      }
      res.json({ message: 'Transcript content updated successfully' });
    }
  );
});

// Get all transcripts with tags
router.get('/', authenticateToken, (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit) : null;
  const offset = req.query.offset ? parseInt(req.query.offset) : 0;
  
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
  
  db.all(query, [req.user.id], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Parse the JSON tags array
    const transcripts = rows.map(row => ({
      ...row,
      tags: JSON.parse(row.tags).filter(tag => tag.id !== null)
    }));
    
    // Get total count for pagination info
    db.get('SELECT COUNT(*) as total FROM transcripts WHERE user_id = ?', [req.user.id], (countErr, countRow) => {
      if (countErr) {
        return res.status(500).json({ error: countErr.message });
      }
      
      res.json({
        data: transcripts,
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
    
    // Save transcript with provided title
    const query = 'INSERT INTO transcripts (text, title, user_id, duration) VALUES (?, ?, ?, ?)'; // Updated query
    const params = [text, finalTitle, req.user.id, duration]; // Added duration to params

    db.run(query, params, function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to save transcript' });
      }

      const transcriptId = this.lastID;
      
      // Process tags if any
      if (tags.length > 0) {
        // Insert tags and create associations
        const insertTag = 'INSERT OR IGNORE INTO tags (name) VALUES (?)';
        const insertItemTag = 'INSERT INTO item_tags (item_id, item_type, tag_id) VALUES (?, ?, ?)';

        tags.forEach(tagName => {
          // Insert tag if it doesn't exist
          db.run(insertTag, [tagName], function(err) {
            if (err) {
              console.error('Error inserting tag:', err);
              return;
            }
            
            // Get tag ID
            db.get('SELECT id FROM tags WHERE name = ?', [tagName], (err, tag) => {
              if (err) {
                console.error('Error getting tag ID:', err);
                return;
              }
              
              // Create item-tag association
              db.run(insertItemTag, [transcriptId, 'transcript', tag.id], (err) => {
                if (err) {
                  console.error('Error creating tag association:', err);
                }
              });
            });
          });
        });
      }

      // Get the full transcript with tags
      db.get(`
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
      `, [transcriptId], (err, row) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to fetch transcript' });
        }
        
        const response = {
          ...row,
          tags: JSON.parse(row.tags).filter(tag => tag.id !== null)
        };
        res.status(201).json(response);
      });
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
