const GeminiProvider = require('./providers/gemini');
const OpenAIProvider = require('./providers/openai');
const DeepSeekProvider = require('./providers/deepseek');
const AIConfigManager = require('./config');

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
      case 'deepseek':
        provider = new DeepSeekProvider(config.apiKey);
        break;
      default:
        throw new Error(`Unsupported AI provider: ${type}`);
    }

    await provider.initialize();
    return provider;
  }

  static async getProvider(userId) {
    try {
      const config = await AIConfigManager.getUserConfig(userId);
      if (!config || !config.provider || !config.apiKey) {
        throw new Error('AI provider configuration not found');
      }
      return await this.createProvider(config.provider, config);
    } catch (error) {
      console.error('Error getting AI provider:', error);
      throw error;
    }
  }
}

module.exports = AIProviderFactory;
