import { TranscriptionProvider, TranscriptionResult, TranscriptionOptions } from '../types';

export class DeepgramProvider implements TranscriptionProvider {
  private socket: WebSocket | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private onResultCallback: ((result: TranscriptionResult) => void) | null = null;
  private onErrorCallback: ((error: Error) => void) | null = null;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
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

async initialize(options?: TranscriptionOptions): Promise<void> {
  // No need to request microphone access here
}

async start(): Promise<void> {
  try {
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
          
          this.onResultCallback({
            transcript,
            isFinal: data.is_final,
            confidence,
          });
        }
      };

      this.socket.onerror = (event: Event) => {
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
        if (event.data.size > 0 && this.socket?.readyState === WebSocket.OPEN) {
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
  }
}
