const Database = require('better-sqlite3');
const path = require('path');

// Use absolute path from project root
const dbPath = path.join(__dirname, '../../database.sqlite');
let db;

try {
  db = new Database(dbPath, { verbose: console.log });
  console.log('Connected to database:', dbPath);
} catch (err) {
  console.error('Error connecting to database:', err.message);
}

class AIConfigManager {
  /**
   * Get AI configuration for a specific user
   * @param {number} userId - The user ID
   * @returns {Promise<{provider: string, apiKey: string, source: string}>}
   */
  static async getUserConfig(userId) {
    try {
      if (userId) {
        // First try user settings
        const userRow = db.prepare(
          `SELECT provider, api_key FROM user_settings 
           WHERE user_id = ? AND is_active = 1 AND api_key IS NOT NULL AND api_key != ''`
        ).get(userId);
        
        if (userRow?.provider && userRow?.api_key) {
          return {
            provider: userRow.provider,
            apiKey: userRow.api_key,
            source: 'user'
          };
        }
        
        // Fallback to app settings
        return await this.getDefaultConfig();
      } else {
        // For unauthenticated requests, use default config
        return await this.getDefaultConfig();
      }
    } catch (error) {
      throw new Error(`Error getting user config: ${error.message}`);
    }
  }

  /**
   * Get default AI configuration from app settings or environment
   * @returns {Promise<{provider: string, apiKey: string, source: string}>}
   */
  static async getDefaultConfig() {
    try {
      const appRow = db.prepare(
        `SELECT provider, api_key FROM app_settings 
         WHERE is_active = 1 AND api_key IS NOT NULL AND api_key != ''`
      ).get();
      
      if (appRow?.provider && appRow?.api_key) {
        return {
          provider: appRow.provider,
          apiKey: appRow.api_key,
          source: 'app'
        };
      }
      
      // Final fallback to environment variables
      const geminiKey = process.env.GEMINI_API_KEY;
      const openaiKey = process.env.OPENAI_API_KEY;
      
      if (geminiKey) {
        return { provider: 'gemini', apiKey: geminiKey, source: 'env' };
      } else if (openaiKey) {
        return { provider: 'openai', apiKey: openaiKey, source: 'env' };
      } else {
        throw new Error('No valid AI provider configuration found. Please configure an API key.');
      }
    } catch (error) {
      throw new Error(`Error getting default config: ${error.message}`);
    }
  }

  /**
   * Update AI configuration for a user
   * @param {number} userId - The user ID
   * @param {{provider: string, apiKey: string}} config - The new configuration
   * @returns {Promise<void>}
   */
  static async updateConfig(userId, config) {
    // Check if we're trying to use an empty API key
    if (!config.apiKey || config.apiKey === 'your-api-key') {
      // If the provider is OpenAI and we have an environment variable, we can skip saving the key
      if (config.provider === 'openai' && process.env.OPENAI_API_KEY) {
        // Just update the provider preference without setting an API key
        try {
          // Use a transaction to ensure both operations succeed or fail together
          const transaction = db.transaction(() => {
            // First deactivate any existing config for this user
            db.prepare('UPDATE user_settings SET is_active = 0 WHERE user_id = ?')
              .run(userId);
            
            // Insert new config with empty API key but mark the provider preference
            db.prepare(
              `INSERT INTO user_settings (user_id, provider, api_key, is_active)
               VALUES (?, ?, '', 1)`
            ).run(userId, config.provider);
          });
          
          // Execute the transaction
          transaction();
          return; // Exit early since we've handled this special case
        } catch (error) {
          throw new Error(`Error updating user config: ${error.message}`);
        }
      } else if (config.provider === 'gemini' && process.env.GEMINI_API_KEY) {
        // Same handling for Gemini
        try {
          const transaction = db.transaction(() => {
            db.prepare('UPDATE user_settings SET is_active = 0 WHERE user_id = ?')
              .run(userId);
            
            db.prepare(
              `INSERT INTO user_settings (user_id, provider, api_key, is_active)
               VALUES (?, ?, '', 1)`
            ).run(userId, config.provider);
          });
          
          transaction();
          return;
        } catch (error) {
          throw new Error(`Error updating user config: ${error.message}`);
        }
      } else {
        // For other cases where we don't have an environment variable, throw an error
        throw new Error('Invalid API key provided');
      }
    }

    try {
      // Use a transaction to ensure both operations succeed or fail together
      const transaction = db.transaction(() => {
        // First deactivate any existing config for this user
        db.prepare('UPDATE user_settings SET is_active = 0 WHERE user_id = ?')
          .run(userId);
        
        // Insert new config
        db.prepare(
          `INSERT INTO user_settings (user_id, provider, api_key, is_active)
           VALUES (?, ?, ?, 1)`
        ).run(userId, config.provider, config.apiKey);
      });
      
      // Execute the transaction
      transaction();
    } catch (error) {
      throw new Error(`Error updating user config: ${error.message}`);
    }
  }
}

module.exports = AIConfigManager;
