const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const sqlite3 = require('sqlite3').verbose();
const jwt = require('jsonwebtoken');

// Database connection
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to the AI routes SQLite database.');
});

// Initialize AI clients with error handling
let openai = null;
let genAI = null;

try {
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-key') {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your-gemini-key') {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
} catch (error) {
  console.error('Error initializing AI clients:', error);
}

// Get current AI provider
router.get('/config', async (req, res) => {
  try {
    db.get('SELECT provider FROM app_settings WHERE is_active = 1', [], (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ provider: row?.provider || process.env.DEFAULT_AI_PROVIDER });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update AI provider
router.put('/config', async (req, res) => {
  const { provider } = req.body;
  if (!['openai', 'gemini'].includes(provider)) {
    return res.status(400).json({ error: 'Invalid provider' });
  }

  // Check if the selected provider is configured
  if (provider === 'openai' && !openai) {
    return res.status(400).json({ error: 'OpenAI is not configured' });
  }
  if (provider === 'gemini' && !genAI) {
    return res.status(400).json({ error: 'Gemini is not configured' });
  }

  try {
    db.serialize(() => {
      db.run('UPDATE app_settings SET is_active = 0');
      db.run('INSERT OR REPLACE INTO app_settings (provider, is_active) VALUES (?, 1)', [provider], (err) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json({ provider });
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Summarize note content
router.post('/summarize', async (req, res) => {
  const { content } = req.body;
  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }

  try {
    db.get('SELECT provider FROM app_settings WHERE is_active = 1', [], async (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      const provider = row?.provider || process.env.DEFAULT_AI_PROVIDER;

      // Check if the selected provider is configured
      if (provider === 'openai' && !openai) {
        return res.status(400).json({ error: 'OpenAI is not configured' });
      }
      if (provider === 'gemini' && !genAI) {
        return res.status(400).json({ error: 'Gemini is not configured' });
      }

      try {
        let summary;
        if (provider === 'openai') {
          const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
              {
                role: "system",
                content: "Generate a brief, descriptive title for this note content."
              },
              {
                role: "user",
                content
              }
            ],
            max_tokens: 50
          });
          summary = completion.choices[0].message.content;
        } else {
          const model = genAI.getGenerativeModel({ model: "gemini-pro" });
          const prompt = `Generate a brief, descriptive title for this note content: ${content}`;
          const result = await model.generateContent(prompt);
          summary = result.response.text();
        }

        res.json({ title: summary.trim() });
      } catch (aiError) {
        res.status(500).json({ error: aiError.message });
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate transcript title
router.post('/transcript-title', async (req, res) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Transcript text is required' });
  }

  try {
    db.get('SELECT provider FROM app_settings WHERE is_active = 1', [], async (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      const provider = row?.provider || process.env.DEFAULT_AI_PROVIDER;

      // Check if the selected provider is configured
      if (provider === 'openai' && !openai) {
        return res.status(400).json({ error: 'OpenAI is not configured' });
      }
      if (provider === 'gemini' && !genAI) {
        return res.status(400).json({ error: 'Gemini is not configured' });
      }

      try {
        let title;
        if (provider === 'openai') {
          const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
              {
                role: "system",
                content: "Generate a brief, descriptive title for this transcript text."
              },
              {
                role: "user",
                content: text
              }
            ],
            max_tokens: 50
          });
          title = completion.choices[0].message.content;
        } else {
          const model = genAI.getGenerativeModel({ model: "gemini-pro" });
          const prompt = `Generate a brief, descriptive title for this transcript text: ${text}`;
          const result = await model.generateContent(prompt);
          title = result.response.text();
        }

        res.json({ title: title.trim() });
      } catch (aiError) {
        res.status(500).json({ error: aiError.message });
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
