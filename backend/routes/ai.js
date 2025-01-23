const express = require('express');
const router = express.Router();
const AIProviderFactory = require('../services/ai/factory');
const AIConfigManager = require('../services/ai/config');
const TranscriptionTask = require('../services/ai/tasks/transcription');
const SummarizationTask = require('../services/ai/tasks/summarization');
const TaggingTask = require('../services/ai/tasks/tagging');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

// Database connection
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to the AI routes SQLite database.');
});

// AI Provider Configuration Endpoints
router.get('/config', async (req, res) => {
  try {
    const config = await AIConfigManager.getUserConfig(req.user?.id);
    res.json(config);
  } catch (error) {
    console.error('Error fetching AI config:', error);
    res.status(500).json({ error: 'Failed to fetch AI configuration' });
  }
});

router.put('/config', async (req, res) => {
  try {
    const { provider, apiKey } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    await AIConfigManager.updateConfig(userId, { provider, apiKey });
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating AI config:', error);
    res.status(500).json({ error: 'Failed to update AI configuration' });
  }
});

// Transcription enhancement endpoint
router.post('/enhance-transcription', async (req, res) => {
  const { transcript, language = 'en-US' } = req.body;
  
  if (!transcript) {
    return res.status(400).json({ error: 'Transcript is required' });
  }

  try {
    const config = await AIConfigManager.getUserConfig(req.user?.id);
    const provider = await AIProviderFactory.createProvider(config.provider, config);
    const transcriptionTask = new TranscriptionTask(provider);
    
    const result = await transcriptionTask.enhance(transcript, language);
    res.json(result);
  } catch (error) {
    console.error('Transcription enhancement error:', error);
    res.status(500).json({ 
      error: 'Failed to enhance transcription',
      enhanced: transcript,
      confidence: 0,
      original: transcript
    });
  }
});

// Generate title for content
router.post('/summarize', async (req, res) => {
  const { content } = req.body;
  
  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }

  try {
    const config = await AIConfigManager.getUserConfig(req.user?.id);
    const provider = await AIProviderFactory.createProvider(config.provider, config);
    const summarizationTask = new SummarizationTask(provider);
    
    const title = await summarizationTask.summarize(content);
    res.json({ title });
  } catch (error) {
    console.error('Content summarization error:', error);
    res.status(500).json({ error: 'Failed to generate title' });
  }
});

// Analyze content for tags
router.post('/tags/analyze', async (req, res) => {
  const { content } = req.body;
  
  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }

  try {
    const config = await AIConfigManager.getUserConfig(req.user?.id);
    const provider = await AIProviderFactory.createProvider(config.provider, config);
    const taggingTask = new TaggingTask(provider);
    
    const tags = await taggingTask.analyze(content);
    res.json({ tags });
  } catch (error) {
    console.error('Tag analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze tags' });
  }
});

// Update transcript title
router.put('/transcripts/:id/title', async (req, res) => {
  const { id } = req.params;
  const { title } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    db.run(
      'UPDATE transcripts SET title = ? WHERE id = ?',
      [title, id],
      function(err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Failed to update transcript title' });
        }
        res.json({ success: true });
      }
    );
  } catch (error) {
    console.error('Error updating transcript title:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Validate item type middleware
const validateItemType = (req, res, next) => {
  // Safely get itemType from params with fallback
  let itemType = req.params?.itemType || req.params?.type;
  
  // If still undefined, check for type in body as fallback
  if (!itemType && req.body?.type) {
    itemType = req.body.type;
  }

  // If we still don't have a type, return error
  if (!itemType) {
    return res.status(400).json({
      error: 'Item type is required. Must be either "note" or "transcript"'
    });
  }

  // Convert to string if it's a number
  if (typeof itemType === 'number') {
    itemType = itemType.toString();
  }

  // Ensure we have a string type
  if (typeof itemType !== 'string') {
    return res.status(400).json({
      error: 'Invalid item type format. Must be a string'
    });
  }

  // Handle case where type might be prefixed with route path
  if (itemType.includes && itemType.includes('/')) {
    itemType = itemType.split('/').pop();
  }

  // Normalize to lowercase and trim whitespace
  const normalizedType = itemType.toLowerCase().trim();

  // Validate against allowed types
  if (!['note', 'transcript'].includes(normalizedType)) {
    return res.status(400).json({
      error: `Invalid item type: "${itemType}". Must be either "note" or "transcript"`
    });
  }

  // Update params with normalized value
  req.params.itemType = normalizedType;
  req.params.type = normalizedType; // Also set type for compatibility
  next();
};

// Create new endpoint for tag creation
router.post('/tags', async (req, res) => {
  const { name, description } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Tag name is required' });
  }

  try {
    const tag = await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO tags (name, description) VALUES (?, ?)',
        [name, description || null],
        function(err) {
          if (err) {
            console.error('Tag creation error:', err);
            reject(err);
          } else {
            resolve({
              id: this.lastID,
              name,
              description
            });
          }
        }
      );
    });

    res.status(201).json(tag);
  } catch (error) {
    console.error('Error creating tag:', error);
    res.status(500).json({ error: 'Failed to create tag' });
  }
});

// Update tag assignment endpoint
router.post('/tags/:type/:id', validateItemType, async (req, res) => {
  const { type, id } = req.params;
  const { tag_id } = req.body;
  
  if (!tag_id) {
    return res.status(400).json({ error: 'Tag ID is required' });
  }

  // Validate item ID
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid item ID' });
  }

  // Validate tag ID
  if (isNaN(tag_id) || tag_id <= 0) {
    return res.status(400).json({ error: 'Invalid tag ID' });
  }

  try {
    // Begin transaction
    await new Promise((resolve, reject) => {
      db.run('BEGIN TRANSACTION', (err) => {
        if (err) reject(err);
        else resolve(null);
      });
    });

    // Check if tag exists
    const tagExists = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM tags WHERE id = ?', [tag_id], (err, row) => {
        if (err) reject(err);
        else resolve(!!row);
      });
    });

    if (!tagExists) {
      await new Promise((resolve) => {
        db.run('ROLLBACK', () => resolve(null));
      });
      return res.status(404).json({ error: 'Tag not found' });
    }

    // Check if item exists
    const itemExists = await new Promise((resolve, reject) => {
      db.get(
        `SELECT id FROM ${type}s WHERE id = ?`,
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(!!row);
        }
      );
    });

    if (!itemExists) {
      await new Promise((resolve) => {
        db.run('ROLLBACK', () => resolve(null));
      });
      return res.status(404).json({ error: 'Item not found' });
    }

    // Assign tag
    const result = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO item_tags (item_id, item_type, tag_id)
         VALUES (?, ?, ?)`,
        [id, type, tag_id],
        function(err) {
          if (err) {
            if (err.code === 'SQLITE_CONSTRAINT' && err.message.includes('UNIQUE')) {
              resolve({ success: true, message: 'Tag already assigned' });
            } else {
              reject(err);
            }
          } else {
            resolve({ success: true });
          }
        }
      );
    });

    // Commit transaction
    await new Promise((resolve, reject) => {
      db.run('COMMIT', (err) => {
        if (err) reject(err);
        else resolve(null);
      });
    });

    res.status(201).json(result);
  } catch (error) {
    // Rollback on error
    await new Promise((resolve) => {
      db.run('ROLLBACK', () => resolve(null));
    });

    console.error('Error assigning tag:', error);
    res.status(500).json({ 
      error: 'Failed to assign tag',
      details: error.message 
    });
  }
});

// Password change endpoint
router.put('/change-password', async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password are required' });
  }

  try {
    // Get user from token
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify current password
    db.get(
      'SELECT password FROM users WHERE id = ?',
      [req.user.id],
      async (err, user) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }
        
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }

        // Verify current password
        const validPassword = await bcrypt.compare(currentPassword, user.password);
        if (!validPassword) {
          return res.status(401).json({ error: 'Invalid current password' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Update password
        db.run(
          'UPDATE users SET password = ? WHERE id = ?',
          [hashedPassword, req.user.id],
          function(err) {
            if (err) {
              console.error('Database error:', err);
              return res.status(500).json({ error: 'Failed to update password' });
            }
            
            res.json({ success: true });
          }
        );
      }
    );
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove tag from note or transcript
router.delete('/tags/:type/:id/:tag_id', validateItemType, async (req, res) => {
  const { type, id, tag_id } = req.params;
  
  // Validate IDs
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid item ID' });
  }
  if (isNaN(tag_id) || tag_id <= 0) {
    return res.status(400).json({ error: 'Invalid tag ID' });
  }

  try {
    // Begin transaction
    await new Promise((resolve, reject) => {
      db.run('BEGIN TRANSACTION', (err) => {
        if (err) reject(err);
        else resolve(null);
      });
    });

    // Check if association exists
    const associationExists = await new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM item_tags 
         WHERE item_id = ? AND item_type = ? AND tag_id = ?`,
        [id, type, tag_id],
        (err, row) => {
          if (err) reject(err);
          else resolve(!!row);
        }
      );
    });

    if (!associationExists) {
      await new Promise((resolve) => {
        db.run('ROLLBACK', () => resolve(null));
      });
      return res.status(404).json({ error: 'Tag association not found' });
    }

    // Delete association
    const result = await new Promise((resolve, reject) => {
      db.run(
        `DELETE FROM item_tags 
         WHERE item_id = ? AND item_type = ? AND tag_id = ?`,
        [id, type, tag_id],
        function(err) {
          if (err) reject(err);
          else resolve({ success: true });
        }
      );
    });

    // Commit transaction
    await new Promise((resolve, reject) => {
      db.run('COMMIT', (err) => {
        if (err) reject(err);
        else resolve(null);
      });
    });

    res.json(result);
  } catch (error) {
    // Rollback on error
    await new Promise((resolve) => {
      db.run('ROLLBACK', () => resolve(null));
    });

    console.error('Error removing tag:', error);
    res.status(500).json({ 
      error: 'Failed to remove tag',
      details: error.message 
    });
  }
});

// Get all tags
router.get('/tags', async (req, res) => {
  try {
    db.all(
      `SELECT * FROM tags ORDER BY name ASC`,
      (err, rows) => {
        if (err) {
          console.error('Error fetching tags:', err);
          return res.status(500).json({ error: 'Failed to fetch tags' });
        }
        res.json(rows);
      }
    );
  } catch (error) {
    console.error('Error in tags endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user-specific tags
router.get('/user-tags', async (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized - missing user ID' });
  }

  try {
    db.all(
      `SELECT t.* FROM tags t
       JOIN user_tags ut ON t.id = ut.tag_id
       WHERE ut.user_id = ?
       ORDER BY t.name ASC`,
      [userId],
      (err, rows) => {
        if (err) {
          console.error('Error fetching user tags:', err);
          return res.status(500).json({ error: 'Failed to fetch user tags' });
        }
        res.json(rows);
      }
    );
  } catch (error) {
    console.error('Error in user tags endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/user-tags', async (req, res) => {
  const { tag_id } = req.body;
  const userId = req.headers['x-user-id'];

  // Validate input
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized - missing user ID' });
  }
  if (!tag_id || isNaN(tag_id) || tag_id <= 0) {
    return res.status(400).json({ error: 'Invalid tag ID' });
  }

  try {
    // Begin transaction
    await new Promise((resolve, reject) => {
      db.run('BEGIN TRANSACTION', (err) => {
        if (err) reject(err);
        else resolve(null);
      });
    });

    // Check if tag exists
    const tagExists = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM tags WHERE id = ?', [tag_id], (err, row) => {
        if (err) reject(err);
        else resolve(!!row);
      });
    });

    if (!tagExists) {
      await new Promise((resolve) => {
        db.run('ROLLBACK', () => resolve(null));
      });
      return res.status(404).json({ error: 'Tag not found' });
    }

    // Check if association already exists
    const associationExists = await new Promise((resolve, reject) => {
      db.get(
        'SELECT 1 FROM user_tags WHERE user_id = ? AND tag_id = ?',
        [userId, tag_id],
        (err, row) => {
          if (err) reject(err);
          else resolve(!!row);
        }
      );
    });

    if (associationExists) {
      await new Promise((resolve) => {
        db.run('ROLLBACK', () => resolve(null));
      });
      return res.status(409).json({ error: 'Tag already associated with user' });
    }

    // Create new association
    const result = await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO user_tags (user_id, tag_id) VALUES (?, ?)',
        [userId, tag_id],
        function(err) {
          if (err) reject(err);
          else resolve({ user_id: userId, tag_id });
        }
      );
    });

    // Commit transaction
    await new Promise((resolve, reject) => {
      db.run('COMMIT', (err) => {
        if (err) reject(err);
        else resolve(null);
      });
    });

    res.status(201).json(result);
  } catch (error) {
    // Rollback on error
    await new Promise((resolve) => {
      db.run('ROLLBACK', () => resolve(null));
    });

    console.error('Error creating user tag association:', error);
    res.status(500).json({ 
      error: 'Failed to create user tag association',
      details: error.message 
    });
  }
});

// Delete user tag endpoint
router.delete('/user-tags/:tag_id', async (req, res) => {
  const { tag_id } = req.params;
  const userId = req.headers['x-user-id'];

  // Validate input
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized - missing user ID' });
  }
  if (!tag_id || isNaN(tag_id) || tag_id <= 0) {
    return res.status(400).json({ error: 'Invalid tag ID' });
  }

  try {
    // Begin transaction
    await new Promise((resolve, reject) => {
      db.run('BEGIN TRANSACTION', (err) => {
        if (err) reject(err);
        else resolve(null);
      });
    });

    // Check if association exists
    const associationExists = await new Promise((resolve, reject) => {
      db.get(
        'SELECT 1 FROM user_tags WHERE user_id = ? AND tag_id = ?',
        [userId, tag_id],
        (err, row) => {
          if (err) reject(err);
          else resolve(!!row);
        }
      );
    });

    if (!associationExists) {
      await new Promise((resolve) => {
        db.run('ROLLBACK', () => resolve(null));
      });
      return res.status(404).json({ error: 'Tag association not found' });
    }

    // Delete association
    const result = await new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM user_tags WHERE user_id = ? AND tag_id = ?',
        [userId, tag_id],
        function(err) {
          if (err) reject(err);
          else resolve({ success: true });
        }
      );
    });

    // Commit transaction
    await new Promise((resolve, reject) => {
      db.run('COMMIT', (err) => {
        if (err) reject(err);
        else resolve(null);
      });
    });

    res.json(result);
  } catch (error) {
    // Rollback on error
    await new Promise((resolve) => {
      db.run('ROLLBACK', () => resolve(null));
    });

    console.error('Error deleting user tag association:', error);
    res.status(500).json({ 
      error: 'Failed to delete user tag association',
      details: error.message 
    });
  }
});

// Tag analysis endpoint
router.post('/tags/analyze', async (req, res) => {
  const { content } = req.body;
  
  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }

  // Initialize AI with user context
  const config = await AIConfigManager.getUserConfig(req.user?.id);
  const provider = await AIProviderFactory.createProvider(config.provider, config);
  const taggingTask = new TaggingTask(provider);
  
  try {
    const tags = await taggingTask.analyze(content);
    res.json({ tags });
  } catch (error) {
    console.error('Tag analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze tags' });
  }
});

// Get tags for a specific note or transcript
router.get('/tags/:type/:id', async (req, res) => {
  const { type, id } = req.params;
  
  try {
    const query = `
      SELECT t.* FROM tags t
      JOIN item_tags it ON t.id = it.tag_id
      WHERE it.item_id = ? AND it.item_type = ?
    `;
    
    db.all(query, [id, type], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch tags' });
      }
      res.json(rows);
    });
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove tag from note or transcript
router.delete('/tags/:type/:id/:tag_id', validateItemType, async (req, res) => {
  const { type, id, tag_id } = req.params;
  
  try {
    db.run(
      `DELETE FROM item_tags WHERE item_id = ? AND item_type = ? AND tag_id = ?`,
      [id, type, tag_id],
      function(err) {
        if (err) {
          console.error('Database error:', {
            message: err.message,
            code: err.code,
            stack: err.stack,
            sql: this.sql,
            params: [id, type, tag_id]
          });
          return res.status(500).json({ error: 'Failed to remove tag' });
        }
        if (this.changes === 0) {
          return res.status(404).json({ error: 'Tag association not found' });
        }
        res.json({ success: true });
      }
    );
  } catch (error) {
    console.error('Error removing tag:', {
      message: error.message,
      stack: error.stack,
      request: req.params
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
