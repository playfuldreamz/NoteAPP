'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SearchResult } from '../../../types/search';
import SearchResultItem from '../../../components/search/SearchResultItem';
import SearchBar from '../../../components/search/SearchBar';
import { searchItems } from '../../../services/search';

// Import the Modal component (default export)
import Modal from '../../../components/modal';

// Create a simple Spinner component since we don't have access to the original
const Spinner = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };
  
  return (
    <div className="flex justify-center items-center">
      <div className={`${sizeClasses[size]} border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin`}></div>
    </div>
  );
};

// Create a simple toast hook since we don't have access to the original
const useToast = () => {
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    console.log(`Toast (${type}): ${message}`);
    // In a real implementation, this would show a toast notification
    alert(`${type.toUpperCase()}: ${message}`);
  };
  
  return { showToast };
};

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearched, setIsSearched] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SearchResult | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { showToast } = useToast();
  const router = useRouter();

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      showToast('Please enter a search query', 'error');
      return;
    }

    setIsLoading(true);
    setQuery(searchQuery);
    
    try {
      const searchResults = await searchItems(searchQuery);
      setResults(searchResults);
      setIsSearched(true);
    } catch (error) {
      console.error('Search error:', error);
      showToast('Error performing search', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemClick = (item: SearchResult) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Semantic Search</h1>
      
      <div className="mb-8">
        <SearchBar onSearch={handleSearch} initialQuery={query} />
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Spinner size="lg" />
        </div>
      ) : isSearched ? (
        <div>
          {results.length > 0 ? (
            <div>
              <h2 className="text-xl font-semibold mb-4">
                {results.length} {results.length === 1 ? 'result' : 'results'} found
              </h2>
              <div className="space-y-4">
                {results.map((result, index) => (
                  <SearchResultItem 
                    key={`${result.type}-${result.id}-${index}`} 
                    result={result} 
                    onClick={() => handleItemClick(result)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">No results found for "{query}"</p>
              <p className="text-gray-400 dark:text-gray-500 mt-2">
                Try different keywords or check your spelling
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-gray-500 dark:text-gray-400">
            Enter a search query to find notes and recordings based on their content
          </p>
          <p className="text-gray-400 dark:text-gray-500 mt-2">
            Our semantic search understands the meaning behind your words
          </p>
        </div>
      )}

      {isModalOpen && selectedItem && (
        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          content={selectedItem.content}
          title={selectedItem.title}
          itemId={selectedItem.id}
          type={selectedItem.type}
        />
      )}
    </div>
  );
}
