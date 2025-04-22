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
      console.log(`=== EMBEDDING GENERATION TASK STARTED ===`);
      console.log(`Generating embedding for ${itemType} ID ${itemId} for user ${userId}`);
      
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
        console.log(`Retrieved content for note ID ${itemId}, content length: ${content.length} characters`);
      } else { // transcript
        const transcript = db.prepare('SELECT text FROM transcripts WHERE id = ?').get(itemId);
        content = transcript?.text || '';
        console.log(`Retrieved content for transcript ID ${itemId}, content length: ${content.length} characters`);
      }

      // If no content, log and exit
      if (!content) {
        console.warn(`No content found for ${itemType} with ID ${itemId}`);
        return false;
      }

      console.log(`Calling embedding service to generate embedding for ${itemType} ID ${itemId} using user ${userId}'s preferred provider...`);
      
      // Generate embedding - this will use the user's preferred provider
      const embedding = await embeddingService.generateEmbedding(content, userId);
      
      // Serialize embedding to Buffer
      const embeddingBuffer = Buffer.from(new Float32Array(embedding).buffer);
      console.log(`Embedding generated successfully, dimensions: ${embedding.length}`);

      // Store embedding in database
      // Force integer conversion for itemId and userId using bitwise OR with 0
      const itemIdInt = itemId | 0; // Force integer conversion
      const userIdInt = userId | 0; // Force integer conversion
      
      console.log(`Converting IDs to integers: itemId ${itemId} → ${itemIdInt}, userId ${userId} → ${userIdInt}`);
      
      db.prepare(`
        INSERT OR REPLACE INTO embeddings (item_id, item_type, user_id, content_embedding)
        VALUES (?, ?, ?, ?)
      `).run(itemIdInt, itemType, userIdInt, embeddingBuffer);
      
      console.log(`Embedding stored in database for ${itemType} ID ${itemId}`);
      console.log(`=== EMBEDDING GENERATION TASK COMPLETED ===`);

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
