/**
 * Main module for embedding backfill process
 */

const dotenv = require('dotenv');
const path = require('path');
const dbUtils = require('./db-utils');
const processor = require('./processor');
const config = require('./config');

// Load environment variables from parent directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Verify required API keys are set
 */
function verifyApiKeys() {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === '') {
    console.error('ERROR: OpenAI API key is not set. Please set OPENAI_API_KEY in your .env file.');
    return false;
  }
  return true;
}

/**
 * Print summary of processing results
 * @param {Object} noteResults - Results of processing notes
 * @param {Object} transcriptResults - Results of processing transcripts
 * @returns {boolean} - True if there were errors
 */
function printSummary(noteResults, transcriptResults) {
  let hasErrors = false;
  
  console.log('\n=== EMBEDDING BACKFILL SUMMARY ===');
  
  if (noteResults) {
    console.log(`Notes: ${noteResults.successful} successful, ${noteResults.skipped} skipped, ${noteResults.failed} failed`);
    if (noteResults.failed > 0) {
      hasErrors = true;
      console.log(`\nFailed note IDs: ${noteResults.failedIds.join(', ')}`);
    }
  }
  
  if (transcriptResults) {
    console.log(`Transcripts: ${transcriptResults.successful} successful, ${transcriptResults.skipped} skipped, ${transcriptResults.failed} failed`);
    if (transcriptResults.failed > 0) {
      hasErrors = true;
      console.log(`\nFailed transcript IDs: ${transcriptResults.failedIds.join(', ')}`);
    }
  }
  
  if (hasErrors) {
    console.log('\nEmbedding backfill completed with errors. Some items could not be processed.');
    console.log('Check the error messages above for details.');
  } else {
    console.log('\nEmbedding backfill completed successfully!');
  }
  
  return hasErrors;
}

/**
 * Main function to run the backfill process
 */
async function main() {
  let hasErrors = false;
  
  try {
    console.log('Starting embedding backfill process...');
    
    // Check if embeddings table exists
    if (!dbUtils.checkEmbeddingsTable()) {
      console.error('Embeddings table not found. Please run migrations first.');
      process.exit(1);
    }
    
    // Verify API keys are set
    if (!verifyApiKeys()) {
      process.exit(1);
    }
    
    // Process notes
    console.log('\nProcessing notes:');
    const noteResults = await processor.processAllItems(config.ITEM_TYPES.NOTE);
    
    // Process transcripts
    console.log('\nProcessing transcripts:');
    const transcriptResults = await processor.processAllItems(config.ITEM_TYPES.TRANSCRIPT);
    
    // Print summary
    hasErrors = printSummary(noteResults, transcriptResults);
    
  } catch (error) {
    console.error('Error during backfill process:', error);
    hasErrors = true;
  } finally {
    // Close database connection
    dbUtils.closeDatabase();
    
    // Exit with appropriate code
    process.exit(hasErrors ? 1 : 0);
  }
}

// Run the main function
main();
