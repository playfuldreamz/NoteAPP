const express = require('express');
const router = express.Router();
const { deleteResource, bulkDeleteResources } = require('../services/deleteService');

// Delete a single transcript
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    await deleteResource('transcript', parseInt(id), userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting transcript:', error);
    res.status(error.message === 'Resource not found or unauthorized' ? 404 : 500)
      .json({ error: error.message || 'Failed to delete transcript' });
  }
});

// Bulk delete transcripts
router.post('/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(ids)) {
      return res.status(400).json({ error: 'Invalid request: ids must be an array' });
    }

    await bulkDeleteResources('transcript', ids, userId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error bulk deleting transcripts:', error);
    res.status(error.message === 'One or more resources not found or unauthorized' ? 404 : 500)
      .json({ error: error.message || 'Failed to delete transcripts' });
  }
});

module.exports = router;
