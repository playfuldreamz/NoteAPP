import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify'; // Import toast for notifications
import Modal from './Modal'; // Import the Modal component

interface Transcript {
  date: string;
  text: string;
}

interface TranscriptsListProps {
  transcripts: Transcript[]; // Accept transcripts as a prop
}

const TranscriptsList: React.FC<TranscriptsListProps> = ({ transcripts }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTranscript, setSelectedTranscript] = useState<string>('');

  const handleDeleteTranscript = (index: number) => {
    const savedTranscripts = JSON.parse(localStorage.getItem('transcripts') || '[]');
    savedTranscripts.splice(index, 1); // Remove the transcript at the specified index
    localStorage.setItem('transcripts', JSON.stringify(savedTranscripts));
    toast.success('Transcript deleted!'); // Notify user
  };

  const handleSeeMore = (text: string) => {
    setSelectedTranscript(text);
    setIsModalOpen(true);
  };

  const truncateText = (text: string) => {
    const words = text.split(' ');
    return words.length > 10 ? words.slice(0, 10).join(' ') + '...' : text; // Updated to truncate at 10th word
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-8">
      <h2 className="text-2xl font-bold mb-4">Saved Transcripts</h2>
      {transcripts.length === 0 ? (
        <p>No transcripts available.</p>
      ) : (
        <ul>
          {transcripts.map((transcript, index) => {
            const truncatedText = truncateText(transcript.text);
            return (
              <li key={index} className="mb-4 p-4 border border-gray-300 rounded-md">
                <div className="flex justify-between">
                  <div>
                    <p className="font-semibold">{new Date(transcript.date).toLocaleString()}</p>
                    <p className="inline">{truncatedText}</p>
                    {transcript.text.split(' ').length > 10 && (
                      <button
                        onClick={() => handleSeeMore(transcript.text)}
                        className="text-blue-500 hover:underline text-xs ml-2"
                      >
                        See more
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteTranscript(index)}
                    className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} content={selectedTranscript} />
    </div>
  );
};

export default TranscriptsList;
