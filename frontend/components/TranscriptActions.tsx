import { Filter, ArrowUpDown, DownloadCloud, ChevronDown, RefreshCw, Search, CheckSquare, Trash2, MoreVertical } from 'lucide-react';
import { useState, useEffect } from 'react';
import UserTagChip from './UserTagChip';
import { getUserTags, API_BASE } from '../services/userTags';
import { getUserIdFromToken } from '../services/userTags';

interface Tag {
  id: number;
  name: string;
}

export interface TranscriptFilters {
  dateRange?: { start: string; end: string };
  keyword?: string;
  length?: 'short' | 'medium' | 'long';
  tags: string[];
  itemType?: 'note' | 'transcript';
}

interface Filters {
  dateRange: { start: string; end: string };
  keyword: string;
  length?: 'short' | 'medium' | 'long';
  tags: string[];
  showAllTags: boolean;
  searchTerm?: string;
}

interface TranscriptActionsProps {
  count: number;
  visibleCount?: number;
  onFilter: (filters: TranscriptFilters) => void;
  onSort: () => void;
  onExport: () => void;
  onRefresh: () => void;
  itemType?: 'note' | 'transcript';
  onToggleSelection?: () => void;
  isSelectionMode?: boolean;
  selectedIds?: Set<number>;
  onBulkDelete?: (ids: number[]) => void;
  onBulkDownload?: (ids: number[]) => void;
}

export default function TranscriptActions({ 
  count, 
  visibleCount,
  onFilter, 
  onSort, 
  onExport, 
  onRefresh,
  itemType = 'transcript',
  onToggleSelection,
  isSelectionMode = false,
  selectedIds = new Set(),
  onBulkDelete,
  onBulkDownload
}: TranscriptActionsProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [showSelectionMenu, setShowSelectionMenu] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    dateRange: { start: '', end: '' },
    keyword: '',
    tags: [],
    showAllTags: false
  });
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);

  useEffect(() => {
    const loadTags = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/ai/user-tags?type=${itemType}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'X-User-Id': getUserIdFromToken(localStorage.getItem('token') || '')
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch tags');
        }

        const tags = await response.json();
        setAvailableTags(tags);
      } catch (error) {
        console.error('Error loading tags:', error);
      }
    };
    loadTags();
  }, [itemType]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showSelectionMenu) {
        setShowSelectionMenu(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showSelectionMenu]);

  const handleApplyFilters = () => {
    onFilter({
      dateRange: filters.dateRange.start || filters.dateRange.end ? filters.dateRange : undefined,
      keyword: filters.keyword.trim() || undefined,
      length: filters.length,
      tags: filters.tags,
      itemType: itemType
    });
    setShowFilters(false);
  };

  return (
    <div className="flex flex-col gap-4 mb-4">
      <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
            {count} {itemType === 'transcript' ? 'Transcript' : 'Note'}{count !== 1 ? 's' : ''}
            {visibleCount !== undefined && visibleCount < count && (
              <span className="text-gray-500 dark:text-gray-400 ml-2">
                ({visibleCount} visible)
              </span>
            )}
            {isSelectionMode && selectedIds.size > 0 && (
              <span className="ml-2 text-blue-500">({selectedIds.size} selected)</span>
            )}
          </span>
        </div>
        <div className="flex gap-4">
          {onToggleSelection && (
            <button
              onClick={onToggleSelection}
              className={`p-2 ${isSelectionMode ? 'text-blue-500 bg-blue-100 dark:bg-blue-900' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'} rounded-lg transition-colors`}
              title={isSelectionMode ? 'Exit Selection Mode' : 'Enter Selection Mode'}
            >
              <CheckSquare size={18} />
            </button>
          )}
          {isSelectionMode && selectedIds.size > 0 && (
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSelectionMenu(!showSelectionMenu);
                }}
                className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                title="Selection Actions"
              >
                <MoreVertical size={18} />
              </button>
              {showSelectionMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                  <div className="py-1">
                    {onBulkDelete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onBulkDelete(Array.from(selectedIds));
                          setShowSelectionMenu(false);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 size={16} className="mr-2" />
                        Delete Selected
                      </button>
                    )}
                    {onBulkDownload && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onBulkDownload(Array.from(selectedIds));
                          setShowSelectionMenu(false);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      >
                        <DownloadCloud size={16} className="mr-2" />
                        Download Selected
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
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
            onClick={onRefresh}
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

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Tags
                </label>
                <div className="relative w-48">
                  <input
                    type="text"
                    placeholder="Filter tags..."
                    value={filters.searchTerm || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                    className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-800 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    aria-label="Filter tags"
                  />
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  {filters.searchTerm && (
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, searchTerm: '' }))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      aria-label="Clear search"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap gap-2">
                  {(filters.searchTerm
                    ? availableTags.filter((tag: Tag) =>
                        tag.name.toLowerCase().includes(filters.searchTerm?.toLowerCase() || '')
                      )
                    : availableTags
                  ).slice(0, 10).map((tag: Tag) => (
                    <UserTagChip
                      key={tag.id}
                      tag={tag}
                      isSelected={filters.tags.includes(tag.name)}
                      onToggle={() => {
                        setFilters(prev => ({
                          ...prev,
                          tags: prev.tags.includes(tag.name)
                            ? prev.tags.filter(t => t !== tag.name)
                            : [...prev.tags, tag.name]
                        }));
                      }}
                    />
                  ))}
                </div>
                {availableTags.length > 10 && (
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, showAllTags: !prev.showAllTags }))}
                    className="text-xs text-blue-500 hover:underline self-start"
                  >
                    {filters.showAllTags ? 'Show less' : `+${availableTags.length - 10} more`}
                  </button>
                )}
                {filters.showAllTags && (
                  <div className="flex flex-wrap gap-2">
                    {availableTags.slice(10).map(tag => (
                      <UserTagChip
                        key={tag.id}
                        tag={tag}
                        isSelected={filters.tags.includes(tag.name)}
                        onToggle={() => {
                          setFilters(prev => ({
                            ...prev,
                            tags: prev.tags.includes(tag.name)
                              ? prev.tags.filter(t => t !== tag.name)
                              : [...prev.tags, tag.name]
                          }));
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setFilters({
                  dateRange: { start: '', end: '' },
                  keyword: '',
                  length: undefined,
                  tags: [],
                  showAllTags: false
                });
                onFilter({ tags: [] });
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
