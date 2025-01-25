const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database connection
const dbPath = path.join(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

// Promisify db.run
const run = (query, params) => new Promise((resolve, reject) => {
  db.run(query, params, function(err) {
    if (err) reject(err);
    else resolve(this);
  });
});

// Promisify db.get
const get = (query, params) => new Promise((resolve, reject) => {
  db.get(query, params, (err, row) => {
    if (err) reject(err);
    else resolve(row);
  });
});

// Begin transaction
const beginTransaction = () => run('BEGIN TRANSACTION');

// Commit transaction
const commit = () => run('COMMIT');

// Rollback transaction
const rollback = () => run('ROLLBACK');

/**
 * Delete a resource and all its associated data
 * @param {string} resourceType - Type of resource ('note' or 'transcript')
 * @param {number} resourceId - ID of the resource
 * @param {number} userId - ID of the user
 * @returns {Promise<boolean>} - True if successful
 */
const deleteResource = async (resourceType, resourceId, userId) => {
  try {
    await beginTransaction();

    // Verify resource exists and belongs to user
    const resource = await get(
      `SELECT id FROM ${resourceType}s WHERE id = ? AND user_id = ?`,
      [resourceId, userId]
    );

    if (!resource) {
      throw new Error('Resource not found or unauthorized');
    }

    // Delete action items
    await run(
      'DELETE FROM action_items WHERE source_type = ? AND source_id = ? AND user_id = ?',
      [resourceType, resourceId, userId]
    );

    // Delete tags
    await run(
      `DELETE FROM ${resourceType}_tags WHERE ${resourceType}_id = ? AND user_id = ?`,
      [resourceId, userId]
    );

    // Delete the main resource
    await run(
      `DELETE FROM ${resourceType}s WHERE id = ? AND user_id = ?`,
      [resourceId, userId]
    );

    await commit();
    return true;
  } catch (error) {
    await rollback();
    throw error;
  }
};

/**
 * Bulk delete resources and their associated data
 * @param {string} resourceType - Type of resource ('note' or 'transcript')
 * @param {number[]} resourceIds - Array of resource IDs
 * @param {number} userId - ID of the user
 * @returns {Promise<boolean>} - True if successful
 */
const bulkDeleteResources = async (resourceType, resourceIds, userId) => {
  if (!resourceIds.length) return true;

  try {
    await beginTransaction();

    // Verify all resources exist and belong to user
    const placeholders = resourceIds.map(() => '?').join(',');
    const resources = await get(
      `SELECT COUNT(*) as count FROM ${resourceType}s WHERE id IN (${placeholders}) AND user_id = ?`,
      [...resourceIds, userId]
    );

    if (resources.count !== resourceIds.length) {
      throw new Error('One or more resources not found or unauthorized');
    }

    // Delete action items
    await run(
      `DELETE FROM action_items WHERE source_type = ? AND source_id IN (${placeholders}) AND user_id = ?`,
      [resourceType, ...resourceIds, userId]
    );

    // Delete tags
    await run(
      `DELETE FROM ${resourceType}_tags WHERE ${resourceType}_id IN (${placeholders}) AND user_id = ?`,
      [...resourceIds, userId]
    );

    // Delete the main resources
    await run(
      `DELETE FROM ${resourceType}s WHERE id IN (${placeholders}) AND user_id = ?`,
      [...resourceIds, userId]
    );

    await commit();
    return true;
  } catch (error) {
    await rollback();
    throw error;
  }
};

module.exports = {
  deleteResource,
  bulkDeleteResources
};
