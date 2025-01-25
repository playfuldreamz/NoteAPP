import { TranscriptionProvider, TranscriptionOptions, TranscriptionResult } from '../types';

export class AssemblyAIProvider implements TranscriptionProvider {
  private socket: WebSocket | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private apiKey: string | undefined;
  private resultCallback: ((result: TranscriptionResult) => void) | null = null;
  private errorCallback: ((error: Error) => void) | null = null;

  name = 'AssemblyAI';
  isOnline = true;  // Requires internet connection

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) return false;
    
    try {
      const response = await fetch('https://api.assemblyai.com/v2/realtime/token', {
        method: 'POST',
        headers: {
          'authorization': this.apiKey,
        },
      });
      
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async initialize(options?: TranscriptionOptions): Promise<void> {
    if (!this.apiKey) {
      throw new Error('AssemblyAI API key is required');
    }

    try {
      // Get AssemblyAI real-time token
      const response = await fetch('https://api.assemblyai.com/v2/realtime/token', {
        method: 'POST',
        headers: {
          'authorization': this.apiKey,
        },
      });

      const { token } = await response.json();

      // Initialize WebSocket connection
      this.socket = new WebSocket(`wss://api.assemblyai.com/v2/realtime/ws?token=${token}`);
      
      this.socket.onmessage = (message) => {
        const data = JSON.parse(message.data);
        if (data.message_type === 'FinalTranscript' || data.message_type === 'PartialTranscript') {
          if (this.resultCallback) {
            this.resultCallback({
              transcript: data.text,
              isFinal: data.message_type === 'FinalTranscript',
              confidence: data.confidence
            });
          }
        }
      };

      this.socket.onerror = (error) => {
        if (this.errorCallback) {
          this.errorCallback(new Error('WebSocket error: ' + error.type));
        }
      };

      // Initialize media recorder
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (this.socket?.readyState === WebSocket.OPEN) {
          this.socket.send(JSON.stringify({
            audio_data: event.data
          }));
        }
      };

    } catch (error) {
      throw new Error('Failed to initialize AssemblyAI provider: ' + error);
    }
  }

  async start(): Promise<void> {
    if (!this.mediaRecorder) {
      throw new Error('MediaRecorder not initialized');
    }

    this.mediaRecorder.start(1000);  // Send data every second
  }

  async stop(): Promise<void> {
    if (this.mediaRecorder) {
      this.mediaRecorder.stop();
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
    
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  onResult(callback: (result: TranscriptionResult) => void): void {
    this.resultCallback = callback;
  }

  onError(callback: (error: Error) => void): void {
    this.errorCallback = callback;
  }

  cleanup(): void {
    if (this.mediaRecorder) {
      if (this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
      this.mediaRecorder = null;
    }

    if (this.socket) {
      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.close();
      }
      this.socket = null;
    }

    this.resultCallback = null;
    this.errorCallback = null;
  }
}
