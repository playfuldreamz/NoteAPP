/**
 * Link Service
 * 
 * This service provides functions to handle bi-directional linking between notes and transcripts.
 * It includes functionality to:
 * - Extract links from text content
 * - Resolve link targets by title
 * - Manage links in the database
 * - Retrieve backlinks
 */

const db = require('../database/connection');

class LinkService {
  /**
   * Extract all link patterns ([[Target Title]]) from content
   * 
   * @param {string} content - The content to extract links from
   * @returns {string[]} - Array of extracted link targets (titles without brackets)
   */
  extractLinksFromContent(content) {
    if (!content) return [];
    
    // Match [[Target Title]] pattern
    const linkPattern = /\[\[([^\[\]]+)\]\]/g;
    const matches = [...content.matchAll(linkPattern)];
    
    // Extract and return all link titles
    return matches.map(match => match[1].trim());
  }

  /**
   * Find the item (note or transcript) that matches a title
   * Filter by user_id for security
   * If multiple matches, return the most recently updated one
   * 
   * @param {string} title - Title to search for
   * @param {number} userId - User ID to filter by
   * @returns {Promise<{id: number, type: string}|null>} - Resolved target or null if not found
   */
  async resolveItemByTitle(title, userId) {
    return new Promise((resolve, reject) => {
      // First check notes table
      const noteQuery = `
        SELECT id, 'note' as type, timestamp as date
        FROM notes 
        WHERE user_id = ? AND title = ?
        ORDER BY timestamp DESC
        LIMIT 1
      `;
      
      db.get(noteQuery, [userId, title], (err, noteResult) => {
        if (err) {
          return reject(err);
        }
        
        // If found in notes, return it
        if (noteResult) {
          return resolve(noteResult);
        }
        
        // If not found in notes, check transcripts table
        const transcriptQuery = `
          SELECT id, 'transcript' as type, date
          FROM transcripts 
          WHERE user_id = ? AND title = ?
          ORDER BY date DESC
          LIMIT 1
        `;
        
        db.get(transcriptQuery, [userId, title], (err, transcriptResult) => {
          if (err) {
            return reject(err);
          }
          
          // Return transcript result (might be null if not found)
          resolve(transcriptResult);
        });
      });
    });
  }

  /**
   * Process all links in content and save to database
   * 
   * @param {number} sourceId - ID of the source item
   * @param {string} sourceType - Type of source ('note' or 'transcript')
   * @param {string} content - Content to extract links from
   * @param {number} userId - User ID for security filtering
   * @returns {Promise<void>}
   */
  async processLinks(sourceId, sourceType, content, userId) {
    if (!content || !sourceId || !userId || !['note', 'transcript'].includes(sourceType)) {
      return Promise.reject(new Error('Invalid parameters for processing links'));
    }

    try {
      // Extract all link targets
      const linkTargets = this.extractLinksFromContent(content);
      
      // Begin transaction
      return new Promise((resolve, reject) => {
        db.serialize(() => {
          db.run('BEGIN TRANSACTION');
          
          // Delete existing links from this source
          db.run(
            'DELETE FROM links WHERE source_id = ? AND source_type = ?',
            [sourceId, sourceType],
            (err) => {
              if (err) {
                console.error('Error deleting existing links:', err);
                db.run('ROLLBACK');
                return reject(err);
              }
              
              // If no links found, commit and return
              if (linkTargets.length === 0) {
                db.run('COMMIT');
                return resolve();
              }
              
              // Process each link target
              const processPromises = linkTargets.map(targetTitle => 
                this.resolveItemByTitle(targetTitle, userId)
                  .then(target => {
                    if (!target) return null; // Skip if target not found
                    
                    // Insert new link
                    return new Promise((resolveInsert, rejectInsert) => {
                      db.run(
                        `INSERT OR IGNORE INTO links 
                         (source_id, source_type, target_id, target_type, link_text) 
                         VALUES (?, ?, ?, ?, ?)`,
                        [sourceId, sourceType, target.id, target.type, targetTitle],
                        function(err) {
                          if (err) {
                            console.error('Error inserting link:', err);
                            return rejectInsert(err);
                          }
                          resolveInsert();
                        }
                      );
                    });
                  })
              );
              
              // Wait for all link processing to complete
              Promise.all(processPromises)
                .then(() => {
                  db.run('COMMIT', (err) => {
                    if (err) {
                      console.error('Error committing transaction:', err);
                      return reject(err);
                    }
                    resolve();
                  });
                })
                .catch(err => {
                  console.error('Error processing links:', err);
                  db.run('ROLLBACK');
                  reject(err);
                });
            }
          );
        });
      });
    } catch (error) {
      console.error('Error in processLinks:', error);
      return Promise.reject(error);
    }
  }

  /**
   * Get all backlinks to a specific item
   * 
   * @param {number} targetId - ID of the target item
   * @param {string} targetType - Type of the target ('note' or 'transcript')
   * @param {number} userId - User ID for security filtering
   * @returns {Promise<Array>} - Array of backlink objects with source information
   */
  async getBacklinks(targetId, targetType, userId) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
          l.source_id as sourceId,
          l.source_type as sourceType,
          l.link_text as linkText,
          CASE 
            WHEN l.source_type = 'note' THEN n.title
            WHEN l.source_type = 'transcript' THEN t.title
            ELSE NULL
          END as sourceTitle,
          CASE 
            WHEN l.source_type = 'note' THEN n.timestamp
            WHEN l.source_type = 'transcript' THEN t.date
            ELSE NULL
          END as sourceDate
        FROM links l
        LEFT JOIN notes n ON l.source_type = 'note' AND l.source_id = n.id
        LEFT JOIN transcripts t ON l.source_type = 'transcript' AND l.source_id = t.id
        WHERE 
          l.target_id = ? 
          AND l.target_type = ?
          AND (
            (l.source_type = 'note' AND n.user_id = ?) 
            OR 
            (l.source_type = 'transcript' AND t.user_id = ?)
          )
        ORDER BY sourceDate DESC
      `;
      
      db.all(query, [targetId, targetType, userId, userId], (err, rows) => {
        if (err) {
          console.error('Error fetching backlinks:', err);
          return reject(err);
        }
        resolve(rows);
      });
    });
  }
}

module.exports = new LinkService();
