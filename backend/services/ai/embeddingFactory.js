/**
 * Factory for creating embedding provider instances.
 * Centralizes the logic for selecting and initializing embedding providers.
 */
const XenovaEmbeddingProvider = require('./providers/xenovaEmbeddingProvider');
const OpenAIEmbeddingProvider = require('./providers/openAIEmbeddingProvider');
const EmbeddingProviderBase = require('./providers/embeddingBase'); // Ensure this base class/interface exists
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables specifically for API keys needed by providers
// Adjust the path if your .env file is located elsewhere relative to this file
const envPath = path.resolve(__dirname, '../../../.env');
dotenv.config({ path: envPath });

class EmbeddingProviderFactory {
    /**
     * Creates an instance of an embedding provider based on the type.
     * @param {string} type - The type of provider ('xenova', 'openai').
     * @returns {EmbeddingProviderBase} An instance of the requested provider.
     * @throws {Error} If the provider type is unsupported or configuration is missing.
     */
    static createProvider(type) {
        const providerType = type.toLowerCase();
        console.log(`EmbeddingProviderFactory: Attempting to create provider of type '${providerType}'`);

        switch (providerType) {
            case 'xenova':
                console.log("EmbeddingProviderFactory: Creating XenovaEmbeddingProvider instance.");
                // Xenova provider doesn't require specific config passed here
                return new XenovaEmbeddingProvider();

            case 'openai':
                console.log("EmbeddingProviderFactory: Creating OpenAIEmbeddingProvider instance.");
                const apiKey = process.env.OPENAI_API_KEY;
                if (!apiKey) {
                    console.error('EmbeddingProviderFactory: OpenAI API key not found in environment variables (OPENAI_API_KEY).');
                    throw new Error('OpenAI embedding provider requested, but OPENAI_API_KEY environment variable is not set.');
                }
                // You might want to make the model name configurable via .env as well
                // const modelName = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
                // return new OpenAIEmbeddingProvider(apiKey, modelName);
                return new OpenAIEmbeddingProvider(apiKey); // Using default model in provider constructor

            default:
                console.error(`EmbeddingProviderFactory: Unsupported embedding provider type requested: ${type}`);
                throw new Error(`Unsupported embedding provider type: ${type}`);
        }
    }
}

module.exports = EmbeddingProviderFactory;
