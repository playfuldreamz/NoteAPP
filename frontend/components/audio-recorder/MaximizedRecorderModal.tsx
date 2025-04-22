'use client';

import React from 'react';
import { Minimize2, Settings, Puzzle, Edit3, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRecording } from '../../context/RecordingContext';
import RecordingControls from './RecordingControls';
import WaveformVisualizer from './WaveformVisualizer';
import TranscriptionDisplay from './TranscriptionDisplay';
import RecorderActions from './RecorderActions';
import RecorderSettings from './RecorderSettings';
import ProviderIndicator from './ProviderIndicator';
import { useTranscription } from '../../context/TranscriptionContext';

const MaximizedRecorderModal: React.FC = () => {
  const {
    isRecording,
    isPaused,
    elapsedTime,
    audioStream,
    transcript,
    isEnhancing,
    isSaving,
    showEnhanced,
    isMaximized,
    startRecording,
    stopRecording,
    pauseRecording,
    saveTranscript,
    enhanceTranscript,
    resetRecording,
    setIsMaximized,
    enhancedTranscript,
    transcriptTitle,
    isEditingTitle,
    editableTitle,
    setIsEditingTitle,
    setEditableTitle,
    handleSaveTitle,
    handleCancelEdit
  } = useRecording();

  const { activeProvider, provider } = useTranscription();
  const [showSettings, setShowSettings] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState('recorder');
  const [isScrolled, setIsScrolled] = React.useState(false);

  if (!isMaximized) return null;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setIsScrolled(e.currentTarget.scrollTop > 0);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="fixed inset-4 lg:inset-8 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col max-h-[calc(100vh-2rem)] lg:max-h-[calc(100vh-4rem)]"
        >
          {/* Header */}
          <div className={`sticky top-0 z-10 px-4 sm:px-6 py-4 flex items-center gap-4 transition-shadow ${isScrolled ? 'shadow-md dark:shadow-gray-800' : ''}`}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {isEditingTitle ? (
                  <input
                    type="text"
                    value={editableTitle}
                    onChange={(e) => setEditableTitle(e.target.value)}
                    placeholder="Enter title"
                    className="text-xl font-semibold text-gray-900 dark:text-gray-100 truncate bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none"
                    autoFocus
                  />
                ) : (
                  <h2
                    className="text-xl font-semibold dark:text-gray-100 truncate cursor-pointer"
                    onClick={() => setIsEditingTitle(true)}
                  >
                    {transcriptTitle}
                  </h2>
                )}
                {isEditingTitle ? (
                  <>
                    <button
                      onClick={handleSaveTitle}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none transition-colors"
                      title="Save title"
                    >
                      <Check size={20} className="text-gray-500 dark:text-gray-400" />
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none transition-colors"
                      title="Cancel edit"
                    >
                      <X size={20} className="text-gray-500 dark:text-gray-400" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditingTitle(true)}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none transition-colors"
                    title="Edit title"
                  >
                    <Edit3 size={20} className="text-gray-500 dark:text-gray-400" />
                  </button>
                )}
              </div>
            </div>
            <button
              onClick={() => setIsMaximized(false)}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
              title="Minimize Recorder"
            >
              <Minimize2 className="w-5 h-5" />
            </button>
          </div>

          {/* Content area with custom scrollbar */}
          <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
            {/* Left panel - Recorder Content */}
            <div className="flex-1 min-w-0 overflow-y-auto px-4 sm:px-6 py-4 lg:border-r border-gray-200 dark:border-gray-700 flex flex-col gap-6"
              onScroll={handleScroll}
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgb(156 163 175) transparent'
              }}
            >
              {/* Recording Controls */}
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <RecordingControls 
                    isRecording={isRecording}
                    isPaused={isPaused}
                    elapsedTime={elapsedTime}
                    onStart={startRecording}
                    onStop={stopRecording}
                    onPause={pauseRecording}
                  />
                  <ProviderIndicator />
                </div>
              </div>

              {/* Waveform Visualizer */}
              <div 
                className={`transition-all duration-300 ease-in-out overflow-hidden rounded-lg ${
                  isRecording && !isPaused ? 'h-[75px] opacity-100' : 'h-0 opacity-0'
                }`}
              >
                <WaveformVisualizer 
                  isRecording={isRecording}
                  isPaused={isPaused}
                  audioStream={audioStream}
                  height={75}
                  theme="dark"
                />
              </div>

              {/* Transcription Display */}
              <div className="flex-grow">
                <TranscriptionDisplay
                  originalTranscript={transcript}
                  interimTranscript=""
                  enhancedTranscript={enhancedTranscript} // Use enhancedTranscript instead of transcript
                  showEnhanced={showEnhanced}
                  isEnhancing={isEnhancing}
                  enhancementProgress={0}
                />
              </div>

              {/* Recorder Actions */}
              <div className="sticky bottom-0 pt-4 bg-white dark:bg-gray-900">
                <RecorderActions
                  transcript={transcript}
                  isRecording={isRecording}
                  isEnhancing={isEnhancing}
                  isSaving={isSaving}
                  canEnhance={activeProvider === 'webspeech' && provider === 'webspeech'}
                  onEnhance={enhanceTranscript}
                  onSave={saveTranscript}
                  onReset={resetRecording}
                />
              </div>
            </div>

            {/* Right panel - Settings and Extensions */}
            <div className="flex-1 min-w-0 lg:max-w-[45%] xl:max-w-[40%] overflow-hidden flex flex-col border-t border-gray-200 dark:border-gray-700 lg:border-t-0">
              {/* Tabs navigation */}
              <div className="flex items-center px-4 sm:px-6 py-2 gap-1 border-b border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                    activeTab === 'settings'
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <Settings size={16} />
                  Settings
                </button>
                <button
                  onClick={() => setActiveTab('extensions')}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                    activeTab === 'extensions'
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <Puzzle size={16} />
                  Extensions
                </button>
              </div>

              {/* Tab panels */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
                {activeTab === 'settings' && (
                  <RecorderSettings
                    showSettings={true}
                    toggleSettings={() => setShowSettings(!showSettings)}
                  />
                )}
                {activeTab === 'extensions' && (
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Extensions panel content
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default MaximizedRecorderModal;