import { API_BASE } from './ai';

/**
 * Triggers the regeneration of embeddings for all items (notes and transcripts)
 * @returns Promise with the status of the regeneration request
 */
export async function regenerateAllEmbeddings(): Promise<{ success: boolean, message: string, hasAPIKeyError?: boolean }> {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No authentication token found');

  try {
    const response = await fetch(`${API_BASE}/api/ai/embedding-regeneration/all`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to start embedding regeneration');
    }

    return await response.json();
  } catch (error) {
    console.error('Error regenerating embeddings:', error);
    throw error;
  }
}

/**
 * Gets the status of the embedding regeneration process
 * @returns Promise with the status information
 */
export async function getRegenerationStatus(): Promise<{ 
  inProgress: boolean, 
  total: number, 
  completed: number, 
  startTime?: string,
  errors?: Array<{itemId: number, itemType: string, error: string}>,
  fatalError?: string,
  hasAPIKeyError?: boolean,
  errorCount?: number
}> {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No authentication token found');

  try {
    const response = await fetch(`${API_BASE}/api/ai/embedding-regeneration/status`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get regeneration status');
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting regeneration status:', error);
    throw error;
  }
}
