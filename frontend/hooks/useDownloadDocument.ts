import { useState } from 'react';
import jsPDF from 'jspdf';

interface BaseDocument {
  id: number;
  title: string;
  timestamp: string;
  tags?: Array<{ id: number; name: string }>;
}

interface Note extends BaseDocument {
  type: 'note';
  content: string;
  transcript?: string;
}

interface Transcript extends BaseDocument {
  type: 'transcript';
  content: string;
}

type DownloadableDocument = Note | Transcript;

export interface DownloadOptions {
  format: 'txt' | 'json' | 'pdf';
  includeMetadata?: boolean;
}

const useDownloadDocument = () => {
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadDocument = async (documentData: DownloadableDocument, options: DownloadOptions) => {
    setIsDownloading(true);
    
    try {
      let content = '';
      let blob: Blob;

      const generateContent = () => {
        let text = `${documentData.title}\n\n`;

        // Add tags at the top if they exist
        if (documentData.tags && documentData.tags.length > 0) {
          text += `Tags: ${documentData.tags.map(tag => tag.name).join(', ')}\n\n`;
        }
          
        if (documentData.type === 'note') {
          text += `Content:\n${documentData.content}\n\n`;
          if (documentData.transcript) {
            text += `Transcript:\n${documentData.transcript}\n\n`;
          }
        } else {
          text += `Content:\n${documentData.content}\n\n`;
        }
        
        if (options.includeMetadata) {
          text += `Additional Information:\n`;
          text += `ID: ${documentData.id}\n`;
          text += `Created: ${documentData.timestamp}\n`;
        }
        return text;
      };

      switch (options.format) {
        case 'txt':
          content = generateContent();
          blob = new Blob([content], { type: 'text/plain' });
          break;

        case 'json':
          const jsonData = {
            id: documentData.id,
            type: documentData.type,
            content: documentData.content,
            timestamp: documentData.timestamp,
            title: documentData.title,
            tags: documentData.tags || [],
            ...(documentData.type === 'note' && documentData.transcript ? { transcript: documentData.transcript } : {})
          };
          blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
          break;

        case 'pdf':
          const pdf = new jsPDF();
          const text = generateContent();
          
          // Split text into lines that fit within page width
          const splitText = pdf.splitTextToSize(text, pdf.internal.pageSize.width - 20);
          
          // Set font and size
          pdf.setFont('helvetica');
          pdf.setFontSize(12);
          
          // Calculate total height needed
          const lineHeight = 7;
          let cursorY = 10;
          
          // Add text page by page
          for (let i = 0; i < splitText.length; i++) {
            if (cursorY > pdf.internal.pageSize.height - 20) {
              pdf.addPage();
              cursorY = 10;
            }
            pdf.text(splitText[i], 10, cursorY);
            cursorY += lineHeight;
          }
          
          blob = new Blob([pdf.output('blob')], { type: 'application/pdf' });
          break;

        default:
          throw new Error(`Unsupported format: ${options.format}`);
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${documentData.title}.${options.format}`;
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

  return { downloadDocument, isDownloading };
};

export type { DownloadableDocument, Note, Transcript, BaseDocument };
export default useDownloadDocument;
