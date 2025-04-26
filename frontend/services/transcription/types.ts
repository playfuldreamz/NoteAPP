export interface TranscriptionResult {
  transcript: string;
  isFinal: boolean;
  confidence?: number;
}

export interface TranscriptionOptions {
  continuous?: boolean;
  interimResults?: boolean;
  language?: string;
  maxAlternatives?: number;
  audioStream?: MediaStream;
  
  // New option - defaults to true
  automaticEnhancement?: boolean;
}

export interface TranscriptionProvider {
  name: string;
  isOnline: boolean;  // Indicates if provider needs internet
  isAvailable: () => Promise<boolean>;  // Check if provider is available (API key valid, etc)
  initialize: (options?: TranscriptionOptions) => Promise<void>;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  onResult: (callback: (result: TranscriptionResult) => void) => void;
  onError: (callback: (error: Error) => void) => void;
  cleanup: () => void;
}

export type ProviderType = 'webspeech' | 'assemblyai' | 'whisper' | 'azure' | 'deepgram' | 'realtimestt';

export interface ProviderConfig {
  type: ProviderType;
  apiKey?: string;
  options?: TranscriptionOptions;
}
