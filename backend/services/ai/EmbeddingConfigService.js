/**
 * Embedding Configuration Service
 * 
 * This service manages user preferences for embedding providers.
 * It allows getting and updating the embedding provider configuration for users.
 */

const db = require('../../database/connection');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

class EmbeddingConfigService {
  /**
   * Get embedding configuration for a specific user
   * @param {number} userId - The user ID
   * @returns {Promise<{provider: string, source: string}>}
   */
  static async getUserEmbeddingConfig(userId) {
    try {
      if (userId) {
        // First try user settings
        const userRow = db.prepare(
          `SELECT embedding_provider FROM user_settings 
           WHERE user_id = ? AND is_active = 1`
        ).get(userId);
        
        if (userRow?.embedding_provider) {
          return {
            provider: userRow.embedding_provider,
            source: 'user'
          };
        }
      }
      
      // Fallback to default config
      return await this.getDefaultEmbeddingConfig();
    } catch (error) {
      console.error('Error getting user embedding config:', error);
      return await this.getDefaultEmbeddingConfig();
    }
  }

  /**
   * Get default embedding configuration
   * @returns {Promise<{provider: string, source: string}>}
   */
  static async getDefaultEmbeddingConfig() {
    try {
      // Default to 'xenova' as the local provider
      return {
        provider: 'xenova',
        source: 'default'
      };
    } catch (error) {
      console.error('Error getting default embedding config:', error);
      // Absolute fallback
      return {
        provider: 'xenova',
        source: 'fallback'
      };
    }
  }

  /**
   * Update embedding configuration for a user
   * @param {number} userId - The user ID
   * @param {Object} config - The configuration object
   * @param {string} config.provider - The embedding provider ('xenova' or 'openai')
   * @returns {Promise<boolean>}
   */
  static async updateUserEmbeddingConfig(userId, config) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const { provider } = config;
      
      if (!provider || !['xenova', 'openai'].includes(provider)) {
        throw new Error('Invalid embedding provider. Must be "xenova" or "openai"');
      }

      // Check if user settings exist
      const existingRow = db.prepare(
        'SELECT id FROM user_settings WHERE user_id = ?'
      ).get(userId);

      if (existingRow) {
        // Update existing settings
        db.prepare(`
          UPDATE user_settings 
          SET embedding_provider = ?, updated_at = CURRENT_TIMESTAMP 
          WHERE user_id = ?
        `).run(provider, userId);
      } else {
        // Insert new settings with default values for other columns
        db.prepare(`
          INSERT INTO user_settings (user_id, provider, api_key, embedding_provider) 
          VALUES (?, 'default', '', ?)
        `).run(userId, provider);
      }

      return true;
    } catch (error) {
      console.error('Error updating user embedding config:', error);
      throw error;
    }
  }
}

module.exports = EmbeddingConfigService;
