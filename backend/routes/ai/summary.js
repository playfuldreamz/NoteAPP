const express = require('express');
const router = express.Router();
const db = require('../../database/connection');
const { authenticateToken } = require('../../middleware/auth');
const validateItemType = require('../../middleware/validateItemType');
const AIProviderFactory = require('../../services/ai/factory');
const ItemSummarizationTask = require('../../services/ai/tasks/itemSummarization');

/**
 * @route POST /api/ai/summary/summarize-item/:type/:id
 * @desc Generate and store a summary for a note or transcript
 * @access Private (requires authentication)
 */
router.post(
  '/summarize-item/:type/:id',
  authenticateToken,
  validateItemType,
  async (req, res) => {
    const userId = req.user.id;
    const { type } = req.params;
    const itemId = parseInt(req.params.id, 10);

    // Validate itemId
    if (isNaN(itemId) || itemId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid ID format',
      });
    }

    // Determine appropriate table and content column based on item type
    const table = type === 'note' ? 'notes' : 'transcripts';
    const contentColumn = type === 'note' ? 'content' : 'text';

    try {
      // Fetch the item content
      const fetchQuery = `
        SELECT ${contentColumn}
        FROM ${table}
        WHERE id = ? AND user_id = ?
      `;
      
      // Use better-sqlite3 API
      const stmt = db.prepare(fetchQuery);
      const item = stmt.get(itemId, userId);
      
      if (!item) {
        return res.status(404).json({
          success: false,
          error: `${type.charAt(0).toUpperCase() + type.slice(1)} not found`,
        });
      }

      const content = item[contentColumn];
      
      // Check if content exists
      if (!content || content.trim() === '') {
        return res.status(400).json({
          success: false,
          error: `${type} content is empty`,
        });
      }

      try {
        // Get AI provider for this user
        const provider = await AIProviderFactory.getProvider(userId);
        
        // Initialize summarization task
        const summarizationTask = new ItemSummarizationTask(provider);
        
        // Generate summary
        const summary = await summarizationTask.generateSummary(content);
        
        // Store the summary in database
        const updateQuery = `
          UPDATE ${table}
          SET summary = ?
          WHERE id = ? AND user_id = ?
        `;
        
        // Use better-sqlite3 API for update
        try {
          const updateStmt = db.prepare(updateQuery);
          const result = updateStmt.run(summary, itemId, userId);
          
          if (result.changes !== 1) {
            return res.status(404).json({
              success: false,
              error: `${type.charAt(0).toUpperCase() + type.slice(1)} not found or not updated`,
            });
          }

          // Return the generated summary
          return res.status(200).json({
            success: true,
            summary,
          });
        } catch (updateErr) {
          console.error(`Error updating ${type} summary:`, updateErr);
          return res.status(500).json({
            success: false,
            error: 'Failed to save summary',
          });
        }
      } catch (error) {
        console.error('AI summary generation error:', error);
        
        // Check if it's an API key error
        if (error.message && (
          error.message.includes('API key') || 
          error.message.includes('authentication') || 
          error.message.includes('auth')
        )) {
          return res.status(401).json({
            success: false,
            error: 'Invalid or missing API key',
            code: 'INVALID_API_KEY',
          });
        }
        
        return res.status(500).json({
          success: false,
          error: `Error generating summary: ${error.message}`,
        });
      }
    } catch (error) {
      console.error(`Error in summarization endpoint:`, error);
      return res.status(500).json({
        success: false,
        error: 'Server error',
      });
    }
  }
);

module.exports = router;