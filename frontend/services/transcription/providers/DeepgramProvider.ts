import { TranscriptionProvider, TranscriptionResult, TranscriptionOptions } from '../types';

export class DeepgramProvider implements TranscriptionProvider {
  private socket: WebSocket | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private onResultCallback: ((result: TranscriptionResult) => void) | null = null;
  private onErrorCallback: ((error: Error) => void) | null = null;
  private apiKey: string;
  private finalTranscript: string = '';
  private isPaused: boolean = false;
  pausedTranscript: string = ''; // Changed to public to match interface

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.finalTranscript = '';
  }

  name = 'deepgram';
  isOnline = true;

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch('http://localhost:5000/api/transcripts/deepgram-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey: this.apiKey }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        if (this.onErrorCallback) {
          this.onErrorCallback(new Error(data.error || 'Failed to validate API key'));
        }
        return false;
      }

      return data.success === true;
    } catch (error) {
      if (this.onErrorCallback) {
        this.onErrorCallback(error as Error);
      }
      return false;
    }
  }

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async initialize(options?: TranscriptionOptions): Promise<void> {
  // No need to request microphone access here
  this.finalTranscript = '';
}

async start(): Promise<void> {
  try {
    // Reset states
    this.finalTranscript = '';
    this.isPaused = false;
    this.pausedTranscript = '';

    // Request microphone access
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Create MediaRecorder with appropriate settings for Deepgram
    this.mediaRecorder = new MediaRecorder(this.stream, {
      mimeType: 'audio/webm',
    });
  } catch (error) {
    if (this.onErrorCallback) {
      this.onErrorCallback(error as Error);
    }
    throw error;
  }

    try {
      // Create WebSocket connection to Deepgram with query parameters
      const params = new URLSearchParams({
        model: 'nova-2',
        language: 'en-US',
        smart_format: 'true',
        interim_results: 'true',
      });
      
      this.socket = new WebSocket(`wss://api.deepgram.com/v1/listen?${params}`, [
        'token',
        this.apiKey,
      ]);

      this.socket.onopen = () => {
        // Start recording when connection is open
        if (this.mediaRecorder) {
          this.mediaRecorder.start(250); // Send data every 250ms
        }
      };

      this.socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (this.onResultCallback && data.channel) {
          const transcript = data.channel.alternatives[0].transcript;
          const confidence = data.channel.alternatives[0].confidence;
          
          if (data.is_final && transcript.trim()) {
            // Add to final transcript when we get a final result
            this.finalTranscript += ' ' + transcript;
            this.finalTranscript = this.finalTranscript.trim();
            
            this.onResultCallback({
              transcript: this.finalTranscript,
              isFinal: true,
              confidence,
            });
          } else {
            // For interim results, combine with the final transcript
            const combinedTranscript = this.finalTranscript + (this.finalTranscript && transcript ? ' ' : '') + transcript;
            
            this.onResultCallback({
              transcript: combinedTranscript,
              isFinal: false,
              confidence,
            });
          }
        }
      };      
      this.socket.onerror = () => {
        if (this.onErrorCallback) {
          const error = new Error('WebSocket connection error');
          this.onErrorCallback(error);
        }
      };

      this.socket.onclose = () => {
        this.cleanup();
      };

      // Send audio data to Deepgram
      this.mediaRecorder.ondataavailable = async (event: BlobEvent) => {
        if (event.data.size > 0 && this.socket?.readyState === WebSocket.OPEN && !this.isPaused) {
          const arrayBuffer = await event.data.arrayBuffer();
          this.socket.send(arrayBuffer);
        }
      };

    } catch (error) {
      if (this.onErrorCallback) {
        this.onErrorCallback(error as Error);
      }
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.mediaRecorder) {
      this.mediaRecorder.stop();
    }
    if (this.socket) {
      this.socket.close();
    }
    
    // Send the final transcript one last time
    if (this.onResultCallback && this.finalTranscript) {
      this.onResultCallback({
        transcript: this.finalTranscript,
        isFinal: true,
        confidence: 1.0,
      });
    }
  }

  async pause(): Promise<void> {
    console.log('Deepgram: Pausing transcription');
    this.isPaused = true;
    this.pausedTranscript = this.finalTranscript;
    
    // Pause the media recorder but keep connection open
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
    }
  }

  async resume(): Promise<void> {
    console.log('Deepgram: Resuming transcription');
    this.isPaused = false;

    // Restore transcript state
    if (this.pausedTranscript) {
      this.finalTranscript = this.pausedTranscript;
    }

    // Resume media recorder
    if (this.mediaRecorder) {
      if (this.mediaRecorder.state === 'paused') {
        this.mediaRecorder.resume();
      } else if (this.mediaRecorder.state === 'inactive') {
        this.mediaRecorder.start(250);
      }
    }

    // Make sure connection is still alive
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.log('Deepgram: Reconnecting WebSocket...');
      await this.initialize();
    }
  }

  onResult(callback: (result: TranscriptionResult) => void): void {
    this.onResultCallback = callback;
  }

  onError(callback: (error: Error) => void): void {
    this.onErrorCallback = callback;
  }

  cleanup(): void {
    if (this.mediaRecorder) {
      if (this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }
      this.mediaRecorder = null;
    }

    if (this.socket) {
      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.close();
      }
      this.socket = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    this.onResultCallback = null;
    this.onErrorCallback = null;
    this.finalTranscript = '';
    this.isPaused = false;
    this.pausedTranscript = '';
  }
}
