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

const { isTagReferenced } = require('./utils/dbUtils');




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
