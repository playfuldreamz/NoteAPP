/**
 * Embedding Regeneration Service
 * 
 * This service handles the regeneration of embeddings for all items in the database.
 * It provides methods to start regeneration and check the status of ongoing regeneration.
 */

const db = require('../../database/connection');
const embeddingService = require('./EmbeddingService');

class EmbeddingRegenerationService {
  constructor() {
    this.regenerationStatus = {
      inProgress: false,
      total: 0,
      completed: 0,
      startTime: null,
      errors: []
    };
  }

  /**
   * Start regenerating embeddings for all items
   * @param {number} userId - The user ID
   * @returns {Promise<Object>} - Status of the regeneration request
   */
  async startRegeneration(userId) {
    // Check if regeneration is already in progress
    if (this.regenerationStatus.inProgress) {
      return {
        success: false,
        message: 'Embedding regeneration is already in progress'
      };
    }

    try {
      // Reset status
      this.regenerationStatus = {
        inProgress: true,
        total: 0,
        completed: 0,
        startTime: new Date().toISOString(),
        errors: [],
        fatalError: null,
        hasAPIKeyError: false
      };

      // Verify the embedding provider can be initialized before starting
      try {
        // This will throw an error if the API key is invalid
        await embeddingService.initializeProviderForUser(userId);
      } catch (error) {
        // If we can't initialize the provider, we can't regenerate embeddings
        this.regenerationStatus.inProgress = false;
        this.regenerationStatus.fatalError = error.message;
        
        // Check if this is an API key error
        if (error.message.includes('API key') || 
            error.message.includes('authentication') || 
            error.message.includes('401')) {
          this.regenerationStatus.hasAPIKeyError = true;
        }
        
        return {
          success: false,
          message: `Cannot regenerate embeddings: ${error.message}`,
          hasAPIKeyError: this.regenerationStatus.hasAPIKeyError
        };
      }

      // Start regeneration in the background
      this.regenerateAllEmbeddings(userId);

      return {
        success: true,
        message: 'Embedding regeneration started successfully'
      };
    } catch (error) {
      this.regenerationStatus.inProgress = false;
      this.regenerationStatus.fatalError = error.message;
      console.error('Error starting embedding regeneration:', error);
      return {
        success: false,
        message: `Failed to start embedding regeneration: ${error.message}`
      };
    }
  }

  /**
   * Get the current status of embedding regeneration
   * @returns {Object} - Status information
   */
  getStatus() {
    return {
      inProgress: this.regenerationStatus.inProgress,
      total: this.regenerationStatus.total,
      completed: this.regenerationStatus.completed,
      startTime: this.regenerationStatus.startTime,
      errors: this.regenerationStatus.errors.slice(0, 10), // Limit to first 10 errors
      fatalError: this.regenerationStatus.fatalError,
      hasAPIKeyError: this.regenerationStatus.hasAPIKeyError || false,
      errorCount: this.regenerationStatus.errors.length
    };
  }

  /**
   * Regenerate embeddings for all items (notes and transcripts)
   * @param {number} userId - The user ID
   * @private
   */
  async regenerateAllEmbeddings(userId) {
    try {
      // Initialize the embedding provider for this user
      try {
        await embeddingService.initializeProviderForUser(userId);
      } catch (error) {
        // If we can't initialize the provider, we can't regenerate embeddings
        this.regenerationStatus.inProgress = false;
        this.regenerationStatus.fatalError = `Failed to initialize embedding provider: ${error.message}`;
        
        // Check if this is an API key error
        if (error.message.includes('API key') || 
            error.message.includes('authentication') || 
            error.message.includes('401')) {
          this.regenerationStatus.hasAPIKeyError = true;
          console.error('API key error detected during regeneration:', error.message);
          
          // Try to fallback to Xenova if this was an OpenAI error
          try {
            // Update the user's embedding provider to Xenova
            const updateStmt = db.prepare(`
              UPDATE user_settings 
              SET embedding_provider = 'xenova' 
              WHERE user_id = ? AND is_active = 1
            `);
            updateStmt.run(userId);
            console.log('Automatically switched embedding provider to Xenova due to OpenAI API key error');
            
            // Add this information to the error message
            this.regenerationStatus.fatalError += '. Automatically switched to Local Model (Xenova).'; 
          } catch (fallbackError) {
            console.error('Failed to fallback to Xenova:', fallbackError);
          }
        }
        
        return;
      }
      
      // Get all notes and transcripts
      const notes = db.prepare('SELECT id, content FROM notes WHERE user_id = ?').all(userId);
      const transcripts = db.prepare('SELECT id, text FROM transcripts WHERE user_id = ?').all(userId);

      this.regenerationStatus.total = notes.length + transcripts.length;
      console.log(`Starting embedding regeneration for ${this.regenerationStatus.total} items`);

      // Process notes
      for (const note of notes) {
        try {
          // Delete existing embedding
          db.prepare('DELETE FROM embeddings WHERE item_id = ? AND item_type = ? AND user_id = ?')
            .run(note.id, 'note', userId);

          // Generate new embedding
          const embedding = await embeddingService.generateEmbedding(note.content, userId);
          
          // Convert embedding to Buffer
          const embeddingBuffer = Buffer.from(new Float32Array(embedding).buffer);
          
          // Save new embedding
          const sql = `
            INSERT INTO embeddings (item_id, item_type, user_id, content_embedding)
            VALUES (${parseInt(note.id)}, 'note', ${parseInt(userId)}, ?)
          `;
          
          db.prepare(sql).run(embeddingBuffer);
          
          this.regenerationStatus.completed++;
          console.log(`Regenerated embedding for note ${note.id} (${this.regenerationStatus.completed}/${this.regenerationStatus.total})`);
        } catch (error) {
          console.error(`Error regenerating embedding for note ${note.id}:`, error);
          this.regenerationStatus.errors.push({
            itemId: note.id,
            itemType: 'note',
            error: error.message
          });
        }
      }

      // Process transcripts
      for (const transcript of transcripts) {
        try {
          // Delete existing embedding
          db.prepare('DELETE FROM embeddings WHERE item_id = ? AND item_type = ? AND user_id = ?')
            .run(transcript.id, 'transcript', userId);

          // Generate new embedding
          const embedding = await embeddingService.generateEmbedding(transcript.text, userId);
          
          // Convert embedding to Buffer
          const embeddingBuffer = Buffer.from(new Float32Array(embedding).buffer);
          
          // Save new embedding
          const sql = `
            INSERT INTO embeddings (item_id, item_type, user_id, content_embedding)
            VALUES (${parseInt(transcript.id)}, 'transcript', ${parseInt(userId)}, ?)
          `;
          
          db.prepare(sql).run(embeddingBuffer);
          
          this.regenerationStatus.completed++;
          console.log(`Regenerated embedding for transcript ${transcript.id} (${this.regenerationStatus.completed}/${this.regenerationStatus.total})`);
        } catch (error) {
          console.error(`Error regenerating embedding for transcript ${transcript.id}:`, error);
          this.regenerationStatus.errors.push({
            itemId: transcript.id,
            itemType: 'transcript',
            error: error.message
          });
        }
      }

      console.log(`Embedding regeneration completed. Processed ${this.regenerationStatus.completed}/${this.regenerationStatus.total} items.`);
    } catch (error) {
      console.error('Error during embedding regeneration:', error);
    } finally {
      this.regenerationStatus.inProgress = false;
    }
  }
}

// Create a singleton instance
const embeddingRegenerationService = new EmbeddingRegenerationService();

module.exports = embeddingRegenerationService;
