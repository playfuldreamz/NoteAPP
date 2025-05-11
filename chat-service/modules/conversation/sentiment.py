"""Sentiment analysis module for message analysis."""
from typing import Dict, List, Optional
from enum import Enum

class SentimentType(Enum):
    """Basic sentiment classification."""
    POSITIVE = "positive"
    NEGATIVE = "negative"
    NEUTRAL = "neutral"
    QUESTION = "question"

class SentimentAnalyzer:
    """Handles sentiment analysis of messages."""
    
    def __init__(self):
        self.positive_patterns = [
            r'\b(?:good|great|awesome|excellent|amazing|love|wonderful|happy|pleased|glad|thank|thanks)\b',
            r'(?::\)|😊|👍|❤️|🙂|😀|😃)'
        ]
        
        self.negative_patterns = [
            r'\b(?:bad|awful|terrible|horrible|hate|dislike|angry|upset|sad|sorry|problem|issue)\b',
            r'(?::\(|😢|👎|😠|😡|😞|😟)'
        ]
        
        self.question_patterns = [
            r'\b(?:who|what|where|when|why|how)\b',
            r'\?$',
            r'\b(?:can|could|would|should|do|does|is|are|was|were)\s+(?:i|you|we|they|he|she|it)\b'
        ]

    def analyze_sentiment(self, text: str) -> SentimentType:
        """Analyze the sentiment of the given text."""
        import re
        
        # Check for questions first
        if any(re.search(pattern, text.lower()) for pattern in self.question_patterns):
            return SentimentType.QUESTION
            
        # Check for positive patterns
        positive_matches = sum(bool(re.search(pattern, text.lower())) for pattern in self.positive_patterns)
        
        # Check for negative patterns
        negative_matches = sum(bool(re.search(pattern, text.lower())) for pattern in self.negative_patterns)
        
        if positive_matches > negative_matches:
            return SentimentType.POSITIVE
        elif negative_matches > positive_matches:
            return SentimentType.NEGATIVE
        
        return SentimentType.NEUTRAL
