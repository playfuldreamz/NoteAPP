// Database utility functions

/**
 * Checks if a tag is still referenced in the database
 * @param {Object} db - Database connection object
 * @param {number} tagId - ID of the tag to check
 * @param {function} callback - Callback function with signature (err, isReferenced)
 */
function isTagReferenced(db, tagId, callback) {
  db.get(
    'SELECT COUNT(*) as count FROM item_tags WHERE tag_id = ?',
    [tagId],
    (err, row) => {
      if (err) return callback(err);
      callback(null, row.count > 0);
    }
  );
}

/**
 * Async version of isTagReferenced
 * @param {Object} db - Database connection object
 * @param {number} tagId - ID of the tag to check
 * @returns {Promise<boolean>} - True if tag is referenced
 */
async function isTagReferencedAsync(db, tagId) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT COUNT(*) as count FROM item_tags WHERE tag_id = ?',
      [tagId],
      (err, row) => {
        if (err) return reject(err);
        resolve(row.count > 0);
      }
    );
  });
}

module.exports = {
  isTagReferenced,
  isTagReferencedAsync
};