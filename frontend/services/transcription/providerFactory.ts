import { TranscriptionProvider, ProviderType, ProviderConfig } from './types';
import { WebSpeechProvider } from './providers/WebSpeechProvider';
import { AssemblyAIProvider } from './providers/AssemblyAIProvider';
import { DeepgramProvider } from './providers/DeepgramProvider';
import { RealtimeSTTProvider } from './providers/RealtimeSTTProvider';

export class TranscriptionProviderFactory {
  private static providers: Map<ProviderType, TranscriptionProvider> = new Map();
  private static apiKeys: Map<ProviderType, string> = new Map();

  static async getProvider(config: ProviderConfig): Promise<TranscriptionProvider> {
    // Return cached provider if exists and API key hasn't changed
    const existingProvider = this.providers.get(config.type);
    const existingApiKey = this.apiKeys.get(config.type);
    if (existingProvider && existingApiKey === config.apiKey) {
      return existingProvider;
    }

    // Cleanup existing provider if API key changed
    if (existingProvider) {
      existingProvider.cleanup();
      this.providers.delete(config.type);
    }

    // Create new provider
    let provider: TranscriptionProvider;

    switch (config.type) {
      case 'webspeech':
        provider = new WebSpeechProvider();
        break;
      case 'assemblyai':
        if (!config.apiKey) {
          throw new Error('API key is required for AssemblyAI provider');
        }
        provider = new AssemblyAIProvider(config.apiKey);
        break;      case 'deepgram':
        if (!config.apiKey) {
          throw new Error('API key is required for Deepgram provider');
        }
        provider = new DeepgramProvider(config.apiKey);
        break;
      case 'realtimestt':
        provider = new RealtimeSTTProvider(config);
        break;
      default:
        throw new Error(`Unsupported provider type: ${config.type}`);
    }

    // Initialize provider
    await provider.initialize(config.options);
    
    // Cache provider and API key
    this.providers.set(config.type, provider);
    if (config.apiKey) {
      this.apiKeys.set(config.type, config.apiKey);
    }
    
    return provider;
  }

  static async cleanup(type?: ProviderType): Promise<void> {
    if (type) {
      // Cleanup specific provider
      const provider = this.providers.get(type);
      if (provider) {
        provider.cleanup();
        this.providers.delete(type);
        this.apiKeys.delete(type);
      }
    } else {
      // Cleanup all providers
      for (const provider of this.providers.values()) {
        provider.cleanup();
      }
      this.providers.clear();
      this.apiKeys.clear();
    }
  }
}
