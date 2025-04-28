import { TranscriptionProvider, TranscriptionResult, TranscriptionOptions } from '../types';

interface ExtendedError extends Error {
  type?: string;
  link?: string;
}

export class AssemblyAIProvider implements TranscriptionProvider {
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

  name = 'assemblyai';
  isOnline = true;

  async isAvailable(): Promise<boolean> {
    try {
      await this.getToken();
      return true;
    } catch {
      return false;
    }
  }

  private async getToken(): Promise<string> {
    const response = await fetch('http://localhost:5000/api/transcripts/assemblyai-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ apiKey: this.apiKey }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      const error = new Error(data.error);      
      (error as ExtendedError).type = data.type;
      (error as ExtendedError).link = data.link;
      throw error;
    }

    return data.token;
  }  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async initialize(options?: TranscriptionOptions): Promise<void> {
    try {
      // Reset states
      this.finalTranscript = '';
      this.isPaused = false;
      this.pausedTranscript = '';
      
      const token = await this.getToken();
      
      // Get microphone stream
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Initialize WebSocket with the token
      this.socket = new WebSocket(`wss://api.assemblyai.com/v2/realtime/ws?token=${token}`);

      this.socket.onmessage = (message) => {
        const data = JSON.parse(message.data);
        if (data.message_type === 'FinalTranscript' || data.message_type === 'PartialTranscript') {
          if (this.onResultCallback) {
            if (data.message_type === 'FinalTranscript' && data.text.trim()) {
              // Add to final transcript when we get a final result
              this.finalTranscript += ' ' + data.text;
              this.finalTranscript = this.finalTranscript.trim();
              
              this.onResultCallback({
                transcript: this.finalTranscript,
                isFinal: true
              });
            } else if (data.message_type === 'PartialTranscript') {
              // For partial results, combine with the final transcript
              const combinedTranscript = this.finalTranscript + (this.finalTranscript && data.text ? ' ' : '') + data.text;
              
              this.onResultCallback({
                transcript: combinedTranscript,
                isFinal: false
              });
            }
          }
        }
      };      this.socket.onerror = () => {
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
        if (event.data.size > 0 && this.socket?.readyState === WebSocket.OPEN && !this.isPaused) {
          // Only send data if not paused
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

    // Reset the final transcript when starting a new session
    this.finalTranscript = '';
    this.mediaRecorder.start(100); // Send data every 100ms
  }

  async stop(): Promise<void> {
    if (this.mediaRecorder) {
      this.mediaRecorder.stop();
    }
    
    // Send the final transcript one last time
    if (this.onResultCallback && this.finalTranscript) {
      this.onResultCallback({
        transcript: this.finalTranscript,
        isFinal: true
      });
    }
    
    this.cleanup();
  }

  async pause(): Promise<void> {
    console.log('AssemblyAI: Pausing transcription');
    this.isPaused = true;
    this.pausedTranscript = this.finalTranscript;

    // Stop sending new data but keep connection alive
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
    }
  }

  async resume(): Promise<void> {
    console.log('AssemblyAI: Resuming transcription');
    this.isPaused = false;
    
    // Restore final transcript
    if (this.pausedTranscript) {
      this.finalTranscript = this.pausedTranscript;
    }

    // Resume sending data
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
    } else if (this.mediaRecorder && this.mediaRecorder.state === 'inactive') {
      this.mediaRecorder.start(100);
    }
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
    
    this.finalTranscript = '';
    this.isPaused = false;
    this.pausedTranscript = '';
  }
}
