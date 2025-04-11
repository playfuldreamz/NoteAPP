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
    const { title } = req.query;
    
    // Validate required parameter
    if (!title) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required parameter: title' 
      });
    }
    
    // Get user ID from auth middleware
    const userId = req.user.id;
    
    // First check notes table
    let note = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id, title, updated_at FROM notes WHERE title = ? AND user_id = ?',
        [title, userId],
        (err, row) => {
          if (err) return reject(err);
          resolve(row);
        }
      );
    });
    
    // Then check transcripts table
    let transcript = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id, title, date as updated_at FROM transcripts WHERE title = ? AND user_id = ?',
        [title, userId],
        (err, row) => {
          if (err) return reject(err);
          resolve(row);
        }
      );
    });
    
    // Determine which to return if both exist (choose the most recently updated)
    let result = null;
    
    if (note && transcript) {
      // Compare update timestamps and pick the most recent
      const noteDate = new Date(note.updated_at);
      const transcriptDate = new Date(transcript.updated_at);
      
      result = noteDate > transcriptDate ? 
        { id: note.id, title: note.title, type: 'note' } : 
        { id: transcript.id, title: transcript.title, type: 'transcript' };
    } else if (note) {
      result = { id: note.id, title: note.title, type: 'note' };
    } else if (transcript) {
      result = { id: transcript.id, title: transcript.title, type: 'transcript' };
    }
    
    res.status(200).json({
      success: true,
      found: result !== null,
      ...result
    });
  } catch (error) {
    console.error('Error finding item by title:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error while searching for item' 
    });
  }
});

module.exports = router;
