/**
 * Database adapter for Supabase/SQLite
 * 
 * This module provides a unified database interface that works with both
 * Supabase and SQLite, allowing for a smooth transition between the two.
 * When Supabase is configured, it will use Supabase. Otherwise, it falls back to SQLite.
 */

const supabase = require('./supabase');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Determine if we should use Supabase or SQLite
const useSupabase = process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY;

// Set up SQLite connection for fallback
let sqliteDb = null;
if (!useSupabase) {
  const dbPath = path.join(__dirname, '../database.sqlite');
  sqliteDb = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error connecting to SQLite database:', err.message);
    } else {
      console.log('Connected to SQLite database:', dbPath);
    }
  });
}

class DatabaseAdapter {
  /**
   * Run a SQL query with parameters
   * @param {string} sql - SQL query to execute
   * @param {Array} params - Parameters for the query
   * @param {Function} callback - Callback function
   */
  run(sql, params = [], callback) {
    // If using SQLite, use the native SQLite methods
    if (!useSupabase) {
      return sqliteDb.run(sql, params, callback);
    }
    
    // Otherwise, use Supabase
    // Convert SQLite queries to Supabase format
    const { convertedSql, convertedParams } = this._convertQuery(sql, params);
    
    // For transaction statements, handle differently
    if (sql.trim().toUpperCase() === 'BEGIN TRANSACTION') {
      // Supabase doesn't have explicit transaction start
      if (callback) callback(null);
      return Promise.resolve();
    }
    
    if (sql.trim().toUpperCase() === 'COMMIT' || sql.trim().toUpperCase() === 'ROLLBACK') {
      // Supabase doesn't have explicit commit/rollback in this context
      if (callback) callback(null);
      return Promise.resolve();
    }

    // For INSERT, UPDATE, DELETE operations
    if (/^(INSERT|UPDATE|DELETE)/i.test(sql)) {
      return this._executeWrite(convertedSql, convertedParams, callback);
    }
    
    // For SELECT operations
    return this._executeRead(convertedSql, convertedParams, callback);
  }

  /**
   * Get a single row from the database
   * @param {string} sql - SQL query to execute
   * @param {Array} params - Parameters for the query
   * @param {Function} callback - Callback function
   */
  get(sql, params = [], callback) {
    // If using SQLite, use the native SQLite methods
    if (!useSupabase) {
      return sqliteDb.get(sql, params, callback);
    }
    
    // Otherwise, use Supabase
    const { convertedSql, convertedParams } = this._convertQuery(sql, params);
    
    supabase.rpc('execute_sql', { 
      sql: convertedSql, 
      params: convertedParams 
    })
    .then(({ data, error }) => {
      if (error) {
        if (callback) callback(error, null);
        return;
      }
      
      // Return the first row or null
      const row = data && data.length > 0 ? data[0] : null;
      if (callback) callback(null, row);
    });
  }

  /**
   * Get multiple rows from the database
   * @param {string} sql - SQL query to execute
   * @param {Array} params - Parameters for the query
   * @param {Function} callback - Callback function
   */
  all(sql, params = [], callback) {
    // If using SQLite, use the native SQLite methods
    if (!useSupabase) {
      return sqliteDb.all(sql, params, callback);
    }
    
    // Otherwise, use Supabase
    const { convertedSql, convertedParams } = this._convertQuery(sql, params);
    
    supabase.rpc('execute_sql', { 
      sql: convertedSql, 
      params: convertedParams 
    })
    .then(({ data, error }) => {
      if (error) {
        if (callback) callback(error, null);
        return;
      }
      
      if (callback) callback(null, data || []);
    });
  }

  /**
   * Execute multiple SQL statements in sequence
   * @param {Function} callback - Function to execute in the sequence
   */
  serialize(callback) {
    // If using SQLite, use the native SQLite methods
    if (!useSupabase) {
      return sqliteDb.serialize(callback);
    }
    
    // Supabase doesn't need serialization like SQLite
    if (callback) callback();
  }

  /**
   * Execute a write operation (INSERT, UPDATE, DELETE)
   * @private
   */
  _executeWrite(sql, params, callback) {
    return supabase.rpc('execute_sql', { 
      sql, 
      params 
    })
    .then(({ data, error }) => {
      if (error) {
        if (callback) callback(error);
        return Promise.reject(error);
      }
      
      // Simulate the SQLite lastID and changes properties
      if (callback) {
        callback.call({
          lastID: data && data.length > 0 ? data[0].id : null,
          changes: data && data.length > 0 ? data[0].affected_rows || 0 : 0
        });
      }
      
      return Promise.resolve();
    });
  }

  /**
   * Execute a read operation (SELECT)
   * @private
   */
  _executeRead(sql, params, callback) {
    return supabase.rpc('execute_sql', { 
      sql, 
      params 
    })
    .then(({ data, error }) => {
      if (error) {
        if (callback) callback(error, null);
        return Promise.reject(error);
      }
      
      if (callback) callback(null, data || []);
      return Promise.resolve(data || []);
    });
  }

  /**
   * Convert SQLite query to PostgreSQL format
   * @private
   */
  _convertQuery(sql, params) {
    let convertedSql = sql;
    
    // Replace SQLite-specific JSON functions with PostgreSQL equivalents
    convertedSql = convertedSql.replace(/json_group_array/g, 'json_agg');
    convertedSql = convertedSql.replace(/json_object/g, 'json_build_object');
    
    // Replace SQLite parameter placeholders (?) with PostgreSQL placeholders ($1, $2, etc.)
    let paramIndex = 1;
    convertedSql = convertedSql.replace(/\?/g, () => `$${paramIndex++}`);
    
    // Replace AUTOINCREMENT with SERIAL
    convertedSql = convertedSql.replace(/AUTOINCREMENT/g, 'SERIAL');
    
    // Replace INTEGER PRIMARY KEY with SERIAL PRIMARY KEY
    convertedSql = convertedSql.replace(/INTEGER PRIMARY KEY/g, 'SERIAL PRIMARY KEY');
    
    // Replace DATETIME with TIMESTAMP
    convertedSql = convertedSql.replace(/DATETIME/g, 'TIMESTAMP');
    
    return { convertedSql, convertedParams: params };
  }
}

// Create and export a singleton instance
const db = new DatabaseAdapter();
module.exports = db;
