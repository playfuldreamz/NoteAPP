/**
 * Embedding Provider Factory
 * Creates and initializes embedding providers based on the requested type
 * Follows the factory pattern to centralize provider instantiation logic
 */
const XenovaEmbeddingProvider = require('./providers/xenovaEmbeddingProvider');
const OpenAIEmbeddingProvider = require('./providers/openAIEmbeddingProvider');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

class EmbeddingProviderFactory {
  /**
   * Creates an instance of an embedding provider based on the type.
   * @param {string} type - The type of provider ('xenova', 'openai').
   * @returns {Object} An instance of the requested provider.
   * @throws {Error} If the provider type is unsupported or configuration is missing.
   */
  static createProvider(type) {
    console.log(`EmbeddingProviderFactory creating provider of type: ${type}`);
    
    switch (type.toLowerCase()) {
      case 'xenova':
        console.log("Factory creating XenovaEmbeddingProvider");
        return new XenovaEmbeddingProvider();
        
      case 'openai':
        console.log("Factory creating OpenAIEmbeddingProvider");
        const apiKey = process.env.OPENAI_API_KEY;
        
        if (!apiKey) {
          throw new Error('OpenAI embedding provider requested, but OPENAI_API_KEY environment variable is not set.');
        }
        
        return new OpenAIEmbeddingProvider(apiKey);
        
      default:
        throw new Error(`Unsupported embedding provider type: ${type}`);
    }
  }
  
  /**
   * Creates a provider with fallback to Xenova if the requested provider fails
   * @param {string} type - The type of provider ('xenova', 'openai')
   * @returns {Object} An instance of the requested provider or fallback
   */
  static createProviderWithFallback(type) {
    try {
      return this.createProvider(type);
    } catch (error) {
      console.warn(`Failed to create ${type} provider: ${error.message}. Falling back to Xenova.`);
      return this.createProvider('xenova');
    }
  }
}

module.exports = EmbeddingProviderFactory;
