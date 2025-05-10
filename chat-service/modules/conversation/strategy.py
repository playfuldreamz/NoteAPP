"""Manages conversation flow and response strategies."""
from typing import List, Dict, Optional, Tuple
from .state import ConversationState, ConversationPhase, UserInterest
from .types import ConversationContext
from datetime import datetime

class ConversationStrategy:
    """Manages conversation flow and generates contextual responses."""
    
    TRANSITION_TEMPLATES = {
        "interest_to_notes": [
            "Speaking of {topic}, would you like to check your notes about that?",
            "That's interesting! I noticed you have some notes about {topic}.",
            "Have you thought about capturing these thoughts about {topic} in your notes?"
        ],
        "casual_to_productive": [
            "By the way, I'd love to help you organize your thoughts or find specific information.",
            "While we're chatting, is there anything specific you'd like to look up in your notes?",
            "I can help you find or organize information if you'd like."
        ],
        "suggestion": [
            "I noticed you've written about {topic} before. Would you like to review those notes?",
            "This reminds me of some interesting notes you have on {topic}.",
            "You might find your previous notes about {topic} helpful here."
        ]
    }

    def __init__(self):
        self._last_transition_time: Optional[datetime] = None
        self._min_transition_interval = 2  # minimum exchanges before another transition
    
    def analyze_context(self, context: ConversationContext, state: ConversationState) -> Dict[str, float]:
        """Analyzes conversation context for topics and interests."""
        # This would integrate with NLP/topic extraction
        # For now, placeholder implementation
        topics = {}
        # Extract topics from current message and recent history
        # Assign confidence scores
        return topics

    def should_transition(self, state: ConversationState) -> bool:
        """Determines if we should transition the conversation."""
        if not self._last_transition_time:
            return state.should_transition_to_notes()
            
        time_since_last = (datetime.now() - self._last_transition_time).seconds
        exchanges_since_last = state.casual_exchange_count - self._min_transition_interval
        
        return (
            time_since_last > 60 and  # At least 1 minute since last transition
            exchanges_since_last >= self._min_transition_interval and
            state.should_transition_to_notes()
        )

    def get_transition_response(self, state: ConversationState) -> Tuple[str, ConversationPhase]:
        """Generates appropriate transition response based on state."""
        interests = state.get_relevant_interests()
        
        if interests:
            # Use most relevant interest for transition
            interest = interests[0]
            template = self._select_template("interest_to_notes")
            return template.format(topic=interest.topic), ConversationPhase.TRANSITIONING
        
        # Generic transition if no specific interests
        template = self._select_template("casual_to_productive")
        return template, ConversationPhase.TRANSITIONING

    def generate_contextual_suggestion(self, state: ConversationState) -> Optional[str]:
        """Generates contextual suggestion based on conversation state."""
        if not state.recent_topics:
            return None
            
        topic = state.recent_topics[-1]
        template = self._select_template("suggestion")
        return template.format(topic=topic)

    def update_state(self, context: ConversationContext, state: ConversationState) -> ConversationState:
        """Updates conversation state based on new context."""
        # Analyze new topics/interests
        topics = self.analyze_context(context, state)
        
        # Update state with new interests
        for topic, confidence in topics.items():
            state.add_user_interest(topic, context.current_message, confidence)
        
        # Check for phase transitions
        if self.should_transition(state):
            state.update_phase(ConversationPhase.TRANSITIONING)
            self._last_transition_time = datetime.now()
        
        return state
