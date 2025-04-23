/**
 * Processor for generating and storing embeddings
 */

const embeddingService = require('../../services/ai/EmbeddingService');
const dbUtils = require('./db-utils');
const config = require('./config');

/**
 * Generate and store embedding for a single item
 * @param {Object} item - The note or transcript
 * @param {string} itemType - 'note' or 'transcript'
 * @returns {Object} - Result of processing
 */
async function processItem(item, itemType) {
  try {
    // Get content based on item type
    const content = itemType === 'note' ? item.content : item.text;
    
    // Skip if no content
    if (!content) {
      console.log(`Skipping ${itemType} ${item.id} - no content`);
      return { success: true, skipped: true };
    }
    
    // Generate embedding
    console.log(`Generating embedding for ${itemType} ${item.id}...`);
    const embedding = await embeddingService.generateEmbedding(content);
    
    // Store embedding in database
    dbUtils.storeEmbedding(item.id, itemType, item.user_id, embedding);
    
    console.log(`Successfully stored embedding for ${itemType} ${item.id}`);
    return { success: true, skipped: false };
  } catch (error) {
    console.error(`Error processing ${itemType} ${item.id}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Process all items of a specific type
 * @param {string} itemType - 'note' or 'transcript'
 * @returns {Object} - Processing results
 */
async function processAllItems(itemType) {
  try {
    // Get total count
    const totalItems = dbUtils.getTotalItemCount(itemType);
    
    console.log(`Found ${totalItems} ${itemType}s to process`);
    
    // Process in batches
    let processed = 0;
    let successful = 0;
    let skipped = 0;
    let failed = 0;
    let failedIds = [];
    let consecutiveErrors = 0;
    let lastErrorMessage = null;
    
    while (processed < totalItems) {
      // Get batch of items
      const items = dbUtils.getBatchOfItems(
        itemType, 
        config.BATCH_SIZE, 
        processed
      );
      
      // Process each item in the batch
      for (const item of items) {
        const result = await processItem(item, itemType);
        if (result.success) {
          if (result.skipped) {
            skipped++;
          } else {
            successful++;
          }
          // Reset consecutive error counter on success
          consecutiveErrors = 0;
          lastErrorMessage = null;
        } else {
          failed++;
          failedIds.push(item.id);
          
          // Check for consecutive identical errors
          if (lastErrorMessage === result.error) {
            consecutiveErrors++;
          } else {
            consecutiveErrors = 1;
            lastErrorMessage = result.error;
          }
          
          // Early termination if we detect a pattern of errors
          if (consecutiveErrors >= config.MAX_CONSECUTIVE_ERRORS) {
            console.log(`\nDetected ${config.MAX_CONSECUTIVE_ERRORS} consecutive identical errors: ${lastErrorMessage}`);
            console.log(`Stopping processing early to avoid unnecessary API calls.`);
            processed = totalItems; // This will exit the while loop after this batch
            break; // Exit the for loop
          }
        }
      }
      
      processed += items.length;
      console.log(`Progress: ${processed}/${totalItems} ${itemType}s processed (${successful} successful, ${skipped} skipped, ${failed} failed)`);
    }
    
    return { totalItems, successful, skipped, failed, failedIds };
  } catch (error) {
    console.error(`Error processing ${itemType}s:`, error);
    return { error: error.message };
  }
}

module.exports = {
  processItem,
  processAllItems
};
