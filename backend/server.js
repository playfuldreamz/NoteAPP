const express = require('express');
const cors = require('cors'); // Import CORS
const sqlite3 = require('sqlite3').verbose();
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors()); // Use CORS middleware
app.use(express.json());

// Database setup
const db = new sqlite3.Database(':memory:', (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to the in-memory SQLite database.');
});

// Create notes table
db.serialize(() => {
  db.run(`CREATE TABLE notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT,
    transcript TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// CRUD operations
app.get('/notes', (req, res) => {
  db.all('SELECT * FROM notes', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/notes', (req, res) => {
  const { content, transcript } = req.body;
  db.run('INSERT INTO notes (content, transcript) VALUES (?, ?)', [content, transcript], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.status(201).json({ id: this.lastID, content, transcript });
  });
});

app.delete('/notes/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM notes WHERE id = ?', id, function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.status(204).send();
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
