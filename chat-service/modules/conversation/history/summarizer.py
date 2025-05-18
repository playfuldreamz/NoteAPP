"""Message summarization logic for chat history."""
from typing import List, Dict, Set
from ..constants import SUMMARY_RETENTION_POLICY
from .message_summary import MessageSummary
from .theme_extractor import ThemeExtractor
from .token_counter import TokenCounter

class MessageSummarizer:
    """Handles summarization of conversation messages."""
    
    def __init__(self, token_counter: TokenCounter):
        self.token_counter = token_counter
        self.theme_extractor = ThemeExtractor()
        
    def create_summary(self, messages: List[Dict], start_index: int, end_index: int) -> MessageSummary:
        """Create a new summary from messages.
        
        Args:
            messages: List of messages to summarize
            start_index: Start index in the message history
            end_index: End index in the message history
            
        Returns:
            MessageSummary object containing the summary
        """
        if not messages:
            return None
            
        summary_text = self._generate_summary_text(messages)
        key_points = self._extract_key_points(messages)
        token_count = self.token_counter.count_tokens(summary_text)
        
        return MessageSummary(
            summary=summary_text,
            start_index=start_index,
            end_index=end_index,
            key_points=key_points,
            token_count=token_count
        )
    
    def _generate_summary_text(self, messages: List[Dict]) -> str:
        """Generate a structured summary of messages.
        
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
                'task_related' if self.theme_extractor.is_task_related(content)
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
            if self.theme_extractor.is_task_related(content):
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
        return self._format_summary_sections(summary_sections)
    
    def _extract_key_points(self, messages: List[Dict]) -> List[str]:
        """Extract key points from messages.
        
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
                    themes.update(self.theme_extractor.extract_themes(ctx_msg['content']))
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
                
        return unique_points[:7]

    def _format_summary_sections(self, sections: Dict[str, List[str]]) -> str:
        """Format summary sections into a single string.
        
        Args:
            sections: Dictionary of section name to list of section content
            
        Returns:
            Formatted summary text
        """
        summary_parts = []
        
        if sections['task']:
            summary_parts.extend([
                "\nTask Context:",
                *sections['task'][:3]
            ])
            
        if sections['error']:
            summary_parts.extend([
                "\nErrors/Warnings:",
                *sections['error'][:2]
            ])
            
        if sections['code']:
            summary_parts.extend([
                "\nCode Context:",
                *sections['code'][:3]
            ])
            
        if sections['important']:
            summary_parts.extend([
                "\nImportant Points:",
                *sections['important'][:3]
            ])
            
        if sections['conversation']:
            summary_parts.extend([
                "\nConversation Context:",
                *sections['conversation'][:3]
            ])
        
        return "\n".join(summary_parts)
    
    def _truncate_text(self, text: str, max_length: int) -> str:
        """Truncate text while preserving word boundaries.
        
        Args:
            text: Text to truncate
            max_length: Maximum length
            
        Returns:
            Truncated text
        """
        if len(text) <= max_length:
            return text
            
        truncated = text[:max_length]
        last_space = truncated.rfind(' ')
        if last_space > 0:
            truncated = truncated[:last_space]
            
        return truncated + "..."
