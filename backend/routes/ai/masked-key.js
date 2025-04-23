/**
 * Masked API Key Route
 * 
 * This route returns a masked version of the API key for a specific provider,
 * ensuring that the full API key is never sent to the frontend.
 */

const express = require('express');
const router = express.Router();
const AIConfigManager = require('../../services/ai/config');

/**
 * Mask an API key for secure display
 * @param {string} key - The API key to mask
 * @param {string} provider - The provider name
 * @returns {string} - The masked key
 */
function maskApiKey(key, provider) {
  if (!key) return '';
  
  // Create a fixed-width mask with consistent dots
  // This ensures the UI displays a consistent mask regardless of key length
  const createMask = (visiblePrefix, visibleSuffix, totalLength) => {
    // Ensure we have at least 6 dots in the middle
    const minDots = 6;
    const actualLength = Math.max(totalLength, visiblePrefix.length + minDots + visibleSuffix.length);
    const dotsCount = actualLength - visiblePrefix.length - visibleSuffix.length;
    return `${visiblePrefix}${'•'.repeat(dotsCount)}${visibleSuffix}`;
  };
  
  // For debugging
  console.log(`Masking key for ${provider}: length=${key.length}`);
  if (key.length > 10) {
    console.log(`First chars: ${key.substring(0, 6)}, Last chars: ${key.substring(key.length - 4)}`);
  }
  
  // Handle different provider key formats
  if (provider === 'openai') {
    // For OpenAI keys, show 'sk-' plus a few more chars and last 4 chars
    const prefix = key.startsWith('sk-') ? `sk-${key.substring(3, 7)}` : key.substring(0, 6);
    return createMask(prefix, key.substring(key.length - 4), key.length);
  } else if (provider === 'gemini') {
    // For Gemini keys, show first 6 and last 4 chars
    const prefix = key.substring(0, 6);
    return createMask(prefix, key.substring(key.length - 4), key.length);
  } else {
    // Default masking for other providers - show first 4 and last 4 chars
    const prefix = key.substring(0, 4);
    return createMask(prefix, key.substring(key.length - 4), key.length);
  }
}

// GET /api/ai/masked-key/:provider
router.get('/:provider', async (req, res) => {
  try {
    const userId = req.user.id;
    const { provider } = req.params;
    
    // Get the config for the requested provider
    const config = await AIConfigManager.getUserConfig(userId);
    
    // If the requested provider doesn't match the config, or there's no key,
    // check if there's a specific key for this provider
    let apiKey = config.provider === provider ? config.apiKey : null;
    let source = config.provider === provider ? config.source : null;
    
    if (!apiKey) {
      // Try to get a specific key for this provider
      const specificConfig = await AIConfigManager.getProviderSpecificConfig(userId, provider);
      if (specificConfig) {
        apiKey = specificConfig.apiKey;
        source = specificConfig.source;
      }
    }
    
    // Return the masked key and source
    res.json({
      provider,
      maskedKey: apiKey ? maskApiKey(apiKey, provider) : '',
      source,
      available: !!apiKey
    });
  } catch (error) {
    console.error('Error getting masked API key:', error);
    res.status(500).json({ error: 'Failed to get masked API key' });
  }
});

module.exports = router;
