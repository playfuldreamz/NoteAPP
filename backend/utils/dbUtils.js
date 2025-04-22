// Database utility functions

/**
 * Checks if a tag is still referenced in the database
 * @param {Object} db - Database connection object
 * @param {number} tagId - ID of the tag to check
 * @returns {boolean} - True if tag is referenced
 */
function isTagReferenced(db, tagId) {
  try {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM item_tags WHERE tag_id = ?');
    const row = stmt.get(tagId);
    return row.count > 0;
  } catch (error) {
    console.error('Error checking if tag is referenced:', error);
    throw error;
  }
}

/**
 * Async version of isTagReferenced
 * @param {Object} db - Database connection object
 * @param {number} tagId - ID of the tag to check
 * @returns {Promise<boolean>} - True if tag is referenced
 */
async function isTagReferencedAsync(db, tagId) {
  try {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM item_tags WHERE tag_id = ?');
    const row = stmt.get(tagId);
    return Promise.resolve(row.count > 0);
  } catch (error) {
    console.error('Error checking if tag is referenced:', error);
    return Promise.reject(error);
  }
}

module.exports = {
  isTagReferenced,
  isTagReferencedAsync
};