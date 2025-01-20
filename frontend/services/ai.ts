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

export interface Tag {
  id: number;
  name: string;
  description?: string;
}

export interface TagAnalysisResponse {
  tags: string[];
}

export interface EnhancedTranscript {
  enhanced: string;
  confidence: number;
  original: string;
}

// Tag-related API functions
export async function analyzeContentForTags(content: string): Promise<string[]> {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No authentication token found');

  const response = await fetch(`${API_BASE}/api/ai/tags/analyze`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to analyze content for tags');
  }

  const data: TagAnalysisResponse = await response.json();
  return data.tags;
}

export async function createTag(name: string, description?: string): Promise<Tag> {
  // Create a temporary tag object
  const tempTag = {
    id: -1,
    name,
    description
  };

  // Use the addTagToItem function with a dummy item ID
  // This will trigger the tag creation logic in the backend
  const result = await addTagToItem('note', 0, {
    name
  });

  // Return the created tag with the new ID and description
  return {
    ...tempTag,
    id: result.id
  };
}

export async function getAllTags(): Promise<Tag[]> {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No authentication token found');

  const response = await fetch(`${API_BASE}/api/ai/tags`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch tags');
  }

  return response.json();
}

export async function getTagsForItem(type: 'note' | 'transcript', id: number): Promise<Tag[]> {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No authentication token found');

  const response = await fetch(`${API_BASE}/api/ai/tags/${type}/${id}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch tags');
  }

  return response.json();
}

export async function addTagToItem(
  type: 'note' | 'transcript',
  id: number,
  tag: { id?: number, name: string, description?: string }
): Promise<{ id: number }> {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No authentication token found');

  const response = await fetch(`${API_BASE}/api/ai/tags/${id}/${type}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tagId: tag.id,
      tagName: tag.name,
      tagDescription: tag.description
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to add tag');
  }

  return response.json();
}

export async function removeTagFromItem(type: 'note' | 'transcript', id: number, tagId: number): Promise<void> {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No authentication token found');

  const response = await fetch(`${API_BASE}/api/ai/tags/${type}/${id}/${tagId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to remove tag');
  }
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
