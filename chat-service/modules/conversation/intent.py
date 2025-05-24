"""Intent classification module for message analysis."""
from typing import Dict, List, Optional, Tuple
from enum import Enum

class IntentType(Enum):
    """Core types of user intents."""
    QUERY_NOTES = "query_notes"          # Direct questions about notes
    SEARCH_REQUEST = "search_request"     # Requests to find information
    CREATE_NOTE = "create_note"           # Requests to create a new note
    OPINION_NOTES = "opinion_notes"       # Opinions/feelings about notes/system
    EMOTIONAL = "emotional"               # Personal/emotional content
    CASUAL = "casual"                     # Small talk
    ACTION = "action"                     # Requests for action
    META = "meta"                         # Questions about the system itself

class IntentClassifier:
    """Classifies user intent based on message content."""
    
    def __init__(self):
        self.intent_triggers = {
            IntentType.QUERY_NOTES: {
                "words": ["notes", "transcripts", "written", "saved", "recorded", "find", "search", "look"],
                "patterns": ["do i have", "where is", "find", "search", "look for", "can you find"]
            },
            IntentType.SEARCH_REQUEST: {
                "words": ["search", "find", "lookup", "locate", "get", "show", "display"],
                "patterns": ["where is", "how do i", "how to", "can you find", "do you know"]
            },
            IntentType.CREATE_NOTE: {
                "words": ["create", "add", "make", "new note", "save", "write down", "document"],
                "patterns": ["create a note", "add a note", "make a new note", "save this as a note", "can you create a note", "i want to add a note", "let's make a note"]
            },
            IntentType.OPINION_NOTES: {
                "words": ["like", "hate", "prefer", "think", "feel", "opinion"],
                "patterns": ["what do you think", "how do you feel", "do you like"]
            },
            IntentType.ACTION: {
                "words": ["create", "make", "add", "update", "delete", "remove", "change"],
                "patterns": ["can you", "please", "would you", "i want you to", "i need you to"]
            },
            IntentType.META: {
                "words": ["help", "tutorial", "guide", "documentation", "manual", "instructions"],
                "patterns": ["how do i", "what is", "explain", "tell me about"]
            }
        }

    def classify_intent(self, text: str, context: Optional[Dict] = None) -> Tuple[IntentType, float]:
        """Classify the intent of a message with confidence score."""
        text = text.lower()
        scores = {intent: 0.0 for intent in IntentType}
        
        for intent, triggers in self.intent_triggers.items():
            # Check for trigger words
            word_matches = sum(1 for word in triggers["words"] if word in text)
            scores[intent] += word_matches * 0.3
            
            # Check for patterns
            pattern_matches = sum(1 for pattern in triggers["patterns"] if pattern in text)
            scores[intent] += pattern_matches * 0.5
            
        # Find the highest scoring intent
        max_intent = max(scores.items(), key=lambda x: x[1])
        
        # If no strong signals, default to CASUAL
        if max_intent[1] == 0:
            return IntentType.CASUAL, 0.5
            
        return max_intent[0], min(max_intent[1], 1.0)
