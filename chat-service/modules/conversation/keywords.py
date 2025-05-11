"""Keyword extraction module for message analysis."""
from typing import List, Set
import re

class KeywordExtractor:
    """Extracts relevant keywords from messages."""
    
    def __init__(self):
        # Common English stop words to filter out
        self.stop_words = {
            'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
            'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
            'to', 'was', 'were', 'will', 'with', 'the', 'this', 'but', 'they',
            'have', 'had', 'what', 'when', 'where', 'who', 'which', 'why', 'how'
        }

        # Important domain-specific terms to always include
        self.domain_terms = {
            'note', 'notes', 'transcript', 'transcripts', 'search', 'find',
            'create', 'update', 'delete', 'show', 'help', 'system', 'tag',
            'category', 'folder', 'organize'
        }

    def extract_keywords(self, text: str) -> List[str]:
        """Extract keywords from the given text."""
        # Convert to lowercase and split into words
        words = re.findall(r'\b\w+\b', text.lower())
        
        # Filter out stop words but keep domain terms
        keywords = [
            word for word in words 
            if word not in self.stop_words or word in self.domain_terms
        ]
        
        # Remove duplicates while preserving order
        seen: Set[str] = set()
        unique_keywords = [
            x for x in keywords 
            if not (x in seen or seen.add(x))
        ]
        
        return unique_keywords
