const db = require('./connection');

const createTables = () => {
  // In better-sqlite3, we use transactions for sequential operations
  const transaction = db.transaction(() => {
    // Create users table
    db.prepare(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`).run();

    // Create notes table with user_id foreign key and title
    db.prepare(`CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT,
      title TEXT,
      transcript TEXT,
      summary TEXT DEFAULT NULL,
      user_id INTEGER,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`).run();

    // Create tags table
    db.prepare(`CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`).run();

    // Create item_tags join table with proper constraints
    db.prepare(`CREATE TABLE IF NOT EXISTS item_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL,
      item_type TEXT NOT NULL CHECK(item_type IN ('note', 'transcript')),
      tag_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(item_id, item_type, tag_id),
      FOREIGN KEY(item_id) REFERENCES notes(id) ON DELETE CASCADE,
      FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE
    )`).run();

    // Create transcription_settings table
    db.prepare(`CREATE TABLE IF NOT EXISTS transcription_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      provider_id TEXT NOT NULL,
      api_key TEXT,
      language TEXT NOT NULL DEFAULT 'en',
      settings TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(user_id, provider_id)
    )`).run();

    // Add index for faster lookups
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_transcription_settings_user_id 
      ON transcription_settings(user_id)`).run();

    // Create app_settings table for global AI configuration
    db.prepare(`CREATE TABLE IF NOT EXISTS app_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider TEXT NOT NULL,
      api_key TEXT NOT NULL,
      is_active BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`).run();

    // Create user_settings table for user-specific API keys
    db.prepare(`CREATE TABLE IF NOT EXISTS user_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      provider TEXT NOT NULL,
      api_key TEXT NOT NULL,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`).run();

    // Create transcripts table with user_id foreign key and title
    db.prepare(`CREATE TABLE IF NOT EXISTS transcripts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT,
      title TEXT,
      summary TEXT DEFAULT NULL,
      user_id INTEGER,
      date DATETIME DEFAULT CURRENT_TIMESTAMP,
      duration INTEGER,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`).run();

    // Create user_tags table for user-specific tag relationships
    db.prepare(`CREATE TABLE IF NOT EXISTS user_tags (
      user_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, tag_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    )`).run();

    // Create action_items table
    db.prepare(`CREATE TABLE IF NOT EXISTS action_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      source_id INTEGER NOT NULL,
      source_type TEXT CHECK(source_type IN ('note', 'transcript')) NOT NULL,
      deadline TEXT,
      priority TEXT CHECK(priority IN ('high', 'medium', 'low')) NOT NULL,
      status TEXT CHECK(status IN ('pending', 'completed', 'cancelled')) DEFAULT 'pending',
      confidence REAL NOT NULL,
      metadata TEXT,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`).run();

    // Create links table for bi-directional linking between notes and transcripts
    db.prepare(`CREATE TABLE IF NOT EXISTS links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id INTEGER NOT NULL,
      source_type TEXT NOT NULL CHECK(source_type IN ('note', 'transcript')),
      target_id INTEGER NOT NULL,
      target_type TEXT NOT NULL CHECK(target_type IN ('note', 'transcript')),
      link_text TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(source_id, source_type, target_id, target_type)
    )`).run();

    // Add indexes for efficient lookups in links table
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_links_source ON links(source_id, source_type)`).run();
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_links_target ON links(target_id, target_type)`).run();

    // Insert default app settings if none exist
    const appSettingsCount = db.prepare('SELECT COUNT(*) as count FROM app_settings').get();
    
    if (appSettingsCount.count === 0) {
      // Get API keys from environment
      const geminiKey = process.env.GEMINI_API_KEY;
      const openaiKey = process.env.OPENAI_API_KEY;
        
      // Only insert default settings if we have a valid API key
      if (geminiKey || openaiKey) {
        const defaultProvider = geminiKey ? 'gemini' : 'openai';
        const defaultApiKey = defaultProvider === 'gemini' ? geminiKey : openaiKey;
        
        try {
          db.prepare('INSERT INTO app_settings (provider, api_key, is_active) VALUES (?, ?, 1)')
            .run(defaultProvider, defaultApiKey);
          console.log('Default app settings created successfully with', defaultProvider);
        } catch (error) {
          console.error('Error inserting default app settings:', error);
        }
      } else {
        console.log('No API keys found in environment variables. Default settings not created.');
      }
    }
  });
  
  // Execute the transaction
  transaction();
};

module.exports = createTables;
