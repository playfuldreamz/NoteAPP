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
