/**
 * Backfill Embeddings Script
 * 
 * This script generates and stores embeddings for all existing notes and transcripts.
 * Run this script once after setting up the semantic search feature to ensure
 * all existing content is searchable.
 * 
 * Usage: node scripts/backfill_embeddings.js
 */

// This is a wrapper script that uses the modular implementation
// The actual implementation is in the ./embeddings directory
require('./embeddings/index');
