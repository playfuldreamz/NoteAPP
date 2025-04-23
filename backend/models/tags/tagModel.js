const db = require('../../database/connection');

class TagModel {
  static async create(name, userId) {
    try {
      // Check if tag exists using better-sqlite3 API
      const findTagStmt = db.prepare('SELECT t.* FROM tags t WHERE LOWER(t.name) = LOWER(?)');
      const existingTag = findTagStmt.get(name.trim());

      let tag;
      
      if (existingTag) {
        // Check if user already has this tag using better-sqlite3 API
        const checkUserTagStmt = db.prepare('SELECT 1 FROM user_tags WHERE user_id = ? AND tag_id = ?');
        const userHasTag = !!checkUserTagStmt.get(userId, existingTag.id);

        if (userHasTag) {
          throw new Error('User already has this tag');
        }

        tag = existingTag;
      } else {
        // Create new tag using better-sqlite3 API
        const insertTagStmt = db.prepare('INSERT INTO tags (name) VALUES (?)');
        const insertResult = insertTagStmt.run(name.trim());
        
        tag = {
          id: insertResult.lastInsertRowid,
          name: name.trim()
        };
      }

      // Associate tag with user using better-sqlite3 API
      const associateTagStmt = db.prepare('INSERT INTO user_tags (user_id, tag_id) VALUES (?, ?)');
      associateTagStmt.run(userId, tag.id);

      return tag;
    } catch (error) {
      throw error;
    }
  }

  static async getAllTags() {
    try {
      const stmt = db.prepare('SELECT * FROM tags ORDER BY name ASC');
      return stmt.all();
    } catch (error) {
      throw error;
    }
  }

  static async getUserTags(userId) {
    try {
      const stmt = db.prepare(`SELECT t.* FROM tags t 
         INNER JOIN user_tags ut ON t.id = ut.tag_id 
         WHERE ut.user_id = ? 
         ORDER BY t.name ASC`);
      return stmt.all(userId);
    } catch (error) {
      throw error;
    }
  }

  static async getItemTags(type, itemId) {
    try {
      const stmt = db.prepare(`SELECT t.* FROM tags t 
         INNER JOIN item_tags it ON t.id = it.tag_id 
         WHERE it.item_id = ? AND it.item_type = ?
         ORDER BY t.name ASC`);
      return stmt.all(itemId, type);
    } catch (error) {
      throw error;
    }
  }

  static async addTagToItem(type, itemId, tagId) {
    try {
      const stmt = db.prepare(`INSERT INTO item_tags (item_id, item_type, tag_id) VALUES (?, ?, ?)`);
      stmt.run(itemId, type, tagId);
    } catch (error) {
      throw error;
    }
  }

  static async removeTagFromItem(type, itemId, tagId) {
    try {
      const stmt = db.prepare('DELETE FROM item_tags WHERE item_id = ? AND item_type = ? AND tag_id = ?');
      stmt.run(itemId, type, tagId);
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  }

  static async removeUserTag(userId, tagId) {
    try {
      const stmt = db.prepare('DELETE FROM user_tags WHERE user_id = ? AND tag_id = ?');
      stmt.run(userId, tagId);
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  }
}

module.exports = TagModel;
