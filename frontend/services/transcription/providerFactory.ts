import { TranscriptionProvider, ProviderType, ProviderConfig } from './types';
import { WebSpeechProvider } from './providers/WebSpeechProvider';
import { AssemblyAIProvider } from './providers/AssemblyAIProvider';
import { DeepgramProvider } from './providers/DeepgramProvider';
import { RealtimeSTTProvider } from './providers/RealtimeSTTProvider';

export class TranscriptionProviderFactory {
  private static providers: Map<ProviderType, TranscriptionProvider> = new Map();
  private static apiKeys: Map<ProviderType, string> = new Map();
  // Track ongoing provider initializations to prevent duplicates
  private static pendingProviders: Map<string, Promise<TranscriptionProvider>> = new Map();

  static async getProvider(config: ProviderConfig): Promise<TranscriptionProvider> {
    const providerKey = `${config.type}-${config.apiKey || 'nokey'}`;
    
    // If we're already initializing this provider, return the pending promise
    if (this.pendingProviders.has(providerKey)) {
      console.log(`TranscriptionProviderFactory: Reusing pending provider initialization for ${config.type}`);
      return this.pendingProviders.get(providerKey)!;
    }
    
    // Return cached provider if exists and API key hasn't changed
    const existingProvider = this.providers.get(config.type);
    const existingApiKey = this.apiKeys.get(config.type);
    if (existingProvider && existingApiKey === config.apiKey) {
      return existingProvider;
    }

    // Create a promise for the provider initialization
    const providerPromise = this.initializeProvider(config);
    // Store the pending promise
    this.pendingProviders.set(providerKey, providerPromise);
    
    try {
      // Wait for the provider to initialize
      const provider = await providerPromise;
      return provider;
    } finally {
      // Clean up the pending promise
      this.pendingProviders.delete(providerKey);
    }
  }
  
  private static async initializeProvider(config: ProviderConfig): Promise<TranscriptionProvider> {
    // Cleanup existing provider if API key changed
    const existingProvider = this.providers.get(config.type);
    if (existingProvider) {
      await existingProvider.cleanup();
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
        break;
      case 'deepgram':
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
        await provider.cleanup();
        this.providers.delete(type);
        this.apiKeys.delete(type);
      }
    } else {
      // Cleanup all providers
      const cleanupPromises = [];
      for (const provider of this.providers.values()) {
        cleanupPromises.push(provider.cleanup());
      }
      
      // Wait for all cleanups to finish
      await Promise.all(cleanupPromises);
      
      this.providers.clear();
      this.apiKeys.clear();
    }
      // Clear any pending providers
    this.pendingProviders.clear();
  }
}
