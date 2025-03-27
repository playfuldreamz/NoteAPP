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
  private isStopping: boolean = false;
  private finalTranscript: string = '';
  
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
    this.finalTranscript = '';
    this.isStopping = false;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    if (!this.recognition) return;

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (!this.resultCallback) return;

      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        
        if (result.isFinal) {
          this.finalTranscript += ' ' + transcript;
          this.finalTranscript = this.finalTranscript.trim();
          
          // Send the complete transcript (including all previous final results)
          this.resultCallback({ 
            transcript: this.finalTranscript, 
            isFinal: true, 
            confidence: result[0].confidence 
          });
        } else {
          interimTranscript += transcript;
          
          // Send the current interim transcript along with all previous final results
          this.resultCallback({ 
            transcript: this.finalTranscript + ' ' + interimTranscript, 
            isFinal: false, 
            confidence: result[0].confidence 
          });
        }
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (this.errorCallback) {
        this.errorCallback(new Error(event.error));
      }
    };

    this.recognition.onend = () => {
      // Only auto restart if continuous mode AND we're not explicitly stopping
      if (this.recognition?.continuous && !this.isStopping) {
        console.log('WebSpeech recognition ended, restarting because continuous mode is enabled');
        this.recognition.start();
      } else {
        console.log('WebSpeech recognition ended, not restarting');
        // If we're explicitly stopping, make sure to send the final transcript one last time
        if (this.isStopping && this.resultCallback && this.finalTranscript) {
          this.resultCallback({
            transcript: this.finalTranscript,
            isFinal: true,
            confidence: 1.0
          });
        }
        this.isStopping = false;
      }
    };
  }

  async start(): Promise<void> {
    if (!this.recognition) {
      throw new Error('Recognition not initialized. Call initialize() first.');
    }
    this.finalTranscript = '';
    this.isStopping = false;
    this.recognition.start();
  }

  async stop(): Promise<void> {
    if (this.recognition) {
      this.isStopping = true;
      this.recognition.stop();
    }
  }

  onResult(callback: (result: TranscriptionResult) => void): void {
    this.resultCallback = callback;
  }

  onError(callback: (error: Error) => void): void {
    this.errorCallback = callback;
  }

  cleanup(): void {
    if (this.recognition) {
      this.isStopping = true;
      this.recognition.abort();
      this.recognition = null;
    }
    this.resultCallback = null;
    this.errorCallback = null;
    this.finalTranscript = '';
  }
}
