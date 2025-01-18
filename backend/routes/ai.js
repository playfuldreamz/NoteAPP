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

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const prompt = `Generate a brief, descriptive title for this content: ${content}`;
    const result = await model.generateContent(prompt);
    const title = result.response.text();
    
    res.json({ title: title.trim() });
  } catch (error) {
    console.error('Gemini error:', error);
    // Fallback if Gemini fails
    const fallbackTitle = content.split(/\s+/).slice(0, 5).join(' ') + '...';
    res.json({ title: fallbackTitle });
  }
});

module.exports = router;

module.exports = router;
