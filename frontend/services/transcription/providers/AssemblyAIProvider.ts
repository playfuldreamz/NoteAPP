import { TranscriptionProvider, TranscriptionResult, TranscriptionOptions } from '../types';

export class AssemblyAIProvider implements TranscriptionProvider {
  private socket: WebSocket | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private onResultCallback: ((result: TranscriptionResult) => void) | null = null;
  private onErrorCallback: ((error: Error) => void) | null = null;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  name = 'assemblyai';
  isOnline = true;

  async isAvailable(): Promise<boolean> {
    try {
      await this.getToken();
      return true;
    } catch (error) {
      return false;
    }
  }

  private async getToken(): Promise<string> {
    const response = await fetch('http://localhost:5000/transcripts/assemblyai-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ apiKey: this.apiKey }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      const error = new Error(data.error);
      (error as any).type = data.type;
      (error as any).link = data.link;
      throw error;
    }

    return data.token;
  }

  async initialize(options?: TranscriptionOptions): Promise<void> {
    try {
      const token = await this.getToken();
      
      // Get microphone stream
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Initialize WebSocket with the token
      this.socket = new WebSocket(`wss://api.assemblyai.com/v2/realtime/ws?token=${token}`);

      this.socket.onmessage = (message) => {
        const data = JSON.parse(message.data);
        if (data.message_type === 'FinalTranscript' || data.message_type === 'PartialTranscript') {
          if (this.onResultCallback) {
            this.onResultCallback({
              transcript: data.text,
              isFinal: data.message_type === 'FinalTranscript'
            });
          }
        }
      };

      this.socket.onerror = (error) => {
        if (this.onErrorCallback) {
          this.onErrorCallback(new Error('WebSocket error'));
        }
      };

      // Wait for socket to be ready
      await new Promise<void>((resolve, reject) => {
        if (!this.socket) return reject(new Error('Socket not initialized'));
        
        this.socket.onopen = () => {
          resolve();
        };
        
        this.socket.onclose = () => {
          reject(new Error('WebSocket connection closed'));
        };
      });

      // Initialize MediaRecorder with correct settings
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'audio/webm',
      });

      this.mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0 && this.socket?.readyState === WebSocket.OPEN) {
          // Convert audio data to the correct format
          const arrayBuffer = await event.data.arrayBuffer();
          const audioData = new Int16Array(arrayBuffer);
          
          // Send the audio data
          this.socket.send(JSON.stringify({
            audio_data: Array.from(audioData)
          }));
        }
      };

    } catch (error) {
      console.error('AssemblyAI initialization error:', error);
      throw error;
    }
  }

  async start(): Promise<void> {
    if (!this.mediaRecorder || !this.socket) {
      throw new Error('AssemblyAI provider not initialized');
    }

    this.mediaRecorder.start(100); // Send data every 100ms
  }

  async stop(): Promise<void> {
    if (this.mediaRecorder) {
      this.mediaRecorder.stop();
    }
    this.cleanup();
  }

  onResult(callback: (result: TranscriptionResult) => void): void {
    this.onResultCallback = callback;
  }

  onError(callback: (error: Error) => void): void {
    this.onErrorCallback = callback;
  }

  cleanup(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    if (this.mediaRecorder) {
      this.mediaRecorder = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }
}
