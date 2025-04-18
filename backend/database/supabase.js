const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

let supabase = null;

// Only create the Supabase client if credentials are available
if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('Supabase client initialized');
  } catch (error) {
    console.error('Error initializing Supabase client:', error.message);
    // Don't exit, allow fallback to SQLite
  }
} else {
  console.warn('Supabase URL and key not provided. Using SQLite as fallback.');
  // Create a dummy Supabase client that returns errors for all operations
  supabase = {
    from: () => ({
      select: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
      insert: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
      update: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
      delete: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
      eq: () => ({ select: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }) }),
      neq: () => ({ select: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }) }),
      limit: () => ({ select: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }) })
    }),
    rpc: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } })
  };
}

module.exports = supabase;
