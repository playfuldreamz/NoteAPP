/**
 * Embedding Generation Task
 * Handles generating and storing embeddings for notes and transcripts
 */
const db = require('../../../database/connection');
const embeddingService = require('../EmbeddingService');

class EmbeddingGenerationTask {
  /**
   * Generate and store an embedding for a note or transcript
   * @param {number} itemId - The ID of the note or transcript
   * @param {string} itemType - The type of item ('note' or 'transcript')
   * @param {number} userId - The ID of the user who owns the item
   * @returns {Promise<boolean>} - A promise that resolves to true if successful
   */
  async generateAndStoreEmbedding(itemId, itemType, userId) {
    try {
      // Validate parameters
      if (!itemId || !['note', 'transcript'].includes(itemType) || !userId) {
        console.error('Invalid parameters for embedding generation:', { itemId, itemType, userId });
        return false;
      }

      // Get the content based on item type
      let content;
      if (itemType === 'note') {
        const note = db.prepare('SELECT content FROM notes WHERE id = ?').get(itemId);
        content = note?.content || '';
      } else { // transcript
        const transcript = db.prepare('SELECT text FROM transcripts WHERE id = ?').get(itemId);
        content = transcript?.text || '';
      }

      // If no content, log and exit
      if (!content) {
        console.warn(`No content found for ${itemType} with ID ${itemId}`);
        return false;
      }

      // Generate embedding
      const embedding = await embeddingService.generateEmbedding(content);
      
      // Serialize embedding to Buffer
      const embeddingBuffer = Buffer.from(new Float32Array(embedding).buffer);

      // Store embedding in database
      db.prepare(`
        INSERT OR REPLACE INTO embeddings (item_id, item_type, user_id, content_embedding)
        VALUES (?, ?, ?, ?)
      `).run(itemId, itemType, userId, embeddingBuffer);

      console.log(`Successfully generated and stored embedding for ${itemType} ${itemId}`);
      return true;
    } catch (error) {
      console.error(`Error generating embedding for ${itemType} ${itemId}:`, error);
      return false;
    }
  }

  /**
   * Delete embedding for a note or transcript
   * @param {number} itemId - The ID of the note or transcript
   * @param {string} itemType - The type of item ('note' or 'transcript')
   * @returns {Promise<boolean>} - A promise that resolves to true if successful
   */
  async deleteEmbedding(itemId, itemType) {
    try {
      db.prepare('DELETE FROM embeddings WHERE item_id = ? AND item_type = ?')
        .run(itemId, itemType);
      
      console.log(`Successfully deleted embedding for ${itemType} ${itemId}`);
      return true;
    } catch (error) {
      console.error(`Error deleting embedding for ${itemType} ${itemId}:`, error);
      return false;
    }
  }
}

module.exports = new EmbeddingGenerationTask();
