/**
 * Semantic Search Service
 * Provides functionality for searching notes and transcripts using vector embeddings
 */
const db = require('../database/connection');
const embeddingService = require('./ai/EmbeddingService');

class SemanticSearchService {
  /**
   * Search for notes and transcripts that match the query semantically
   * @param {string} query - The search query
   * @param {number} userId - The ID of the user performing the search
   * @param {number} limit - Maximum number of results to return (default: 10)
   * @returns {Promise<Array>} - A promise that resolves to an array of search results
   */
  async search(query, userId, limit = 10) {
    try {
      // Generate embedding for the query
      const queryEmbedding = await embeddingService.generateEmbedding(query);
      
      // Serialize embedding to Buffer
      const queryEmbeddingBuffer = Buffer.from(new Float32Array(queryEmbedding).buffer);
      
      // Search for matching embeddings using sqlite-vec's MATCH operator
      // Force integer conversion for userId
      const userIdInt = parseInt(userId);
      const limitInt = parseInt(limit);
      
      console.log(`Performing semantic search for user ${userIdInt} with limit ${limitInt}`);
      
      const matchingItems = db.prepare(`
        SELECT item_id, item_type, distance
        FROM embeddings
        WHERE content_embedding MATCH ? AND user_id = ?
        ORDER BY distance LIMIT ?
      `).all(queryEmbeddingBuffer, userIdInt, limitInt);
      
      // If no results, return empty array
      if (!matchingItems || matchingItems.length === 0) {
        return [];
      }
      
      // Group items by type for efficient batch retrieval
      const noteIds = matchingItems
        .filter(item => item.item_type === 'note')
        .map(item => item.item_id);
        
      const transcriptIds = matchingItems
        .filter(item => item.item_type === 'transcript')
        .map(item => item.item_id);
      
      // Fetch details for matching notes
      let notes = [];
      if (noteIds.length > 0) {
        const placeholders = noteIds.map(() => '?').join(',');
        console.log(`Searching for notes with IDs: ${noteIds.join(', ')}`);
        // Force integer conversion for all IDs
        const noteIdsInt = noteIds.map(id => parseInt(id));
        const userIdInt = parseInt(userId);
        
        notes = db.prepare(`
          SELECT id, title, content, summary, timestamp
          FROM notes
          WHERE id IN (${placeholders}) AND user_id = ?
        `).all([...noteIdsInt, userIdInt]);
      }
      
      // Fetch details for matching transcripts
      let transcripts = [];
      if (transcriptIds.length > 0) {
        const placeholders = transcriptIds.map(() => '?').join(',');
        console.log(`Searching for transcripts with IDs: ${transcriptIds.join(', ')}`);
        // Force integer conversion for all IDs
        const transcriptIdsInt = transcriptIds.map(id => parseInt(id));
        const userIdInt = parseInt(userId);
        
        transcripts = db.prepare(`
          SELECT id, title, text, summary, date
          FROM transcripts
          WHERE id IN (${placeholders}) AND user_id = ?
        `).all([...transcriptIdsInt, userIdInt]);
      }
      
      // Combine results and add distance/relevance score
      const results = matchingItems.map(match => {
        if (match.item_type === 'note') {
          const note = notes.find(n => n.id === match.item_id);
          if (!note) return null;
          
          return {
            id: note.id,
            type: 'note',
            title: note.title,
            content: note.content,
            summary: note.summary,
            timestamp: note.timestamp,
            relevance: 1 - match.distance // Convert distance to relevance score (0-1)
          };
        } else { // transcript
          const transcript = transcripts.find(t => t.id === match.item_id);
          if (!transcript) return null;
          
          return {
            id: transcript.id,
            type: 'transcript',
            title: transcript.title,
            content: transcript.text,
            summary: transcript.summary,
            timestamp: transcript.date,
            relevance: 1 - match.distance // Convert distance to relevance score (0-1)
          };
        }
      }).filter(Boolean); // Remove null entries
      
      return results;
    } catch (error) {
      console.error('Error performing semantic search:', error);
      throw error;
    }
  }
}

module.exports = new SemanticSearchService();
