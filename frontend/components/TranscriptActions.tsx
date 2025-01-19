import { Filter, ArrowUpDown, DownloadCloud } from 'lucide-react';

interface TranscriptActionsProps {
  count: number;
  onFilter?: () => void;
  onSort?: () => void;
  onExport?: () => void;
}

export default function TranscriptActions({ count, onFilter, onSort, onExport }: TranscriptActionsProps) {
  return (
    <div className="flex justify-between items-center mb-4">
      <span className="text-sm text-gray-500 dark:text-gray-400">
        {count} transcript{count !== 1 ? 's' : ''}
      </span>
      <div className="flex gap-3">
        <button
          onClick={onFilter}
          className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          title="Filter"
        >
          <Filter size={16} />
        </button>
        <button
          onClick={onSort}
          className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          title="Sort"
        >
          <ArrowUpDown size={16} />
        </button>
        <button
          onClick={onExport}
          className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          title="Export"
        >
          <DownloadCloud size={16} />
        </button>
      </div>
    </div>
  );
}
