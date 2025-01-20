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


// Validate item type middleware
const validateItemType = (req, res, next) => {
  let { itemType } = req.params;
  
  // Convert numeric values to string
  if (typeof itemType === 'number') {
    itemType = itemType.toString();
  }
  
  // Handle case where type might be prefixed with route path
  if (itemType.includes('/')) {
    itemType = itemType.split('/').pop();
  }

  console.log(`Validating item type: ${itemType}`);
  
  // Normalize to lowercase and check valid types
  const normalizedType = itemType.toLowerCase();
  if (!['note', 'transcript'].includes(normalizedType)) {
    console.error(`Invalid item type: ${itemType}`);
    return res.status(400).json({
      error: 'Invalid item type. Must be either "note" or "transcript"'
    });
  }
  
  // Update params with normalized value
  req.params.itemType = normalizedType;
  next();
};

router.post('/tags/:itemId/:itemType', validateItemType, async (req, res) => {
  const { itemId, itemType } = req.params;
  const { tagId, tagName } = req.body;
  
  console.log('Received tag assignment request:', {
    itemId,
    itemType,
    tagId,
    tagName,
    headers: req.headers,
    body: req.body
  });

  try {
    let finalTagId = tagId;
    
    // If we have a tag name but no ID, find or create the tag
    if (!tagId && tagName) {
      console.log(`Finding or creating tag: ${tagName}`);
      
      // First try to find existing tag
      const existingTag = await new Promise((resolve, reject) => {
        db.get(
          'SELECT id FROM tags WHERE name = ?',
          [tagName],
          function(err, row) {
            if (err) {
              console.error('Tag lookup error:', err);
              reject(err);
            } else {
              resolve(row);
            }
          }
        );
      });

      if (existingTag) {
        finalTagId = existingTag.id;
      } else {
        // Create new tag if it doesn't exist
        finalTagId = await new Promise((resolve, reject) => {
          db.run(
            'INSERT INTO tags (name, description) VALUES (?, ?)',
            [tagName, req.body.tagDescription || null],
            function(err) {
              if (err) {
                console.error('Tag creation error:', {
                  message: err.message,
                  code: err.code,
                  stack: err.stack,
                  sql: this.sql,
                  params: [tagName]
                });
                reject(err);
              } else {
                resolve(this.lastID);
              }
            }
          );
        });
      }
    }

    console.log('Attempting to assign tag:', {
      itemId,
      itemType,
      finalTagId
    });

    // Assign tag using the unified item_tags table
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO item_tags (item_id, item_type, tag_id)
         VALUES (?, ?, ?)`,
        [itemId, itemType, finalTagId],
        function(err) {
          if (err) {
            console.error('Database error details:', {
              message: err.message,
              code: err.code,
              stack: err.stack,
              sql: this.sql,
              params: [itemId, finalTagId]
            });
            reject(err);
          } else {
            resolve(this.lastID);
          }
        }
      );
    });

    console.log(`Successfully assigned tag ${finalTagId} to item ${itemId}`);
    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Error in tag assignment:', {
      message: error.message,
      stack: error.stack,
      request: {
        params: req.params,
        body: req.body,
        headers: req.headers
      }
    });
    res.status(500).json({ error: 'Failed to assign tag', details: error.message });
  }
});

router.delete('/tags/:itemId/:itemType/:tagId', async (req, res) => {
  const { itemId, itemType, tagId } = req.params;

  try {
    db.run(
      `DELETE FROM item_tags
       WHERE item_id = ? AND item_type = ? AND tag_id = ?`,
      [itemId, itemType, tagId],
      function(err) {
        if (err) throw err;
        if (this.changes === 0) {
          return res.status(404).json({ error: 'Tag assignment not found' });
        }
        res.json({ message: 'Tag removed' });
      }
    );
  } catch (error) {
    console.error('Error removing tag:', error);
    res.status(500).json({ error: 'Failed to remove tag' });
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
router.delete('/tags/:type/:id/:tag_id', async (req, res) => {
  const { type, id, tag_id } = req.params;
  
  try {
    db.run(
      `DELETE FROM item_tags WHERE item_id = ? AND item_type = ? AND tag_id = ?`,
      [id, type, tag_id],
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


module.exports = router;
