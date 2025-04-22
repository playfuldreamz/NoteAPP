/**
 * Migration: Add embedding provider configuration
 * 
 * This migration adds an embedding_provider column to the user_settings table
 * to allow users to select their preferred embedding provider.
 */

module.exports = {
  up: function(db) {
    // Add embedding_provider column to user_settings table
    db.prepare(`
      ALTER TABLE user_settings 
      ADD COLUMN embedding_provider TEXT DEFAULT 'xenova'
    `).run();
    
    console.log('Added embedding_provider column to user_settings table');
    
    return Promise.resolve();
  },
  
  down: function(db) {
    // SQLite doesn't support dropping columns directly
    // We would need to recreate the table without the column
    // This is left as a placeholder
    console.log('Warning: Cannot drop column in SQLite. Migration down not implemented.');
    
    return Promise.resolve();
  },
  
  description: 'Add embedding provider configuration to user settings'
};
