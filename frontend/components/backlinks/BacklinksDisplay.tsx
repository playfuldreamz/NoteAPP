import React, { useEffect, useState } from 'react';
import { fetchBacklinks, BacklinkItem as BacklinkItemType } from '../../services/linkService';
import BacklinkItemComponent from './BacklinkItem';

interface BacklinksDisplayProps {
  itemId: number;
  itemType: 'note' | 'transcript';
}

const BacklinksDisplay: React.FC<BacklinksDisplayProps> = ({ itemId, itemType }) => {
  const [backlinks, setBacklinks] = useState<BacklinkItemType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadBacklinks() {
      try {
        setLoading(true);
        setError(null);
        const links = await fetchBacklinks(itemType, itemId);
        setBacklinks(links);
      } catch (err) {
        console.error('Failed to load backlinks:', err);
        setError(err instanceof Error ? err.message : 'Failed to load backlinks');
      } finally {
        setLoading(false);
      }
    }

    if (itemId) {
      loadBacklinks();
    }
  }, [itemId, itemType]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500 dark:text-red-400">
        <p>Error loading backlinks: {error}</p>
      </div>
    );
  }

  if (backlinks.length === 0) {
    return (
      <div className="p-4 text-gray-500 dark:text-gray-400">
        <p>No backlinks found for this item.</p>
      </div>
    );
  }
  return (
    <div className="space-y-4 p-4">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {backlinks.length} {backlinks.length === 1 ? 'item links' : 'items link'} to this
      </h3>
      <div className="space-y-2">
        {backlinks.map((backlink) => (
          <BacklinkItemComponent 
            key={`${backlink.sourceType}-${backlink.sourceId}`}
            backlink={backlink}
          />
        ))}
      </div>
    </div>
  );
};

export default BacklinksDisplay;
