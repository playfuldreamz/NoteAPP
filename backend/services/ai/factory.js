const GeminiProvider = require('./providers/gemini');
const OpenAIProvider = require('./providers/openai');

class AIProviderFactory {
  static async createProvider(type, config) {
    let provider;

    switch (type.toLowerCase()) {
      case 'gemini':
        provider = new GeminiProvider(config.apiKey);
        break;
      case 'openai':
        provider = new OpenAIProvider(config.apiKey);
        break;
      default:
        throw new Error(`Unsupported AI provider: ${type}`);
    }

    await provider.initialize();
    return provider;
  }
}

module.exports = AIProviderFactory;
