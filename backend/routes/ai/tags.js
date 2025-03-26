const express = require('express');
const router = express.Router();
const TagModel = require('../../models/tags/tagModel');
const validateItemType = require('../../middleware/validateItemType');

// Create new tag
router.post('/', async (req, res) => {
  const { name } = req.body;
  const userId = req.user.id;
  
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({ error: 'Tag name is required and must be a non-empty string' });
  }

  if (!userId) {
    return res.status(401).json({ error: 'User authentication required' });
  }

  try {
    const tag = await TagModel.create(name, userId);
    res.status(201).json(tag);
  } catch (error) {
    console.error('Error in tag creation:', error);
    if (error.message === 'User already has this tag') {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to create tag' });
  }
});

// Get all tags
router.get('/', async (req, res) => {
  try {
    const tags = await TagModel.getAllTags();
    res.json(tags);
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

// Get user's tags
router.get('/user', async (req, res) => {
  try {
    const tags = await TagModel.getUserTags(req.user.id);
    res.json(tags);
  } catch (error) {
    console.error('Error fetching user tags:', error);
    res.status(500).json({ error: 'Failed to fetch user tags' });
  }
});

// Get tags for specific item
router.get('/:type/:id', validateItemType, async (req, res) => {
  const { type, id } = req.params;
  
  try {
    const tags = await TagModel.getItemTags(type, id);
    res.json(tags);
  } catch (error) {
    console.error('Error fetching item tags:', error);
    res.status(500).json({ error: 'Failed to fetch item tags' });
  }
});

// Add tag to item
router.post('/:type/:id', validateItemType, async (req, res) => {
  const { type, id } = req.params;
  const { tag_id } = req.body;
  
  if (!tag_id) {
    return res.status(400).json({ error: 'Tag ID is required' });
  }

  try {
    await TagModel.addTagToItem(type, id, tag_id);
    res.status(200).json({ message: 'Tag added successfully' });
  } catch (error) {
    console.error('Error adding tag to item:', error);
    res.status(500).json({ error: 'Failed to add tag to item' });
  }
});

// Remove tag from item
router.delete('/:type/:id/:tag_id', validateItemType, async (req, res) => {
  const { type, id, tag_id } = req.params;

  try {
    await TagModel.removeTagFromItem(type, id, tag_id);
    res.status(200).json({ message: 'Tag removed successfully' });
  } catch (error) {
    console.error('Error removing tag from item:', error);
    res.status(500).json({ error: 'Failed to remove tag from item' });
  }
});

// Remove user's tag
router.delete('/user/:tag_id', async (req, res) => {
  const { tag_id } = req.params;
  const userId = req.user.id;

  try {
    await TagModel.removeUserTag(userId, tag_id);
    res.status(200).json({ message: 'Tag removed successfully' });
  } catch (error) {
    console.error('Error removing user tag:', error);
    res.status(500).json({ error: 'Failed to remove user tag' });
  }
});

module.exports = router;