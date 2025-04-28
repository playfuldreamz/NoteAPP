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
  wsUrl?: string;  // WebSocket URL for RealtimeSTT provider
  
  // New option - defaults to true
  automaticEnhancement?: boolean;
}

export interface TranscriptionProvider {
  name: string;
  isOnline: boolean;  // Indicates if provider needs internet
  isAvailable: () => Promise<boolean>;  // Check if provider is available (API key valid, etc)
  initialize: (options?: TranscriptionOptions) => Promise<void>;
  start: (mediaStream?: MediaStream) => Promise<void>;
  stop: () => Promise<void>;
  pause: () => Promise<void>;  // Pause transcription without cleanup
  resume: () => Promise<void>; // Resume transcription from paused state
  onResult: (callback: (result: TranscriptionResult) => void) => void;
  onError: (callback: (error: Error) => void) => void;
  cleanup: () => void;
  pausedTranscript?: string; // Store transcript during pause/resume
}

export type ProviderType = 'webspeech' | 'assemblyai' | 'whisper' | 'azure' | 'deepgram' | 'realtimestt';

export interface ProviderConfig {
  type: ProviderType;
  apiKey?: string;
  options?: TranscriptionOptions;
}
