import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import Modal from './Modal';
import { ChevronUp, Trash2, Eye } from 'lucide-react';

interface Transcript {
  id: number;
  text: string;
  date: string;
}

interface TranscriptsListProps {
  transcripts: Transcript[];
  updateTranscripts: () => void;
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

  const handleDeleteTranscript = async (id: number) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      const response = await fetch(`http://localhost:5000/transcripts/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      if (response.ok) {
        toast.success('Transcript deleted!');
        updateTranscripts(); // Call to update transcripts in parent component
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete transcript');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete transcript');
    }
  };

  const handleSeeMore = (text: string) => {
    setSelectedTranscript(text);
    setIsModalOpen(true);
  };

  const truncateText = (text: string) => {
    const words = text.split(' ');
    return words.length > 6 ? words.slice(0, 6).join(' ') + '...' : text;
  };

  const handleLoadMore = () => {
    const currentLength = visibleTranscripts.length;
    const sortedTranscripts = [...initialTranscripts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const newVisibleTranscripts = sortedTranscripts.slice(0, currentLength + 5);
    setVisibleTranscripts(newVisibleTranscripts);
    setShowLoadMore(newVisibleTranscripts.length < initialTranscripts.length);
  };

  const handleShowLess = () => {
    const sortedTranscripts = [...initialTranscripts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setVisibleTranscripts(sortedTranscripts.slice(0, 5));
    setShowLoadMore(sortedTranscripts.length > 5);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-8">
      {visibleTranscripts.length === 0 ? (
        <p>No transcripts available.</p>
      ) : (
        <ul>
          {visibleTranscripts.map((transcript) => {
            const truncatedText = truncateText(transcript.text);
            return (
              <li key={transcript.id} className="mb-4 p-4 border border-gray-300 rounded-md">
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
                    onClick={() => handleDeleteTranscript(transcript.id)}
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
      <div className="flex justify-end mt-4">
        {showLoadMore && (
          <button onClick={handleLoadMore} className="text-blue-500 hover:underline text-sm mr-2">
            Load more
          </button>
        )}
        {visibleTranscripts.length > 5 && (
          <button onClick={handleShowLess} className="text-blue-500 hover:underline text-sm">
            <ChevronUp size={16} />
          </button>
        )}
      </div>
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} content={selectedTranscript} />
    </div>
  );
};

export default TranscriptsList;
