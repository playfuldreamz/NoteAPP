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
