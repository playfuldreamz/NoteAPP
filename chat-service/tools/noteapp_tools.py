from typing import Optional
import requests
from langchain_core.tools import BaseTool
from pydantic import BaseModel, Field

from config import NOTEAPP_BACKEND_URL

class SearchNoteAppInput(BaseModel):
    """Input schema for the search tool."""
    query: str = Field(
        description="The search query to find relevant notes and transcripts"
    )

class GetNoteAppContentInput(BaseModel):
    """Input schema for the content retrieval tool."""
    item_id: int = Field(description="The ID of the note or transcript")
    item_type: str = Field(
        description="The type of item ('note' or 'transcript')"
    )

class BaseNoteAppTool(BaseTool):
    """Base class for NoteApp tools with authentication handling."""
    
    def __init__(self):
        super().__init__()
        self.jwt_token: Optional[str] = None
        self.user_id: Optional[str] = None

    def set_auth(self, jwt_token: str, user_id: str) -> None:
        """Set authentication credentials for the tool."""
        self.jwt_token = jwt_token
        self.user_id = user_id

    def _get_headers(self) -> dict:
        """Get headers with authentication token."""
        if not self.jwt_token:
            raise ValueError("Authentication token not set")
        return {
            "Authorization": f"Bearer {self.jwt_token}",
            "Content-Type": "application/json"
        }

class SearchNoteAppTool(BaseNoteAppTool):
    """Tool for searching notes and transcripts."""
    
    name: str = "search_noteapp"
    description: str = "Search through user's notes and transcripts using semantic search."
    args_schema: type[BaseModel] = SearchNoteAppInput

    def _run(self, query: str, **kwargs) -> str:
        """Execute the search."""
        if not self.jwt_token or not self.user_id:
            raise ValueError("Tool not properly authenticated")

        try:
            response = requests.post(
                f"{NOTEAPP_BACKEND_URL}/api/search",
                headers=self._get_headers(),
                json={"query": query}
            )
            response.raise_for_status()
            results = response.json()

            if not results:
                return "No matching notes or transcripts found."

            formatted_results = ["Here are the relevant items I found:"]
            for item in results:
                formatted_results.append(
                    f"- {item['type'].capitalize()} (ID: {item['id']}): {item['title']} "
                    f"[Relevance: {item.get('relevance', 'N/A'):.2f}]"
                )
            
            return "\n".join(formatted_results)

        except requests.RequestException as e:
            return f"Error searching notes and transcripts: {str(e)}"

class GetNoteAppContentTool(BaseNoteAppTool):
    """Tool for retrieving full content of notes and transcripts."""
    
    name: str = "get_noteapp_content"
    description: str = "Retrieve the full content of a specific note or transcript by its ID."
    args_schema: type[BaseModel] = GetNoteAppContentInput

    def _run(self, item_id: int, item_type: str, **kwargs) -> str:
        """Retrieve the content of a specific item."""
        if not self.jwt_token or not self.user_id:
            raise ValueError("Tool not properly authenticated")

        if item_type not in ['note', 'transcript']:
            return f"Invalid item type: {item_type}. Must be 'note' or 'transcript'."

        endpoint = 'notes' if item_type == 'note' else 'transcripts'
        
        try:
            response = requests.get(
                f"{NOTEAPP_BACKEND_URL}/api/{endpoint}/{item_id}",
                headers=self._get_headers()
            )
            response.raise_for_status()
            item = response.json()

            content = item.get('content' if item_type == 'note' else 'text', '')
            title = item.get('title', 'Untitled')

            return f"{item_type.capitalize()}: {title}\n\nContent:\n{content}"

        except requests.RequestException as e:
            return f"Error retrieving {item_type} content: {str(e)}"
