import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify'; // Import toast for notifications
import Modal from './Modal'; // Import the Modal component
import { LucideIcon, Trash2, Eye } from 'lucide-react'; // Import Lucide icons

interface Transcript {
  date: string;
  text: string;
}

interface TranscriptsListProps {
  transcripts: Transcript[]; // Accept transcripts as a prop
  updateTranscripts: () => void; // Function to update transcripts
}

const TranscriptsList: React.FC<TranscriptsListProps> = ({ transcripts: initialTranscripts, updateTranscripts }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTranscript, setSelectedTranscript] = useState<string>('');
  const [visibleTranscripts, setVisibleTranscripts] = useState<Transcript[]>([]);
  const [showLoadMore, setShowLoadMore] = useState(true);

  useEffect(() => {
    const sortedTranscripts = [...initialTranscripts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setVisibleTranscripts(sortedTranscripts.slice(0, 5));
    setShowLoadMore(sortedTranscripts.length > 5);
  }, [initialTranscripts]);

  const handleDeleteTranscript = (index: number) => {
    const updatedTranscripts = [...initialTranscripts];
    updatedTranscripts.splice(index, 1); // Remove the transcript at the specified index
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
    return words.length > 6 ? words.slice(0, 6).join(' ') + '...' : text; // Updated to truncate at 6th word
  };

  const handleLoadMore = () => {
    const currentLength = visibleTranscripts.length;
    const newVisibleTranscripts = initialTranscripts.slice(0, currentLength + 5);
    setVisibleTranscripts(newVisibleTranscripts);
    setShowLoadMore(newVisibleTranscripts.length < initialTranscripts.length);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-8">
      {visibleTranscripts.length === 0 ? (
        <p>No transcripts available.</p>
      ) : (
        <ul>
          {visibleTranscripts.map((transcript, index) => {
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
                        <Eye size={16} />
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteTranscript(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {showLoadMore && (
        <button
          onClick={handleLoadMore}
          className="text-blue-500 hover:underline text-sm mt-4"
        >
          Load more
        </button>
      )}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} content={selectedTranscript} />
    </div>
  );
};

export default TranscriptsList;
