import { jwtDecode } from 'jwt-decode';

interface Tag {
  id: number;
  name: string;
  created_at?: string;
  // Add other fields that might come from the API
}

export interface UserTag extends Tag {
  is_user_tag: boolean;
}

// API Functions
export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function getUserTags(): Promise<UserTag[]> {
  const token = localStorage.getItem('token');
  console.log('Token from localStorage:', token); // Add this line
  if (!token) {
    console.error('No authentication token found in localStorage');
    throw new Error('Please log in to access user tags');
  }

  try {
    const response = await fetch(`${API_BASE}/api/ai/user-tags`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-User-Id': getUserIdFromToken(token)
      },
    });

    if (response.status === 401) {
      console.error('Authentication failed - invalid or expired token');
      throw new Error('Your session has expired. Please log in again.');
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch user tags');
    }

    const tags: Tag[] = await response.json();
    return tags.map((tag: Tag) => ({
      ...tag,
      is_user_tag: !!tag.created_at
    }));
  } catch (error) {
    console.error('Error fetching user tags:', error);
    throw error;
  }
}

function getUserIdFromToken(token: string): string {
  try {
    const decoded: { id?: number } = jwtDecode(token);
    console.log('Decoded token:', decoded);
    
    if (!decoded.id) {
      throw new Error('Invalid token: missing user ID');
    }
    return decoded.id.toString(); // Convert number to string
  } catch (error) {
    console.error('Error decoding token:', error);
    throw new Error('Invalid token');
  }
}

export async function addUserTag(tagId: number): Promise<void> {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Please log in to add user tags');
  }

  try {
    const response = await fetch(`${API_BASE}/api/ai/user-tags`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-User-Id': getUserIdFromToken(token)
      },
      body: JSON.stringify({ tag_id: tagId })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to add user tag');
    }
  } catch (error) {
    console.error('Error adding user tag:', error);
    throw error;
  }
}

export async function deleteUserTag(tagId: number): Promise<void> {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('Please log in to delete user tags');
  }

  try {
    const response = await fetch(`${API_BASE}/api/ai/user-tags/${tagId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-User-Id': getUserIdFromToken(token)
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete user tag');
    }
  } catch (error) {
    console.error('Error deleting user tag:', error);
    throw error;
  }
}
