import re

item_pattern = re.compile(
    r"-\s*(Note|Transcript)\s*\(ID:\s*(\d+)\):\s*(.*?)\s*\[Relevance:\s*(-?\d+\.\d+)\].*?(?:\[TITLE MATCH\])?"
)

test_outputs = [
    "- Note (ID: 15): DSPy Planning [Relevance: 0.03] [TITLE MATCH]",
    "- Transcript (ID: 42): Meeting Recap [Relevance: 0.85]",
    "- Note (ID: 7): Python Tips [Relevance: 0.71]",
    "- Note (ID: 99): Something [Relevance: -0.12] [TITLE MATCH]",
    "- Note (ID: 123):   Extra Spaces   [Relevance: 0.99]",
    "- Transcript (ID: 555): Final Review [Relevance: 1.00]",
    "- Note (ID: 1): Edge [Relevance: 0.00]",
    "- Note (ID: 2): No TitleMatch [Relevance: 0.50]",
    "- Note (ID: 3): Bad Relevance [Relevance: not_a_number]",
    "- Note (ID: 4): Missing Relevance",
    "- Something else entirely"
]

for line in test_outputs:
    match = item_pattern.match(line.strip())
    if match:
        print(f"MATCH: {match.groups()}")
    else:
        print(f"NO MATCH: {line}")
