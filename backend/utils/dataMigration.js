/**
 * Data Migration Utility
 * 
 * This utility helps migrate data from SQLite to Supabase.
 * It extracts data from the SQLite database and inserts it into Supabase.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const supabase = require('../database/supabase');

// Path to SQLite database
const dbPath = path.join(__dirname, '../database.sqlite');

// Connect to SQLite database
const sqliteDb = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Error connecting to SQLite database:', err.message);
    process.exit(1);
  }
  console.log('Connected to SQLite database for migration');
});

/**
 * Migrate users from SQLite to Supabase
 */
const migrateUsers = async () => {
  try {
    console.log('Migrating users...');
    
    // Get users from SQLite
    const users = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM users', [], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
    
    console.log(`Found ${users.length} users to migrate`);
    
    // Insert users into Supabase
    for (const user of users) {
      const { data, error } = await supabase
        .from('users')
        .insert([{
          id: user.id.toString(), // Convert to string for UUID
          username: user.username,
          password: user.password,
          created_at: user.created_at
        }]);
      
      if (error) {
        console.error(`Error migrating user ${user.id}:`, error);
      } else {
        console.log(`Migrated user ${user.id}`);
      }
    }
    
    console.log('User migration completed');
  } catch (error) {
    console.error('Error migrating users:', error);
  }
};

/**
 * Migrate notes from SQLite to Supabase
 */
const migrateNotes = async () => {
  try {
    console.log('Migrating notes...');
    
    // Get notes from SQLite
    const notes = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM notes', [], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
    
    console.log(`Found ${notes.length} notes to migrate`);
    
    // Insert notes into Supabase
    for (const note of notes) {
      const { data, error } = await supabase
        .from('notes')
        .insert([{
          id: note.id.toString(), // Convert to string for UUID
          content: note.content,
          title: note.title,
          transcript: note.transcript,
          summary: note.summary,
          user_id: note.user_id.toString(), // Convert to string for UUID
          timestamp: note.timestamp
        }]);
      
      if (error) {
        console.error(`Error migrating note ${note.id}:`, error);
      } else {
        console.log(`Migrated note ${note.id}`);
      }
    }
    
    console.log('Note migration completed');
  } catch (error) {
    console.error('Error migrating notes:', error);
  }
};

/**
 * Migrate tags from SQLite to Supabase
 */
const migrateTags = async () => {
  try {
    console.log('Migrating tags...');
    
    // Get tags from SQLite
    const tags = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM tags', [], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
    
    console.log(`Found ${tags.length} tags to migrate`);
    
    // Insert tags into Supabase
    for (const tag of tags) {
      const { data, error } = await supabase
        .from('tags')
        .insert([{
          id: tag.id.toString(), // Convert to string for UUID
          name: tag.name,
          created_at: tag.created_at
        }]);
      
      if (error) {
        console.error(`Error migrating tag ${tag.id}:`, error);
      } else {
        console.log(`Migrated tag ${tag.id}`);
      }
    }
    
    console.log('Tag migration completed');
  } catch (error) {
    console.error('Error migrating tags:', error);
  }
};

/**
 * Migrate item_tags from SQLite to Supabase
 */
const migrateItemTags = async () => {
  try {
    console.log('Migrating item_tags...');
    
    // Get item_tags from SQLite
    const itemTags = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM item_tags', [], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
    
    console.log(`Found ${itemTags.length} item_tags to migrate`);
    
    // Insert item_tags into Supabase
    for (const itemTag of itemTags) {
      const { data, error } = await supabase
        .from('item_tags')
        .insert([{
          id: itemTag.id.toString(), // Convert to string for UUID
          item_id: itemTag.item_id.toString(), // Convert to string for UUID
          item_type: itemTag.item_type,
          tag_id: itemTag.tag_id.toString(), // Convert to string for UUID
          created_at: itemTag.created_at
        }]);
      
      if (error) {
        console.error(`Error migrating item_tag ${itemTag.id}:`, error);
      } else {
        console.log(`Migrated item_tag ${itemTag.id}`);
      }
    }
    
    console.log('Item_tag migration completed');
  } catch (error) {
    console.error('Error migrating item_tags:', error);
  }
};

/**
 * Migrate transcripts from SQLite to Supabase
 */
const migrateTranscripts = async () => {
  try {
    console.log('Migrating transcripts...');
    
    // Get transcripts from SQLite
    const transcripts = await new Promise((resolve, reject) => {
      sqliteDb.all('SELECT * FROM transcripts', [], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
    
    console.log(`Found ${transcripts.length} transcripts to migrate`);
    
    // Insert transcripts into Supabase
    for (const transcript of transcripts) {
      const { data, error } = await supabase
        .from('transcripts')
        .insert([{
          id: transcript.id.toString(), // Convert to string for UUID
          text: transcript.text,
          title: transcript.title,
          summary: transcript.summary,
          user_id: transcript.user_id.toString(), // Convert to string for UUID
          date: transcript.date,
          duration: transcript.duration
        }]);
      
      if (error) {
        console.error(`Error migrating transcript ${transcript.id}:`, error);
      } else {
        console.log(`Migrated transcript ${transcript.id}`);
      }
    }
    
    console.log('Transcript migration completed');
  } catch (error) {
    console.error('Error migrating transcripts:', error);
  }
};

/**
 * Migrate all data from SQLite to Supabase
 */
const migrateAllData = async () => {
  try {
    console.log('Starting data migration from SQLite to Supabase...');
    
    // Migrate in order of dependencies
    await migrateUsers();
    await migrateTags();
    await migrateNotes();
    await migrateTranscripts();
    await migrateItemTags();
    
    // Add more migration functions as needed
    
    console.log('Data migration completed successfully');
  } catch (error) {
    console.error('Error during data migration:', error);
  } finally {
    // Close SQLite connection
    sqliteDb.close((err) => {
      if (err) {
        console.error('Error closing SQLite database:', err.message);
      } else {
        console.log('Closed SQLite database connection');
      }
    });
  }
};

// Export migration functions
module.exports = {
  migrateAllData,
  migrateUsers,
  migrateNotes,
  migrateTags,
  migrateItemTags,
  migrateTranscripts
};
