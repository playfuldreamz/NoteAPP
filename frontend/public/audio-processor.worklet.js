class AudioProcessor extends AudioWorkletProcessor {
  // Parameters the worklet can receive (e.g., target sample rate)
  static get parameterDescriptors() {
    return [
      { name: 'targetSampleRate', defaultValue: 16000, minValue: 8000, maxValue: 48000 }
    ];
  }
  constructor(options) {
    super(options);
    
    // Resampling State
    this.inputBuffer = []; // to hold incoming Float32 samples across process calls
    this.resampleRatio = 1.0; // calculated based on sampleRate and targetSampleRate
    this.lastInputSample = 0.0; // for linear interpolation between blocks
    
    // Processing State
    this.isPaused = false; // Flag to control processing

    // Output Buffering State
    this.outputBufferSize = 4096; // size (send ~4 times per second at 16kHz)
    this.outputBuffer = new Int16Array(this.outputBufferSize);
    this.outputBufferOffset = 0;
    
    // Stats for debugging
    this.processedFrames = 0;
    this.sentBuffers = 0;

    // Initialize resampleRatio when processor is created
    // sampleRate is a global property in AudioWorkletGlobalScope
    const targetSr = options?.processorOptions?.targetSampleRate || 16000;
    if (sampleRate > 0 && targetSr > 0) {
      this.resampleRatio = sampleRate / targetSr;
    } else {
      console.error("AudioWorklet Error: Invalid sample rates provided.", sampleRate, targetSr);
      this.resampleRatio = 1.0; // Default to no resampling on error
    }
    console.log(`AudioWorklet Initialized: sampleRate=${sampleRate}, targetSampleRate=${targetSr}, ratio=${this.resampleRatio}`);

    // Handle messages from the main thread
    this.port.onmessage = (event) => {
      try {
        const { type, data } = event.data;
        
        switch (type) {
          case 'updateSampleRate':
            const newTargetSr = data || 16000;
            if (sampleRate > 0 && newTargetSr > 0) {
              this.resampleRatio = sampleRate / newTargetSr;
              console.log(`AudioWorklet Updated: targetSampleRate=${newTargetSr}, ratio=${this.resampleRatio}`);
            }
            break;
            
          case 'pause':
            this.isPaused = true;
            console.log('AudioWorklet: Processing paused');
            break;
            
          case 'resume':
            this.isPaused = false;
            console.log('AudioWorklet: Processing resumed');
            break;
            
          case 'flush':
            this.flush();
            break;
            
          case 'getStats':
            this.port.postMessage({
              type: 'stats',
              data: {
                processedFrames: this.processedFrames,
                sentBuffers: this.sentBuffers,
                inputBufferSize: this.inputBuffer.length,
                outputBufferOffset: this.outputBufferOffset,
                resampleRatio: this.resampleRatio
              }
            });
            break;
            
          default:
            console.warn(`AudioWorklet: Unknown message type: ${type}`);
        }
      } catch (error) {
        console.error('AudioWorklet: Error handling message:', error);
      }
    };
  }
  // Linear interpolation function
  linearInterpolate(inputData, inputIndex) {
    const index1 = Math.floor(inputIndex);
    const index2 = Math.min(index1 + 1, inputData.length - 1);
    const weight = inputIndex - index1;
    
    return inputData[index1] * (1 - weight) + inputData[index2] * weight;
  }
  process(inputs, outputs, parameters) {
    // Count processed frames for statistics
    this.processedFrames++;
    
    // Using mono input on the first channel
    const inputChannel = inputs[0]?.[0];

    // If no input, skip processing
    if (!inputChannel || inputChannel.length === 0) {
      return true; // Keep processor alive
    }

    // Get the current target sample rate from parameters or use the stored value
    const targetSr = parameters.targetSampleRate[0] || 16000;
    
    // Update ratio if needed
    const currentRatio = sampleRate / targetSr;
    if (Math.abs(currentRatio - this.resampleRatio) > 1e-6) {
      console.log(`AudioWorklet: Sample rate ratio updated: ${currentRatio}`);
      this.resampleRatio = currentRatio;
    }

    // Add current input to buffer for processing
    this.inputBuffer = [...this.inputBuffer, ...inputChannel];
    
    // If paused, we still collect input but don't process it
    if (this.isPaused) {
      // Cap the buffer size when paused to prevent memory growth
      if (this.inputBuffer.length > 8192) {
        this.inputBuffer = this.inputBuffer.slice(-8192);
      }
      return true;
    }
    
    try {
      // Calculate how many output samples we can generate
      const availableInputSamples = this.inputBuffer.length;
      const possibleOutputSamples = Math.floor(availableInputSamples / this.resampleRatio);
      const samplesToProcess = Math.min(
        possibleOutputSamples,
        this.outputBufferSize - this.outputBufferOffset
      );
      
      if (samplesToProcess <= 0) {
        return true; // Not enough samples to process yet
      }
      
      // Perform linear interpolation for each output sample
      for (let outIdx = 0; outIdx < samplesToProcess; outIdx++) {
        // Calculate the exact position in the input buffer
        const inIdx = outIdx * this.resampleRatio;
        const index1 = Math.floor(inIdx);
        const index2 = Math.min(index1 + 1, availableInputSamples - 1);
        const weight = inIdx - index1;
        
        // Linear interpolation
        const sample = this.inputBuffer[index1] * (1 - weight) + this.inputBuffer[index2] * weight;
        
        // Convert to Int16 with clamping
        const clampedSample = Math.max(-1, Math.min(1, sample));
        this.outputBuffer[this.outputBufferOffset++] = 
          Math.round(clampedSample < 0 ? clampedSample * 0x8000 : clampedSample * 0x7FFF);
      }
      
      // Remove processed input samples
      const inputSamplesUsed = Math.floor(samplesToProcess * this.resampleRatio);
      this.inputBuffer = this.inputBuffer.slice(inputSamplesUsed);
      
      // Send buffer if full 
      if (this.outputBufferOffset >= this.outputBufferSize) {
        this.port.postMessage(this.outputBuffer.slice(0));
        this.sentBuffers++;
        this.outputBufferOffset = 0;
        
        // Log statistics occasionally (every 20 buffers sent)
        if (this.sentBuffers % 20 === 0) {
          console.log(`AudioWorklet stats: ${this.processedFrames} frames, ${this.sentBuffers} buffers sent`);
        }
      }
    } catch (error) {
      console.error('AudioWorklet processing error:', error);
      // Continue processing even if there's an error
    }
    
    return true;
    
    return true;
  }
  flush() {
    console.log(`AudioWorklet: Flushing ${this.outputBufferOffset} remaining samples`);
    
    // Process any remaining input samples if possible
    if (this.inputBuffer.length > 0 && !this.isPaused) {
      try {
        // Calculate how many more samples we can generate
        const availableInputSamples = this.inputBuffer.length;
        const remainingSpace = this.outputBufferSize - this.outputBufferOffset;
        const possibleOutputSamples = Math.min(
          Math.floor(availableInputSamples / this.resampleRatio),
          remainingSpace
        );
        
        // Process remaining samples
        for (let outIdx = 0; outIdx < possibleOutputSamples; outIdx++) {
          const inIdx = outIdx * this.resampleRatio;
          const index1 = Math.floor(inIdx);
          const index2 = Math.min(index1 + 1, availableInputSamples - 1);
          const weight = inIdx - index1;
          
          const sample = this.inputBuffer[index1] * (1 - weight) + this.inputBuffer[index2] * weight;
          
          const clampedSample = Math.max(-1, Math.min(1, sample));
          this.outputBuffer[this.outputBufferOffset++] = 
            Math.round(clampedSample < 0 ? clampedSample * 0x8000 : clampedSample * 0x7FFF);
        }
      } catch (error) {
        console.error('AudioWorklet: Error during flush processing:', error);
      }
    }
    
    // Send any remaining samples in the output buffer
    if (this.outputBufferOffset > 0) {
      this.port.postMessage(this.outputBuffer.slice(0, this.outputBufferOffset));
      this.sentBuffers++;
      console.log(`AudioWorklet: Flushed ${this.outputBufferOffset} samples (${this.sentBuffers} total buffers sent)`);
      this.outputBufferOffset = 0;
    }
    
    // Clear input buffer
    this.inputBuffer = [];
  }
}

registerProcessor("audio-processor", AudioProcessor);
