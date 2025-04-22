/**
 * Embedding Configuration API Routes
 * 
 * These routes allow getting and updating the embedding provider configuration.
 */

const express = require('express');
const router = express.Router();
const EmbeddingConfigService = require('../../services/ai/EmbeddingConfigService');
const { authenticateToken } = require('../../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * GET /api/ai/embedding-config
 * Get the current embedding configuration for the user
 */
router.get('/', async (req, res) => {
  try {
    const config = await EmbeddingConfigService.getUserEmbeddingConfig(req.user.id);
    res.json(config);
  } catch (error) {
    console.error('Error fetching embedding config:', error);
    res.status(500).json({ error: 'Failed to fetch embedding configuration' });
  }
});

/**
 * PUT /api/ai/embedding-config
 * Update the embedding configuration for the user
 */
router.put('/', async (req, res) => {
  try {
    const { provider } = req.body;
    const userId = req.user.id;

    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    if (!provider || !['xenova', 'openai'].includes(provider)) {
      return res.status(400).json({ 
        error: 'Invalid embedding provider. Must be "xenova" or "openai"' 
      });
    }

    await EmbeddingConfigService.updateUserEmbeddingConfig(userId, { provider });
    res.json({ 
      success: true,
      message: `Embedding provider updated to ${provider}`,
      provider
    });
  } catch (error) {
    console.error('Error updating embedding config:', error);
    res.status(500).json({ error: 'Failed to update embedding configuration' });
  }
});

module.exports = router;
