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

module.exports = router;
