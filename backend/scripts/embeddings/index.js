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
 * Verify embedding provider configuration
 * @returns {boolean} - True if configuration is valid
 */
function verifyEmbeddingConfig() {
  const embeddingService = require('../../services/ai/EmbeddingService');
  
  // Check if the embedding service has a provider initialized
  if (!embeddingService.provider) {
    console.error('ERROR: No embedding provider could be initialized.');
    console.error('Xenova should be used by default, but if it failed, check your OpenAI API key as fallback.');
    return false;
  }
  
  // Log which provider is being used
  const providerName = embeddingService.provider.constructor.name;
  console.log(`Using ${providerName} for embeddings`);
  
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
    
    // Verify embedding provider configuration
    if (!verifyEmbeddingConfig()) {
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
