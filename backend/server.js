const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// Initialize SQLite database
const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    db.run(`CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT DEFAULT 'General',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
  }
});

// API Routes

// Get all notes
app.get('/api/notes', (req, res) => {
  const sql = 'SELECT * FROM notes ORDER BY id ASC';
  db.all(sql, [], (err, rows) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({
      message: 'success',
      data: rows
    });
  });
});

// Create a new note
app.post('/api/notes', (req, res) => {
  const { title, content, category } = req.body;
  if (!title || !content) {
    res.status(400).json({ error: 'Title and content are required' });
    return;
  }
  const sql = 'INSERT INTO notes (title, content, category) VALUES (?, ?, ?)';
  const params = [title, content, category || 'General'];
  db.run(sql, params, function(err) {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({
      message: 'success',
      data: { id: this.lastID, title, content, category }
    });
  });
});

// Update an existing note
app.put('/api/notes/:id', (req, res) => {
  const { title, content, category } = req.body;
  const { id } = req.params;
  
  if (!title || !content) {
    res.status(400).json({ error: 'Title and content are required' });
    return;
  }
  
  const sql = 'UPDATE notes SET title = ?, content = ?, category = ? WHERE id = ?';
  const params = [title, content, category || 'General', id];
  
  db.run(sql, params, function(err) {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({
      message: 'success',
      data: { id: Number(id), title, content, category }
    });
  });
});

// Delete a note
app.delete('/api/notes/:id', (req, res) => {
  const { id } = req.params;
  
  const sql = 'DELETE FROM notes WHERE id = ?';
  db.run(sql, id, function(err) {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({
      message: 'success',
      changes: this.changes
    });
  });
});

// Serve frontend static files
// In production, we build the Vue app and serve it from a "dist" folder
app.use(express.static(path.join(__dirname, 'dist')));

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
