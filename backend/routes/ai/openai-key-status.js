/**
 * OpenAI Key Status Route
 * 
 * This route checks if an OpenAI API key is available for the current user,
 * either from their user settings or from the environment variables.
 * It also verifies that the key is valid by making a test API call.
 */

const express = require('express');
const router = express.Router();
const db = require('../../database/connection');
const authenticateToken = require('../../middleware/auth');
const dotenv = require('dotenv');
const OpenAI = require('openai');

// Load environment variables
dotenv.config();

/**
 * Verify if an OpenAI API key is valid by making a test API call
 * @param {string} apiKey - The OpenAI API key to verify
 * @returns {Promise<boolean>} - Whether the key is valid
 */
async function verifyOpenAIKey(apiKey) {
  if (!apiKey) return false;
  
  try {
    const openai = new OpenAI({ apiKey });
    
    // Make a minimal API call to verify the key
    await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: "test",
      encoding_format: "float",
    });
    
    return true;
  } catch (error) {
    console.error('Error verifying OpenAI key:', error.message);
    return false;
  }
}

// GET /api/ai/openai-key-status
router.get('/', async function(req, res) {
  try {
    const userId = parseInt(req.user.id);
    
    // Check if the user has an OpenAI API key in their settings
    const userKeyStmt = db.prepare(`
      SELECT api_key FROM user_settings 
      WHERE user_id = ? AND provider = 'openai' AND is_active = 1 AND api_key IS NOT NULL AND api_key != ''
    `);
    const userKeyRow = userKeyStmt.get(userId);
    const userKey = userKeyRow ? userKeyRow.api_key : null;
    
    // Check if there's an OpenAI API key in the environment variables
    const envKey = process.env.OPENAI_API_KEY || null;
    
    // Verify the keys
    let userKeyValid = false;
    let envKeyValid = false;
    
    if (userKey) {
      userKeyValid = await verifyOpenAIKey(userKey);
    }
    
    if (envKey && !userKeyValid) { // Only check env key if user key is not valid
      envKeyValid = await verifyOpenAIKey(envKey);
    }
    
    // Return the status
    res.json({ 
      available: userKeyValid || envKeyValid,
      source: userKeyValid ? 'user' : (envKeyValid ? 'env' : null),
      valid: userKeyValid || envKeyValid
    });
  } catch (error) {
    console.error('Error checking OpenAI key status:', error);
    res.status(500).json({ 
      message: 'Failed to check OpenAI key status',
      available: false,
      source: null,
      valid: false
    });
  }
});

module.exports = router;
