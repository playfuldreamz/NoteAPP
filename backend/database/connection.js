const Database = require('better-sqlite3');
const path = require('path');
const sqliteVec = require('sqlite-vec'); // Import the sqlite-vec package

const dbPath = path.join(__dirname, '../database.sqlite');
let db;

try {
  db = new Database(dbPath, { verbose: console.log }); // Add options if needed
  db.pragma('journal_mode = WAL'); // Enable Write-Ahead Logging for better concurrency

  // Load sqlite-vec extension automatically
  sqliteVec.load(db);
  console.log('sqlite-vec extension loaded successfully via npm package.');

  console.log('Connected to database:', dbPath);
} catch (err) {
  console.error('Error connecting to database or loading extension:', err.message);
  process.exit(1); // Exit if critical setup fails
}

// Ensure graceful shutdown
process.on('exit', () => db.close());
process.on('SIGHUP', () => process.exit(128 + 1));
process.on('SIGINT', () => process.exit(128 + 2));
process.on('SIGTERM', () => process.exit(128 + 15));

module.exports = db;
