const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { registerUser, loginUser, changePassword, changeUsername } = require('../services/authService');

// Register endpoint
router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const result = await registerUser(username, password);
    res.status(201).json(result);
  } catch (err) {
    if (err.message === 'Username already exists') {
      return res.status(400).json({ error: err.message });
    }
    if (err.message === 'Username and password are required') {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await loginUser(username, password);
    res.json(result);
  } catch (err) {
    if (err.message === 'User not found' || err.message === 'Invalid password') {
      return res.status(400).json({ error: err.message });
    }
    if (err.message === 'Username and password are required') {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

// Change password endpoint
router.put('/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    const result = await changePassword(req.user.id, currentPassword, newPassword);
    res.json(result);
  } catch (err) {
    if (err.message === 'User not found') {
      return res.status(404).json({ error: err.message });
    }
    if (err.message === 'Invalid current password') {
      return res.status(401).json({ error: err.message });
    }
    if (err.message === 'Current and new password are required') {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

// Change username endpoint
router.put('/change-username', authenticateToken, async (req, res) => {
  const { newUsername, password } = req.body;
  
  try {
    const result = await changeUsername(req.user.id, newUsername, password);
    res.json(result);
  } catch (err) {
    if (err.message === 'User not found') {
      return res.status(404).json({ error: err.message });
    }
    if (err.message === 'Invalid password') {
      return res.status(401).json({ error: err.message });
    }
    if (err.message === 'Username already taken') {
      return res.status(400).json({ error: err.message });
    }
    if (err.message === 'New username and password are required') {
      return res.status(400).json({ error: err.message });
    }
    console.error('Error changing username:', err);
    res.status(500).json({ error: 'Failed to change username' });
  }
});

module.exports = router;