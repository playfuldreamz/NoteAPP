// Load environment variables
require('dotenv').config();

const fetch = require('node-fetch');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { authenticateToken, generateToken } = require('./middleware/auth');
const { OpenAI } = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const db = require('./database/connection');
const createTables = require('./database/schema');
const authRoutes = require('./routes/auth');

// Initialize AI clients
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
}) : null;

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

const app = express();

// Import routes
const aiRoutes = require('./routes/ai');
const actionItemsRoutes = require('./routes/actionItems');
const transcriptsRoutes = require('./routes/transcripts');
const notesRoutes = require('./routes/notes');
const PORT = process.env.PORT || 5000;

// JWT secret key - in production, use an environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware
app.use(cors({
  origin: ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id']
}));
app.use(express.json());

// Add request logging middleware
app.use((req, res, next) => {
  next();
});


// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/ai', authenticateToken, aiRoutes);
app.use('/api/action-items', authenticateToken, actionItemsRoutes);
app.use('/api/transcripts', transcriptsRoutes);  // No auth required for token validation
app.use('/api/notes', authenticateToken, notesRoutes);

// Initialize database
createTables();

// Helper function to check if a tag is still referenced
function isTagReferenced(db, tagId, callback) {
  db.get(
    'SELECT COUNT(*) as count FROM item_tags WHERE tag_id = ?',
    [tagId],
    (err, row) => {
      if (err) return callback(err);
      callback(null, row.count > 0);
    }
  );
}


// Protected routes - Add authenticateToken middleware
app.get('/notes', authenticateToken, (req, res) => {
  const query = `
    SELECT
      n.id,
      n.content,
      n.title,
      n.transcript,
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
    
    res.json(notes);
  });
});

app.post('/notes', authenticateToken, (req, res) => {
  const { content, title, transcript } = req.body;
  db.run('INSERT INTO notes (content, title, transcript, user_id) VALUES (?, ?, ?, ?)', 
    [content, title, transcript, req.user.id], 
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.status(201).json({ id: this.lastID, content, title, transcript });
    });
});

// Delete note tags endpoint with cleanup
app.delete('/notes/:id/tags', authenticateToken, (req, res) => {
  const noteId = req.params.id;
  
  // Get all tag IDs associated with this note
  db.all(
    'SELECT tag_id FROM item_tags WHERE item_id = ? AND item_type = ?',
    [noteId, 'note'],
    (err, tagRows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Delete item_tags records
      db.run(
        'DELETE FROM item_tags WHERE item_id = ? AND item_type = ?',
        [noteId, 'note'],
        function(err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          // Check and delete orphaned tags
          const tagIds = tagRows.map(row => row.tag_id);
          tagIds.forEach(tagId => {
            isTagReferenced(db, tagId, (err, isReferenced) => {
              if (err) {
                console.error('Error checking tag reference:', err);
                return;
              }
              
              if (!isReferenced) {
                db.run('DELETE FROM tags WHERE id = ?', [tagId], err => {
                  if (err) {
                    console.error('Error deleting orphaned tag:', err);
                  }
                });
              }
            });
          });

          res.json({ message: 'Note tags deleted successfully' });
        }
      );
    }
  );
});

// Delete note endpoint with tag cleanup
app.delete('/notes/:id', authenticateToken, (req, res) => {
  const noteId = req.params.id;
  
  // Get all tag IDs associated with this note
  db.all(
    'SELECT tag_id FROM item_tags WHERE item_id = ? AND item_type = ?',
    [noteId, 'note'],
    (err, tagRows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Delete item_tags records
      db.run(
        'DELETE FROM item_tags WHERE item_id = ? AND item_type = ?',
        [noteId, 'note'],
        function(err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          // Check and delete orphaned tags
          const tagIds = tagRows.map(row => row.tag_id);
          tagIds.forEach(tagId => {
            isTagReferenced(db, tagId, (err, isReferenced) => {
              if (err) {
                console.error('Error checking tag reference:', err);
                return;
              }
              
              if (!isReferenced) {
                db.run('DELETE FROM tags WHERE id = ?', [tagId], err => {
                  if (err) {
                    console.error('Error deleting orphaned tag:', err);
                  }
                });
              }
            });
          });

          // Finally delete the note
          db.run(
            'DELETE FROM notes WHERE id = ? AND user_id = ?',
            [noteId, req.user.id],
            function(err) {
              if (err) {
                return res.status(500).json({ error: err.message });
              }
              if (this.changes === 0) {
                return res.status(404).json({ error: 'Note not found or unauthorized' });
              }
              res.json({ message: 'Note and associated tags deleted' });
            }
          );
        }
      );
    }
  );
});

// Transcript routes
app.get('/transcripts', authenticateToken, (req, res) => {
  const query = `
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
    WHERE t.user_id = ?
    GROUP BY t.id
    ORDER BY t.date DESC
  `;
  
  db.all(query, [req.user.id], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Parse the JSON tags array
    const transcripts = rows.map(row => ({
      ...row,
      tags: JSON.parse(row.tags).filter(tag => tag.id !== null)
    }));
    
    res.json(transcripts);
  });
});


app.post('/transcripts', authenticateToken, async (req, res) => {
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

// Delete transcript tags endpoint with cleanup
app.delete('/transcripts/:id/tags', authenticateToken, (req, res) => {
  const transcriptId = req.params.id;
  
  // Get all tag IDs associated with this transcript
  db.all(
    'SELECT tag_id FROM item_tags WHERE item_id = ? AND item_type = ?',
    [transcriptId, 'transcript'],
    (err, tagRows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Delete item_tags records
      db.run(
        'DELETE FROM item_tags WHERE item_id = ? AND item_type = ?',
        [transcriptId, 'transcript'],
        function(err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          // Check and delete orphaned tags
          const tagIds = tagRows.map(row => row.tag_id);
          tagIds.forEach(tagId => {
            isTagReferenced(db, tagId, (err, isReferenced) => {
              if (err) {
                console.error('Error checking tag reference:', err);
                return;
              }
              
              if (!isReferenced) {
                db.run('DELETE FROM tags WHERE id = ?', [tagId], err => {
                  if (err) {
                    console.error('Error deleting orphaned tag:', err);
                  }
                });
              }
            });
          });

          res.json({ message: 'Transcript tags deleted successfully' });
        }
      );
    }
  );
});

// Delete transcript endpoint with tag cleanup
app.delete('/transcripts/:id', authenticateToken, (req, res) => {
  const transcriptId = req.params.id;
  
  // Get all tag IDs associated with this transcript
  db.all(
    'SELECT tag_id FROM item_tags WHERE item_id = ? AND item_type = ?',
    [transcriptId, 'transcript'],
    (err, tagRows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Delete item_tags records
      db.run(
        'DELETE FROM item_tags WHERE item_id = ? AND item_type = ?',
        [transcriptId, 'transcript'],
        function(err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          // Check and delete orphaned tags
          const tagIds = tagRows.map(row => row.tag_id);
          tagIds.forEach(tagId => {
            isTagReferenced(db, tagId, (err, isReferenced) => {
              if (err) {
                console.error('Error checking tag reference:', err);
                return;
              }
              
              if (!isReferenced) {
                db.run('DELETE FROM tags WHERE id = ?', [tagId], err => {
                  if (err) {
                    console.error('Error deleting orphaned tag:', err);
                  }
                });
              }
            });
          });

          // Finally delete the transcript
          db.run(
            'DELETE FROM transcripts WHERE id = ? AND user_id = ?',
            [transcriptId, req.user.id],
            function(err) {
              if (err) {
                return res.status(500).json({ error: err.message });
              }
              if (this.changes === 0) {
                return res.status(404).json({ error: 'Transcript not found or unauthorized' });
              }
              res.json({ message: 'Transcript and associated tags deleted' });
            }
          );
        }
      );
    }
  );
});

// Tag management routes
app.get('/tags', authenticateToken, (req, res) => {
  db.all('SELECT id, name FROM tags ORDER BY name ASC', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

app.post('/tags', authenticateToken, (req, res) => {
  const { name } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Tag name is required' });
  }

  db.run('INSERT OR IGNORE INTO tags (name) VALUES (?)', [name], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (this.changes === 0) {
      // Tag already exists
      db.get('SELECT id, name FROM tags WHERE name = ?', [name], (err, tag) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.status(200).json(tag);
      });
    } else {
      // New tag created
      res.status(201).json({ id: this.lastID, name });
    }
  });
});

app.delete('/tags/:id', authenticateToken, (req, res) => {
  db.run('DELETE FROM tags WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Tag not found' });
    }
    res.json({ message: 'Tag deleted' });
  });
});

// AssemblyAI token endpoint - no authentication required for this endpoint
app.post('/transcripts/assemblyai-token', async (req, res) => {
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

// Password change endpoint
app.put('/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password are required' });
  }

  try {
    // Verify current password
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE id = ?', [userId], (err, row) => {
        if (err) reject(err);
        resolve(row);
      });
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid current password' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    await new Promise((resolve, reject) => {
      db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId], function(err) {
        if (err) reject(err);
        resolve(this);
      });
    });

    res.json({ message: 'Password updated successfully' });

  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

// Transcription settings routes
app.get('/api/transcription/settings', authenticateToken, (req, res) => {
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

app.put('/api/transcription/settings', authenticateToken, (req, res) => {
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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
