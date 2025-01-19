import { Filter, ArrowUpDown, DownloadCloud, ChevronDown, RefreshCw } from 'lucide-react';
import { useState } from 'react';

export interface TranscriptFilters {
  dateRange?: { start: string; end: string };
  keyword?: string;
  length?: 'short' | 'medium' | 'long';
  tags?: string[];
}

interface Filters {
  dateRange: { start: string; end: string };
  keyword: string;
  length?: 'short' | 'medium' | 'long';
  tags: string[];
}

interface TranscriptActionsProps {
  count: number;
  onFilter: (filters: TranscriptFilters) => void;
  onSort: () => void;
  onExport: () => void;
}

export default function TranscriptActions({ count, onFilter, onSort, onExport }: TranscriptActionsProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    dateRange: { start: '', end: '' },
    keyword: '',
    tags: []
  });

  const handleApplyFilters = () => {
    onFilter({
      dateRange: filters.dateRange.start || filters.dateRange.end ? filters.dateRange : undefined,
      keyword: filters.keyword.trim() || undefined,
      length: filters.length,
      tags: filters.tags.length ? filters.tags : undefined
    });
    setShowFilters(false);
  };

  return (
    <div className="flex flex-col gap-4 mb-4">
      <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
            {count} Transcript{count !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
            title="Filter"
          >
            <Filter size={18} />
          </button>
          <button
            onClick={onSort}
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
            title="Sort"
          >
            <ArrowUpDown size={18} />
          </button>
          <button
            onClick={onExport}
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
            title="Export"
          >
            <DownloadCloud size={18} />
          </button>
          <button
            onClick={() => window.location.reload()}
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Date Range
              </label>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  value={filters.dateRange.start}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, start: e.target.value }
                  }))}
                  className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
                <input
                  type="date"
                  value={filters.dateRange.end}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, end: e.target.value }
                  }))}
                  className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                Keyword
              </label>
              <input
                type="text"
                value={filters.keyword}
                onChange={(e) => setFilters(prev => ({ ...prev, keyword: e.target.value }))}
                placeholder="Search text or title..."
                className="w-full p-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Length
              </label>
              <select
                value={filters.length || ''}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  length: e.target.value as 'short' | 'medium' | 'long' | undefined
                }))}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800"
              >
                <option value="">All lengths</option>
                <option value="short">Short (less than 100 words)</option>
                <option value="medium">Medium (100 to 500 words)</option>
                <option value="long">Long (more than 500 words)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setFilters({
                  dateRange: { start: '', end: '' },
                  keyword: '',
                  length: undefined,
                  tags: []
                });
                onFilter({});
                setShowFilters(false);
              }}
              className="text-sm text-gray-600 dark:text-gray-300 hover:underline"
            >
              Clear Filters
            </button>
            <button
              onClick={handleApplyFilters}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
