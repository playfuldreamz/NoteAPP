'use client';

import React, { useEffect, useRef, useState } from 'react';

interface WaveformVisualizerProps {
  isRecording: boolean;
  isPaused: boolean;
  audioStream: MediaStream | null;
  height?: number; // Recommend increasing default height slightly for better visuals
  theme?: 'light' | 'dark';
  width?: number; // Allow controlling width for flexibility
}

const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  isRecording,
  isPaused,
  audioStream,
  height = 75, // Slightly increased default height
  width = 500, // Default width
  theme = 'dark'
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null); // Keep track of the source node

  // Enhanced Colors based on theme
  const colors = {
    light: {
      background: 'transparent', // Keep background transparent
      waveformGradientStart: '#60a5fa', // Lighter blue start
      waveformGradientEnd: '#3b82f6',   // Main blue end
      centerLine: '#d1d5db',            // Light gray center line
      glow: 'rgba(59, 130, 246, 0.3)',  // Subtle blue glow
    },
    dark: {
      background: 'transparent', // Keep background transparent
      waveformGradientStart: '#2563eb', // Darker blue start
      waveformGradientEnd: '#60a5fa',   // Brighter blue end
      centerLine: '#4b5563',            // Dark gray center line
      glow: 'rgba(96, 165, 250, 0.4)',  // Brighter blue glow
    }
  };

  const selectedColors = colors[theme];

  // Initialize or reinitialize audio analyzer
  useEffect(() => {
    if (!audioStream) {
      // Clean up if stream is removed or becomes null
      stopAnimation();
      if (sourceNodeRef.current) {
        sourceNodeRef.current.disconnect();
        sourceNodeRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
         // Don't close the context immediately if we might get a new stream
         // Let the main cleanup handle it, or re-use if possible (though creating new is safer)
      }
      analyserRef.current = null;
      dataArrayRef.current = null;
      return;
    }

    // Ensure existing context is closed before creating a new one
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(console.error);
    }

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const audioContext = new AudioContextClass();
    const analyser = audioContext.createAnalyser();

    // Configure analyser for time domain data
    analyser.fftSize = 2048; // Standard value, provides 1024 data points
    const bufferLength = analyser.frequencyBinCount; // = fftSize / 2
    const dataArray = new Uint8Array(bufferLength);

    // Connect the audio stream
    const source = audioContext.createMediaStreamSource(audioStream);
    source.connect(analyser);

    // Store references
    audioContextRef.current = audioContext;
    analyserRef.current = analyser;
    dataArrayRef.current = dataArray;
    sourceNodeRef.current = source; // Store source node reference

    // Start animation immediately if conditions are met
    if (isRecording && !isPaused) {
      startAnimation();
    }

    return () => {
      // Cleanup function for when the audioStream changes or component unmounts
      stopAnimation();
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.disconnect();
        } catch (e) {
          console.warn("Error disconnecting source node:", e);
        }
        sourceNodeRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(console.error);
        audioContextRef.current = null; // Ensure ref is cleared
      }
       analyserRef.current = null;
       dataArrayRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioStream]); // Rerun when audioStream changes

  // Control animation based on recording/paused state
  useEffect(() => {
    if (isRecording && !isPaused && audioStream && analyserRef.current) {
      // Resume AudioContext if suspended (important for some browsers after inactivity)
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
      }
      startAnimation();
    } else {
      stopAnimation();
    }

    // No direct cleanup needed here as the audioStream effect handles it.
    // The stopAnimation call covers the visual part.
  }, [isRecording, isPaused, audioStream]); // Dependencies include audioStream


  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAnimation();
      // Ensure context is closed on final unmount
      if (sourceNodeRef.current) {
         try {
           sourceNodeRef.current.disconnect();
         } catch (e) { /* Ignore */ }
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(console.error);
      }
    };
  }, []);

  const startAnimation = () => {
    if (animationFrameRef.current) {
       // Already running
       return;
    }
    if (!canvasRef.current || !analyserRef.current || !dataArrayRef.current) {
      console.warn("Cannot start animation: Missing required refs.");
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    const dataArray = dataArrayRef.current;
    const bufferLength = dataArray.length; // Use the full buffer length for time domain

    const draw = () => {
      if (!analyserRef.current || !dataArrayRef.current || !canvasRef.current || !ctx) {
         stopAnimation();
         return;
      }
      // Ensure analyser and dataArray are still valid
      analyser.getByteTimeDomainData(dataArray); // Use time domain data

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // --- Draw the Center Line ---
      ctx.lineWidth = 1;
      ctx.strokeStyle = selectedColors.centerLine;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();

      // --- Draw the Mirrored Waveform ---
      ctx.lineWidth = 1.5; // Slightly thicker line for the waveform outline

      // Create gradient fill
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, selectedColors.waveformGradientStart);
      gradient.addColorStop(0.5, selectedColors.waveformGradientEnd);
      gradient.addColorStop(1, selectedColors.waveformGradientStart);
      ctx.fillStyle = gradient;

      // Add glow effect
      ctx.shadowColor = selectedColors.glow;
      ctx.shadowBlur = 8; // Adjust blur radius as needed

      ctx.beginPath();

      const sliceWidth = canvas.width * 1.0 / bufferLength;
      let x = 0;
      const centerY = canvas.height / 2;

      // Start path from the center-left
      ctx.moveTo(0, centerY);

      // Draw the top half of the waveform
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0; // Normalize data (0-255 -> 0.0-2.0)
        const y = v * centerY; // Scale to canvas height (center is 1.0 * centerY)

        ctx.lineTo(x, y);
        x += sliceWidth;
      }

      // Line to the center-right edge to close the top half visually for filling
       ctx.lineTo(canvas.width, centerY);

      // --- Optional: Draw bottom half explicitly for fill (or rely on closing path) ---
      // If we just closePath, it draws a straight line back. For a mirrored fill:
      // We need to iterate backwards to draw the bottom mirrored part.
      // Let's try fill without explicit bottom path first, it's often sufficient.
      // If fill looks wrong, uncomment and adapt this section:
      /*
      x = canvas.width; // Reset x for reverse drawing
      for (let i = bufferLength - 1; i >= 0; i--) {
         const v = dataArray[i] / 128.0;
         const mirroredY = canvas.height - (v * centerY); // Mirror the y coordinate

         ctx.lineTo(x, mirroredY);
         x -= sliceWidth;
      }
      */

      // Close the path back to the start (center-left)
      ctx.closePath();

      // Fill the shape
      ctx.fill();

       // Reset shadow for next frame elements if any (like the center line if drawn after)
       ctx.shadowColor = 'transparent';
       ctx.shadowBlur = 0;


      // Request next frame
      animationFrameRef.current = requestAnimationFrame(draw);
    };

    // Start the loop
    draw();
  };

  const stopAnimation = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Optionally clear canvas when stopped, or leave the last frame
    requestAnimationFrame(() => { // Ensure clear happens after the last frame might have rendered
        if (canvasRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                // Optionally draw a flat center line when stopped
                ctx.lineWidth = 1;
                ctx.strokeStyle = selectedColors.centerLine;
                ctx.beginPath();
                ctx.moveTo(0, canvas.height / 2);
                ctx.lineTo(canvas.width, canvas.height / 2);
                ctx.stroke();
            }
        }
    });
  };

  return (
    <div className="waveform-container w-full" style={{ height: `${height}px` }}>
      <canvas
        ref={canvasRef}
        width={width} // Use state or prop for width
        height={height} // Use prop for height
        className="w-full h-full rounded-md" // Use h-full to respect container height
        style={{ zIndex: 1 }} // zIndex might not be needed depending on layout
      />
    </div>
  );
};

export default WaveformVisualizer;