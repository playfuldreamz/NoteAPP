import { useState, FormEvent, useEffect } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface SearchBarProps {
  onSearch: (query: string) => void;
  initialQuery?: string;
  realTimeSearch?: boolean;
  debounceTime?: number;
}

export default function SearchBar({ 
  onSearch, 
  initialQuery = '', 
  realTimeSearch = true,
  debounceTime = 500 
}: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);

  // Handle real-time search with debouncing
  useEffect(() => {
    if (!realTimeSearch) return;
    
    // Only set up the timeout if the query has changed from the debounced query
    // This prevents continuous refreshes after typing has stopped
    if (query !== debouncedQuery) {
      const handler = setTimeout(() => {
        setDebouncedQuery(query);
        if (query.trim().length >= 2) {
          onSearch(query);
        }
      }, debounceTime);

      return () => {
        clearTimeout(handler);
      };
    }
  }, [query, debouncedQuery, onSearch, debounceTime, realTimeSearch]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <MagnifyingGlassIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </div>
        <input
          type="search"
          className="block w-full p-4 pl-10 text-sm border rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-500 dark:focus:border-blue-500"
          placeholder="Search for concepts, topics, or specific content..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          required
        />
        <button
          type="submit"
          className="absolute right-2.5 bottom-2.5 bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
        >
          Search
        </button>
      </div>
    </form>
  );
}
