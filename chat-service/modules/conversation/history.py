"""Manages conversation message history and summarization."""
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from .constants import (
    MAX_RECENT_MESSAGES,
    MAX_HISTORY_TOKENS,
    SUMMARY_TRIGGER_LENGTH,
    SUMMARY_MAX_LENGTH,
    SUMMARY_RETENTION_POLICY,
    TOKEN_LIMITS,
    CONTEXT_WEIGHTS
)

@dataclass
class MessageSummary:
    """Represents a summarized portion of the conversation."""
    summary: str
    start_index: int
    end_index: int
    key_points: List[str]
    token_count: int

class MessageHistoryManager:
    """Manages conversation message history, including summarization and token management."""

    def __init__(self, tokenizer=None):
        """Initialize the history manager.
        
        Args:
            tokenizer: Optional tokenizer to use for token counting. If None, uses a simple
                      approximation based on word count.
        """
        self.tokenizer = tokenizer
        self.messages: List[Dict] = []  # Full message history
        self.summaries: List[MessageSummary] = []  # Summarized sections
        self.current_token_count = 0
        self.total_tokens_processed = 0

    def add_message(self, message: Dict) -> None:
        """Add a new message to the history.
        
        Args:
            message: Dictionary containing 'role' and 'content'
        """
        # Add message
        self.messages.append(message)
        
        # Count tokens
        token_count = self._count_tokens(message['content'])
        self.current_token_count += token_count
        self.total_tokens_processed += token_count

        # Check if we need to summarize
        if self._should_summarize():
            self._create_summary()

    def get_formatted_history(self) -> List[AIMessage | HumanMessage]:
        """Get the formatted message history for the LLM.
        
        Returns:
            List of formatted messages including summaries and recent messages.
        """
        formatted_history = []

        # Add active summaries first
        if self.summaries:
            formatted_history.append(SystemMessage(content=self._format_summaries()))

        # Add recent messages
        recent_messages = self.messages[-MAX_RECENT_MESSAGES:] if len(self.messages) > MAX_RECENT_MESSAGES else self.messages
        for msg in recent_messages:
            if msg['role'] == 'assistant':
                formatted_history.append(AIMessage(content=msg['content']))
            else:
                formatted_history.append(HumanMessage(content=msg['content']))

        return formatted_history

    def get_token_stats(self) -> Dict[str, int]:
        """Get current token statistics.
        
        Returns:
            Dictionary containing token statistics.
        """
        return {
            "current_tokens": self.current_token_count,
            "total_tokens": self.total_tokens_processed,
            "summary_tokens": sum(s.token_count for s in self.summaries),
            "message_count": len(self.messages),
            "summary_count": len(self.summaries)
        }

    def _should_summarize(self) -> bool:
        """Determine if the conversation needs summarization.
        
        Returns:
            True if summarization is needed.
        """
        # Check message count trigger
        if len(self.messages) >= SUMMARY_TRIGGER_LENGTH:
            return True

        # Check token limit trigger
        if self.current_token_count > MAX_HISTORY_TOKENS:
            return True

        return False

    def _create_summary(self) -> None:
        """Create a new summary from older messages."""
        if len(self.messages) < SUMMARY_TRIGGER_LENGTH:
            return

        # Determine messages to summarize
        summary_end = -MAX_RECENT_MESSAGES if len(self.messages) > MAX_RECENT_MESSAGES else 0
        messages_to_summarize = self.messages[:summary_end]
        
        if not messages_to_summarize:
            return

        # Generate summary
        summary_text = self._generate_summary(messages_to_summarize)
        key_points = self._extract_key_points(messages_to_summarize)
        token_count = self._count_tokens(summary_text)

        # Create summary object
        summary = MessageSummary(
            summary=summary_text,
            start_index=0,
            end_index=len(messages_to_summarize),
            key_points=key_points,
            token_count=token_count
        )

        self.summaries.append(summary)
        self._update_token_count()

    def _generate_summary(self, messages: List[Dict]) -> str:
        """Generate a concise summary of messages.
        
        Args:
            messages: List of messages to summarize
            
        Returns:
            Summarized text
        """
        # Simple concatenation for now - in practice, you'd want to use an LLM
        summary_parts = []
        
        for msg in messages:
            weight = (SUMMARY_RETENTION_POLICY['user_messages'] 
                    if msg['role'] == 'user' 
                    else SUMMARY_RETENTION_POLICY['assistant_messages'])
            
            content = msg['content']
            # Only include first part of long messages
            if len(content.split()) > 50:
                content = " ".join(content.split()[:50]) + "..."
                
            if weight >= 0.8:  # High importance messages
                summary_parts.append(f"{msg['role']}: {content}")

        return "\n".join(summary_parts)

    def _extract_key_points(self, messages: List[Dict]) -> List[str]:
        """Extract key points from messages.
        
        Args:
            messages: List of messages to analyze
            
        Returns:
            List of key points
        """
        # Simple implementation - in practice, use LLM or NLP
        key_points = []
        for msg in messages:
            if msg['role'] == 'user' and '?' in msg['content']:
                # Capture questions as key points
                key_points.append(msg['content'])
            elif msg['role'] == 'assistant' and any(kw in msg['content'].lower() 
                                                  for kw in ['important', 'key', 'must', 'should']):
                # Capture important statements
                key_points.append(msg['content'])
                
        return key_points[:5]  # Limit to top 5 key points

    def _format_summaries(self) -> str:
        """Format all summaries into a single context message.
        
        Returns:
            Formatted summary text
        """
        if not self.summaries:
            return ""

        parts = ["Previous conversation context:"]
        for summary in self.summaries:
            parts.append(f"\nSummary {summary.start_index}-{summary.end_index}:")
            parts.append(summary.summary)
            if summary.key_points:
                parts.append("\nKey points:")
                parts.extend(f"- {point}" for point in summary.key_points)

        return "\n".join(parts)

    def _count_tokens(self, text: str) -> int:
        """Count tokens in text.
        
        Args:
            text: Text to count tokens for
            
        Returns:
            Approximate token count
        """
        if self.tokenizer:
            return len(self.tokenizer.encode(text))
        # Simple approximation: words / 0.75 (typical tokens-per-word ratio)
        return int(len(text.split()) / 0.75)

    def _update_token_count(self) -> None:
        """Update the current token count based on recent messages and summaries."""
        self.current_token_count = sum(
            self._count_tokens(msg['content']) 
            for msg in self.messages[-MAX_RECENT_MESSAGES:]
        )
        self.current_token_count += sum(s.token_count for s in self.summaries)
