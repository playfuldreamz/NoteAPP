import { TranscriptionProvider, TranscriptionResult, TranscriptionOptions, ProviderConfig } from '../types';

// Define the expected structure of metadata sent with audio
interface AudioMetadata {
  sampleRate: number;
}

export class RealtimeSTTProvider implements TranscriptionProvider {
  public name = 'realtimestt';
  public isOnline = true; // Requires connection to the local server

  private socket: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private mediaStream: MediaStream | null = null;
  private onResultCallback: ((result: TranscriptionResult) => void) | null = null;
  private onErrorCallback: ((error: Error) => void) | null = null;
  private wsUrl: string;
  private targetSampleRate = 16000; // Rate expected by the Python server/RealtimeSTT
  private bufferSize = 1024; // Audio processing buffer size
  private isPaused = false; // Add this flag

  constructor(config: ProviderConfig) {
    // Use environment variable for URL, fallback to default localhost
    this.wsUrl = process.env.NEXT_PUBLIC_STT_DATA_URL || 'ws://localhost:8012';
    console.log(`RealtimeSTTProvider initialized. WebSocket URL: ${this.wsUrl}`);
  }

  async isAvailable(): Promise<boolean> {
    // Basic check: Can we establish a quick connection?
    return new Promise((resolve) => {
      try {
        const testSocket = new WebSocket(this.wsUrl);
        testSocket.onopen = () => {
          testSocket.close();
          console.log("RealtimeSTT server check: Connection successful.");
          resolve(true);
        };
        testSocket.onerror = (error) => {
          console.error("RealtimeSTT server check: Connection failed.", error);
          testSocket.close();
          resolve(false);
        };
        // Timeout if connection takes too long
        setTimeout(() => {
             if (testSocket.readyState !== WebSocket.OPEN && testSocket.readyState !== WebSocket.CLOSED) {
                  console.warn("RealtimeSTT server check: Connection attempt timed out.");
                  testSocket.close();
                  resolve(false);
             }
        }, 2000); // 2 second timeout
      } catch (error) {
        console.error("RealtimeSTT server check: Error creating WebSocket.", error);
        resolve(false);
      }
    });
  }

  async initialize(options?: TranscriptionOptions): Promise<void> {
    console.log("RealtimeSTTProvider: Initializing...");
    return new Promise((resolve, reject) => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        console.log("RealtimeSTTProvider: Already initialized.");
        resolve();
        return;
      }

      try {
        this.socket = new WebSocket(this.wsUrl);

        this.socket.onopen = () => {
          console.log("RealtimeSTTProvider: WebSocket connection opened.");
          resolve();
        };

        this.socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (this.onResultCallback) {
              if (data.type === 'realtime' || data.type === 'fullSentence') {
                this.onResultCallback({
                  transcript: data.text || '',
                  isFinal: true,
                });
              } else {
                 console.warn("RealtimeSTTProvider: Received unknown message type:", data.type);
              }
            }
          } catch (error) {
            console.error("RealtimeSTTProvider: Error parsing message:", error);
            if (this.onErrorCallback) {
              this.onErrorCallback(new Error("Error parsing server message"));
            }
          }
        };

        this.socket.onerror = (event) => {
          console.error("RealtimeSTTProvider: WebSocket error:", event);
          const error = new Error("WebSocket connection error");
          if (this.onErrorCallback) {
            this.onErrorCallback(error);
          }
          if (this.socket?.readyState !== WebSocket.OPEN) {
               reject(error);
          }
          this.cleanup();
        };

        this.socket.onclose = (event) => {
          console.log(`RealtimeSTTProvider: WebSocket connection closed. Code: ${event.code}, Reason: ${event.reason}`);
          this.cleanup();
        };

      } catch (error) {
         console.error("RealtimeSTTProvider: Failed to create WebSocket.", error);
         reject(error);
      }
    });
  }

  async start(stream?: MediaStream): Promise<void> {
    console.log("RealtimeSTTProvider: Start called.");
    this.isPaused = false; // Ensure not paused when starting

    // --- Ensure WebSocket is connected --- START
    try {
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
        console.log("RealtimeSTTProvider: WebSocket not connected or closed. Re-initializing...");
        await this.initialize(); // Wait for initialization to complete
        // Check again after attempting to initialize
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
          throw new Error('RealtimeSTTProvider: Failed to re-establish WebSocket connection.');
        }
        console.log("RealtimeSTTProvider: WebSocket re-initialized successfully.");
      }
    } catch (initError) {
      console.error("RealtimeSTTProvider: Error during re-initialization:", initError);
      this.cleanup(); // Clean up any partial state
      throw initError; // Re-throw the error to be caught by the caller
    }
    // --- Ensure WebSocket is connected --- END

    // --- Existing checks and logic --- START
    if (!stream) {
        throw new Error('RealtimeSTTProvider: MediaStream is required to start recording.');
    }
    if (this.audioContext) {
        console.warn("RealtimeSTTProvider: Audio context already exists. Stopping previous processing first.");
        await this.stopAudioProcessing(); // Ensure previous audio processing is fully stopped
    }

    console.log("RealtimeSTTProvider: Starting audio processing...");
    this.mediaStream = stream;

    try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const sourceSampleRate = this.audioContext.sampleRate;
        console.log(`RealtimeSTTProvider: Source Sample Rate: ${sourceSampleRate}, Target: ${this.targetSampleRate}`);

        // --- Existing audio processing setup --- 
        // ... (createMediaStreamSource, createScriptProcessor, onaudioprocess, connect nodes)
        this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
        this.processorNode = this.audioContext.createScriptProcessor(this.bufferSize, 1, 1);

        this.processorNode.onaudioprocess = (event: AudioProcessingEvent) => {
            // **** Check if paused ****
            if (this.isPaused) {
                return; // Do not process or send audio if paused
            }
            // **** End Check ****

            if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
                // Added check here too, although initialize should handle it.
                // console.warn("RealtimeSTTProvider: WebSocket closed during audio processing.");
                return; 
            }

            const inputData = event.inputBuffer.getChannelData(0);
            const downsampleFactor = sourceSampleRate / this.targetSampleRate;
            const outputLength = Math.floor(inputData.length / downsampleFactor);
            const pcm16Data = new Int16Array(outputLength);
            let outputIndex = 0;

            // Simple averaging for downsampling (consider a better algorithm if needed)
            while (outputIndex < outputLength) {
                let sum = 0;
                const nextInputIndex = Math.round((outputIndex + 1) * downsampleFactor);
                // Ensure indices are within bounds
                const startIndex = Math.min(Math.max(0, Math.round(outputIndex * downsampleFactor)), inputData.length);
                const endIndex = Math.min(Math.max(startIndex, nextInputIndex), inputData.length);
                const count = endIndex - startIndex;

                for (let i = startIndex; i < endIndex; i++) {
                    sum += inputData[i];
                }
                // Avoid division by zero
                const average = count > 0 ? sum / count : 0;
                // Clamp values to int16 range
                pcm16Data[outputIndex] = Math.max(-32768, Math.min(32767, Math.round(average * 32767))); 
                outputIndex++;
            }

            if (pcm16Data.length > 0 && this.socket && this.socket.readyState === WebSocket.OPEN) {
                const metadata: AudioMetadata = { sampleRate: this.targetSampleRate };
                const metadataJson = JSON.stringify(metadata);
                const metadataBytes = new TextEncoder().encode(metadataJson);
                const metadataLengthBytes = new ArrayBuffer(4);
                new DataView(metadataLengthBytes).setUint32(0, metadataBytes.byteLength, true); // Use little-endian

                const messageBlob = new Blob([metadataLengthBytes, metadataBytes, pcm16Data.buffer]);
                this.socket.send(messageBlob);
            }
        };

        this.sourceNode.connect(this.processorNode);
        this.processorNode.connect(this.audioContext.destination); // Connect to destination to potentially enable audio monitoring if needed, or keep disconnected if not

        console.log("RealtimeSTTProvider: Audio processing started.");
        // --- Existing audio processing setup --- END

    } catch (error) {
         console.error("RealtimeSTTProvider: Error setting up audio processing:", error);
         this.cleanup(); // Ensure cleanup on error
         if (this.onErrorCallback) {
             this.onErrorCallback(error instanceof Error ? error : new Error("Audio processing setup failed"));
         }
         // Re-throw the error so the calling context knows setup failed
         throw error;
    }
    // --- Existing checks and logic --- END
  }

  // --- Add pause() method ---
  async pause(): Promise<void> {
    console.log("RealtimeSTTProvider: Pausing audio sending.");
    this.isPaused = true;
    // Do NOT stop audio processing or close WebSocket here
  }
  // --- End pause() method ---

  // --- Add resume() method ---
  async resume(): Promise<void> {
    console.log("RealtimeSTTProvider: Resuming audio sending.");
    this.isPaused = false;
    // Ensure WebSocket is still open, re-initialize if necessary?
    // For now, assume the connection stays open during pause.
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
        console.warn("RealtimeSTTProvider: WebSocket closed during pause. Attempting re-initialization on resume...");
        try {
            await this.initialize();
            if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
                throw new Error("Failed to re-establish WebSocket connection on resume.");
            }
            console.log("RealtimeSTTProvider: WebSocket re-initialized successfully on resume.");
        } catch (error) {
            console.error("RealtimeSTTProvider: Error re-initializing WebSocket on resume:", error);
            if (this.onErrorCallback) {
                this.onErrorCallback(error instanceof Error ? error : new Error("WebSocket resume failed"));
            }
            // Optionally, try to cleanup fully
            await this.cleanup();
            throw error; // Re-throw
        }
    }
  }
  // --- End resume() method ---

  private async stopAudioProcessing(): Promise<void> {
      if (this.processorNode) {
          this.processorNode.disconnect();
          this.processorNode.onaudioprocess = null;
          this.processorNode = null;
          console.log("RealtimeSTTProvider: Processor node disconnected.");
      }
      if (this.sourceNode) {
          this.sourceNode.disconnect();
          this.sourceNode = null;
          console.log("RealtimeSTTProvider: Source node disconnected.");
      }
      if (this.mediaStream) {
          this.mediaStream.getTracks().forEach(track => track.stop());
          console.log("RealtimeSTTProvider: MediaStream tracks stopped.");
          this.mediaStream = null;
      }
      if (this.audioContext && this.audioContext.state !== 'closed') {
          try {
              await this.audioContext.close();
              console.log("RealtimeSTTProvider: AudioContext closed.");
          } catch (error) {
               console.error("RealtimeSTTProvider: Error closing AudioContext:", error);
          }
          this.audioContext = null;
      }
  }

  async stop(): Promise<void> {
    console.log("RealtimeSTTProvider: Stopping (full stop)..."); // Clarify log
    this.isPaused = false; // Reset pause state on full stop
    await this.stopAudioProcessing();

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log("RealtimeSTTProvider: Closing WebSocket connection.");
      this.socket.close();
    }
    this.socket = null;
  }

  onResult(callback: (result: TranscriptionResult) => void): void {
    this.onResultCallback = callback;
  }

  onError(callback: (error: Error) => void): void {
    this.onErrorCallback = callback;
  }

  async cleanup(): Promise<void> {
    console.log("RealtimeSTTProvider: Cleaning up resources...");
    await this.stopAudioProcessing();

    if (this.socket) {
      if (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING) {
        this.socket.close();
        console.log("RealtimeSTTProvider: WebSocket connection closed during cleanup.");
      }
      this.socket.onopen = null;
      this.socket.onmessage = null;
      this.socket.onerror = null;
      this.socket.onclose = null;
      this.socket = null;
    }
    this.onResultCallback = null;
    this.onErrorCallback = null;
    console.log("RealtimeSTTProvider: Cleanup complete.");
  }
}
