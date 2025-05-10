from dataclasses import dataclass
from typing import List, Dict, Any, Optional
from enum import Enum
from langchain_core.messages import AIMessage, HumanMessage

class ConversationType(Enum):
    CASUAL = "casual"
    TASK = "task"
    UNKNOWN = "unknown"

@dataclass
class ConversationContext:
    chat_history: List[AIMessage | HumanMessage]
    current_message: str
    previous_type: Optional[ConversationType] = None

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
