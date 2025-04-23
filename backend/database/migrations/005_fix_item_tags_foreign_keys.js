/**
 * Migration: Fix item_tags foreign key constraints
 * Date: April 22, 2025
 * 
 * This migration fixes the foreign key constraint issue in the item_tags table
 * that currently only references the notes table, preventing tags from being
 * added to transcripts. The solution removes the problematic foreign key and
 * implements triggers to maintain referential integrity.
 */

const db = require('../connection');

/**
 * Apply the migration - fix item_tags foreign key constraints
 */
function up() {
  try {
    // Start a transaction to ensure data integrity
    const migration = db.transaction(() => {
      console.log('Starting item_tags table migration...');
      
      // 1. Backup existing item_tags data
      console.log('Backing up existing item_tags data...');
      const existingTags = db.prepare('SELECT * FROM item_tags').all();
      console.log(`Found ${existingTags.length} existing tag relationships to preserve`);
      
      // 2. Drop the existing item_tags table
      console.log('Dropping existing item_tags table...');
      db.prepare('DROP TABLE IF EXISTS item_tags').run();
      
      // 3. Create a new item_tags table without the problematic foreign key
      console.log('Creating new item_tags table with proper constraints...');
      db.prepare(`CREATE TABLE IF NOT EXISTS item_tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id INTEGER NOT NULL,
        item_type TEXT NOT NULL CHECK(item_type IN ('note', 'transcript')),
        tag_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(item_id, item_type, tag_id),
        FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE
      )`).run();
      
      // 4. Create triggers to enforce referential integrity
      console.log('Creating triggers for referential integrity...');
      
      // Trigger to validate notes before insert
      db.prepare(`
        CREATE TRIGGER IF NOT EXISTS validate_note_item_tags_insert
        BEFORE INSERT ON item_tags
        WHEN NEW.item_type = 'note'
        BEGIN
          SELECT CASE
            WHEN NOT EXISTS(SELECT 1 FROM notes WHERE id = NEW.item_id)
            THEN RAISE(ABORT, 'Foreign key constraint failed: Note (ID: ' || NEW.item_id || ') does not exist')
          END;
        END;
      `).run();
      
      // Trigger to validate transcripts before insert
      db.prepare(`
        CREATE TRIGGER IF NOT EXISTS validate_transcript_item_tags_insert
        BEFORE INSERT ON item_tags
        WHEN NEW.item_type = 'transcript'
        BEGIN
          SELECT CASE
            WHEN NOT EXISTS(SELECT 1 FROM transcripts WHERE id = NEW.item_id)
            THEN RAISE(ABORT, 'Foreign key constraint failed: Transcript does not exist')
          END;
        END;
      `).run();
      
      // 5. Restore the existing item_tags data
      console.log('Restoring existing tag relationships...');
      if (existingTags.length > 0) {
        const insertStmt = db.prepare(`
          INSERT INTO item_tags (item_id, item_type, tag_id, created_at)
          VALUES (?, ?, ?, ?)
        `);
        
        let restoredCount = 0;
        let skippedCount = 0;
        
        // Insert each record individually to handle potential validation issues
        existingTags.forEach(tag => {
          try {
            insertStmt.run(
              tag.item_id,
              tag.item_type,
              tag.tag_id,
              tag.created_at || new Date().toISOString()
            );
            restoredCount++;
          } catch (err) {
            console.log(`Skipped restoring tag relationship: ${tag.item_type}-${tag.item_id}-${tag.tag_id} (${err.message})`);
            skippedCount++;
          }
        });
        
        console.log(`Restored ${restoredCount} tag relationships, skipped ${skippedCount}`);
      }
      
      // 6. Create indexes for better performance
      console.log('Creating indexes for better performance...');
      db.prepare('CREATE INDEX IF NOT EXISTS idx_item_tags_item ON item_tags(item_id, item_type)').run();
      db.prepare('CREATE INDEX IF NOT EXISTS idx_item_tags_tag ON item_tags(tag_id)').run();
      
      console.log('Item_tags table migration completed successfully');
    });
    
    // Execute the transaction
    migration();
    return true;
  } catch (err) {
    console.error('Error fixing item_tags table:', err.message);
    throw err;
  }
}

/**
 * Revert the migration - restore original item_tags table
 */
function down() {
  try {
    // Start a transaction to ensure data integrity
    const reversion = db.transaction(() => {
      console.log('Reverting item_tags table to original schema...');
      
      // 1. Backup existing item_tags data
      console.log('Backing up existing item_tags data...');
      const existingTags = db.prepare('SELECT * FROM item_tags').all();
      console.log(`Found ${existingTags.length} existing tag relationships to preserve`);
      
      // 2. Drop the triggers
      console.log('Dropping validation triggers...');
      db.prepare('DROP TRIGGER IF EXISTS validate_note_item_tags_insert').run();
      db.prepare('DROP TRIGGER IF EXISTS validate_transcript_item_tags_insert').run();
      
      // 3. Drop the existing item_tags table
      console.log('Dropping modified item_tags table...');
      db.prepare('DROP TABLE IF EXISTS item_tags').run();
      
      // 4. Recreate the original item_tags table
      console.log('Recreating original item_tags table...');
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
      
      // 4. Restore only the note tags (since the original schema only supported notes)
      console.log('Restoring compatible tag relationships...');
      const noteTags = existingTags.filter(tag => tag.item_type === 'note');
      
      if (noteTags.length > 0) {
        const insertStmt = db.prepare(`
          INSERT INTO item_tags (item_id, item_type, tag_id, created_at)
          VALUES (?, ?, ?, ?)
        `);
        
        let restoredCount = 0;
        
        noteTags.forEach(tag => {
          try {
            insertStmt.run(
              tag.item_id,
              tag.item_type,
              tag.tag_id,
              tag.created_at || new Date().toISOString()
            );
            restoredCount++;
          } catch (err) {
            console.log(`Failed to restore tag: ${err.message}`);
          }
        });
        
        console.log(`Restored ${restoredCount} note tags out of ${noteTags.length}`);
        console.log(`Skipped ${existingTags.length - noteTags.length} transcript tags (not supported in original schema)`);
      }
      
      console.log('Item_tags table reversion completed');
    });
    
    // Execute the transaction
    reversion();
    return true;
  } catch (err) {
    console.error('Error reverting item_tags table:', err.message);
    throw err;
  }
}

module.exports = {
  up,
  down,
  description: 'Fix item_tags foreign key constraints to support both notes and transcripts'
};
