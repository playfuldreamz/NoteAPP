import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  Circle, 
  XCircle, 
  RotateCw, 
  ListTodo, 
  Info, 
  ClipboardList 
} from 'lucide-react';
import { formatUTCTimestampToLongLocal } from '../utils/dateUtils';

interface ActionItem {
  id: number;
  content: string;
  deadline: string | null;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'completed' | 'cancelled';
  confidence: number;
  metadata: {
    contextualClues: string[];
    originalText: string;
  };
}

interface ActionItemsModuleProps {
  itemId: number;
  type: 'note' | 'transcript';
  content: string;
  onUpdate?: () => void;
}

const ActionItemsModule: React.FC<ActionItemsModuleProps> = ({
  itemId,
  type,
  content,
  onUpdate
}) => {
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<{
    status?: string;
    priority?: string;
  }>({});

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  // Helper function to get auth token
  const getAuthToken = () => {
    return localStorage.getItem('token');
  };

  // Helper function to format date safely
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No deadline';
    try {
      return formatUTCTimestampToLongLocal(dateString);
    } catch {
      return 'Invalid date';
    }
  };
  // Fetch action items
  const fetchActionItems = useCallback(async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        setError('Authentication required');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/action-items?sourceId=${itemId}&sourceType=${type}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch action items');
      }

      const data = await response.json();
      setActionItems(data);
      setError(null);
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Failed to fetch action items');
    }
  }, [itemId, type, API_BASE_URL]); // Add dependencies for fetchActionItems

  // Extract action items
  const extractActionItems = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${API_BASE_URL}/api/action-items/extract`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          sourceId: itemId,
          sourceType: type,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to extract action items');
      }

      const data = await response.json();
      
      if (!data.actionItems || data.actionItems.length === 0) {
        toast.info('No action items found in the text');
        return;
      }

      // Fetch the updated list of action items after extraction
      await fetchActionItems();
      
      toast.success(`Found ${data.actionItems.length} action item${data.actionItems.length === 1 ? '' : 's'}`);
    } catch (error) {
      console.error('Extract error:', error);
      setError(error instanceof Error ? error.message : 'Failed to extract action items');
      toast.error(error instanceof Error ? error.message : 'Failed to extract action items');
    } finally {
      setLoading(false);
    }
  };

  // Update action item status
  const updateActionItem = async (id: number, updates: Partial<ActionItem>) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/action-items/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Failed to update action item');
      await fetchActionItems();
      if (onUpdate) onUpdate();
    } catch (err) {
      setError('Failed to update action item');
      console.error(err);
    }
  };

  // Delete action item
  const deleteActionItem = async (id: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/action-items/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        },
      });

      if (!response.ok) throw new Error('Failed to delete action item');
      await fetchActionItems();
      if (onUpdate) onUpdate();
    } catch (err) {
      setError('Failed to delete action item');
      console.error(err);
    }
  };

  useEffect(() => {
    fetchActionItems();
  }, [itemId, fetchActionItems]); // Add fetchActionItems to dependencies

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-500 dark:text-red-400';
      case 'medium': return 'text-yellow-500 dark:text-yellow-400';
      case 'low': return 'text-green-500 dark:text-green-400';
      default: return 'text-gray-500 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="text-green-500" />;
      case 'cancelled': return <XCircle className="text-red-500" />;
      default: return <Circle className="text-gray-500" />;
    }
  };

  const filteredItems = actionItems.filter(item => {
    if (filter.status && item.status !== filter.status) return false;
    if (filter.priority && item.priority !== filter.priority) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Action buttons and filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {actionItems.length > 0 ? (
          <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
            <Info size={16} />
            Action items already extracted
          </div>
        ) : (
          <button
            onClick={extractActionItems}
            disabled={loading}
            className={`inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex-shrink-0
              ${loading 
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50'
              }`}
          >
            {loading ? (
              <>
                <RotateCw className="h-4 w-4 animate-spin" />
                Extracting...
              </>
            ) : (
              <>
                <ListTodo className="h-4 w-4" />
                Extract Action Items
              </>
            )}
          </button>
        )}

        {actionItems.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <select
              value={filter.status || ''}
              onChange={(e) => setFilter(f => ({ ...f, status: e.target.value || undefined }))}
              className="px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              value={filter.priority || ''}
              onChange={(e) => setFilter(f => ({ ...f, priority: e.target.value || undefined }))}
              className="px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">All Priority</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/30 p-3 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Action items list */}
      <div className="space-y-2">
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className="group relative rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => updateActionItem(item.id, {
                    status: item.status === 'completed' ? 'pending' : 'completed'
                  })}
                  className="mt-0.5 flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg p-1 -m-1"
                >
                  {getStatusIcon(item.status)}
                </button>

                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${
                    item.status === 'completed' 
                      ? 'line-through text-gray-500 dark:text-gray-400' 
                      : 'text-gray-900 dark:text-gray-100'
                  }`}>
                    {item.content}
                  </p>

                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                      <Calendar size={12} />
                      {formatDate(item.deadline)}
                    </span>

                    <span className={`inline-flex items-center gap-1.5 ${getPriorityColor(item.priority)}`}>
                      <Clock size={12} />
                      {item.priority} priority
                    </span>

                    {item.metadata?.contextualClues?.length > 0 && (
                      <span className="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                        <Info size={12} />
                        {item.metadata.contextualClues.join(', ')}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => deleteActionItem(item.id)}
                  className="flex-shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 -m-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-lg transition-opacity"
                >
                  <XCircle size={16} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-6">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 mb-3">
              <ClipboardList className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No action items found. Click &ldquo;Extract Action Items&rdquo; to analyze the content.
            </p>
          </div>
        )}
      </div>
    </div>
  );

};

export default ActionItemsModule;
