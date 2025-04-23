/**
 * OpenAI Key Status Route
 * 
 * This route checks if an OpenAI API key is available for the current user,
 * either from their user settings or from the environment variables.
 */

const express = require('express');
const router = express.Router();
const db = require('../../database/connection');
const authenticateToken = require('../../middleware/auth');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// GET /api/ai/openai-key-status
router.get('/', function(req, res) {
  try {
    const userId = parseInt(req.user.id);
    
    // Check if the user has an OpenAI API key in their settings
    const userStmt = db.prepare(`
      SELECT 1 FROM user_settings 
      WHERE user_id = ? AND provider = 'openai' AND is_active = 1 AND api_key IS NOT NULL AND api_key != ''
    `);
    const userKeyExists = !!userStmt.get(userId);
    
    // Check if there's an OpenAI API key in the environment variables
    const envKeyExists = !!process.env.OPENAI_API_KEY;
    
    // Return the status
    res.json({ 
      available: userKeyExists || envKeyExists,
      source: userKeyExists ? 'user' : (envKeyExists ? 'env' : null)
    });
  } catch (error) {
    console.error('Error checking OpenAI key status:', error);
    res.status(500).json({ message: 'Failed to check OpenAI key status' });
  }
});

module.exports = router;
