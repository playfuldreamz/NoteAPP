const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5000;

// JWT secret key - in production, use an environment variable
const JWT_SECRET = 'your-secret-key'; // TODO: Move to environment variable

// Middleware
app.use(cors());
app.use(express.json());

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
const db = new sqlite3.Database(':memory:', (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to the in-memory SQLite database.');
});

// Create tables
db.serialize(() => {
  // Create users table
  db.run(`CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Create notes table with user_id foreign key
  db.run(`CREATE TABLE notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT,
    transcript TEXT,
    user_id INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  // Create transcripts table with user_id foreign key
  db.run(`CREATE TABLE transcripts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT,
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
  const { content, transcript } = req.body;
  db.run('INSERT INTO notes (content, transcript, user_id) VALUES (?, ?, ?)', 
    [content, transcript, req.user.id], 
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.status(201).json({ id: this.lastID, content, transcript });
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
  db.all('SELECT * FROM transcripts WHERE user_id = ? ORDER BY date DESC', 
    [req.user.id], 
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(rows);
    });
});

app.post('/transcripts', authenticateToken, (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }

  db.run('INSERT INTO transcripts (text, user_id) VALUES (?, ?)',
    [text, req.user.id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.status(201).json({ 
        id: this.lastID, 
        text,
        date: new Date().toISOString(),
        user_id: req.user.id 
      });
    });
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
