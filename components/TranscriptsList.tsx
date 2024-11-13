import React, { useEffect, useState } from 'react';

const TranscriptsList: React.FC = () => {
  const [transcripts, setTranscripts] = useState<{ date: string; text: string }[]>([]);

  const fetchTranscripts = () => {
    const savedTranscripts = JSON.parse(localStorage.getItem('transcripts') || '[]');
    setTranscripts(savedTranscripts);
  };

  useEffect(() => {
    fetchTranscripts();
  }, []);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-8">
      <h2 className="text-2xl font-bold mb-4">Saved Transcripts</h2> {/* Added header */}
      {transcripts.length === 0 ? (
        <p>No transcripts available.</p>
      ) : (
        <ul>
          {transcripts.map((transcript, index) => (
            <li key={index} className="border-b py-2">
              <p className="font-semibold">{new Date(transcript.date).toLocaleString()}</p>
              <p>{transcript.text}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default TranscriptsList;
