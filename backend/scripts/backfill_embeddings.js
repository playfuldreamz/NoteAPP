/**
 * Backfill Embeddings Script
 * 
 * This script generates and stores embeddings for all existing notes and transcripts.
 * Run this script once after setting up the semantic search feature to ensure
 * all existing content is searchable.
 * 
 * Usage: node scripts/backfill_embeddings.js
 */

const db = require('../database/connection');
const embeddingService = require('../services/ai/EmbeddingService');

// Process items in batches to avoid memory issues
const BATCH_SIZE = 50;

/**
 * Generate and store embedding for a single item
 * @param {Object} item - The note or transcript
 * @param {string} itemType - 'note' or 'transcript'
 */
async function processItem(item, itemType) {
  try {
    // Get content based on item type
    const content = itemType === 'note' ? item.content : item.text;
    
    // Skip if no content
    if (!content) {
      console.log(`Skipping ${itemType} ${item.id} - no content`);
      return;
    }
    
    // Generate embedding
    console.log(`Generating embedding for ${itemType} ${item.id}...`);
    const embedding = await embeddingService.generateEmbedding(content);
    
    // Serialize embedding to Buffer
    const embeddingBuffer = Buffer.from(new Float32Array(embedding).buffer);
    
    // Store embedding in database
    db.prepare(`
      INSERT OR REPLACE INTO embeddings (item_id, item_type, user_id, content_embedding)
      VALUES (?, ?, ?, ?)
    `).run(item.id, itemType, item.user_id, embeddingBuffer);
    
    console.log(`Successfully stored embedding for ${itemType} ${item.id}`);
  } catch (error) {
    console.error(`Error processing ${itemType} ${item.id}:`, error.message);
  }
}

/**
 * Process all items of a specific type
 * @param {string} itemType - 'note' or 'transcript'
 */
async function processAllItems(itemType) {
  try {
    // Get total count
    const countRow = db.prepare(`SELECT COUNT(*) as count FROM ${itemType}s`).get();
    const totalItems = countRow.count;
    
    console.log(`Found ${totalItems} ${itemType}s to process`);
    
    // Process in batches
    let processed = 0;
    
    while (processed < totalItems) {
      // Get batch of items
      const tableName = `${itemType}s`;
      const contentField = itemType === 'note' ? 'content' : 'text';
      
      const items = db.prepare(`
        SELECT id, ${contentField}, user_id 
        FROM ${tableName}
        LIMIT ? OFFSET ?
      `).all(BATCH_SIZE, processed);
      
      // Process each item in the batch
      for (const item of items) {
        await processItem(item, itemType);
      }
      
      processed += items.length;
      console.log(`Progress: ${processed}/${totalItems} ${itemType}s processed`);
    }
    
    console.log(`Completed processing all ${itemType}s`);
  } catch (error) {
    console.error(`Error processing ${itemType}s:`, error);
  }
}

/**
 * Main function to run the backfill process
 */
async function main() {
  try {
    console.log('Starting embedding backfill process...');
    
    // Check if embeddings table exists
    try {
      db.prepare('SELECT 1 FROM embeddings LIMIT 1').get();
    } catch (error) {
      console.error('Embeddings table not found. Please run migrations first.');
      process.exit(1);
    }
    
    // Process notes
    await processAllItems('note');
    
    // Process transcripts
    await processAllItems('transcript');
    
    console.log('Embedding backfill completed successfully!');
  } catch (error) {
    console.error('Error during backfill process:', error);
  } finally {
    // Close database connection
    db.close();
  }
}

// Run the script
main();
