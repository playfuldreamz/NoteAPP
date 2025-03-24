const db = require('../database/connection');
const { isTagReferencedAsync } = require('../utils/dbUtils');

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

// Promisify db.all
const all = (query, params) => new Promise((resolve, reject) => {
  db.all(query, params, (err, rows) => {
    if (err) reject(err);
    else resolve(rows);
  });
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
