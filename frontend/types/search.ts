/**
 * Types for the semantic search feature
 */

export interface SearchResult {
  id: number;
  type: 'note' | 'transcript';
  title: string;
  content: string;
  summary?: string;
  timestamp: string;
  relevance: number; // Score between 0-1 indicating relevance to query
}

export interface SearchResponse {
  success: boolean;
  count: number;
  results: SearchResult[];
  message?: string; // Optional error message
}
