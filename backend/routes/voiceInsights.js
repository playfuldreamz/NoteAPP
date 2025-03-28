const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getVoiceInsights } = require('../services/voiceInsightsService');

// GET /api/voice-insights
router.get('/', authenticateToken, async (req, res) => {
  try {
    const timeRange = req.query.timeRange || '7d';
    
    // Validate time range
    if (!['24h', '7d', '30d', '90d'].includes(timeRange)) {
      return res.status(400).json({ message: 'Invalid time range. Must be 24h, 7d, 30d, or 90d.' });
    }

    const insights = await getVoiceInsights(req.user.id, timeRange);
    res.json(insights);
  } catch (error) {
    console.error('Error in voice insights route:', error);
    res.status(500).json({ message: 'Error fetching voice insights' });
  }
});

module.exports = router;
