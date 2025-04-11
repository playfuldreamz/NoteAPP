import { API_BASE } from './userTags';

export interface BacklinkItem {
  sourceId: number;
  sourceType: string;
  sourceTitle: string;
  linkText: string; 
}

/**
 * Fetch backlinks for a specific item
 * @param type - The type of the item ('note' or 'transcript')
 * @param id - The ID of the item
 * @returns Array of backlinks
 */
export async function fetchBacklinks(type: string, id: number): Promise<BacklinkItem[]> {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found');
  }
  
  const response = await fetch(`${API_BASE}/api/links/backlinks?type=${type}&id=${id}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch backlinks');
  }
  
  const data = await response.json();
  return data.data;
}
