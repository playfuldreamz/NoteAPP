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

// Cache for API key validation results
// Format: { key: { valid: boolean, timestamp: number, error?: string } }
const keyValidationCache = new Map();

// Cache expiration time (5 minutes)
const CACHE_EXPIRATION_MS = 5 * 60 * 1000;

/**
 * Verify if an OpenAI API key is valid by making a test API call
 * @param {string} apiKey - The OpenAI API key to verify
 * @returns {Promise<boolean>} - Whether the key is valid
 */
async function verifyOpenAIKey(apiKey) {
  if (!apiKey) return { valid: false, error: 'No API key provided' };
  
  // Check cache first
  const cachedResult = keyValidationCache.get(apiKey);
  if (cachedResult && (Date.now() - cachedResult.timestamp) < CACHE_EXPIRATION_MS) {
    console.log('Using cached OpenAI key validation result');
    return { valid: cachedResult.valid, error: cachedResult.error };
  }
  
  try {
    const openai = new OpenAI({ apiKey });
    
    // Make a minimal API call to verify the key
    await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: "test",
      encoding_format: "float",
    });
    
    // Cache the result
    keyValidationCache.set(apiKey, { valid: true, timestamp: Date.now() });
    
    return { valid: true };
  } catch (error) {
    console.error('Error verifying OpenAI key:', error);
    
    // Cache the error result
    keyValidationCache.set(apiKey, { 
      valid: false, 
      error: error.message, 
      timestamp: Date.now() 
    });
    
    return { valid: false, error: error.message };
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
    let userKeyResult = { valid: false };
    let envKeyResult = { valid: false };
    let errorMessage = null;
    
    if (userKey) {
      userKeyResult = await verifyOpenAIKey(userKey);
      if (!userKeyResult.valid) {
        errorMessage = userKeyResult.error;
      }
    }
    
    if (envKey && !userKeyResult.valid) { // Only check env key if user key is not valid
      envKeyResult = await verifyOpenAIKey(envKey);
      if (!envKeyResult.valid && !errorMessage) {
        errorMessage = envKeyResult.error;
      }
    }
    
    // Return the status
    res.json({ 
      available: userKey !== null || envKey !== null, // Key exists but might not be valid
      source: userKey ? 'user' : (envKey ? 'env' : null),
      valid: userKeyResult.valid || envKeyResult.valid,
      error: errorMessage
    });
  } catch (error) {
    console.error('Error checking OpenAI key status:', error);
    res.status(500).json({ 
      message: 'Failed to check OpenAI key status',
      available: false,
      source: null,
      valid: false,
      error: error.message
    });
  }
});

module.exports = router;
