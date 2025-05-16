"""Manages conversation message history and summarization."""
from typing import List, Dict, Optional, Tuple, Set
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
        """Generate a structured summary of messages with improved retention and formatting.

        Args:
            messages: List of messages to summarize
            
        Returns:
            Formatted summary text
        """
        summary_sections = {
            'task': [],
            'code': [],
            'error': [],
            'important': [],
            'conversation': []
        }
        
        # First pass: Categorize messages
        code_block = False
        for msg in messages:
            content = msg['content']
            role = msg['role']
            weight = SUMMARY_RETENTION_POLICY[
                'task_related' if self._is_task_related(content)
                else 'code_blocks' if '```' in content
                else 'user_messages' if role == 'user'
                else 'assistant_messages'
            ]
            
            if '```' in content:
                code_block = not code_block
                if code_block:
                    code_desc = content.split('```')[0].strip()
                    if code_desc:
                        summary_sections['code'].append(f"Code: {code_desc}")
            
            # Check task-related content
            if self._is_task_related(content):
                summary_sections['task'].append(
                    f"{role}: {self._truncate_text(content, 100)}"
                )
            
            # Check for errors/warnings
            elif any(kw in content.lower() for kw in ['error', 'warning', 'fail', 'issue']):
                summary_sections['error'].append(
                    f"{role}: {self._truncate_text(content, 80)}"
                )
            
            # Check for important statements
            elif weight >= 0.8 and any(kw in content.lower() 
                for kw in ['important', 'key', 'must', 'should', 'note']):
                summary_sections['important'].append(
                    f"{role}: {self._truncate_text(content, 80)}"
                )
            
            # Add to general conversation if significant
            elif weight >= 0.7:
                summary_sections['conversation'].append(
                    f"{role}: {self._truncate_text(content, 60)}"
                )
        
        # Build final summary with sections
        summary_parts = []
        
        if summary_sections['task']:
            summary_parts.extend([
                "\nTask Context:",
                *summary_sections['task'][:3]
            ])
            
        if summary_sections['error']:
            summary_parts.extend([
                "\nErrors/Warnings:",
                *summary_sections['error'][:2]
            ])
            
        if summary_sections['code']:
            summary_parts.extend([
                "\nCode Context:",
                *summary_sections['code'][:3]
            ])
            
        if summary_sections['important']:
            summary_parts.extend([
                "\nImportant Points:",
                *summary_sections['important'][:3]
            ])
            
        if summary_sections['conversation']:
            summary_parts.extend([
                "\nConversation Context:",
                *summary_sections['conversation'][:3]
            ])
        
        return "\n".join(summary_parts)
        
    def _is_task_related(self, text: str) -> bool:
        """Check if text is task-related."""
        text = text.lower()
        task_indicators = [
            'create', 'update', 'delete', 'modify', 'implement',
            'add', 'remove', 'change', 'fix', 'improve'
        ]
        return (
            any(indicator in text for indicator in task_indicators) or
            (any(q in text for q in ['can you', 'could you']) and
             any(act in text for act in ['help', 'please', 'need']))
        )
        
    def _truncate_text(self, text: str, max_length: int) -> str:
        """Truncate text to max_length while preserving word boundaries."""
        if len(text) <= max_length:
            return text
            
        truncated = text[:max_length]
        last_space = truncated.rfind(' ')
        if last_space > 0:
            truncated = truncated[:last_space]

        return truncated + "..."

    def _extract_key_points(self, messages: List[Dict]) -> List[str]:
        """Extract key points from messages using improved heuristics.

        Args:
            messages: List of messages to analyze
            
        Returns:
            List of key points
        """
        key_points = []
        code_block = False
        consecutive_context = []
        
        for msg in messages:
            content = msg['content'].lower()
            
            # Track code blocks
            if '```' in content:
                code_block = not code_block
                if code_block and len(content.split('```')) > 1:
                    # Add brief code summary
                    code_desc = content.split('```')[0].strip()
                    if code_desc:
                        key_points.append(f"Code example: {code_desc}")
            
            # Identify task-related content
            if msg['role'] == 'user':
                if any(kw in content for kw in ['can you', 'could you', 'please', 'help']):
                    task = content.replace('can you', '').replace('could you', '').replace('please', '').strip()
                    key_points.append(f"Task requested: {task[:100]}")
                elif '?' in content:
                    key_points.append(f"Question: {content[:100]}")
            
            # Track important assistant responses
            elif msg['role'] == 'assistant':
                if any(kw in content for kw in [
                    'important', 'key', 'must', 'should', 'warning', 'error', 'note',
                    'recommend', 'suggest', 'best practice', 'critical'
                ]):
                    # Extract the important statement
                    for line in content.split('\n'):
                        if any(kw in line.lower() for kw in [
                            'important', 'key', 'must', 'should', 'warning', 'error',
                            'note', 'recommend', 'suggest', 'best practice', 'critical'
                        ]):
                            key_points.append(line.strip()[:100])
            
            # Track conversation context
            consecutive_context.append(msg)
            if len(consecutive_context) >= 3:
                # Check for thematic consistency
                themes = set()
                for ctx_msg in consecutive_context[-3:]:
                    themes.update(self._extract_themes(ctx_msg['content']))
                if len(themes) >= 2:
                    key_points.append(f"Context theme: {', '.join(list(themes)[:3])}")
                consecutive_context = consecutive_context[-3:]
                
        # Deduplicate and limit
        seen = set()
        unique_points = []
        for point in key_points:
            normalized = point.lower()
            if normalized not in seen:
                seen.add(normalized)
                unique_points.append(point)
                
        return unique_points[:7]  # Increased limit for better context
        
    def _extract_themes(self, text: str) -> Set[str]:
        """Extract main themes from text.
        
        Args:
            text: Text to analyze
            
        Returns:
            Set of identified themes
        """
        # Simple keyword-based theme extraction
        themes = set()
        text = text.lower()
        
        theme_keywords = {
            'code': ['function', 'class', 'method', 'variable', 'import', 'return'],
            'error': ['error', 'exception', 'failed', 'bug', 'issue', 'problem'],
            'task': ['create', 'update', 'delete', 'modify', 'implement', 'add'],
            'question': ['how', 'what', 'why', 'when', 'where', 'can', 'could'],
            'data': ['json', 'array', 'object', 'string', 'number', 'boolean'],
            'api': ['endpoint', 'request', 'response', 'api', 'rest', 'server'],
            'ui': ['component', 'style', 'css', 'html', 'layout', 'design'],
        }
        
        for theme, keywords in theme_keywords.items():
            if any(kw in text for kw in keywords):
                themes.add(theme)

        return themes

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

        # Build formatted output
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
