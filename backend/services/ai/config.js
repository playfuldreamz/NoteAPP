const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

class AIConfigManager {
  /**
   * Get AI configuration for a specific user
   * @param {number} userId - The user ID
   * @returns {Promise<{provider: string, apiKey: string}>}
   */
  static async getUserConfig(userId) {
    return new Promise((resolve, reject) => {
      if (userId) {
        // First try user settings
        db.get(
          `SELECT provider, api_key FROM user_settings 
           WHERE user_id = ? AND is_active = 1`,
          [userId],
          (err, userRow) => {
            if (err) return reject(err);
            
            if (userRow?.provider && userRow?.api_key) {
              return resolve({
                provider: userRow.provider,
                apiKey: userRow.api_key
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
   * @returns {Promise<{provider: string, apiKey: string}>}
   */
  static async getDefaultConfig() {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT provider, api_key FROM app_settings WHERE is_active = 1',
        (err, appRow) => {
          if (err) return reject(err);
          
          if (appRow?.provider && appRow?.api_key) {
            return resolve({
              provider: appRow.provider,
              apiKey: appRow.api_key
            });
          }
          
          // Final fallback to environment variables
          const provider = process.env.GEMINI_API_KEY ? 'gemini' : 
                         process.env.OPENAI_API_KEY ? 'openai' : null;
          const apiKey = process.env[`${provider?.toUpperCase()}_API_KEY`];
          
          if (provider && apiKey) {
            resolve({ provider, apiKey });
          } else {
            reject(new Error('No AI provider configuration found'));
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
