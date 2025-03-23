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

    // Insert the user
    db.run('INSERT INTO users (username, password) VALUES (?, ?)', 
      [username, hashedPassword], 
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Username already exists' });
          }
          return res.status(500).json({ error: err.message });
        }

        // Create token
        const token = generateToken({ id: this.lastID, username });
        res.status(201).json({ token, username });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

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
  });
});

// Change password endpoint
router.put('/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password are required' });
  }

  try {
    // Verify current password
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE id = ?', [req.user.id], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });

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

    // Update password
    await new Promise((resolve, reject) => {
      db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.id], function(err) {
        if (err) return reject(err);
        resolve(this);
      });
    });

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
    // Get current user
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE id = ?', [req.user.id], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Check if new username is available
    const usernameExists = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM users WHERE username = ? AND id != ?', [newUsername, user.id], (err, row) => {
        if (err) return reject(err);
        resolve(!!row);
      });
    });

    if (usernameExists) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    // Update username
    await new Promise((resolve, reject) => {
      db.run('UPDATE users SET username = ? WHERE id = ?', [newUsername, user.id], function(err) {
        if (err) return reject(err);
        resolve(this);
      });
    });

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