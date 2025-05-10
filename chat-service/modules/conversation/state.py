"""Manages conversation state and transitions."""
from typing import List, Dict, Optional
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from langchain_core.messages import BaseMessage

class ConversationPhase(Enum):
    """Tracks the current phase of conversation."""
    GREETING = "greeting"
    CASUAL = "casual"
    TRANSITIONING = "transitioning"
    TASK_ORIENTED = "task_oriented"
    SUGGESTING = "suggesting"
    CLOSING = "closing"

@dataclass
class UserInterest:
    """Tracks topics user has shown interest in."""
    topic: str
    mentioned_at: datetime
    context: str
    confidence: float
    related_notes: List[str] = field(default_factory=list)

@dataclass
class ConversationState:
    """Maintains the current state of the conversation."""
    phase: ConversationPhase
    casual_exchange_count: int = 0
    last_note_topic: Optional[str] = None
    last_suggestion_time: Optional[datetime] = None
    user_interests: List[UserInterest] = field(default_factory=list)
    recent_topics: List[str] = field(default_factory=list)
    
    def should_transition_to_notes(self) -> bool:
        """Determines if it's time to transition to note-related topics."""
        return (
            self.phase in [ConversationPhase.CASUAL, ConversationPhase.GREETING] and
            self.casual_exchange_count >= 3
        )
    
    def add_user_interest(self, topic: str, context: str, confidence: float = 0.8):
        """Records a new topic of user interest."""
        interest = UserInterest(
            topic=topic,
            mentioned_at=datetime.now(),
            context=context,
            confidence=confidence
        )
        self.user_interests.append(interest)
        self.recent_topics.append(topic)
        if len(self.recent_topics) > 5:  # Keep last 5 topics
            self.recent_topics.pop(0)
    
    def get_relevant_interests(self) -> List[UserInterest]:
        """Returns recently mentioned interests that might be relevant."""
        # Sort by recency and confidence
        return sorted(
            self.user_interests,
            key=lambda x: (x.confidence, x.mentioned_at),
            reverse=True
        )[:3]
    
    def update_phase(self, new_phase: ConversationPhase):
        """Updates conversation phase and related metrics."""
        self.phase = new_phase
        if new_phase == ConversationPhase.CASUAL:
            self.casual_exchange_count += 1
        elif new_phase == ConversationPhase.TASK_ORIENTED:
            self.casual_exchange_count = 0
