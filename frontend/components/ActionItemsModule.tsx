import React, { useState, useEffect } from 'react';
import { format, isValid, parseISO } from 'date-fns';
import { Calendar, Clock, CheckCircle2, Circle, XCircle, AlertTriangle } from 'lucide-react';

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
      const date = parseISO(dateString);
      return isValid(date) ? format(date, 'MMM d, yyyy') : 'Invalid date';
    } catch {
      return 'Invalid date';
    }
  };

  // Fetch action items
  const fetchActionItems = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/action-items?sourceId=${itemId}&sourceType=${type}`,
        {
          headers: {
            'Authorization': `Bearer ${getAuthToken()}`,
          },
        }
      );
      if (!response.ok) throw new Error('Failed to fetch action items');
      const data = await response.json();
      setActionItems(data);
    } catch (err) {
      setError('Failed to load action items');
      console.error(err);
    }
  };

  // Extract action items
  const extractActionItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/action-items/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({
          content,
          sourceId: itemId,
          sourceType: type,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to extract action items');
      }
      
      const data = await response.json();
      await fetchActionItems();
      if (onUpdate) onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract action items');
      console.error(err);
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
  }, [itemId, type]);

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
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Action Items</h3>
        <button
          onClick={extractActionItems}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded hover:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Extracting...' : 'Extract Action Items'}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-500 dark:text-red-400">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="flex gap-4 mb-4">
        <select
          value={filter.status || ''}
          onChange={(e) => setFilter(f => ({ ...f, status: e.target.value || undefined }))}
          className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <select
          value={filter.priority || ''}
          onChange={(e) => setFilter(f => ({ ...f, priority: e.target.value || undefined }))}
          className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded px-2 py-1"
        >
          <option value="">All Priority</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      <div className="space-y-2">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="border border-gray-200 dark:border-gray-700 rounded p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-2 flex-grow">
                <button
                  onClick={() => updateActionItem(item.id, {
                    status: item.status === 'completed' ? 'pending' : 'completed'
                  })}
                  className="mt-1"
                >
                  {getStatusIcon(item.status)}
                </button>
                <div className="flex-grow">
                  <p className={`${item.status === 'completed' ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}>
                    {item.content}
                  </p>
                  <div className="flex gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar size={14} />
                      {formatDate(item.deadline)}
                    </span>
                    <span className={`flex items-center gap-1 ${getPriorityColor(item.priority)}`}>
                      <Clock size={14} />
                      {item.priority} priority
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => deleteActionItem(item.id)}
                className="text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-500"
              >
                <XCircle size={16} />
              </button>
            </div>
          </div>
        ))}
        
        {filteredItems.length === 0 && (
          <p className="text-center text-gray-500 dark:text-gray-400 py-4">
            No action items found
          </p>
        )}
      </div>
    </div>
  );
};

export default ActionItemsModule;
