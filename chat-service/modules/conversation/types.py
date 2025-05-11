from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from enum import Enum
from langchain_core.messages import AIMessage, HumanMessage

class ConversationType(Enum):
    CASUAL = "casual"
    TASK = "task"
    UNKNOWN = "unknown"

@dataclass
class ConversationContext:
    """Tracks the state and history of a conversation."""
    chat_history: List[AIMessage | HumanMessage]
    current_message: str
    previous_type: Optional[ConversationType] = None
    
    # Enhanced context tracking
    last_intent: Optional[str] = None
    intent_chain: List[str] = field(default_factory=list)
    topic_chain: List[str] = field(default_factory=list)
    active_tools: List[str] = field(default_factory=list)
    casual_exchange_count: int = 0
    last_tool_use: Optional[str] = None
    emotion_state: str = "neutral"
    
    def update_context(self, intent: str, topic: Optional[str] = None, tool: Optional[str] = None):
        """Update conversation context with new information."""
        # Track intent history
        self.last_intent = intent
        self.intent_chain.append(intent)
        if len(self.intent_chain) > 5:  # Keep last 5 intents
            self.intent_chain.pop(0)
            
        # Track topic history
        if topic:
            self.topic_chain.append(topic)
            if len(self.topic_chain) > 5:  # Keep last 5 topics
                self.topic_chain.pop(0)
                
        # Track tool usage
        if tool:
            self.last_tool_use = tool
            if tool not in self.active_tools:
                self.active_tools.append(tool)
                
        # Update casual conversation counter
        if intent in ["CASUAL", "EMOTIONAL"]:
            self.casual_exchange_count += 1
        else:
            self.casual_exchange_count = 0
            
    def has_recent_intent(self, intent: str, lookback: int = 3) -> bool:
        """Check if an intent occurred in recent history."""
        return intent in self.intent_chain[-lookback:]
        
    def is_continuing_topic(self, topic: str) -> bool:
        """Check if a topic is continuing from recent messages."""
        return topic in self.topic_chain
        
    def needs_context_refresh(self) -> bool:
        """Determine if context needs refreshing."""
        return (
            self.casual_exchange_count >= 3 or  # Too many casual exchanges
            len(self.intent_chain) >= 5 or      # Long conversation
            not self.last_intent                # No context established
        )

@dataclass
class ClassificationResult:
    is_casual: bool
    confidence: float
    reasons: List[str]
    weights: Dict[str, float]

@dataclass
class PatternMatch:
    matched: bool
    pattern_type: str
    match_text: str = ""
    confidence: float = 0.0
