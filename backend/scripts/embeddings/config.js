/**
 * Configuration for embedding backfill process
 */

module.exports = {
  // Process items in batches to avoid memory issues
  BATCH_SIZE: 50,
  
  // Early termination settings
  MAX_CONSECUTIVE_ERRORS: 3, // Stop after this many consecutive errors of the same type
  
  // Item types
  ITEM_TYPES: {
    NOTE: 'note',
    TRANSCRIPT: 'transcript'
  }
};
