import { useState, useRef, useEffect } from 'react';

interface UseRecorderOptions {
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  onRecordingPause?: () => void;
  onRecordingResume?: () => void;
}

interface UseRecorderReturn {
  isRecording: boolean;
  isPaused: boolean;
  elapsedTime: number;
  startTime: number | null;
  pausedTime: number;
  pauseStartTime: number | null;
  startRecording: () => void;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  resetRecording: () => void;
  audioStream: MediaStream | null;
}

export function useRecorder(options: UseRecorderOptions = {}): UseRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [pausedTime, setPausedTime] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [pauseStartTime, setPauseStartTime] = useState<number | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // Timer for recording duration
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        if (startTime) {
          const currentTime = Date.now();
          // Calculate elapsed time including any previous paused time
          // but don't count the time while paused
          const elapsed = Math.floor((currentTime - startTime) / 1000) + pausedTime;
          setElapsedTime(elapsed);
        }
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording, isPaused, startTime, pausedTime]);

  // Cleanup audio resources on unmount
  useEffect(() => {
    return () => {
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
      }
      
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, [audioStream]);

  const setupAudioContext = async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream);
      
      return true;
    } catch (error) {
      console.error('Error accessing microphone:', error);
      return false;
    }
  };

  const startRecording = async () => {
    if (isRecording && isPaused) {
      // Resume recording
      resumeRecording();
      return;
    }
    
    // Setup audio context if not already done
    if (!audioStream) {
      const success = await setupAudioContext();
      if (!success) return;
    }
    
    setIsRecording(true);
    setIsPaused(false);
    setStartTime(Date.now());
    setPausedTime(0); // Reset paused time when starting a new recording
    
    if (options.onRecordingStart) {
      options.onRecordingStart();
    }
  };

  const stopRecording = () => {
    // If recording is paused, treat this as a full stop
    if (isRecording) {
      setIsRecording(false);
      setIsPaused(false);
      setStartTime(null);
      setPauseStartTime(null);
      setElapsedTime(0); // Reset the timer when stopping
      setPausedTime(0);  // Reset paused time as well
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // Stop the audio tracks
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
      }
      
      if (options.onRecordingStop) {
        options.onRecordingStop();
      }
    }
  };

  const pauseRecording = () => {
    if (!isRecording || isPaused) return;
    
    // When pausing, we need to:
    // 1. Calculate how much time has elapsed since we started/resumed recording
    // 2. Add this to our accumulated pausedTime
    if (startTime) {
      const currentTime = Date.now();
      const elapsedSinceStart = Math.floor((currentTime - startTime) / 1000);
      // Update the pausedTime to include the time elapsed since we started/resumed
      setPausedTime(prev => prev + elapsedSinceStart);
    }
    
    setIsPaused(true);
    setPauseStartTime(Date.now());
    
    // Clear the timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (options.onRecordingPause) {
      options.onRecordingPause();
    }
  };

  const resumeRecording = () => {
    if (!isRecording || !isPaused) return;
    
    setIsPaused(false);
    const now = Date.now();
    
    // When resuming, set the new startTime to now
    // We don't need to adjust pausedTime here as it's already accumulated
    setStartTime(now);
    setPauseStartTime(null);
    
    if (options.onRecordingResume) {
      options.onRecordingResume();
    }
  };

  const resetRecording = () => {
    setIsRecording(false);
    setIsPaused(false);
    setElapsedTime(0);
    setPausedTime(0);
    setStartTime(null);
    setPauseStartTime(null);
    
    // Stop and clean up any existing audio stream
    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop());
      setAudioStream(null);
    }
  };

  return {
    isRecording,
    isPaused,
    elapsedTime,
    startTime,
    pausedTime,
    pauseStartTime,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
    audioStream
  };
}
