// Types
export type AIProvider = 'openai' | 'gemini';

interface AIConfig {
  provider: AIProvider;
}

interface SummarizeResponse {
  title: string;
}

// API Functions
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function getAIProvider(): Promise<AIProvider> {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No authentication token found');

  const response = await fetch(`${API_BASE}/api/ai/config`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to get AI provider');
  }

  const data: AIConfig = await response.json();
  return data.provider;
}

export async function updateAIProvider(provider: AIProvider): Promise<AIProvider> {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No authentication token found');

  const response = await fetch(`${API_BASE}/api/ai/config`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ provider }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update AI provider');
  }

  const data: AIConfig = await response.json();
  return data.provider;
}

export async function summarizeContent(content: string): Promise<string> {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No authentication token found');

  const response = await fetch(`${API_BASE}/api/ai/summarize`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to summarize content');
  }

  const data: SummarizeResponse = await response.json();
  return data.title;
}

export async function generateTranscriptTitle(content: string): Promise<string> {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No authentication token found');

  const response = await fetch(`${API_BASE}/api/ai/summarize`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to generate transcript title');
  }

  const data: SummarizeResponse = await response.json();
  return data.title;
}

export async function updateTranscriptTitle(id: number, title: string): Promise<void> {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No authentication token found');

  const response = await fetch(`${API_BASE}/api/ai/transcripts/${id}/title`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update transcript title');
  }
}

export interface EnhancedTranscript {
  enhanced: string;
  confidence: number;
  original: string;
}

export async function enhanceTranscript(
  transcript: string,
  onProgress?: (progress: number) => void,
  language = 'en-US'
): Promise<EnhancedTranscript> {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No authentication token found');

  const response = await fetch(`${API_BASE}/api/ai/enhance-transcription`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ transcript, language }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to enhance transcript');
  }

  // Handle progress updates if callback provided
  if (onProgress) {
    const reader = response.body?.getReader();
    if (reader) {
      let receivedLength = 0;
      const chunks = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        receivedLength += value.length;
        if (onProgress) {
          const contentLength = parseInt(response.headers.get('Content-Length') || '0', 10) || receivedLength;
          const progress = Math.round((receivedLength / contentLength) * 100);
          onProgress(progress);
        }
      }
      const chunksAll = new Uint8Array(receivedLength);
      let position = 0;
      for (const chunk of chunks) {
        chunksAll.set(chunk, position);
        position += chunk.length;
      }
      const result = new TextDecoder('utf-8').decode(chunksAll);
      return JSON.parse(result);
    }
  }

  return response.json();
}
