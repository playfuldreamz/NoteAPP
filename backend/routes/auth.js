const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../database/connection');
const { generateToken, authenticateToken } = require('../middleware/auth');

// Register endpoint
router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert the user using better-sqlite3 API
    try {
      const stmt = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)');
      const result = stmt.run(username, hashedPassword);
      
      // Create token
      const token = generateToken({ id: result.lastInsertRowid, username });
      res.status(201).json({ token, username });
    } catch (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'Username already exists' });
      }
      throw err;
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Use better-sqlite3 API to get user
    const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
    const user = stmt.get(username);

    if (!user) {
      return res.status(400).json({ error: 'User not found' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    // Create token
    const token = generateToken({ id: user.id, username: user.username });
    res.json({ token, username: user.username });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Change password endpoint
router.put('/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password are required' });
  }

  try {
    // Verify current password using better-sqlite3 API
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    const user = stmt.get(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid current password' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password using better-sqlite3 API
    const updateStmt = db.prepare('UPDATE users SET password = ? WHERE id = ?');
    updateStmt.run(hashedPassword, req.user.id);

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Change username endpoint
router.put('/change-username', authenticateToken, async (req, res) => {
  const { newUsername, password } = req.body;
  
  if (!newUsername || !password) {
    return res.status(400).json({ error: 'New username and password are required' });
  }

  try {
    // Get current user using better-sqlite3 API
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    const user = stmt.get(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Check if new username is available using better-sqlite3 API
    const checkStmt = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?');
    const existingUser = checkStmt.get(newUsername, user.id);
    const usernameExists = !!existingUser;

    if (usernameExists) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    // Update username using better-sqlite3 API
    const updateStmt = db.prepare('UPDATE users SET username = ? WHERE id = ?');
    updateStmt.run(newUsername, user.id);

    // Generate new token with updated username
    const token = generateToken({ id: user.id, username: newUsername });
    
    res.json({ 
      token,
      username: newUsername
    });
  } catch (err) {
    console.error('Error changing username:', err);
    res.status(500).json({ error: 'Failed to change username' });
  }
});

module.exports = router;