import { useState } from 'react';

export interface DownloadOptions {
  format: 'txt' | 'json' | 'pdf';
  includeTranscript?: boolean;
  includeMetadata?: boolean;
}

interface Note {
  id: number;
  content: string;
  transcript?: string;
  timestamp: string;
  title: string;
  tags?: Array<{ id: number; name: string }>;
}

const useDownloadNote = () => {
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadNote = async (note: Note, options: DownloadOptions) => {
    setIsDownloading(true);
    
    try {
      let content = '';
      const metadata = {
        id: note.id,
        title: note.title,
        timestamp: note.timestamp,
        tags: note.tags || []
      };

      switch (options.format) {
        case 'txt':
          content = `Title: ${note.title}\n\n`;
          content += `Content:\n${note.content}\n\n`;
          if (options.includeTranscript && note.transcript) {
            content += `Transcript:\n${note.transcript}\n\n`;
          }
          if (options.includeMetadata) {
            content += `Metadata:\n`;
            content += `ID: ${metadata.id}\n`;
            content += `Timestamp: ${metadata.timestamp}\n`;
            if (metadata.tags.length > 0) {
              content += `Tags: ${metadata.tags.map(tag => tag.name).join(', ')}\n`;
            }
          }
          break;

        case 'json':
          const jsonData = {
            ...note,
            metadata: options.includeMetadata ? metadata : undefined
          };
          content = JSON.stringify(jsonData, null, 2);
          break;

        case 'pdf':
          // PDF generation would require a library like pdf-lib or jsPDF
          // For now, we'll just create a text-based PDF
          content = `Title: ${note.title}\n\n`;
          content += `Content:\n${note.content}\n\n`;
          if (options.includeTranscript && note.transcript) {
            content += `Transcript:\n${note.transcript}\n\n`;
          }
          if (options.includeMetadata) {
            content += `Metadata:\n`;
            content += `ID: ${metadata.id}\n`;
            content += `Timestamp: ${metadata.timestamp}\n`;
            if (metadata.tags.length > 0) {
              content += `Tags: ${metadata.tags.map(tag => tag.name).join(', ')}\n`;
            }
          }
          break;
      }

      const blob = new Blob([content], { type: getMimeType(options.format) });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${note.title || 'note'}.${options.format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  const getMimeType = (format: string) => {
    switch (format) {
      case 'txt':
        return 'text/plain';
      case 'json':
        return 'application/json';
      case 'pdf':
        return 'application/pdf';
      default:
        return 'text/plain';
    }
  };

  return { downloadNote, isDownloading };
};

export default useDownloadNote;
