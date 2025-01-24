const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const AIProviderFactory = require('../services/ai/factory');
const ActionItemsTask = require('../services/ai/tasks/actionItems');

// Database connection
const dbPath = path.join(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

// Extract action items from content
router.post('/extract', async (req, res) => {
  try {
    const { content, sourceId, sourceType } = req.body;
    const userId = req.user.id;

    if (!content || !sourceId || !sourceType) {
      return res.status(400).json({ error: 'Content, sourceId, and sourceType are required' });
    }

    // Get AI provider instance
    const provider = await AIProviderFactory.getProvider(userId);
    const actionItemsTask = new ActionItemsTask(provider);
    
    // Extract action items using AI
    const extractedItems = await actionItemsTask.extractActionItems(content);

    if (!extractedItems?.actionItems || !Array.isArray(extractedItems.actionItems)) {
      throw new Error('Invalid response from AI provider');
    }

    // Store extracted items in database
    const insertPromises = extractedItems.actionItems.map(item => {
      return new Promise((resolve, reject) => {
        const metadata = {
          contextualClues: item.metadata?.contextualClues || [],
          originalText: item.metadata?.originalText || ''
        };

        db.run(
          `INSERT INTO action_items (
            content, source_id, source_type, deadline, priority,
            confidence, metadata, user_id, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            item.content,
            sourceId,
            sourceType,
            item.deadline,
            item.priority,
            item.confidence,
            JSON.stringify(metadata),
            userId,
            'pending'
          ],
          function(err) {
            if (err) reject(err);
            else resolve(this.lastID);
          }
        );
      });
    });

    await Promise.all(insertPromises);
    res.json(extractedItems);
  } catch (error) {
    console.error('Error extracting action items:', error);
    res.status(500).json({ error: error.message || 'Failed to extract action items' });
  }
});

// Get action items for a user
router.get('/', async (req, res) => {
  const userId = req.user.id;
  const { status, priority, sourceType, sourceId } = req.query;

  let query = 'SELECT * FROM action_items WHERE user_id = ?';
  const params = [userId];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  if (priority) {
    query += ' AND priority = ?';
    params.push(priority);
  }

  if (sourceType) {
    query += ' AND source_type = ?';
    params.push(sourceType);
  }

  if (sourceId) {
    query += ' AND source_id = ?';
    params.push(sourceId);
  }

  query += ' ORDER BY CASE priority WHEN "high" THEN 1 WHEN "medium" THEN 2 WHEN "low" THEN 3 END, deadline ASC';

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Error fetching action items:', err);
      return res.status(500).json({ error: 'Failed to fetch action items' });
    }

    // Parse metadata JSON for each row
    const items = rows.map(row => ({
      ...row,
      metadata: row.metadata ? JSON.parse(row.metadata) : {}
    }));

    res.json(items);
  });
});

// Update action item status
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { status, priority, deadline } = req.body;
  const userId = req.user.id;

  const updates = [];
  const params = [];

  if (status) {
    updates.push('status = ?');
    params.push(status);
  }

  if (priority) {
    updates.push('priority = ?');
    params.push(priority);
  }

  if (deadline) {
    updates.push('deadline = ?');
    params.push(deadline);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No updates provided' });
  }

  updates.push('updated_at = CURRENT_TIMESTAMP');
  params.push(id, userId);

  const query = `
    UPDATE action_items 
    SET ${updates.join(', ')} 
    WHERE id = ? AND user_id = ?
  `;

  db.run(query, params, function(err) {
    if (err) {
      console.error('Error updating action item:', err);
      return res.status(500).json({ error: 'Failed to update action item' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Action item not found' });
    }
    res.json({ success: true });
  });
});

// Delete action item
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  db.run(
    'DELETE FROM action_items WHERE id = ? AND user_id = ?',
    [id, userId],
    function(err) {
      if (err) {
        console.error('Error deleting action item:', err);
        return res.status(500).json({ error: 'Failed to delete action item' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Action item not found' });
      }
      res.json({ success: true });
    }
  );
});

module.exports = router;
