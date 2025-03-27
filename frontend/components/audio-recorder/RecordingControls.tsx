import React from 'react';
import { Mic, MicOff, Pause, Square } from 'lucide-react';

interface RecordingControlsProps {
  isRecording: boolean;
  isPaused: boolean;
  elapsedTime: number;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const RecordingControls: React.FC<RecordingControlsProps> = ({
  isRecording,
  isPaused,
  elapsedTime,
  onStart,
  onStop,
  onPause,
}) => {
  const handleButtonClick = () => {
    if (!isRecording) {
      // Not recording, start recording
      onStart();
    } else if (isRecording && !isPaused) {
      // Recording and not paused, pause it
      onPause();
    } else if (isRecording && isPaused) {
      // Recording but paused, resume it
      onStart();
    }
  };

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={handleButtonClick}
        className={`p-2 rounded-lg ${
          isRecording && !isPaused
            ? 'bg-red-500 hover:bg-red-600 text-white'
            : isPaused
            ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
            : 'bg-blue-500 hover:bg-blue-600 text-white'
        }`}
        title={
          isRecording && !isPaused 
            ? 'Pause Recording' 
            : isPaused 
            ? 'Resume Recording' 
            : 'Start Recording'
        }
      >
        {isRecording && !isPaused ? (
          <Pause className="w-5 h-5" />
        ) : isPaused ? (
          <Mic className="w-5 h-5" />
        ) : (
          <Mic className="w-5 h-5" />
        )}
      </button>
      
      {isRecording && (
        <button
          onClick={onStop}
          className="p-2 rounded-lg bg-gray-500 hover:bg-gray-600 text-white"
          title="Stop Recording"
        >
          <Square className="w-5 h-5" />
        </button>
      )}
      
      {(isRecording || elapsedTime > 0) && (
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          {isRecording && !isPaused && <span className="animate-pulse mr-1 text-red-500">●</span>}
          {isPaused && <span className="mr-1 text-yellow-500">❚❚</span>}
          <span>{formatTime(elapsedTime)}</span>
        </div>
      )}
    </div>
  );
};

export default RecordingControls;