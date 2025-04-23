const db = require('../database/connection');
const { isTagReferencedAsync } = require('../utils/dbUtils');

// Use better-sqlite3 API for run
const run = (query, params = []) => {
  try {
    const stmt = db.prepare(query);
    return params.length > 0 ? stmt.run(...params) : stmt.run();
  } catch (error) {
    throw error;
  }
};

// Use better-sqlite3 API for get
const get = (query, params = []) => {
  try {
    const stmt = db.prepare(query);
    return params.length > 0 ? stmt.get(...params) : stmt.get();
  } catch (error) {
    throw error;
  }
};

// Promisify db.all
const all = (query, params = []) => new Promise((resolve, reject) => {
  try {
    const stmt = db.prepare(query);
    const rows = params.length > 0 ? stmt.all(...params) : stmt.all();
    resolve(rows);
  } catch (error) {
    reject(error);
  }
});

let transactionDepth = 0;
let transactionError = null;

// Begin transaction
const beginTransaction = async () => {
  if (transactionDepth === 0) {
    try {
      await run('BEGIN TRANSACTION');
    } catch (err) {
      if (err.code !== 'SQLITE_ERROR') {
        throw err;
      }
    }
  }
  transactionDepth++;
};

// Commit transaction
const commit = async () => {
  if (transactionDepth === 0) return;
  
  transactionDepth--;
  if (transactionDepth === 0 && !transactionError) {
    try {
      await run('COMMIT');
    } catch (err) {
      if (err.code !== 'SQLITE_ERROR') {
        throw err;
      }
    }
  }
};

// Rollback transaction
const rollback = async () => {
  if (transactionDepth === 0) return;
  
  transactionDepth--;
  if (transactionDepth === 0) {
    try {
      await run('ROLLBACK');
    } catch (err) {
      if (err.code !== 'SQLITE_ERROR') {
        throw err;
      }
    }
  }
};

// Transaction wrapper
const withTransaction = async (fn) => {
  try {
    await beginTransaction();
    const result = await fn();
    await commit();
    return result;
  } catch (err) {
    transactionError = err;
    await rollback();
    throw err;
  } finally {
    if (transactionDepth === 0) {
      transactionError = null;
    }
  }
};

/**
 * Delete a resource and all its associated data
 * @param {string} resourceType - Type of resource ('note' or 'transcript')
 * @param {number} resourceId - ID of the resource
 * @param {number} userId - ID of the user
 * @returns {Promise<boolean>} - True if successful
 */
const deleteResource = async (resourceType, resourceId, userId, options = {}) => {
  const { manageTransaction = true } = options;
  
  try {
    if (manageTransaction) {
      await beginTransaction();
    }

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

    // Delete links where this resource is the source
    await run(
      'DELETE FROM links WHERE source_id = ? AND source_type = ?',
      [resourceId, resourceType]
    );

    // Delete links where this resource is the target
    await run(
      'DELETE FROM links WHERE target_id = ? AND target_type = ?',
      [resourceId, resourceType]
    );

    // Get all tag IDs associated with this resource
    const tagRows = await all(
      'SELECT tag_id FROM item_tags WHERE item_id = ? AND item_type = ?',
      [resourceId, resourceType]
    );
    
    // Delete item_tags records
    await run(
      'DELETE FROM item_tags WHERE item_id = ? AND item_type = ?',
      [resourceId, resourceType]
    );

    // Check and delete orphaned tags
    if (tagRows.length > 0) {
      for (const tag of tagRows) {
        const isReferenced = await isTagReferencedAsync(db, tag.tag_id);
        if (!isReferenced) {
          await run(
            'DELETE FROM tags WHERE id = ?',
            [tag.tag_id]
          );
        }
      }
    }

    // Delete the embedding for this resource
    await run(
      'DELETE FROM embeddings WHERE item_id = ? AND item_type = ? AND user_id = ?',
      [resourceId, resourceType, userId]
    );

    // Delete the main resource
    await run(
      `DELETE FROM ${resourceType}s WHERE id = ? AND user_id = ?`,
      [resourceId, userId]
    );

    if (manageTransaction) {
      await commit();
    }
    return true;
  } catch (error) {
    if (manageTransaction) {
      try {
        await rollback();
      } catch (rollbackError) {
        console.error('Rollback failed:', rollbackError);
      }
    }
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
const bulkDeleteResources = async (resourceType, resourceIds, userId, options = {}) => {
  if (!resourceIds.length) return true;

  const { manageTransaction = true } = options;
  
  try {
    if (manageTransaction) {
      await beginTransaction();
    }

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

    // Delete links where these resources are the source
    await run(
      `DELETE FROM links WHERE source_id IN (${placeholders}) AND source_type = ?`,
      [...resourceIds, resourceType]
    );

    // Delete links where these resources are the target
    await run(
      `DELETE FROM links WHERE target_id IN (${placeholders}) AND target_type = ?`,
      [...resourceIds, resourceType]
    );

    // Get all tags associated with these resources
    const tagRows = await all(
      `SELECT DISTINCT tag_id FROM item_tags WHERE item_id IN (${placeholders}) AND item_type = ?`,
      [...resourceIds, resourceType]
    );
    
    // Delete item_tags records
    await run(
      `DELETE FROM item_tags WHERE item_id IN (${placeholders}) AND item_type = ?`,
      [...resourceIds, resourceType]
    );

    // Check and delete orphaned tags
    if (tagRows && tagRows.length > 0) {
      for (const tag of tagRows) {
        const isReferenced = await isTagReferencedAsync(db, tag.tag_id);
        if (!isReferenced) {
          await run(
            'DELETE FROM tags WHERE id = ?',
            [tag.tag_id]
          );
        }
      }
    }

    // Delete the embeddings for these resources
    await run(
      `DELETE FROM embeddings WHERE item_id IN (${placeholders}) AND item_type = ? AND user_id = ?`,
      [...resourceIds, resourceType, userId]
    );

    // Delete the main resources
    await run(
      `DELETE FROM ${resourceType}s WHERE id IN (${placeholders}) AND user_id = ?`,
      [...resourceIds, userId]
    );

    if (manageTransaction) {
      await commit();
    }
    return true;
  } catch (error) {
    if (manageTransaction) {
      try {
        await rollback();
      } catch (rollbackError) {
        console.error('Rollback failed:', rollbackError);
      }
    }
    throw error;
  }
};

module.exports = {
  deleteResource,
  bulkDeleteResources
};
