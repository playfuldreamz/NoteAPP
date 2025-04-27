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
  startRecording: (manageStream?: boolean) => Promise<MediaStream | null>; // Return stream or null
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

  const startRecording = async (manageStream: boolean = true): Promise<MediaStream | null> => {
    console.log(`useRecorder: startRecording called with manageStream=${manageStream}`);
    if (isRecording && isPaused) {
      resumeRecording();
      // Resuming doesn't return a new stream, rely on existing state if needed
      // Or perhaps the caller should handle resume logic differently?
      // For now, returning null as we didn't *acquire* a stream here.
      return audioStream; // Return existing stream on resume
    }

    // Reset state for a new recording attempt
    setIsRecording(false); // Reset flags first
    setIsPaused(false);
    setStartTime(null);
    setPausedTime(0);
    setElapsedTime(0);
    if (timerRef.current) clearInterval(timerRef.current);

    // Stop any existing stream
    if (audioStream) {
      console.log("useRecorder: Stopping existing audio stream tracks.");
      audioStream.getTracks().forEach(track => track.stop());
      setAudioStream(null);
    }

    // Set recording state immediately for UI responsiveness
    setIsRecording(true);
    setStartTime(Date.now());

    if (manageStream) {
      console.log("useRecorder: Attempting to manage stream (getUserMedia)...");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log("useRecorder: getUserMedia successful.");
        setAudioStream(stream); // Set state
        if (options.onRecordingStart) {
          options.onRecordingStart();
        }
        return stream; // Return the acquired stream
      } catch (error) {
        console.error('useRecorder: Error accessing microphone:', error);
        // Reset state fully on failure
        setIsRecording(false);
        setStartTime(null);
        setAudioStream(null);
        return null; // Indicate failure by returning null
      }
    } else {
      console.log("useRecorder: Not managing stream. Starting timer/UI state only.");
      // If not managing stream, success means UI state is set
      if (options.onRecordingStart) {
        options.onRecordingStart();
      }
      // No stream was acquired or requested in this mode
      return null; // Indicate success (UI state set) but no stream returned
    }
  };

  const stopRecording = () => {
    // If recording is paused, treat this as a full stop
    if (isRecording) {
      console.log("useRecorder: stopRecording called.");
      // Store the final elapsed time before stopping
      const finalElapsedTime = elapsedTime;

      setIsRecording(false);
      setIsPaused(false);
      setStartTime(null);
      setPauseStartTime(null);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      // Stop the audio tracks if they exist
      if (audioStream) {
        console.log("useRecorder: Stopping audio stream tracks on stopRecording.");
        audioStream.getTracks().forEach(track => track.stop());
        setAudioStream(null); // Clear the stream state
      }

      if (options.onRecordingStop) {
        options.onRecordingStop();
      }
    }
  };

  const pauseRecording = () => {
    if (!isRecording || isPaused) return;
    console.log("useRecorder: pauseRecording called."); // Added log

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

    // Disable audio tracks instead of stopping them
    if (audioStream) {
      console.log("useRecorder: Disabling audio stream tracks.");
      audioStream.getTracks().forEach(track => track.enabled = false);
    }

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
    console.log("useRecorder: resumeRecording called."); // Added log

    // Enable audio tracks
    if (audioStream) {
      console.log("useRecorder: Enabling audio stream tracks.");
      audioStream.getTracks().forEach(track => track.enabled = true);
    }

    setIsPaused(false);
    const now = Date.now();
    
    // When resuming, set the new startTime to now
    // We don't need to adjust pausedTime here as it's already accumulated
    setStartTime(now);
    setPauseStartTime(null);
    
    // Call the callback *after* enabling tracks
    if (options.onRecordingResume) {
      options.onRecordingResume();
    }
  };

  const resetRecording = () => {
    console.log("useRecorder: resetRecording called.");
    setIsRecording(false);
    setIsPaused(false);
    setElapsedTime(0);
    setPausedTime(0);
    setStartTime(null);
    setPauseStartTime(null);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Stop and clean up any existing audio stream
    if (audioStream) {
      console.log("useRecorder: Stopping audio stream tracks on resetRecording.");
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
