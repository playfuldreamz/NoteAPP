import { SearchResult, SearchResponse } from '../types/search';
import { API_BASE_URL } from '../config';

/**
 * Search for notes and transcripts using semantic search
 * @param query The search query
 * @param limit Maximum number of results to return (default: 10)
 * @returns Array of search results
 */
export async function searchItems(query: string, limit: number = 10): Promise<SearchResult[]> {
  try {
    const token = localStorage.getItem('token');
    
    if (!token) {
      throw new Error('Authentication required');
    }
    
    const response = await fetch(`${API_BASE_URL}/api/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ query, limit })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to perform search');
    }
    
    const data: SearchResponse = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Search failed');
    }
    
    return data.results;
  } catch (error) {
    console.error('Error in searchItems:', error);
    throw error;
  }
}
