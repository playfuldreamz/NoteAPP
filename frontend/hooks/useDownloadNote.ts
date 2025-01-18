import { useState } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

type DownloadFormat = 'txt' | 'json' | 'pdf';

export interface DownloadOptions {
  format: DownloadFormat;
  includeTranscript?: boolean;
  includeMetadata?: boolean;
}

interface Note {
  id: number;
  content: string;
  transcript: string;
  timestamp: string;
  title: string;
}

export function useDownloadNote() {
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadNote = async (note: Note, options: DownloadOptions) => {
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Please login to download notes');
      return;
    }

    setIsDownloading(true);

    try {
      let content = '';
      
      // Add metadata if requested
      if (options.includeMetadata) {
        content += `Title: ${note.title}\n`;
        content += `Created: ${new Date(note.timestamp).toLocaleString()}\n\n`;
      }

      // Add main content
      content += note.content;

      // Add transcript if requested
      if (options.includeTranscript && note.transcript) {
        content += `\n\n--- Transcript ---\n${note.transcript}`;
      }

      // Handle different formats
      switch (options.format) {
        case 'txt':
          downloadTextFile(content, `${note.title}.txt`);
          break;
          
        case 'json':
          downloadJsonFile({
            title: note.title,
            content: note.content,
            transcript: options.includeTranscript ? note.transcript : undefined,
            timestamp: note.timestamp
          }, `${note.title}.json`);
          break;

        case 'pdf':
          await downloadPdfFile(content, `${note.title}.pdf`);
          break;

        default:
          throw new Error('Unsupported download format');
      }

      toast.success('Download started!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download note');
    } finally {
      setIsDownloading(false);
    }
  };

  const downloadTextFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadJsonFile = (data: object, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadPdfFile = async (content: string, filename: string) => {
    // Use the browser's print functionality for PDF generation
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('Failed to open print window');
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>${filename}</title>
          <style>
            body { font-family: Arial, sans-serif; }
            h1 { color: #333; }
            .content { white-space: pre-wrap; }
          </style>
        </head>
        <body>
          <h1>${filename.replace('.pdf', '')}</h1>
          <div class="content">${content}</div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.print();
    printWindow.close();
  };

  return {
    downloadNote,
    isDownloading
  };
}
