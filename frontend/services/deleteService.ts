import { API_BASE } from './userTags';

export type ResourceType = 'note' | 'transcript';

/**
 * Delete a single resource
 */
export const deleteResource = async (
  resourceType: ResourceType,
  resourceId: number,
  token: string
): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE}/${resourceType}s/${resourceId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || `Failed to delete ${resourceType}`);
    }

    return true;
  } catch (error) {
    console.error(`Delete ${resourceType} error:`, error);
    throw error;
  }
};

/**
 * Bulk delete multiple resources
 */
export const bulkDeleteResources = async (
  resourceType: ResourceType,
  resourceIds: number[],
  token: string
): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE}/${resourceType}s/bulk-delete`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ids: resourceIds })
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || `Failed to bulk delete ${resourceType}s`);
    }

    return true;
  } catch (error) {
    console.error(`Bulk delete ${resourceType}s error:`, error);
    throw error;
  }
};
