import re
from .constants import CASUAL_PATTERNS

class MessageNormalizer:
    @staticmethod
    def normalize(text: str) -> str:
        """Normalizes input text for consistent processing."""
        # Convert to lowercase
        text = text.lower()
        
        # Remove excessive punctuation but preserve single marks
        text = re.sub(r'([?!.])\1+', r'\1', text)
        
        # Normalize repeated characters (e.g., heyyy -> heyy)
        for match in re.finditer(CASUAL_PATTERNS["repeated_chars"], text):
            char = match.group(1)
            text = text.replace(match.group(0), char + char)
        
        # Remove extra whitespace
        text = " ".join(text.split())
        
        return text.strip()

    @staticmethod
    def get_characteristics(text: str) -> dict:
        """Extracts message characteristics useful for classification."""
        return {
            "length": len(text.split()),
            "has_question_mark": "?" in text,
            "has_repeated_chars": bool(re.search(CASUAL_PATTERNS["repeated_chars"], text)),
            "all_caps": text.isupper(),
            "starts_lowercase": text[0].islower() if text else False,
        }
