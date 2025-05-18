"""Message summary class for chat history."""
from dataclasses import dataclass
from typing import List

@dataclass
class MessageSummary:
    """Represents a summarized portion of the conversation."""
    summary: str
    start_index: int
    end_index: int
    key_points: List[str]
    token_count: int
