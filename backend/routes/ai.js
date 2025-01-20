const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const sqlite3 = require('sqlite3').verbose();

// Database connection
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to the AI routes SQLite database.');
});

// Initialize Gemini AI client
let genAI = null;
try {
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your-gemini-key') {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  } else {
    console.error('Gemini API key not configured');
  }
} catch (error) {
  console.error('Error initializing Gemini:', error);
}

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
          category: "HARM_CATEGORY_DANGEROUS",
          threshold: "BLOCK_NONE"
        },
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
    const table = type === 'note' ? 'note_tags' : 'transcript_tags';
    const query = `
      SELECT t.* FROM tags t
      JOIN ${table} jt ON t.id = jt.tag_id
      WHERE jt.${type}_id = ?
    `;
    
    db.all(query, [id], (err, rows) => {
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

// Add tag to note or transcript
router.post('/tags/:type/:id', async (req, res) => {
  const { type, id } = req.params;
  const { tag_id } = req.body;
  
  if (!tag_id) {
    return res.status(400).json({ error: 'Tag ID is required' });
  }

  try {
    const table = type === 'note' ? 'note_tags' : 'transcript_tags';
    const column = type === 'note' ? 'note_id' : 'transcript_id';
    
    db.run(
      `INSERT INTO ${table} (${column}, tag_id) VALUES (?, ?)`,
      [id, tag_id],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Tag already associated' });
          }
          return res.status(500).json({ error: 'Failed to add tag' });
        }
        res.status(201).json({ success: true });
      }
    );
  } catch (error) {
    console.error('Error adding tag:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove tag from note or transcript
router.delete('/tags/:type/:id/:tag_id', async (req, res) => {
  const { type, id, tag_id } = req.params;
  
  try {
    const table = type === 'note' ? 'note_tags' : 'transcript_tags';
    const column = type === 'note' ? 'note_id' : 'transcript_id';
    
    db.run(
      `DELETE FROM ${table} WHERE ${column} = ? AND tag_id = ?`,
      [id, tag_id],
      function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to remove tag' });
        }
        if (this.changes === 0) {
          return res.status(404).json({ error: 'Tag association not found' });
        }
        res.json({ success: true });
      }
    );
  } catch (error) {
    console.error('Error removing tag:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Tag management endpoints
router.post('/tags', async (req, res) => {
  const { name, description } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Tag name is required' });
  }

  try {
    db.run(
      'INSERT INTO tags (name, description) VALUES (?, ?)',
      [name, description],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Tag already exists' });
          }
          return res.status(500).json({ error: 'Failed to create tag' });
        }
        res.status(201).json({
          id: this.lastID,
          name,
          description
        });
      }
    );
  } catch (error) {
    console.error('Tag creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/tags', async (req, res) => {
  try {
    db.all('SELECT * FROM tags', (err, rows) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to fetch tags' });
      }
      res.json(rows);
    });
  } catch (error) {
    console.error('Tag fetch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
