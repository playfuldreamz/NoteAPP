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
        res.status(201).json({ token, username }); // Include username in response
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
    res.json({ token, username: user.username }); // Include username in response
  });
});

// Protected routes - Add authenticateToken middleware
app.get('/notes', authenticateToken, (req, res) => {
  db.all('SELECT * FROM notes WHERE user_id = ?', [req.user.id], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
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

app.delete('/notes/:id', authenticateToken, (req, res) => {
  db.run('DELETE FROM notes WHERE id = ? AND user_id = ?', 
    [req.params.id, req.user.id], 
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (this.changes === 0) {
        res.status(404).json({ error: 'Note not found or unauthorized' });
        return;
      }
      res.json({ message: 'Note deleted' });
    });
});

// Transcript routes
app.get('/transcripts', authenticateToken, (req, res) => {
    const query = 'SELECT id, text, title, date FROM transcripts WHERE user_id = ? ORDER BY date DESC';
    
    db.all(query, [req.user.id], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
    res.json(rows);
  });
});

app.post('/transcripts', authenticateToken, async (req, res) => {
  try {
    if (!req.body) {
      return res.status(400).json({ error: 'No request body' });
    }
    
    const text = req.body.text;
    const title = req.body.title;
    
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

      const response = { 
        id: this.lastID, 
        text,
        title: finalTitle,
        date: new Date().toISOString(),
        user_id: req.user.id 
      };
      res.status(201).json(response);
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/transcripts/:id', authenticateToken, (req, res) => {
  db.run('DELETE FROM transcripts WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (this.changes === 0) {
        res.status(404).json({ error: 'Transcript not found or unauthorized' });
        return;
      }
      res.json({ message: 'Transcript deleted' });
    });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
