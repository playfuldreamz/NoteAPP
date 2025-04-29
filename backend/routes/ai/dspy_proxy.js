const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');
const dspyIntegrationService = require('../../services/dspyIntegrationService');

// --- Chat Endpoint ---
router.post('/chat', authenticateToken, async (req, res) => {
    const userId = req.user.id; // Get user ID from authenticated token
    const { userInput, chatHistory = [] } = req.body;

    if (!userInput) {
        return res.status(400).json({ success: false, error: 'userInput is required' });
    }
    if (!Array.isArray(chatHistory)) {
         return res.status(400).json({ success: false, error: 'chatHistory must be an array' });
    }

    try {
        console.log(`Proxying chat request for user ${userId} to DSPy service...`);
        const dspyResponse = await dspyIntegrationService.startChatTurn(userInput, chatHistory, userId);
        console.log(`Received DSPy response for user ${userId}, sending to client.`);
        res.json({ success: true, ...dspyResponse });

    } catch (error) {
        console.error(`Error in /chat route for user ${userId}:`, error);
        res.status(500).json({ success: false, error: error.message || 'Failed to process chat request' });
    }
});

// --// --- Health Check Endpoint (Optional Proxy) ---
router.get('/dspy/health', authenticateToken, async (req, res) => {
     try {
          const health = await dspyIntegrationService.checkDSPyHealth();
          res.json(health);
     } catch (error) {
          res.status(503).json({ status: 'unhealthy', error: error.message });
     }
});


module.exports = router;
