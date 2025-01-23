const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Use absolute path from project root
const dbPath = path.join(__dirname, '../../database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  }
  console.log('Connected to database:', dbPath);
});

class AIConfigManager {
  /**
   * Get AI configuration for a specific user
   * @param {number} userId - The user ID
   * @returns {Promise<{provider: string, apiKey: string, source: string}>}
   */
  static async getUserConfig(userId) {
    return new Promise((resolve, reject) => {
      if (userId) {
        // First try user settings
        db.get(
          `SELECT provider, api_key FROM user_settings 
           WHERE user_id = ? AND is_active = 1 AND api_key IS NOT NULL AND api_key != ''`,
          [userId],
          (err, userRow) => {
            if (err) return reject(err);
            
            if (userRow?.provider && userRow?.api_key) {
              return resolve({
                provider: userRow.provider,
                apiKey: userRow.api_key,
                source: 'user'
              });
            }
            
            // Fallback to app settings
            this.getDefaultConfig().then(resolve).catch(reject);
          }
        );
      } else {
        // For unauthenticated requests, use default config
        this.getDefaultConfig().then(resolve).catch(reject);
      }
    });
  }

  /**
   * Get default AI configuration from app settings or environment
   * @returns {Promise<{provider: string, apiKey: string, source: string}>}
   */
  static async getDefaultConfig() {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT provider, api_key FROM app_settings 
         WHERE is_active = 1 AND api_key IS NOT NULL AND api_key != ''`,
        (err, appRow) => {
          if (err) return reject(err);
          
          if (appRow?.provider && appRow?.api_key) {
            return resolve({
              provider: appRow.provider,
              apiKey: appRow.api_key,
              source: 'app'
            });
          }
          
          // Final fallback to environment variables
          const geminiKey = process.env.GEMINI_API_KEY;
          const openaiKey = process.env.OPENAI_API_KEY;
          
          if (geminiKey) {
            resolve({ provider: 'gemini', apiKey: geminiKey, source: 'env' });
          } else if (openaiKey) {
            resolve({ provider: 'openai', apiKey: openaiKey, source: 'env' });
          } else {
            reject(new Error('No valid AI provider configuration found. Please configure an API key.'));
          }
        }
      );
    });
  }

  /**
   * Update AI configuration for a user
   * @param {number} userId - The user ID
   * @param {{provider: string, apiKey: string}} config - The new configuration
   * @returns {Promise<void>}
   */
  static async updateConfig(userId, config) {
    if (!config.apiKey || config.apiKey === 'your-api-key') {
      throw new Error('Invalid API key provided');
    }

    return new Promise((resolve, reject) => {
      // First deactivate any existing config for this user
      db.run(
        'UPDATE user_settings SET is_active = 0 WHERE user_id = ?',
        [userId],
        (err) => {
          if (err) return reject(err);
          
          // Insert new config
          db.run(
            `INSERT INTO user_settings (user_id, provider, api_key, is_active)
             VALUES (?, ?, ?, 1)`,
            [userId, config.provider, config.apiKey],
            (err) => {
              if (err) return reject(err);
              resolve();
            }
          );
        }
      );
    });
  }
}

module.exports = AIConfigManager;
