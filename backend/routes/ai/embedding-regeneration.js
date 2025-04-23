/**
 * Embedding Regeneration Routes
 * 
 * This file contains routes for managing embedding regeneration:
 * - Starting regeneration for all items
 * - Checking the status of ongoing regeneration
 */

const express = require('express');
const router = express.Router();
const authenticateToken = require('../../middleware/auth');
const embeddingRegenerationService = require('../../services/ai/EmbeddingRegenerationService');

// POST /api/ai/embedding-regeneration/all
// Start regenerating embeddings for all items
router.post('/all', function(req, res) {
  try {
    const userId = parseInt(req.user.id);
    embeddingRegenerationService.startRegeneration(userId)
      .then(result => {
        if (result.success) {
          res.status(200).json(result);
        } else {
          res.status(400).json(result);
        }
      })
      .catch(error => {
        console.error('Error starting embedding regeneration:', error);
        res.status(500).json({ 
          success: false, 
          message: `Failed to start embedding regeneration: ${error.message}` 
        });
      });
  } catch (error) {
    console.error('Error starting embedding regeneration:', error);
    res.status(500).json({ 
      success: false, 
      message: `Failed to start embedding regeneration: ${error.message}` 
    });
  }
});

// GET /api/ai/embedding-regeneration/status
// Get the status of ongoing embedding regeneration
router.get('/status', function(req, res) {
  try {
    const status = embeddingRegenerationService.getStatus();
    res.status(200).json(status);
  } catch (error) {
    console.error('Error getting embedding regeneration status:', error);
    res.status(500).json({ 
      message: `Failed to get embedding regeneration status: ${error.message}` 
    });
  }
});

module.exports = router;
