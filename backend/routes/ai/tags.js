const express = require('express');
const router = express.Router();
const db = require('../../database/connection');

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
router.post('/', async (req, res) => {
  const { name } = req.body;
  const userId = req.user.id;
  
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Tag name is required and must be a non-empty string' });
  }

  if (!userId) {
    return res.status(401).json({ error: 'User authentication required' });
  }

  try {
    // First check if tag already exists
    const existingTag = await new Promise((resolve, reject) => {
      db.get(
        'SELECT t.* FROM tags t WHERE LOWER(t.name) = LOWER(?)',
        [name.trim()],
        (err, row) => {
          if (err) {
            console.error('Error checking existing tag:', err);
            reject(err);
          } else {
            resolve(row);
          }
        }
      );
    });

    let tag;
    
    if (existingTag) {
      // Check if user already has this tag
      const userHasTag = await new Promise((resolve, reject) => {
        db.get(
          'SELECT 1 FROM user_tags WHERE user_id = ? AND tag_id = ?',
          [userId, existingTag.id],
          (err, row) => {
            if (err) {
              console.error('Error checking user tag:', err);
              reject(err);
            } else {
              resolve(!!row);
            }
          }
        );
      });

      if (userHasTag) {
        return res.status(400).json({ error: 'You already have this tag' });
      }

      // Use existing tag
      tag = existingTag;
    } else {
      // Create new tag
      tag = await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO tags (name) VALUES (?)',
          [name.trim()],
          function(err) {
            if (err) {
              console.error('Tag creation error:', err);
              reject(err);
            } else {
              resolve({
                id: this.lastID,
                name: name.trim()
              });
            }
          }
        );
      });
    }

    // Associate tag with user
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO user_tags (user_id, tag_id) VALUES (?, ?)',
        [userId, tag.id],
        function(err) {
          if (err) {
            console.error('User tag association error:', err);
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });

    res.status(201).json(tag);
  } catch (error) {
    console.error('Error in tag creation:', error);
    res.status(500).json({ error: 'Failed to create tag' });
  }
});

// Update tag assignment endpoint
router.post('/:type/:id', validateItemType, async (req, res) => {
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

// Remove tag from note or transcript
router.delete('/:type/:id/:tag_id', validateItemType, async (req, res) => {
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
router.get('/', async (req, res) => {
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
router.get('/user', async (req, res) => {
  const userId = req.user.id;
  const itemType = req.query.type; // Get type from query parameter

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized - missing user ID' });
  }

  try {
    let query = `
      SELECT DISTINCT t.* 
      FROM tags t
      JOIN user_tags ut ON t.id = ut.tag_id
      WHERE ut.user_id = ?
    `;
    const params = [userId];

    // If type is specified, filter by item_type
    if (itemType === 'note' || itemType === 'transcript') {
      query = `
        SELECT DISTINCT t.* 
        FROM tags t
        JOIN user_tags ut ON t.id = ut.tag_id
        JOIN item_tags it ON t.id = it.tag_id
        WHERE ut.user_id = ? 
        AND it.item_type = ?
        ORDER BY t.name ASC
      `;
      params.push(itemType);
    }

    db.all(query, params, (err, rows) => {
      if (err) {
        console.error('Error fetching user tags:', err);
        return res.status(500).json({ error: 'Failed to fetch user tags' });
      }
      res.json(rows);
    });
  } catch (error) {
    console.error('Error in user tags endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create user tag association
router.post('/user', async (req, res) => {
  const { tag_id } = req.body;
  const userId = req.user.id;

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

// Delete user tag association
router.delete('/user/:tag_id', async (req, res) => {
  const { tag_id } = req.params;
  const userId = req.user.id;

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

// Get tags for a specific note or transcript
router.get('/:type/:id', async (req, res) => {
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

module.exports = router;