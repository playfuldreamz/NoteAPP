"""Theme extraction utilities for chat history."""
from typing import Set, Dict, List

class ThemeExtractor:
    """Extracts themes from conversation messages."""
    
    def __init__(self):
        self.theme_keywords = {
            'code': ['function', 'class', 'method', 'variable', 'import', 'return'],
            'error': ['error', 'exception', 'failed', 'bug', 'issue', 'problem'],
            'task': ['create', 'update', 'delete', 'modify', 'implement', 'add'],
            'question': ['how', 'what', 'why', 'when', 'where', 'can', 'could'],
            'data': ['json', 'array', 'object', 'string', 'number', 'boolean'],
            'api': ['endpoint', 'request', 'response', 'api', 'rest', 'server'],
            'ui': ['component', 'style', 'css', 'html', 'layout', 'design']
        }
        
        self.task_indicators = [
            'create', 'update', 'delete', 'modify', 'implement',
            'add', 'remove', 'change', 'fix', 'improve'
        ]

    def extract_themes(self, text: str) -> Set[str]:
        """Extract themes from text.
        
        Args:
            text: Text to analyze
            
        Returns:
            Set of identified themes
        """
        themes = set()
        text = text.lower()
        
        for theme, keywords in self.theme_keywords.items():
            if any(kw in text for kw in keywords):
                themes.add(theme)
                
        return themes

    def is_task_related(self, text: str) -> bool:
        """Check if text is task-related.
        
        Args:
            text: Text to analyze
            
        Returns:
            True if text appears to be task-related
        """
        text = text.lower()
        return (
            any(indicator in text for indicator in self.task_indicators) or
            (any(q in text for q in ['can you', 'could you']) and
             any(act in text for act in ['help', 'please', 'need']))
        )
