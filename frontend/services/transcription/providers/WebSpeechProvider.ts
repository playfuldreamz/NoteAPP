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
  private isPaused: boolean = false;  private finalTranscript: string = '';
  pausedTranscript: string = ''; // Made public to match TranscriptionProvider interface
  
  // Audio enhancement components
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private enhancerNode: AudioWorkletNode | null = null;
  private destinationNode: MediaStreamAudioDestinationNode | null = null;
  private originalStream: MediaStream | null = null;
  private enhancedStream: MediaStream | null = null;
  private audioProcessor: ScriptProcessorNode | null = null;
  private speechDetector: SpeechDetector | null = null;
  
  name = 'WebSpeech';
  isOnline = false;

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

    // If we have an audio stream and automatic enhancement is not disabled
    if (options?.audioStream && options?.automaticEnhancement !== false) {
      try {
        await this.enhanceAudioStream(options.audioStream);
      } catch (error) {
        console.warn('Failed to enhance audio stream:', error);
        // Continue with original stream if enhancement fails
      }
    }

    this.setupEventListeners();
  }

  private async enhanceAudioStream(stream: MediaStream): Promise<void> {
    try {
      this.originalStream = stream;
      this.audioContext = new AudioContext();
      
      // Create source node from the input stream
      this.sourceNode = this.audioContext.createMediaStreamSource(stream);
      
      // Create destination node
      this.destinationNode = this.audioContext.createMediaStreamDestination();
      
      // Apply automatic audio enhancements
      await this.applyEnhancements();
      
      // Store the enhanced stream
      this.enhancedStream = this.destinationNode.stream;
      
      // Initialize speech detector to improve recognition during pauses
      this.speechDetector = new SpeechDetector(this.enhancedStream);
      
      console.log('Audio stream enhancement complete');
    } catch (error) {
      console.error('Error enhancing audio stream:', error);
      throw error;
    }
  }
  
  private async applyEnhancements(): Promise<void> {
    if (!this.audioContext || !this.sourceNode || !this.destinationNode) return;
    
    // 1. Apply gain boost for low volume audio
    const gainNode = this.audioContext.createGain();
    gainNode.gain.value = 1.5; // Moderate boost
    
    // 2. Apply compression to even out volumes
    const compressor = this.audioContext.createDynamicsCompressor();
    compressor.threshold.value = -30;
    compressor.knee.value = 20;
    compressor.ratio.value = 12;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;
    
    // 3. Apply equalization to enhance speech frequencies
    const lowShelf = this.audioContext.createBiquadFilter();
    lowShelf.type = 'lowshelf';
    lowShelf.frequency.value = 300;
    lowShelf.gain.value = -10; // Reduce low frequencies
    
    const highShelf = this.audioContext.createBiquadFilter();
    highShelf.type = 'highshelf';
    highShelf.frequency.value = 3000;
    highShelf.gain.value = -10; // Reduce high frequencies
    
    const midPeak = this.audioContext.createBiquadFilter();
    midPeak.type = 'peaking';
    midPeak.frequency.value = 1800; // Speech clarity range
    midPeak.Q.value = 0.8;
    midPeak.gain.value = 12; // Boost speech frequencies
    
    // 4. Create a script processor for handling audio frames directly
    this.audioProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);
    this.audioProcessor.onaudioprocess = this.processAudioBuffer.bind(this);
    
    // Connect the audio graph
    this.sourceNode.connect(gainNode);
    gainNode.connect(compressor);
    compressor.connect(lowShelf);
    lowShelf.connect(highShelf);
    highShelf.connect(midPeak);
    midPeak.connect(this.audioProcessor);
    this.audioProcessor.connect(this.destinationNode);
  }
  
  private processAudioBuffer(event: AudioProcessingEvent): void {
    const inputBuffer = event.inputBuffer;
    const outputBuffer = event.outputBuffer;
    
    // Process each channel
    for (let channel = 0; channel < outputBuffer.numberOfChannels; channel++) {
      const inputData = inputBuffer.getChannelData(channel);
      const outputData = outputBuffer.getChannelData(channel);
      
      // Apply noise gate - suppress very low signals that are likely noise
      const threshold = 0.01;
      
      for (let i = 0; i < inputData.length; i++) {
        // Simple noise gate
        if (Math.abs(inputData[i]) < threshold) {
          outputData[i] = 0;
        } else {
          outputData[i] = inputData[i];
        }
        
        // Could add more sophisticated processing here
      }
    }
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
          
          this.resultCallback({ 
            transcript: this.finalTranscript, 
            isFinal: true, 
            confidence: result[0].confidence 
          });
        } else {
          interimTranscript += transcript;
          
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
        // Don't report errors if we're intentionally pausing/stopping
        if (!this.isStopping && !this.isPaused) {
          this.errorCallback(new Error(event.error));
        }
      }
    };    this.recognition.onend = () => {
      console.log(`WebSpeech recognition ended. isPaused=${this.isPaused}, isStopping=${this.isStopping}`);
      // Only auto restart if continuous mode AND we're not explicitly stopping/pausing
      if (this.recognition?.continuous && !this.isStopping && !this.isPaused) {
        console.log('WebSpeech recognition ended, restarting because continuous mode is enabled');
        try {
          this.recognition.start();
        } catch (error) {
          // If already started, just ignore
          if (!(error instanceof Error && error.message.includes('already started'))) {
            console.error('Error restarting recognition:', error);
          }
        }
      } else {
        console.log('WebSpeech recognition ended, not restarting');
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

    // Only reset transcript if not resuming from pause
    if (!this.pausedTranscript) {
      this.finalTranscript = '';
    }
    
    this.isPaused = false;
    this.isStopping = false;

    // If recognition is in progress, don't try to start again
    if (this.recognition && !this.isPaused && !this.isStopping) {
      try {
        this.recognition.start();
      } catch (error) {
        // If already started, just ignore the error
        if (error instanceof Error && error.message.includes('already started')) {
          return;
        }
        throw error;
      }
    }
  }

  async stop(): Promise<void> {
    if (!this.recognition) return;
    
    this.isStopping = true;
    this.isPaused = false;
    this.pausedTranscript = '';
    this.recognition.stop();
    
    if (this.speechDetector) {
      this.speechDetector.stop();
    }
  }
  async pause(): Promise<void> {
    if (!this.recognition) return;

    console.log('WebSpeech: Pausing recognition');
    // Don't set isPaused until after we've stopped to prevent onend from restarting
    this.pausedTranscript = this.finalTranscript; // Store current transcript
    this.recognition.stop(); // Temporarily stop recognition
    this.isPaused = true;
  }

  async resume(): Promise<void> {
    if (!this.recognition) {
      throw new Error('Recognition not initialized. Call initialize() first.');
    }

    console.log('WebSpeech: Resuming recognition');
    if (this.pausedTranscript) {
      this.finalTranscript = this.pausedTranscript;
    }
    this.isPaused = false;
    
    try {
      this.recognition.start();
    } catch (error) {
      // If already started, just ignore the error
      if (error instanceof Error && error.message.includes('already started')) {
        return;
      }
      throw error;
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
    
    if (this.audioContext) {
      if (this.sourceNode) this.sourceNode.disconnect();
      if (this.audioProcessor) this.audioProcessor.disconnect();
      this.audioContext.close();
    }
    
    if (this.speechDetector) {
      this.speechDetector.cleanup();
      this.speechDetector = null;
    }
    
    this.audioContext = null;
    this.sourceNode = null;
    this.enhancerNode = null;
    this.destinationNode = null;
    this.originalStream = null;
    this.enhancedStream = null;
    this.audioProcessor = null;
    
    this.resultCallback = null;
    this.errorCallback = null;
    this.finalTranscript = '';
  }
}

// Helper class for speech detection
class SpeechDetector {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream;
  private dataArray: Uint8Array | null = null;
  private rafId: number | null = null;
  private silenceTimer: number | null = null;
  private isSpeaking: boolean = false;
  private onSpeechStart: (() => void) | null = null;
  private onSpeechEnd: (() => void) | null = null;
  
  constructor(stream: MediaStream) {
    this.stream = stream;
  }
  
  start(): void {
    if (this.audioContext) return;
    
    try {
      this.audioContext = new AudioContext();
      this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      
      this.analyser.fftSize = 256;
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength);
      
      this.sourceNode.connect(this.analyser);
      
      this.detectSpeech();
    } catch (error) {
      console.error('Error initializing speech detector:', error);
    }
  }
  
  private detectSpeech = () => {
    if (!this.analyser || !this.dataArray) return;
    
    this.analyser.getByteFrequencyData(this.dataArray);
    
    // Calculate average volume level
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i];
    }
    const average = sum / this.dataArray.length;
    
    // Determine if we're detecting speech
    const threshold = 15; // Adjust based on testing
    const isSpeakingNow = average > threshold;
    
    // Handle state transitions
    if (isSpeakingNow && !this.isSpeaking) {
      this.isSpeaking = true;
      if (this.silenceTimer) {
        clearTimeout(this.silenceTimer);
        this.silenceTimer = null;
      }
      if (this.onSpeechStart) this.onSpeechStart();
    } 
    else if (!isSpeakingNow && this.isSpeaking) {
      // Add a delay before considering speech ended (to handle pauses)
      if (!this.silenceTimer) {
        this.silenceTimer = window.setTimeout(() => {
          this.isSpeaking = false;
          if (this.onSpeechEnd) this.onSpeechEnd();
          this.silenceTimer = null;
        }, 1500); // 1.5 second delay
      }
    }
    
    // Continue detection loop
    this.rafId = requestAnimationFrame(this.detectSpeech);
  }
  
  stop(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }
  
  cleanup(): void {
    this.stop();
    
    if (this.sourceNode) {
      this.sourceNode.disconnect();
    }
    
    if (this.audioContext) {
      this.audioContext.close().catch(console.error);
    }
    
    this.audioContext = null;
    this.analyser = null;
    this.sourceNode = null;
    this.dataArray = null;
  }
  
  onSpeechDetected(callback: () => void): void {
    this.onSpeechStart = callback;
  }
  
  onSpeechEnded(callback: () => void): void {
    this.onSpeechEnd = callback;
  }
}
