from typing import Optional, Dict, Any, Union
import json
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
    item_id: int = Field(description="The ID of the note or transcript (must be an integer)")
    item_type: str = Field(description="The type of item (must be 'note' or 'transcript')")

class CreateNoteAppInput(BaseModel):
    """Input schema for the create note tool."""
    title: str = Field(description="The title of the note.")
    content: str = Field(description="The content of the note.")

class BaseNoteAppTool(BaseTool, BaseModel):
    """Base class for NoteApp tools with authentication handling."""
    jwt_token: Optional[str] = None
    user_id: Optional[str] = None

    class Config:
        arbitrary_types_allowed = True

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
            data = response.json()
            
            # Extract results from the response structure
            results = data.get('results', [])              
            if not results:
                return "No matching notes or transcripts found."

            formatted_results = ["Here are the relevant items I found:"]
            has_relevant_items = False
            
            for item in results:
                relevance = item.get('relevance', 0)
                relevance_display = f"[Relevance: {relevance:.2f}]"
                
                # Check if title contains query terms (case insensitive)
                title_match = False
                if any(term.lower() in item['title'].lower() for term in query.lower().split()):
                    title_match = True
                    relevance_display += " [TITLE MATCH]"
                    has_relevant_items = True
                
                formatted_results.append(
                    f"- {item['type'].capitalize()} (ID: {item['id']}): {item['title']} {relevance_display}"
                )
            
            if has_relevant_items:
                formatted_results.append("\nRELEVANT ITEMS FOUND! You should examine the content of these items.")
            
            # Add guidance on how to use get_noteapp_content
            formatted_results.append("\nTo view the full content of an item, use the get_noteapp_content tool with:")
            formatted_results.append('Action Input: {"item_id": <number>, "item_type": "<type>"}')
            formatted_results.append("Where <number> is the ID (without quotes) and <type> is either \"note\" or \"transcript\"")
            
            return "\n".join(formatted_results)

        except requests.RequestException as e:
            return f"Error searching notes and transcripts: {str(e)}"

class GetNoteAppContentTool(BaseNoteAppTool):
    """Tool for retrieving full content of notes and transcripts."""
    
    name: str = "get_noteapp_content"
    description: str = "Retrieve the full content of a specific note or transcript by its ID."
    
    # Remove the args_schema to prevent validation issues with the ReAct agent
    # Instead, we'll parse the input directly in the _run method
    
    def _run(self, tool_input: str, **kwargs) -> str:
        """Retrieve the content of a specific item."""
        if not self.jwt_token or not self.user_id:
            raise ValueError("Tool not properly authenticated")

        # Parse the input manually - ReAct agent provides a JSON string
        try:
            # First, try to parse as JSON if it's a string
            if isinstance(tool_input, str):
                # Clean up any extra whitespace or newlines
                tool_input = tool_input.strip()
                if tool_input.startswith('{') and tool_input.endswith('}'):
                    try:
                        input_dict = json.loads(tool_input)
                        item_id = input_dict.get('item_id')
                        item_type = input_dict.get('item_type')
                    except json.JSONDecodeError:
                        return f"Error: Could not parse JSON input: '{tool_input}'. Please use format: {{\"item_id\": 15, \"item_type\": \"note\"}}"
                else:
                    return f"Error: Input must be a JSON object with 'item_id' and 'item_type'. Got: '{tool_input}'"
            elif isinstance(tool_input, dict):
                item_id = tool_input.get('item_id')
                item_type = tool_input.get('item_type')
            else:
                return f"Error: Unexpected input type: {type(tool_input).__name__}. Please use a JSON object with 'item_id' and 'item_type'."
            
            # Validate item_id (must be convertible to int)
            try:
                item_id = int(item_id)
            except (ValueError, TypeError):
                return f"Error: 'item_id' must be a number, got: '{item_id}'"
                
            # Validate item_type (must be 'note' or 'transcript')
            if not isinstance(item_type, str):
                return f"Error: 'item_type' must be a string, got: {type(item_type).__name__}"
                
            item_type = item_type.lower().strip()
            if item_type not in ['note', 'transcript']:
                return f"Error: 'item_type' must be 'note' or 'transcript', got: '{item_type}'"
                
            # Now we have valid item_id and item_type
            endpoint = 'notes' if item_type == 'note' else 'transcripts'
            
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
            return f"Error retrieving content: {str(e)}"
        except Exception as e:
            return f"Unexpected error: {str(e)}"

class CreateNoteAppTool(BaseNoteAppTool):
    """Tool for creating a new note."""
    
    name: str = "create_noteapp_note"
    description: str = "Creates a new note with the given title and content. Use this when the user explicitly asks to create or save a note."
    args_schema: type[BaseModel] = CreateNoteAppInput

    def _run(self, title: str, content: str, **kwargs) -> str:
        """Execute the note creation."""
        if not self.jwt_token or not self.user_id:
            return "Error: Tool not properly authenticated. JWT token or user ID is missing."

        if not title or not title.strip():
            return "Error: Note title cannot be empty."
        if not content or not content.strip():
            return "Error: Note content cannot be empty."

        try:
            response = requests.post(
                f"{NOTEAPP_BACKEND_URL}/api/notes",
                headers=self._get_headers(),
                json={"title": title.strip(), "content": content.strip()}
            )
            response.raise_for_status()  # Raises an exception for 4XX/5XX errors
            
            # Assuming the backend returns the created note object with its ID
            created_note_data = response.json()
            note_id = created_note_data.get("id", "unknown_id") 
            # Backend might return { "success": true, "note": { "id": ..., ... } } or just { "id": ... }
            # Adjust based on actual backend response structure for note creation.
            # For now, let's assume it's in created_note_data.id or created_note_data.note.id
            if isinstance(created_note_data.get("note"), dict):
                note_id = created_note_data.get("note", {}).get("id", note_id)


            return f"Successfully created note titled '{title.strip()}' with ID: {note_id}."

        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 400:
                try:
                    error_data = e.response.json()
                    return f"Error creating note (400 Bad Request): {error_data.get('message', e.response.text)}"
                except json.JSONDecodeError:
                    return f"Error creating note (400 Bad Request): {e.response.text}"
            return f"Error creating note: HTTP {e.response.status_code} - {e.response.text}"
        except requests.RequestException as e:
            return f"Error creating note: {str(e)}"
        except Exception as e:
            return f"An unexpected error occurred while creating the note: {str(e)}"
