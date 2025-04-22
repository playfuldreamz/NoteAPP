/**
 * Database utilities for embedding backfill process
 */

const db = require('../../database/connection');

/**
 * Get total count of items of a specific type
 * @param {string} itemType - 'note' or 'transcript'
 * @returns {number} - Total count of items
 */
function getTotalItemCount(itemType) {
  const countRow = db.prepare(`SELECT COUNT(*) as count FROM ${itemType}s`).get();
  return countRow.count;
}

/**
 * Get a batch of items to process
 * @param {string} itemType - 'note' or 'transcript'
 * @param {number} batchSize - Number of items to fetch
 * @param {number} offset - Offset to start from
 * @returns {Array} - Array of items
 */
function getBatchOfItems(itemType, batchSize, offset) {
  const tableName = `${itemType}s`;
  const contentField = itemType === 'note' ? 'content' : 'text';
  
  // Get items from database
  const items = db.prepare(`
    SELECT id, ${contentField}, user_id 
    FROM ${tableName}
    LIMIT ? OFFSET ?
  `).all(batchSize, offset);
  
  // Ensure IDs are integers
  return items.map(item => ({
    ...item,
    id: parseInt(item.id, 10),
    user_id: parseInt(item.user_id, 10)
  }));
}

/**
 * Store embedding in database
 * @param {number} itemId - ID of the item
 * @param {string} itemType - 'note' or 'transcript'
 * @param {number} userId - ID of the user
 * @param {Float32Array|Array<number>} embedding - The embedding to store
 */
function storeEmbedding(itemId, itemType, userId, embedding) {
  // Convert IDs to integers using Number() to avoid floating point
  const itemIdInt = Number(itemId)|0; // Bitwise OR with 0 forces integer
  const userIdInt = Number(userId)|0; // Bitwise OR with 0 forces integer
  
  // Serialize embedding to Buffer
  const embeddingBuffer = Buffer.from(new Float32Array(embedding).buffer);
  
  // Use a direct SQL string with integer literals to avoid type conversion issues
  const sql = `
    INSERT OR REPLACE INTO embeddings (item_id, item_type, user_id, content_embedding)
    VALUES (${itemIdInt}, '${itemType}', ${userIdInt}, ?)
  `;
  
  // Only pass the buffer as a parameter
  db.prepare(sql).run(embeddingBuffer);
}

/**
 * Check if embeddings table exists
 * @returns {boolean} - True if table exists
 */
function checkEmbeddingsTable() {
  try {
    db.prepare('SELECT 1 FROM embeddings LIMIT 1').get();
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Close database connection
 */
function closeDatabase() {
  db.close();
}

module.exports = {
  getTotalItemCount,
  getBatchOfItems,
  storeEmbedding,
  checkEmbeddingsTable,
  closeDatabase
};
