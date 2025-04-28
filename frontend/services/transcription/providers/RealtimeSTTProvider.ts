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
  private workletNode: AudioWorkletNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private mediaStream: MediaStream | null = null;
  private onResultCallback: ((result: TranscriptionResult) => void) | null = null;
  private onErrorCallback: ((error: Error) => void) | null = null;
  private wsUrl: string;
  private targetSampleRate = 16000; // Rate expected by the Python server/RealtimeSTT
  private bufferSize = 4096; // Audio buffer size for worklet
  private isPaused = false; // Add this flag
  constructor({ options }: ProviderConfig) {
    // Use environment variable for URL or options URL, fallback to default localhost
    this.wsUrl = options?.wsUrl || process.env.NEXT_PUBLIC_STT_DATA_URL || 'ws://localhost:8012';
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    this.mediaStream = stream;    try {
        // Define explicit type for cross-browser AudioContext
        type AudioContextType = typeof AudioContext
        const AudioContextCtor = (window.AudioContext || (window as unknown as { webkitAudioContext: AudioContextType }).webkitAudioContext);
        this.audioContext = new AudioContextCtor();
        const sourceSampleRate = this.audioContext.sampleRate;
        console.log(`RealtimeSTTProvider: Source Sample Rate: ${sourceSampleRate}, Target: ${this.targetSampleRate}`);        // Create media stream source
        this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
        
        // Load the audio worklet module
        try {
            await this.audioContext.audioWorklet.addModule('/audio-processor.worklet.js');
            console.log("RealtimeSTTProvider: AudioWorklet module loaded successfully.");
            
            // Create the AudioWorkletNode with processor options
            this.workletNode = new AudioWorkletNode(this.audioContext, 'audio-processor', {
                processorOptions: {
                    targetSampleRate: this.targetSampleRate
                },
                outputChannelCount: [1]
            });
            
            // Set up message handler to receive processed audio chunks from the worklet
            this.workletNode.port.onmessage = (event) => {
                // Skip processing if paused
                if (this.isPaused) {
                    return;
                }
                
                // Skip if socket is not open
                if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
                    return;
                }
                
                const pcm16Data = event.data as Int16Array;
                
                if (pcm16Data && pcm16Data.length > 0) {
                    const metadata: AudioMetadata = { sampleRate: this.targetSampleRate };
                    const metadataJson = JSON.stringify(metadata);
                    const metadataBytes = new TextEncoder().encode(metadataJson);
                    const metadataLengthBytes = new ArrayBuffer(4);
                    new DataView(metadataLengthBytes).setUint32(0, metadataBytes.byteLength, true); // Use little-endian
                      // Clone the Int16Array to ensure we get a standard ArrayBuffer, not a SharedArrayBuffer
                    const pcm16Buffer = pcm16Data.slice().buffer;
                    
                    const messageBlob = new Blob([metadataLengthBytes, metadataBytes, pcm16Buffer]);
                    
                    // Send the message blob to the server
                    try {
                        this.socket.send(messageBlob);
                        // console.log(`RealtimeSTTProvider: Sent audio chunk: ${pcm16Data.length} samples`);
                    } catch (sendError) {
                        console.error("RealtimeSTTProvider: Error sending audio data:", sendError);
                        if (this.onErrorCallback) {
                            this.onErrorCallback(sendError instanceof Error ? sendError : new Error('Failed to send audio data'));
                        }
                    }
                }
            };
            
            this.workletNode.port.onmessageerror = (error) => {
                console.error("RealtimeSTTProvider: Error receiving message from worklet:", error);
                if (this.onErrorCallback) {
                    this.onErrorCallback(new Error("Error receiving message from audio worklet"));
                }
            };
            
            // Connect the source to the worklet
            this.sourceNode.connect(this.workletNode);
            
            // Optionally connect to destination for monitoring (usually not needed)
            // this.workletNode.connect(this.audioContext.destination);
            
            console.log("RealtimeSTTProvider: Audio processing started with AudioWorkletNode.");
        } catch (workletError) {
            console.error("RealtimeSTTProvider: Failed to load or initialize AudioWorklet:", workletError);
            if (this.onErrorCallback) {
                this.onErrorCallback(workletError instanceof Error ? workletError : new Error("Failed to initialize AudioWorklet"));
            }
            throw workletError;
        }

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
  // Pause audio processing and sending
  async pause(): Promise<void> {
    console.log("RealtimeSTTProvider: Pausing audio processing and sending.");
    this.isPaused = true;
    
    // Notify the worklet to pause processing
    if (this.workletNode) {
      try {
        this.workletNode.port.postMessage({ type: 'pause' });
      } catch (error) {
        console.warn("RealtimeSTTProvider: Error sending pause message to worklet:", error);
      }
    }
  }

  // Resume audio processing and sending
  async resume(): Promise<void> {
    console.log("RealtimeSTTProvider: Resuming audio processing and sending.");
    this.isPaused = false;
    
    // Ensure WebSocket is still open, re-initialize if necessary
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
    
    // Notify the worklet to resume processing
    if (this.workletNode) {
      try {
        this.workletNode.port.postMessage({ type: 'resume' });
        
        // Request statistics from the worklet
        this.workletNode.port.postMessage({ type: 'getStats' });
      } catch (error) {
        console.warn("RealtimeSTTProvider: Error sending resume message to worklet:", error);
      }
    }
  }
  private async stopAudioProcessing(): Promise<void> {
      if (this.workletNode) {
          // Send flush message to worklet to process remaining samples
          try {
              this.workletNode.port.postMessage({ type: 'flush' });
          } catch (error) {
              console.warn("RealtimeSTTProvider: Error sending flush message to worklet:", error);
          }
          
          this.workletNode.disconnect();
          this.workletNode.port.onmessage = null;
          this.workletNode.port.onmessageerror = null;
          this.workletNode = null;
          console.log("RealtimeSTTProvider: AudioWorklet node disconnected.");
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
