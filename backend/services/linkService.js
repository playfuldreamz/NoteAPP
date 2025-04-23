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
    try {
      // First check notes table
      const noteQuery = `
        SELECT id, 'note' as type, timestamp as date
        FROM notes 
        WHERE user_id = ? AND title = ?
        ORDER BY timestamp DESC
        LIMIT 1
      `;
      
      // Use better-sqlite3 API
      const noteStmt = db.prepare(noteQuery);
      const noteResult = noteStmt.get(userId, title);
      
      // If found in notes, return it
      if (noteResult) {
        return noteResult;
      }
      
      // If not found in notes, check transcripts table
      const transcriptQuery = `
        SELECT id, 'transcript' as type, date
        FROM transcripts 
        WHERE user_id = ? AND title = ?
        ORDER BY date DESC
        LIMIT 1
      `;
      
      // Use better-sqlite3 API
      const transcriptStmt = db.prepare(transcriptQuery);
      const transcriptResult = transcriptStmt.get(userId, title);
      
      // Return transcript result (might be null if not found)
      return transcriptResult;
    } catch (error) {
      console.error('Error resolving item by title:', error);
      throw error;
    }
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
    try {
      // Extract links from content
      const linkTargets = this.extractLinksFromContent(content);
      
      // First, resolve all link targets (outside the transaction)
      const resolvedTargets = await Promise.all(
        linkTargets.map(async (targetTitle) => {
          const target = await this.resolveItemByTitle(targetTitle, userId);
          return { targetTitle, target };
        })
      );
      
      // Use better-sqlite3 transaction API
      const processTransaction = db.transaction(() => {
        // Delete existing links from this source
        const deleteStmt = db.prepare('DELETE FROM links WHERE source_id = ? AND source_type = ?');
        deleteStmt.run(sourceId, sourceType);
        
        // If no links found, return early
        if (linkTargets.length === 0) {
          return;
        }
        
        // Prepare the insert statement once (for better performance)
        const insertLinkStmt = db.prepare(`
          INSERT OR IGNORE INTO links 
          (source_id, source_type, target_id, target_type, link_text) 
          VALUES (?, ?, ?, ?, ?)
        `);
        
        // Process each resolved target
        for (const { targetTitle, target } of resolvedTargets) {
          // Skip if target not found
          if (!target) continue;
          
          // Insert the link
          insertLinkStmt.run(sourceId, sourceType, target.id, target.type, targetTitle);
        }
      });
      
      // Execute the transaction
      processTransaction();
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error processing links:', error);
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
    try {
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
      
      // Use better-sqlite3 API
      const stmt = db.prepare(query);
      const rows = stmt.all(targetId, targetType, userId, userId);
      return rows;
    } catch (error) {
      console.error('Error fetching backlinks:', error);
      throw error;
    }
  }
}

module.exports = new LinkService();
