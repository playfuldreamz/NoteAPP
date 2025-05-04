/**
 * Search Routes
 * Handles API endpoints for searching notes and transcripts
 */
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const semanticSearchService = require('../services/SemanticSearchService');

/**
 * @route POST /api/search
 * @desc Search notes and transcripts semantically
 * @access Private
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { query, limit = 10 } = req.body;
    const userId = req.user.id;
    
    // Validate query
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ 
        success: false, 
        message: 'Search query is required and must be a string' 
      });
    }
    
    // Validate limit
    const searchLimit = parseInt(limit);
    if (isNaN(searchLimit) || searchLimit < 1) {
      return res.status(400).json({ 
        success: false, 
        message: 'Limit must be a positive number' 
      });
    }
    
    // Perform search
    const results = await semanticSearchService.search(query, userId, searchLimit);
    
    // Return results
    res.json({
      success: true,
      count: results.length,
      results
    });
  } catch (error) {
    console.error('Error in search endpoint:', error);
    res.status(500).json({ 
      success: false, 
      message: 'An error occurred while searching' 
    });
  }
});

module.exports = router;
