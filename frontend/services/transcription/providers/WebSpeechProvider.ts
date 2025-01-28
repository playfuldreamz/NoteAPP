import { TranscriptionProvider, TranscriptionOptions, TranscriptionResult } from '../types';

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

// Add these interfaces
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  start(): void;
  stop(): void;
  abort(): void;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
}

export class WebSpeechProvider implements TranscriptionProvider {
  private recognition: SpeechRecognition | null = null;
  private resultCallback: ((result: TranscriptionResult) => void) | null = null;
  private errorCallback: ((error: Error) => void) | null = null;
  
  name = 'WebSpeech';
  isOnline = false;  // Works offline

  async isAvailable(): Promise<boolean> {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  async initialize(options?: TranscriptionOptions): Promise<void> {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      throw new Error('Speech Recognition not supported in this browser.');
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = options?.continuous ?? true;
    this.recognition.interimResults = options?.interimResults ?? true;
    this.recognition.lang = options?.language ?? 'en-US';
    this.recognition.maxAlternatives = options?.maxAlternatives ?? 1;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    if (!this.recognition) return;

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (!this.resultCallback) return;

      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        if (result.isFinal) {
          this.resultCallback({ transcript, isFinal: true, confidence: result[0].confidence });
        } else {
          interim += transcript;
          this.resultCallback({ transcript: interim, isFinal: false, confidence: result[0].confidence });
        }
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (this.errorCallback) {
        this.errorCallback(new Error(event.error));
      }
    };

    this.recognition.onend = () => {
      // Auto restart if continuous mode
      if (this.recognition?.continuous) {
        this.recognition.start();
      }
    };
  }

  async start(): Promise<void> {
    if (!this.recognition) {
      throw new Error('Recognition not initialized. Call initialize() first.');
    }
    this.recognition.start();
  }

  async stop(): Promise<void> {
    this.recognition?.stop();
  }

  onResult(callback: (result: TranscriptionResult) => void): void {
    this.resultCallback = callback;
  }

  onError(callback: (error: Error) => void): void {
    this.errorCallback = callback;
  }

  cleanup(): void {
    if (this.recognition) {
      this.recognition.abort();
      this.recognition = null;
    }
    this.resultCallback = null;
    this.errorCallback = null;
  }
}
