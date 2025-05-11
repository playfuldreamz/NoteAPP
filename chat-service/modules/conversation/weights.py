from typing import List, Dict
from .types import PatternMatch, ConversationContext
from .constants import WEIGHTS, MIN_CONFIDENCE_THRESHOLD

class WeightsHandler:
    @staticmethod
    def calculate_pattern_weight(pattern_matches: List[PatternMatch]) -> float:
        """Calculate weight from pattern matches."""
        weight = 0.0
        
        # Special handling for greetings and common patterns
        for match in pattern_matches:
            if match.pattern_type == "greeting":
                weight += 0.9  # Increased from default to better handle greetings
            elif match.pattern_type in ["how_are_you", "thanks", "goodbye", "acknowledgment"]:
                weight += 0.8
            else:
                weight += match.confidence
                
        # Normalize weight to avoid exceeding 1.0
        return min(weight, 1.0)

    @staticmethod
    def calculate_context_weight(context: ConversationContext) -> float:
        """Calculate weight from conversation context."""
        weight = 0.0
        
        # Consider previous messages for context
        if context.chat_history:
            # If previous exchange was casual, more likely this one is too
            if context.casual_exchange_count > 0:
                weight += 0.3
                
        return weight

    @staticmethod
    def calculate_characteristics_weight(characteristics: Dict) -> float:
        """Calculate weight based on message characteristics."""
        weight = 0.0
        
        # Short messages are more likely to be casual
        if characteristics["length"] <= 4:
            weight += 0.3
            
        # Messages with repeated characters (e.g., heyyy) are likely casual
        if characteristics["has_repeated_chars"]:
            weight += 0.2
            
        # All caps or lowercase starts might indicate casual style
        if characteristics["all_caps"] or characteristics["starts_lowercase"]:
            weight += 0.2  # Increased from 0.1 to better handle all-caps messages

        return weight

    @staticmethod
    def is_confident(total_weight: float) -> bool:
        """Determine if the total weight is confident enough."""
        return total_weight >= MIN_CONFIDENCE_THRESHOLD
