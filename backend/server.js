// Load environment variables
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OpenAI } = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize AI clients
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
}) : null;

const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

const app = express();

// Import routes
const aiRoutes = require('./routes/ai');
const PORT = process.env.PORT || 5000;

// JWT secret key - in production, use an environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? 
    process.env.FRONTEND_URL : 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Add request logging middleware
app.use((req, res, next) => {
  next();
});

// Mount routes
app.use('/api/ai', aiRoutes);

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).json({ error: 'Invalid token' });
  }
};

// Database setup
const db = new sqlite3.Database('database.sqlite', (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to the SQLite database.');
});

// Create tables if they don't exist
db.serialize(() => {
  // Create users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Create notes table with user_id foreign key and title
  db.run(`CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT,
    title TEXT,
    transcript TEXT,
    user_id INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  // Create tags table
  db.run(`CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Create item_tags join table with proper constraints
  db.run(`CREATE TABLE IF NOT EXISTS item_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL,
    item_type TEXT NOT NULL CHECK(item_type IN ('note', 'transcript')),
    tag_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(item_id, item_type, tag_id),
    FOREIGN KEY(item_id) REFERENCES notes(id) ON DELETE CASCADE,
    FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE
  )`);

  // Create app_settings table for global AI configuration
  db.run(`CREATE TABLE IF NOT EXISTS app_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider TEXT NOT NULL,
    api_key TEXT NOT NULL,
    is_active BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Create user_settings table for user-specific API keys
  db.run(`CREATE TABLE IF NOT EXISTS user_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    provider TEXT NOT NULL,
    api_key TEXT NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  // Create transcripts table with user_id foreign key and title
  db.run(`CREATE TABLE IF NOT EXISTS transcripts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT,
    title TEXT,
    user_id INTEGER,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);
});

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

// Auth routes
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert the user
    db.run('INSERT INTO users (username, password) VALUES (?, ?)', 
      [username, hashedPassword], 
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Username already exists' });
          }
          return res.status(500).json({ error: err.message });
        }

        // Create token
        const token = jwt.sign({ id: this.lastID, username }, JWT_SECRET);
        res.status(201).json({ token, username });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    // Create token
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET);
    res.json({ token, username: user.username });
  });
});

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
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (typeof title !== 'string') {
      return res.status(400).json({ error: 'Title must be a string' });
    }

    // Only use 'Untitled Transcript' if title is null or undefined
    const finalTitle = (title === null || title === undefined) ? 'Untitled Transcript' : title;
    
    // Save transcript with provided title
    const query = 'INSERT INTO transcripts (text, title, user_id) VALUES (?, ?, ?)';
    const params = [text, finalTitle, req.user.id];

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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
