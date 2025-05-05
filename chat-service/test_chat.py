import asyncio
from modules.chat_agent import NoteAppChatAgent
from langchain_core.tools import Tool
from langchain_ollama import ChatOllama

# Mock Tools
class MockSearchNoteAppTool(Tool):
    """Mock tool to simulate searching for notes."""
    def __init__(self):
        super().__init__(
            name="search_noteapp",
            func=self.search,
            description="Mock search for notes or transcripts containing the given query."
        )
    
    def search(self, query: str) -> list:
        """Return mock search results based on the query."""
        return [
            {"id": "1", "title": f"{query} Notes", "snippet": f"Snippet about {query.lower()}..."},
            {"id": "2", "title": f"{query} Advanced", "snippet": f"Advanced {query.lower()} concepts..."}
        ]
    
    def set_auth(self, jwt_token: str, user_id: str):
        """Mock auth method."""
        pass

class MockGetNoteAppContentTool(Tool):
    """Mock tool to simulate retrieving note content."""
    def __init__(self):
        super().__init__(
            name="get_noteapp_content",
            func=self.get_content,
            description="Mock retrieval of full content of a note or transcript by ID."
        )
    
    def get_content(self, item_id, item_type='note') -> dict:
        """Return mock content for a note ID."""
        try:
            # Convert to int if it's a string
            item_id = int(item_id)
        except (ValueError, TypeError):
            return "Error: item_id must be a valid integer"
            
        return {
            "id": item_id,
            "title": f"{item_type.capitalize()} {item_id}",
            "content": f"Full content for {item_type} {item_id}: This is a mock {item_type} about the requested topic."
        }
    
    def set_auth(self, jwt_token: str, user_id: str):
        """Mock auth method."""
        pass

async def interactive_chat():
    """Run an interactive chat session with the NoteAppChatAgent."""
    try:
        # Initialize components
        llm = ChatOllama(model="phi4-mini:latest")
        tools = [MockSearchNoteAppTool(), MockGetNoteAppContentTool()]
        agent = NoteAppChatAgent(llm, tools)

        print("Welcome to NoteApp Chat! Type 'exit' to quit.")
        chat_history = []  # Simple history to maintain context

        while True:
            query = input("\nYou: ")
            if query.lower() == "exit":
                break

            # Send query to agent
            response = await agent.invoke(
                user_input=query,
                chat_history=chat_history,
                user_id="test-user",
                jwt_token="test-token"
            )

            # Update chat history
            chat_history.append({"role": "user", "content": query})
            if "error" in response:
                print(f"Error: {response['error']}")
            else:
                print(f"Assistant: {response['final_answer']}")
                chat_history.append({"role": "assistant", "content": response['final_answer']})

            # Keep history manageable (e.g., last 10 messages)
            if len(chat_history) > 10:
                chat_history = chat_history[-10:]

    except Exception as e:
        print(f"Chat failed: {str(e)}")

if __name__ == "__main__":
    asyncio.run(interactive_chat())