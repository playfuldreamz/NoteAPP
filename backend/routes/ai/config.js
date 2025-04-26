const express = require('express');
const router = express.Router();
const AIConfigManager = require('../../services/ai/config');
const db = require('../../database/connection');

// GET /api/ai/config
router.get('/', async (req, res) => {
  try {
    const config = await AIConfigManager.getUserConfig(req.user.id);
    res.json(config);
  } catch (error) {
    console.error('Error fetching AI config:', error);
    res.status(500).json({ error: 'Failed to fetch AI configuration' });
  }
});

// PUT /api/ai/config
router.put('/', async (req, res) => {
  try {
    const { provider, apiKey } = req.body;
    const userId = req.user.id;

    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    await AIConfigManager.updateConfig(userId, { provider, apiKey });
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating AI config:', error);
    res.status(500).json({ error: 'Failed to update AI configuration' });
  }
});

// GET /api/ai/config/all
router.get('/all', async (req, res) => {
  try {
    const userId = req.user.id;
    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    // Get all active settings for this user using better-sqlite3 API
    const stmt = db.prepare(`
      SELECT provider, api_key FROM user_settings 
      WHERE user_id = ? AND api_key IS NOT NULL AND api_key != ''
    `);
    
    const rows = stmt.all(userId);
    
    const userSettings = rows.map(row => ({
      provider: row.provider,
      apiKey: row.api_key,
      source: 'user'
    }));

    // Add environment keys for providers that don't have user settings
    const settings = [...userSettings];
    const userProviders = new Set(userSettings.map(s => s.provider));

    // Add Gemini env key if no user setting
    if (!userProviders.has('gemini') && process.env.GEMINI_API_KEY) {
      settings.push({
        provider: 'gemini',
        apiKey: process.env.GEMINI_API_KEY,
        source: 'env'
      });
    }    // Add OpenAI env key if no user setting
    if (!userProviders.has('openai') && process.env.OPENAI_API_KEY) {
      settings.push({
        provider: 'openai',
        apiKey: process.env.OPENAI_API_KEY,
        source: 'env'
      });
    }

    res.json(settings);
  } catch (error) {
    console.error('Error fetching AI config:', error);
  }
});

// GET /api/ai/openai-key-status
router.get('/openai-key-status', async (req, res) => {
  const userId = req.user.id;
  let userKeyExists = false;
  let envKeyExists = false;

  try {
    // 1. Check user_settings table
    const userStmt = db.prepare(`
      SELECT 1 FROM user_settings
      WHERE user_id = ? AND provider = 'openai' AND is_active = 1 AND api_key IS NOT NULL AND api_key != ''
      LIMIT 1
    `);
    const userResult = userStmt.get(userId);
    userKeyExists = !!userResult;

    // 2. Check environment variable
    envKeyExists = !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim() !== '';

    const isAvailable = userKeyExists || envKeyExists;
    console.log(`OpenAI Key Status Check for user ${userId}: UserKey=${userKeyExists}, EnvKey=${envKeyExists}, Available=${isAvailable}`);

    res.json({ available: isAvailable });  } catch (error) {
    console.error(`Error checking OpenAI key status for user ${userId}:`, error);
    // Return false availability on error to be safe
    res.status(500).json({ available: false, error: 'Failed to check OpenAI key status' });
  }
});

module.exports = router;