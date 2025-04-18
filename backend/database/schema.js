/**
 * Schema creation for Supabase/SQLite
 * 
 * This module handles database schema initialization for both Supabase and SQLite.
 * It checks if required tables exist and ensures default settings are created.
 */

const supabase = require('./supabase');
const db = require('./connection');

// SQLite schema creation function (original implementation)
const createSQLiteTables = () => {
  db.serialize(() => {
    // Create users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create notes table with user_id foreign key and title
    db.run(`CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT,
      title TEXT,
      transcript TEXT,
      summary TEXT DEFAULT NULL,
      user_id INTEGER,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    // Create tags table
    db.run(`CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create item_tags join table with proper constraints
    db.run(`CREATE TABLE IF NOT EXISTS item_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_id INTEGER NOT NULL,
      item_type TEXT NOT NULL CHECK(item_type IN ('note', 'transcript')),
      tag_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(item_id, item_type, tag_id),
      FOREIGN KEY(item_id) REFERENCES notes(id) ON DELETE CASCADE,
      FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE
    )`);

    // Create transcription_settings table
    db.run(`CREATE TABLE IF NOT EXISTS transcription_settings (
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
    )`);

    // Add index for faster lookups
    db.run(`CREATE INDEX IF NOT EXISTS idx_transcription_settings_user_id 
      ON transcription_settings(user_id)`);

    // Create app_settings table for global AI configuration
    db.run(`CREATE TABLE IF NOT EXISTS app_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider TEXT NOT NULL,
      api_key TEXT NOT NULL,
      is_active BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create user_settings table for user-specific API keys
    db.run(`CREATE TABLE IF NOT EXISTS user_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      provider TEXT NOT NULL,
      api_key TEXT NOT NULL,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    // Create transcripts table with user_id foreign key and title
    db.run(`CREATE TABLE IF NOT EXISTS transcripts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT,
      title TEXT,
      summary TEXT DEFAULT NULL,
      user_id INTEGER,
      date DATETIME DEFAULT CURRENT_TIMESTAMP,
      duration INTEGER,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    // Create user_tags table for user-specific tag relationships
    db.run(`CREATE TABLE IF NOT EXISTS user_tags (
      user_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, tag_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    )`);

    // Create action_items table
    db.run(`CREATE TABLE IF NOT EXISTS action_items (
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
    )`);

    // Create links table for bi-directional linking between notes and transcripts
    db.run(`CREATE TABLE IF NOT EXISTS links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id INTEGER NOT NULL,
      source_type TEXT NOT NULL CHECK(source_type IN ('note', 'transcript')),
      target_id INTEGER NOT NULL,
      target_type TEXT NOT NULL CHECK(target_type IN ('note', 'transcript')),
      link_text TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(source_id, source_type, target_id, target_type)
    )`);

    // Add indexes for efficient lookups in links table
    db.run(`CREATE INDEX IF NOT EXISTS idx_links_source ON links(source_id, source_type)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_links_target ON links(target_id, target_type)`);

    // Insert default app settings if none exist
    db.get('SELECT COUNT(*) as count FROM app_settings', (err, row) => {
      if (err) {
        console.error('Error checking app_settings:', err);
        return;
      }

      if (row.count === 0) {
        // Get API keys from environment
        const geminiKey = process.env.GEMINI_API_KEY;
        const openaiKey = process.env.OPENAI_API_KEY;
        
        // Only insert default settings if we have a valid API key
        if (geminiKey || openaiKey) {
          const defaultProvider = geminiKey ? 'gemini' : 'openai';
          const defaultApiKey = defaultProvider === 'gemini' ? geminiKey : openaiKey;
          
          db.run(
            'INSERT INTO app_settings (provider, api_key, is_active) VALUES (?, ?, 1)',
            [defaultProvider, defaultApiKey],
            (err) => {
              if (err) {
                console.error('Error inserting default app settings:', err);
              } else {
                console.log('Default app settings created successfully with', defaultProvider);
              }
            }
          );
        } else {
          console.log('No API keys found in environment variables. Default settings not created.');
        }
      }
    });
  });
};

// Supabase schema initialization function
const createSupabaseTables = async () => {
  try {
    console.log('Checking Supabase database schema...');
    
    // Check if app_settings table has default values
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .maybeSingle();
      
    if (error) {
      console.error('Error checking app_settings:', error);
      return;
    }
    
    if (!data) {
      // Get API keys from environment
      const geminiKey = process.env.GEMINI_API_KEY;
      const openaiKey = process.env.OPENAI_API_KEY;
      
      // Only insert default settings if we have a valid API key
      if (geminiKey || openaiKey) {
        const defaultProvider = geminiKey ? 'gemini' : 'openai';
        const defaultApiKey = defaultProvider === 'gemini' ? geminiKey : openaiKey;
        
        const { error: insertError } = await supabase
          .from('app_settings')
          .insert([{
            provider: defaultProvider,
            api_key: defaultApiKey,
            is_active: true
          }]);
          
        if (insertError) {
          console.error('Error inserting default app settings:', insertError);
        } else {
          console.log('Default app settings created successfully with', defaultProvider);
        }
      } else {
        console.log('No API keys found in environment variables. Default settings not created.');
      }
    }
    
    console.log('Supabase database schema check completed');
  } catch (error) {
    console.error('Error in Supabase schema initialization:', error);
  }
};

/**
 * Initialize the database schema
 * Checks if tables exist and creates default settings
 */
const createTables = async () => {
  try {
    console.log('Initializing database schema...');
    
    // Check if Supabase is configured
    const isSupabaseConfigured = process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY;
    
    if (isSupabaseConfigured) {
      // Try to initialize Supabase schema
      try {
        await createSupabaseTables();
      } catch (supabaseError) {
        console.error('Error initializing Supabase schema:', supabaseError);
        console.warn('Falling back to SQLite schema...');
        createSQLiteTables();
      }
    } else {
      // Use SQLite schema
      console.log('Using SQLite schema...');
      createSQLiteTables();
    }
    
    console.log('Database schema initialization completed');
  } catch (error) {
    console.error('Error in database schema initialization:', error);
    // Fallback to SQLite in case of any errors
    try {
      console.warn('Attempting SQLite schema as fallback...');
      createSQLiteTables();
    } catch (sqliteError) {
      console.error('SQLite fallback also failed:', sqliteError);
    }
  }
};

module.exports = createTables;
