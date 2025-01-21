const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const sqlite3 = require('sqlite3').verbose();
const { OpenAI } = require('openai');

// AI Provider Configuration Endpoints
router.get('/config', async (req, res) => {
  try {
    db.get('SELECT provider FROM app_settings WHERE is_active = 1', (err, row) => {
      if (err) {
        console.error('Error fetching AI config:', err);
        return res.status(500).json({ error: 'Failed to fetch AI configuration' });
      }
      res.json({ provider: row?.provider || 'gemini' });
    });
  } catch (error) {
    console.error('Error in AI config endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/config', async (req, res) => {
  const { provider } = req.body;
  
  if (!['openai', 'gemini'].includes(provider)) {
    return res.status(400).json({ error: 'Invalid provider specified' });
  }

  try {
    db.run(
      'UPDATE app_settings SET is_active = 0 WHERE is_active = 1'
    );
    
    db.run(
      'INSERT INTO app_settings (provider, is_active) VALUES (?, 1)',
      [provider],
      function(err) {
        if (err) {
          console.error('Error updating AI config:', err);
          return res.status(500).json({ error: 'Failed to update AI configuration' });
        }
        res.json({ provider });
      }
    );
  } catch (error) {
    console.error('Error updating AI config:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Database connection
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to the AI routes SQLite database.');
});

// Initialize Gemini AI client
let genAI = null;

const initializeAI = async () => {
  try {
    // First try to get API key from app_settings
    const getApiKey = () => new Promise((resolve, reject) => {
      db.get(
        'SELECT api_key FROM app_settings WHERE is_active = 1 AND provider = ?',
        ['gemini'],
        (err, row) => {
          if (err) return reject(err);
          resolve(row?.api_key);
        }
      );
    });

    // Check both sources for API key
    const apiKey = await getApiKey() || process.env.GEMINI_API_KEY;
    
    if (apiKey && apiKey !== 'your-gemini-key') {
      genAI = new GoogleGenerativeAI(apiKey);
    } else {
      console.error('Gemini API key not configured');
    }
  } catch (error) {
    console.error('Error initializing Gemini:', error);
  }
};

initializeAI();

// Transcription enhancement endpoint
router.post('/enhance-transcription', async (req, res) => {
  const { transcript, language = 'en-US' } = req.body;
  
  if (!transcript) {
    return res.status(400).json({ error: 'Transcript is required' });
  }

  if (!genAI) {
    return res.json({ enhanced: transcript, confidence: 0 });
  }

  try {
    const model = genAI.getGenerativeModel({ 
      model: "gemini-pro",
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT", 
          threshold: "BLOCK_NONE"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_NONE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_NONE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_NONE"
        },
        {
          category: "HARM_CATEGORY_CIVIC_INTEGRITY",
          threshold: "BLOCK_NONE"
        }
      ]
    });
    
    // First pass: Basic formatting and punctuation
    const formatPrompt = `Add proper punctuation and formatting to this transcript:\n${transcript}`;
    const formatResult = await model.generateContent(formatPrompt);
    
    // Check for blocked content
    if (formatResult.response.promptFeedback?.blockReason) {
      console.warn('Formatting blocked:', formatResult.response.promptFeedback.blockReason);
      throw new Error('Formatting blocked by safety filters');
    }
    
    let formattedText = formatResult.response.text();
    
    // Second pass: Context-aware correction
    const correctPrompt = `Correct any transcription errors in this text while preserving meaning:\n${formattedText}`;
    const correctResult = await model.generateContent(correctPrompt);
    
    // Check for blocked content
    if (correctResult.response.promptFeedback?.blockReason) {
      console.warn('Correction blocked:', correctResult.response.promptFeedback.blockReason);
      throw new Error('Correction blocked by safety filters');
    }
    
    const correctedText = correctResult.response.text();
    
    // Calculate confidence score
    const similarity = calculateSimilarity(transcript, correctedText);
    const confidence = Math.min(100, Math.max(0, Math.round(similarity * 100)));
    
    res.json({ 
      enhanced: correctedText,
      confidence,
      original: transcript
    });
  } catch (error) {
    console.error('Transcription enhancement error:', error);
    res.status(500).json({ 
      error: 'Failed to enhance transcription',
      enhanced: transcript,
      confidence: 0
    });
  }
});

// Helper function to calculate text similarity
function calculateSimilarity(original, enhanced) {
  const originalWords = new Set(original.toLowerCase().split(/\s+/));
  const enhancedWords = new Set(enhanced.toLowerCase().split(/\s+/));
  
  const intersection = new Set(
    [...originalWords].filter(word => enhancedWords.has(word))
  );
  
  return intersection.size / originalWords.size;
}

// Generate title for content
router.post('/summarize', async (req, res) => {
  const { content } = req.body;
  
  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }

  if (!genAI) {
    // Fallback to simple title generation if Gemini is not configured
    const fallbackTitle = content.split(/\s+/).slice(0, 5).join(' ') + '...';
    return res.json({ title: fallbackTitle });
  }

  // Validate content
  if (typeof content !== 'string' || content.length > 10000) {
    return res.status(400).json({ error: 'Invalid content format or length' });
  }

  // Sanitize content by removing potentially problematic characters
  const sanitizedContent = content
    .replace(/[<>{}[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 5000);

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const prompt = `Generate a brief, descriptive title for this content: ${sanitizedContent}`;
    const result = await model.generateContent(prompt);
    
    // Handle safety filters
    if (result.response.promptFeedback?.blockReason) {
      console.warn('Content blocked by safety filters:', result.response.promptFeedback.blockReason);
      throw new Error('Content blocked by safety filters');
    }
    
    const title = result.response.text();
    res.json({ title: title.trim() });
  } catch (error) {
    console.error('Gemini error:', error);
    // Enhanced fallback mechanism
    const fallbackTitle = sanitizedContent
      .split(/\s+/)
      .slice(0, 5)
      .join(' ')
      .replace(/[^\w\s]/g, '')
      .trim();
    res.json({ title: fallbackTitle || 'Untitled' });
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
    db.all('SELECT * FROM tags ORDER BY name ASC', [], (err, rows) => {
      if (err) {
        console.error('Error fetching tags:', err);
        return res.status(500).json({ error: 'Failed to fetch tags' });
      }
      res.json(rows);
    });
  } catch (error) {
    console.error('Error in tags endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Tag analysis endpoint
router.post('/tags/analyze', async (req, res) => {
  const { content } = req.body;
  
  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }

  if (!genAI) {
    return res.json({ tags: [] });
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const prompt = `Analyze this content and suggest relevant tags:\n${content}\n\nReturn tags as a comma-separated list`;
    const result = await model.generateContent(prompt);
    
    if (result.response.promptFeedback?.blockReason) {
      console.warn('Tag analysis blocked:', result.response.promptFeedback.blockReason);
      throw new Error('Tag analysis blocked by safety filters');
    }
    
    const tags = result.response.text()
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
    
    res.json({ tags });
  } catch (error) {
    console.error('Tag analysis error:', error);
    res.status(500).json({
      error: 'Failed to analyze content for tags',
      tags: []
    });
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
