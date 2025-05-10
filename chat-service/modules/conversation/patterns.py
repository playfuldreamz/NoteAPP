from typing import List, Optional
from .types import PatternMatch
from .constants import CASUAL_PHRASES, CASUAL_PATTERNS, PATTERN_MATCH_CONFIDENCE

class PatternMatcher:
    @staticmethod
    def check_exact_matches(text: str) -> Optional[PatternMatch]:
        """Check for exact matches in casual phrases."""
        if text in CASUAL_PHRASES:
            return PatternMatch(
                matched=True,
                pattern_type="exact_match",
                match_text=text,
                confidence=1.0
            )
        return None

    @staticmethod
    def check_regex_patterns(text: str) -> List[PatternMatch]:
        """Check text against regex patterns."""
        matches = []
        for pattern_name, pattern in CASUAL_PATTERNS.items():
            if match := pattern.search(text):
                matches.append(PatternMatch(
                    matched=True,
                    pattern_type=pattern_name,
                    match_text=match.group(0),
                    confidence=PATTERN_MATCH_CONFIDENCE
                ))
        return matches

    @staticmethod
    def is_short_response(text: str, max_words: int = 4) -> bool:
        """Check if the text is a short response."""
        return len(text.split()) <= max_words
