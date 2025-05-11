"""Syntax feature extraction module for message analysis."""
from typing import List
from dataclasses import dataclass
import re

@dataclass
class SyntaxFeatures:
    """Extracted syntactic features from message."""
    has_question: bool = False
    has_command: bool = False
    has_negation: bool = False
    subject_is_notes: bool = False
    subject_is_self: bool = False
    contains_emotion: bool = False

class SyntaxAnalyzer:
    """Analyzes syntactic features of messages."""
    
    def __init__(self):
        # Question detection patterns
        self.question_patterns = [
            r'\b(?:who|what|where|when|why|how)\b',
            r'\?$',
            r'\b(?:can|could|would|should|do|does|is|are|was|were)\s+(?:i|you|we|they|he|she|it)\b'
        ]
        
        # Command detection patterns
        self.command_patterns = [
            r'^(?:please\s+)?(?:show|find|tell|help|get|create|update|delete)',
            r'^(?:i\s+(?:want|need)\s+you\s+to)',
            r'^(?:could|would|can)\s+you\s+(?:please\s+)?(?:show|find|tell|help)'
        ]
        
        # Negation patterns
        self.negation_patterns = [
            r'\b(?:not|no|never|none|nobody|nothing|nowhere|isn\'t|aren\'t|wasn\'t|weren\'t|haven\'t|hasn\'t|hadn\'t|don\'t|doesn\'t|didn\'t|won\'t|wouldn\'t|can\'t|cannot|couldn\'t|shouldn\'t|wouldn\'t)\b'
        ]
        
        # Subject patterns
        self.note_subject_patterns = [
            r'\b(?:note|notes|transcript|transcripts)\b(?:\s+(?:about|on|for|that|which|from))?\b'
        ]
        
        self.self_subject_patterns = [
            r'\b(?:i|me|my|mine|we|us|our|ours)\b'
        ]

        # Emotion patterns
        self.emotion_patterns = [
            r'\b(?:happy|sad|angry|excited|worried|concerned|love|hate|like|dislike)\b',
            r'(?::\)|:\(|😊|😢|😠|😡|❤️|👍|👎)'
        ]

    def extract_features(self, text: str) -> SyntaxFeatures:
        """Extract syntactic features from the given text."""
        features = SyntaxFeatures()
        
        text = text.lower()
        
        # Check for questions
        features.has_question = any(bool(re.search(pattern, text)) for pattern in self.question_patterns)
        
        # Check for commands
        features.has_command = any(bool(re.search(pattern, text)) for pattern in self.command_patterns)
        
        # Check for negations
        features.has_negation = any(bool(re.search(pattern, text)) for pattern in self.negation_patterns)
        
        # Check subjects
        features.subject_is_notes = any(bool(re.search(pattern, text)) for pattern in self.note_subject_patterns)
        features.subject_is_self = any(bool(re.search(pattern, text)) for pattern in self.self_subject_patterns)
        
        # Check for emotions
        features.contains_emotion = any(bool(re.search(pattern, text)) for pattern in self.emotion_patterns)
        
        return features
