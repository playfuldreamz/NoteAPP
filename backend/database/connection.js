/**
 * Database connection module
 * 
 * This module exports the database adapter, which has been updated
 * to use Supabase instead of SQLite.
 */

// Import the Supabase adapter that provides SQLite-compatible methods
const db = require('./db');

console.log('Connected to Supabase database');

module.exports = db;
