// Types
export type AIProvider = 'openai' | 'gemini' | 'deepseek';
export type EmbeddingProvider = 'xenova' | 'openai';

interface AIConfig {
  provider: AIProvider;
  source: 'user' | 'app' | 'env';
  apiKey: string;
}

interface EmbeddingConfig {
  provider: EmbeddingProvider;
  source: 'user' | 'default' | 'fallback';
}

interface SummarizeResponse {
  title: string;
}

// API Functions
export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function getAIProvider(): Promise<AIConfig> {
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

  return await response.json();
}

export async function updateAIProvider(config: { provider: AIProvider, apiKey: string }): Promise<AIConfig> {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No authentication token found');

  const response = await fetch(`${API_BASE}/api/ai/config`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(config),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update AI provider');
  }

  return await response.json();
}

/**
 * Get the current embedding provider configuration
 * @returns Promise with the embedding configuration
 */
export async function getEmbeddingProvider(): Promise<EmbeddingConfig> {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No authentication token found');

  const response = await fetch(`${API_BASE}/api/ai/embedding-config`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to get embedding provider');
  }

  return await response.json();
}

/**
 * Update the embedding provider configuration
 * @param config The new embedding provider configuration
 * @returns Promise with the updated configuration
 */
export async function updateEmbeddingProvider(config: { provider: EmbeddingProvider }): Promise<EmbeddingConfig> {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No authentication token found');

  const response = await fetch(`${API_BASE}/api/ai/embedding-config`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(config),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update embedding provider');
  }

  return await response.json();
}

/**
 * Get the status of the OpenAI API key availability
 * @returns Promise with the key status information
 */
export async function getOpenAIKeyStatus(): Promise<{ available: boolean, source: 'user' | 'env' | null, valid: boolean, error?: string }> {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No authentication token found');

  const response = await fetch(`${API_BASE}/api/ai/openai-key-status`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to get OpenAI key status');
  }

  return await response.json();
}

/**
 * Get a masked version of the API key for a specific provider
 * @param provider The AI provider to get the masked key for
 * @returns Promise with the masked key information
 */
export async function getMaskedApiKey(provider: AIProvider): Promise<{ provider: string, maskedKey: string, source: 'user' | 'env' | null, available: boolean }> {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No authentication token found');

  const response = await fetch(`${API_BASE}/api/ai/masked-key/${provider}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `Failed to get masked key for ${provider}`);
  }

  return await response.json();
}

// Custom error class for API key issues
export class InvalidAPIKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidAPIKeyError';
  }
}

// Helper function to handle API errors
async function handleAPIError(response: Response): Promise<never> {
  const error = await response.json();
  if (error.code === 'INVALID_API_KEY') {
    throw new InvalidAPIKeyError(error.error);
  }
  throw new Error(error.message || 'An error occurred');
}

export async function summarizeContent(content: string): Promise<string> {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No authentication token found');

  const response = await fetch(`${API_BASE}/api/ai/tasks/summarize`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    await handleAPIError(response);
  }

  const data: SummarizeResponse = await response.json();
  return data.title;
}

export async function generateTranscriptTitle(content: string): Promise<string> {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No authentication token found');

  const response = await fetch(`${API_BASE}/api/ai/tasks/summarize`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    await handleAPIError(response);
  }

  const data: SummarizeResponse = await response.json();
  return data.title;
}

export async function updateTranscriptTitle(id: number, title: string): Promise<void> {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No authentication token found');

  const response = await fetch(`${API_BASE}/api/transcripts/${id}/title`, {
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

export async function updateNoteTitle(id: number, title: string): Promise<void> {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No authentication token found');

  const response = await fetch(`${API_BASE}/api/notes/${id}/title`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update note title');
  }
}

export async function updateNoteContent(id: number, content: string): Promise<void> {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No authentication token found');

  const response = await fetch(`${API_BASE}/api/notes/${id}/content`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update note content');
  }
}

export async function updateTranscriptContent(id: number, content: string): Promise<void> {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No authentication token found');

  const response = await fetch(`${API_BASE}/api/transcripts/${id}/content`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update transcript content');
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

  const response = await fetch(`${API_BASE}/api/ai/tasks/tags/analyze`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    await handleAPIError(response);
  }

  const data: TagAnalysisResponse = await response.json();
  return data.tags;
}

export async function createTag(name: string): Promise<Tag> {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No authentication token found');

  try {
    const response = await fetch(`${API_BASE}/api/ai/tags`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to create tag');
    }

    return data;
  } catch (error) {
    console.error('Error creating tag:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      name
    });
    throw error;
  }
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

export async function getUserTags(): Promise<Tag[]> {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No authentication token found');

  const response = await fetch(`${API_BASE}/api/ai/user-tags`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch user tags');
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

interface AddTagResponse {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export async function addTagToItem(
  type: 'note' | 'transcript',
  id: number,
  tag: { id?: number, name: string, description?: string }
): Promise<AddTagResponse> {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No authentication token found');

  try {
    const response = await fetch(`${API_BASE}/api/ai/tags/${type}/${id}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tag.id ? { tag_id: tag.id } : { name: tag.name, description: tag.description }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Failed to add tag:', {
        status: response.status,
        error: error.message || 'Unknown error',
        type,
        id,
        tag
      });
      
      // Handle specific error cases
      let errorMessage = 'Failed to add tag';
      if (response.status === 400) {
        errorMessage = 'Invalid request - please check your input';
      } else if (response.status === 404) {
        errorMessage = 'Resource not found';
      } else if (response.status === 500) {
        errorMessage = 'Server error - please try again';
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    // If we're using an existing tag, return it in the expected format
    if (tag.id) {
      return {
        id: tag.id,
        name: tag.name,
        description: tag.description,
        created_at: data.created_at || new Date().toISOString(),
        updated_at: data.updated_at || new Date().toISOString()
      };
    }
    
    return data;
  } catch (error) {
    console.error('Error in addTagToItem:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      type,
      id,
      tag
    });
    throw error;
  }
}

export async function removeTagFromItem(type: 'note' | 'transcript', id: number, tagId: number): Promise<void> {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No authentication token found');

  try {
    const response = await fetch(`${API_BASE}/api/ai/tags/${type}/${id}/${tagId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
    });

    if (!response.ok) {
      // Clone the response to allow multiple reads of the body
      const responseClone = response.clone();
      let errorMessage = 'Failed to remove tag';
      
      try {
        // First try to parse as JSON
        const error = await response.json();
        errorMessage = error.message || errorMessage;
      } catch (jsonError) {
        // If JSON parsing fails, try to get text from the cloned response
        try {
          const text = await responseClone.text();
          if (text.startsWith('<!DOCTYPE')) {
            errorMessage = 'Server error - please try again later';
          } else {
            errorMessage = text || errorMessage;
          }
        } catch (textError) {
          errorMessage = `Server returned status ${response.status}`;
        }
      }
      
      throw new Error(errorMessage);
    }
  } catch (error) {
    console.error('Error removing tag:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      type,
      id,
      tagId
    });
    throw error;
  }
}

export async function enhanceTranscript(
  transcript: string,
  onProgress?: (progress: number) => void,
  language = 'en-US'
): Promise<EnhancedTranscript> {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No authentication token found');

  const response = await fetch(`${API_BASE}/api/ai/tasks/enhance-transcription`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ transcript, language }),
  });

  if (!response.ok) {
    await handleAPIError(response);
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

  return await response.json();
}

export interface SummaryResponse {
  success: boolean;
  summary: string;
}

/**
 * Generates and saves a summary for a note or transcript
 * 
 * @param type - The item type ('note' or 'transcript')
 * @param itemId - The ID of the item
 * @returns A promise containing the generated summary
 * @throws {InvalidAPIKeyError} If the API key is invalid or missing
 * @throws {Error} For other errors
 */
export async function generateAndSaveSummary(
  type: 'note' | 'transcript', 
  itemId: number
): Promise<SummaryResponse> {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No authentication token found');

  const response = await fetch(`${API_BASE}/api/ai/summary/summarize-item/${type}/${itemId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    await handleAPIError(response);
  }

  return await response.json();
}
