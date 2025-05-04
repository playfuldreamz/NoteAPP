const express = require('express');
const router = express.Router();
const ChatIntegrationService = require('../services/chatIntegrationService');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication middleware to all routes in this router
router.use(authenticateToken);

/**
 * POST /api/chat
 * Handle chat requests by proxying them to the Python chat service
 */
router.post('/', async (req, res) => {
    try {
        const { message, history } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Format chat history to match the expected structure
        const formattedHistory = history?.map(msg => ({
            role: msg.role || (msg.isUser ? 'user' : 'assistant'),
            content: msg.content
        })) || [];

        // Get JWT token from auth middleware
        const token = req.headers.authorization?.split(' ')[1];
        
        const response = await ChatIntegrationService.startChatTurn(
            message,
            formattedHistory,
            req.user.id,
            token
        );

        res.json(response);
    } catch (error) {
        console.error('Error in chat endpoint:', error);
        res.status(500).json({ 
            error: 'Failed to process chat request',
            details: error.message
        });
    }
});

/**
 * GET /api/chat/health
 * Check the health of the chat service
 */
router.get('/health', async (req, res) => {
    try {
        const isHealthy = await ChatIntegrationService.checkHealth();
        if (isHealthy) {
            res.json({ status: 'healthy' });
        } else {
            res.status(503).json({ status: 'unhealthy' });
        }
    } catch (error) {
        res.status(503).json({ 
            status: 'unhealthy',
            error: error.message
        });
    }
});

module.exports = router;
