"""Manages conversation message history and summarization."""
from typing import List, Dict, Optional, Union
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, trim_messages
from ..constants import MAX_RECENT_MESSAGES, MAX_HISTORY_TOKENS, SUMMARY_TRIGGER_LENGTH, TOKEN_LIMITS
from .message_summary import MessageSummary
from .token_counter import TokenCounter, SimpleTokenCounter, TokenizedTokenCounter
from .summarizer import MessageSummarizer

class MessageHistoryManager:
    """Manages conversation message history, including summarization and token management."""

    def __init__(self, tokenizer=None):
        """Initialize the history manager.
        
        Args:
            tokenizer: Optional tokenizer to use for token counting. If None, uses a simple
                      approximation based on word count.
        """
        # Initialize token counter based on tokenizer availability
        self.token_counter = TokenizedTokenCounter(tokenizer) if tokenizer else SimpleTokenCounter()
        
        # Initialize summarizer
        self.summarizer = MessageSummarizer(self.token_counter)
        
        # Initialize state
        self.messages: List[Dict] = []  # Full message history
        self.summaries: List[MessageSummary] = []  # Summarized sections
        self.current_token_count = 0
        self.total_tokens_processed = 0
        
        # Add compatibility with LangChain's trim_messages
        self.token_counter_function = self.token_counter  # Alias for compatibility

    def add_message(self, message: Dict) -> None:
        """Add a new message to the history.
        
        Args:
            message: Dictionary containing 'role' and 'content'
        """
        # Add message
        self.messages.append(message)
        
        # Count tokens
        token_count = self.token_counter.count_tokens(message['content'])
        self.current_token_count += token_count
        self.total_tokens_processed += token_count

        # Check if we need to summarize
        if self._should_summarize():
            self._create_summary()

    def get_formatted_history(self) -> List[Union[AIMessage, HumanMessage, SystemMessage]]:
        """Get the formatted message history for the LLM, trimmed to token limits.
        
        Returns:
            List of formatted messages including summaries and recent messages,
            trimmed to fit within token limits.
        """
        # Convert messages to LangChain message format
        langchain_messages = []
        
        # Add system message with summaries if available
        if self.summaries:
            summary_text = self._format_summaries()
            if summary_text:
                langchain_messages.append(SystemMessage(content=summary_text))
        
        # Add recent messages
        recent_messages = self.messages[-MAX_RECENT_MESSAGES:] if len(self.messages) > MAX_RECENT_MESSAGES else self.messages
        for msg in recent_messages:
            if msg['role'] == 'assistant':
                langchain_messages.append(AIMessage(content=msg['content']))
            else:
                langchain_messages.append(HumanMessage(content=msg['content']))
        
        # Trim messages to fit within token limits
        trimmed_messages = trim_messages(
            langchain_messages,
            strategy="last",  # Keep most recent messages
            token_counter=self.token_counter,
            max_tokens=MAX_HISTORY_TOKENS - TOKEN_LIMITS["response"],  # Leave room for response
            start_on="human",  # Ensure we start with a human message
            end_on=("human",),  # End on a human message
            include_system=True  # Always include system messages
        )
        
        return list(trimmed_messages)

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

        # Generate summary using summarizer
        summary = self.summarizer.create_summary(
            messages_to_summarize,
            start_index=0,
            end_index=len(messages_to_summarize)
        )

        if summary:
            self.summaries.append(summary)
            self._update_token_count()

    def _format_summaries(self) -> str:
        """Format all summaries into a structured context message.

        Returns:
            Formatted summary text with improved organization
        """
        if not self.summaries:
            return ""

        # Organize summaries into sections
        sections = {
            'tasks': [],
            'code': [],
            'questions': [],
            'important': [],
            'context': []
        }

        # Process all summaries to categorize content
        for summary in self.summaries:
            for point in summary.key_points:
                point = point.strip()
                
                # Categorize based on content markers
                if any(marker in point.lower() for marker in ['task', 'todo', 'implement']):
                    sections['tasks'].append(point)
                elif 'code example:' in point.lower():
                    sections['code'].append(point)
                elif '?' in point:
                    sections['questions'].append(point)
                elif any(marker in point.lower() for marker in ['important', 'key', 'must', 'should']):
                    sections['important'].append(point)
                elif 'context theme:' in point.lower():
                    sections['context'].append(point)

        return self._format_summary_output(sections)

    def _format_summary_output(self, sections: Dict[str, List[str]]) -> str:
        """Format the summary sections into a readable output.
        
        Args:
            sections: Dictionary of section name to list of section content
            
        Returns:
            Formatted summary text
        """
        output = ["=== Conversation Summary ==="]

        # Add each non-empty section
        if sections['tasks']:
            output.extend(["\n=== Active Tasks ==="] + 
                        [f"• {task}" for task in sections['tasks'][:3]])

        if sections['code']:
            output.extend(["\n=== Code Context ==="] + 
                        [f"• {code}" for code in sections['code'][:2]])

        if sections['important']:
            output.extend(["\n=== Key Points ==="] + 
                        [f"• {point}" for point in sections['important'][:3]])

        if sections['questions']:
            output.extend(["\n=== Recent Questions ==="] + 
                        [f"• {q}" for q in sections['questions'][:2]])

        if sections['context']:
            output.extend(["\n=== Discussion Themes ==="] + 
                        [f"• {theme}" for theme in sections['context'][:2]])

        # Add recent conversation flow
        if self.summaries:
            output.append("\n=== Recent Activity ===")
            for summary in reversed(self.summaries[-2:]):
                output.append(f"\nExchange {summary.start_index}-{summary.end_index}:")
                output.append(self._format_conversation_flow(summary))

        return "\n".join(output)

    def _format_conversation_flow(self, summary: MessageSummary) -> str:
        """Format a summary into a readable conversation flow.
        
        Args:
            summary: The message summary to format
            
        Returns:
            Formatted conversation flow
        """
        # Split into user and assistant messages
        user_msgs = []
        assistant_msgs = []
        
        for line in summary.summary.split("\n"):
            if line.startswith("user:"):
                user_msgs.append(line.replace("user:", "👤").strip())
            elif line.startswith("assistant:"):
                assistant_msgs.append(line.replace("assistant:", "🤖").strip())
        
        # Format into condensed flow
        flow = []
        
        # Add user messages first
        if user_msgs:
            flow.append("User discussed:")
            flow.extend(f"  {msg[:100]}..." if len(msg) > 100 else f"  {msg}" 
                       for msg in user_msgs[:2])
        
        # Add assistant responses
        if assistant_msgs:
            flow.append("Assistant provided:")
            flow.extend(f"  {msg[:100]}..." if len(msg) > 100 else f"  {msg}"
                       for msg in assistant_msgs[:2])
        
        return "\n".join(flow)

    def _update_token_count(self) -> None:
        """Update the current token count based on recent messages and summaries."""
        self.current_token_count = sum(
            self.token_counter.count_tokens(msg['content']) 
            for msg in self.messages[-MAX_RECENT_MESSAGES:]
        )
        self.current_token_count += sum(s.token_count for s in self.summaries)
