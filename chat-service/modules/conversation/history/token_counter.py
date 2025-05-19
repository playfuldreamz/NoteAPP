"""Token counting utilities for chat history."""
from typing import Protocol, List
from langchain_core.messages import BaseMessage

class TokenCounter(Protocol):
    """Protocol for token counting implementations."""
    def count_tokens(self, text: str) -> int:
        """Count tokens in text."""
        pass

class SimpleTokenCounter:
    """Simple token counter implementation based on word count."""
    def count_tokens(self, text: str) -> int:
        """Simple approximation: words / 0.75 (typical tokens-per-word ratio)"""
        return int(len(text.split()) / 0.75)
    
    def __call__(self, messages: List[BaseMessage]) -> int:
        """Count tokens in a list of messages (LangChain compatibility)."""
        return sum(self.count_tokens(msg.content) for msg in messages if hasattr(msg, 'content'))

class TokenizedTokenCounter:
    """Token counter using a tokenizer implementation."""
    def __init__(self, tokenizer):
        self.tokenizer = tokenizer
        
    def count_tokens(self, text: str) -> int:
        """Count tokens using the tokenizer."""
        return len(self.tokenizer.encode(text))
    
    def __call__(self, messages: List[BaseMessage]) -> int:
        """Count tokens in a list of messages (LangChain compatibility)."""
        return sum(self.count_tokens(msg.content) for msg in messages if hasattr(msg, 'content'))
