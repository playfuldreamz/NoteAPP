"""Token counting utilities for chat history."""
from typing import Protocol

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

class TokenizedTokenCounter:
    """Token counter using a tokenizer implementation."""
    def __init__(self, tokenizer):
        self.tokenizer = tokenizer
        
    def count_tokens(self, text: str) -> int:
        """Count tokens using the tokenizer."""
        return len(self.tokenizer.encode(text))
