import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify'; // Import toast for notifications
import Modal from './Modal'; // Import the Modal component

interface Transcript {
  date: string;
  text: string;
}

interface TranscriptsListProps {
  transcripts: Transcript[]; // Accept transcripts as a prop
  updateTranscripts: () => void; // Function to update transcripts
}

const TranscriptsList: React.FC<TranscriptsListProps> = ({ transcripts: initialTranscripts, updateTranscripts }) => {
  const [transcripts, setTranscripts] = useState<Transcript[]>(initialTranscripts);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTranscript, setSelectedTranscript] = useState<string>('');

  useEffect(() => {
    //console.log('TranscriptsList re-rendered with new transcripts:', initialTranscripts); // Log when the component re-renders
    setTranscripts(initialTranscripts);
  }, [initialTranscripts]);

  const handleDeleteTranscript = (index: number) => {
    const updatedTranscripts = [...transcripts];
    updatedTranscripts.splice(index, 1); // Remove the transcript at the specified index
    setTranscripts(updatedTranscripts); // Update local state
    localStorage.setItem('transcripts', JSON.stringify(updatedTranscripts)); // Update local storage
    toast.success('Transcript deleted!'); // Notify user
    updateTranscripts(); // Call to update transcripts in parent component
  };

  const handleSeeMore = (text: string) => {
    setSelectedTranscript(text);
    setIsModalOpen(true);
  };

  const truncateText = (text: string) => {
    const words = text.split(' ');
    return words.length > 8 ? words.slice(0, 8).join(' ') + '...' : text; // Updated to truncate at 6th word
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
                    {transcript.text.split(' ').length > 6 && (
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
