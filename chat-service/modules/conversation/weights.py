from typing import List, Dict
from .types import PatternMatch, ConversationContext
from .constants import WEIGHTS, MIN_CONFIDENCE_THRESHOLD
from langchain_core.messages import AIMessage

class WeightsHandler:
    @staticmethod
    def calculate_pattern_weight(matches: List[PatternMatch]) -> float:
        """Calculate weight based on pattern matches."""
        if not matches:
            return 0.0
            
        # Use the highest confidence match
        max_confidence = max(match.confidence for match in matches)
        return max_confidence * WEIGHTS["pattern_match"]

    @staticmethod
    def calculate_context_weight(context: ConversationContext) -> float:
        """Calculate weight based on conversation context."""
        if not context.chat_history:
            return 0.0

        weight = 0.0
        last_message = context.chat_history[-1]

        # If the last message was from the assistant and was a question
        if isinstance(last_message, AIMessage):
            if any(q in last_message.content.lower() for q in ["how are you", "what about you", "and you"]):
                weight += WEIGHTS["context_continuation"]

        return weight

    @staticmethod
    def calculate_characteristics_weight(characteristics: Dict) -> float:
        """Calculate weight based on message characteristics."""
        weight = 0.0
        
        # Short messages are more likely to be casual
        if characteristics["length"] <= 4:
            weight += WEIGHTS["message_length"]
            
        # Messages with repeated characters (e.g., heyyy) are likely casual
        if characteristics["has_repeated_chars"]:
            weight += 0.2
            
        # All caps or lowercase starts might indicate casual style
        if characteristics["all_caps"] or characteristics["starts_lowercase"]:
            weight += 0.1

        return weight

    @staticmethod
    def is_confident(total_weight: float) -> bool:
        """Determine if the total weight is confident enough."""
        return total_weight >= MIN_CONFIDENCE_THRESHOLD
