const db = require('../../database/connection');

class TagModel {
  static async create(name, userId) {
    try {
      // Check if tag exists
      const existingTag = await new Promise((resolve, reject) => {
        db.get(
          'SELECT t.* FROM tags t WHERE LOWER(t.name) = LOWER(?)',
          [name.trim()],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });

      let tag;
      
      if (existingTag) {
        // Check if user already has this tag
        const userHasTag = await new Promise((resolve, reject) => {
          db.get(
            'SELECT 1 FROM user_tags WHERE user_id = ? AND tag_id = ?',
            [userId, existingTag.id],
            (err, row) => {
              if (err) reject(err);
              else resolve(!!row);
            }
          );
        });

        if (userHasTag) {
          throw new Error('User already has this tag');
        }

        tag = existingTag;
      } else {
        // Create new tag
        tag = await new Promise((resolve, reject) => {
          db.run(
            'INSERT INTO tags (name) VALUES (?)',
            [name.trim()],
            function(err) {
              if (err) reject(err);
              else resolve({
                id: this.lastID,
                name: name.trim()
              });
            }
          );
        });
      }

      // Associate tag with user
      await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO user_tags (user_id, tag_id) VALUES (?, ?)',
          [userId, tag.id],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      return tag;
    } catch (error) {
      throw error;
    }
  }

  static async getAllTags() {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM tags ORDER BY name ASC', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  static async getUserTags(userId) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT t.* FROM tags t 
         INNER JOIN user_tags ut ON t.id = ut.tag_id 
         WHERE ut.user_id = ? 
         ORDER BY t.name ASC`,
        [userId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  static async getItemTags(type, itemId) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT t.* FROM tags t 
         INNER JOIN item_tags it ON t.id = it.tag_id 
         WHERE it.item_id = ? AND it.item_type = ?
         ORDER BY t.name ASC`,
        [itemId, type],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  static async addTagToItem(type, itemId, tagId) {
    try {
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO item_tags (item_id, item_type, tag_id) VALUES (?, ?, ?)`,
          [itemId, type, tagId],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    } catch (error) {
      throw error;
    }
  }

  static async removeTagFromItem(type, itemId, tagId) {
    return new Promise((resolve, reject) => {
      db.run(
        `DELETE FROM item_tags WHERE item_id = ? AND item_type = ? AND tag_id = ?`,
        [itemId, type, tagId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }

  static async removeUserTag(userId, tagId) {
    return new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM user_tags WHERE user_id = ? AND tag_id = ?',
        [userId, tagId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }
}

module.exports = TagModel;
