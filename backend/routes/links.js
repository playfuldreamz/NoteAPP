const express = require('express');
const router = express.Router();
const linkService = require('../services/linkService'); // Use the exported instance directly
const { authenticateToken } = require('../middleware/auth');
const validateItemType = require('../middleware/validateItemType');
const db = require('../database/connection');

/**
 * @route GET /api/links/backlinks
 * @desc Get all backlinks to a specific item
 * @access Private
 */
router.get('/backlinks', authenticateToken, validateItemType, async (req, res) => {
  try {
    const { id, type } = req.query;
    
    // Validate required parameters
    if (!id || !type) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required parameters: id and type are required' 
      });
    }
    
    // Convert id to number
    const itemId = parseInt(id, 10);
    if (isNaN(itemId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid id parameter: must be a number' 
      });
    }
    
    // Get user ID from auth middleware
    const userId = req.user.id;
    
    // Get backlinks from service
    const backlinks = await linkService.getBacklinks(itemId, type, userId);
    
    res.status(200).json({
      success: true,
      data: backlinks
    });
  } catch (error) {
    console.error('Error retrieving backlinks:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while retrieving backlinks' 
    });
  }
});

/**
 * @route GET /api/links/find-by-title
 * @desc Find a note or transcript by its title
 * @access Private
 */
router.get('/find-by-title', authenticateToken, async (req, res) => {
  try {
    let { title } = req.query;
    
    console.log('Original title query:', title);
    
    // Validate required parameter
    if (!title) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required parameter: title' 
      });
    }
    
    // Remove quotes if they exist (handle URL-encoded quotes)
    if (title.startsWith('"') || title.startsWith('%22')) {
      title = title.replace(/^"|^%22|"$|%22$/g, '');
    }
    
    // Decode URI component to handle special characters
    title = decodeURIComponent(title);
    
    console.log('Processed title:', title);
    
    // Get user ID from auth middleware
    const userId = req.user.id;
    
    // Use the linkService to resolve the item by title
    const linkService = require('../services/linkService');
    const result = await linkService.resolveItemByTitle(title, userId);
    
    console.log('Link service result:', result);
    
    // If no result found, try a more flexible search
    if (!result) {
      // Try case-insensitive search in notes
      const noteStmt = db.prepare("SELECT id, title FROM notes WHERE LOWER(title) LIKE LOWER(?) AND user_id = ? LIMIT 1");
      const note = noteStmt.get(`%${title}%`, userId);
      
      // Try case-insensitive search in transcripts
      const transcriptStmt = db.prepare("SELECT id, title FROM transcripts WHERE LOWER(title) LIKE LOWER(?) AND user_id = ? LIMIT 1");
      const transcript = transcriptStmt.get(`%${title}%`, userId);
      
      if (note) {
        res.status(200).json({
          success: true,
          found: true,
          id: note.id,
          title: note.title,
          type: 'note'
        });
        return;
      } else if (transcript) {
        res.status(200).json({
          success: true,
          found: true,
          id: transcript.id,
          title: transcript.title,
          type: 'transcript'
        });
        return;
      }
      
      // No matches found
      res.status(200).json({
        success: true,
        found: false
      });
      return;
    }
    
    // Result found by linkService
    res.status(200).json({
      success: true,
      found: true,
      id: result.id,
      title: title,
      type: result.type
    });
  } catch (error) {
    console.error('Error finding item by title:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while searching for item',
      error: error.message
    });
  }
});

module.exports = router;
