# Install: pip install backboard-sdk
import asyncio
import os
import json
from pathlib import Path
from backboard import BackboardClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class EventsChatbot:
    """Chatbot that searches local events data first, then falls back to AI"""
    
    def __init__(self, events_json_path=None):
        """
        Initialize the chatbot with events data and AI client
        
        Args:
            events_json_path: Path to events JSON file. If None, will look in project root
        """
        # Load events data
        if events_json_path is None:
            # Get the project root (3 levels up from this file)
            project_root = Path(__file__).parent.parent.parent
            events_json_path = project_root / "backend" / "data" / "meeting_data.json"
        
        with open(events_json_path, 'r', encoding='utf-8') as f:
            self.events_data = json.load(f)
        
        # Initialize AI client
        api_key = os.getenv("BACKBOARD_API_KEY")
        if not api_key:
            raise ValueError("BACKBOARD_API_KEY not found in environment variables")
        
        self.client = BackboardClient(api_key=api_key)
        self.assistant = None
        self.thread = None
    
    async def initialize_ai(self):
        """Initialize the AI assistant and thread"""
        if not self.assistant:
            self.assistant = await self.client.create_assistant(
                name="Kingston Events Assistant",
                system_prompt="""You are a helpful assistant for Kingston city events and council meetings. 
                You provide information about dates, times, committees, and event details.
                Be concise and friendly in your responses."""
            )
        
        if not self.thread:
            self.thread = await self.client.create_thread(self.assistant.assistant_id)
    
    def search_events_local(self, query):
        """
        Search for events in the local JSON data
        
        Args:
            query: User's search query (string)
            
        Returns:
            list of matching events or None if no matches found
        """
        query_lower = query.lower()
        keywords = query_lower.split()
        
        matching_events = []
        
        for event in self.events_data:
            # Search in meeting title, date, and documents
            title = event.get('meeting', '').lower()
            date = event.get('date', '').lower()
            meeting_url = event.get('meeting_url', '').lower()
            documents = event.get('documents', {}) or {}
            documents_text = " ".join([
                str(doc_name).lower() + " " + str(doc_url).lower()
                for doc_name, doc_url in documents.items()
            ])
            
            # Check if any keyword matches
            match_score = 0
            for keyword in keywords:
                if keyword in title:
                    match_score += 3  # Title matches are most important
                if keyword in date:
                    match_score += 2  # Date matches are also important
                if keyword in meeting_url:
                    match_score += 2
                if keyword in documents_text:
                    match_score += 1  # HTML content matches are less important
            
            if match_score > 0:
                matching_events.append({
                    'event': event,
                    'score': match_score
                })
        
        # Sort by match score (highest first)
        matching_events.sort(key=lambda x: x['score'], reverse=True)
        
        # Return top 5 matches
        return [item['event'] for item in matching_events[:5]] if matching_events else None
    
    def format_event_response(self, events):
        """
        Format events data into a readable response
        
        Args:
            events: List of event dictionaries
            
        Returns:
            Formatted string response
        """
        if not events:
            return None
        
        response = f"I found {len(events)} meeting(s) in the local database:\n\n"
        
        for i, event in enumerate(events, 1):
            title = event.get('meeting', 'Untitled Meeting')
            date = event.get('date', 'Date TBA')
            link = event.get('meeting_url', '')
            documents = event.get('documents', {}) or {}
            
            response += f"{i}. **{title}**\n"
            response += f"   Date: {date}\n"
            if link:
                response += f"   Link: {link}\n"
            if documents:
                doc_items = list(documents.items())[:3]
                response += "   Documents:\n"
                for doc_name, doc_url in doc_items:
                    response += f"     - {doc_name}: {doc_url}\n"
            response += "\n"
        
        return response
    
    async def ask_ai(self, query, context=None):
        """
        Ask the AI assistant when local search doesn't find results
        
        Args:
            query: User's question
            context: Optional context about failed local search
            
        Returns:
            AI's response
        """
        await self.initialize_ai()
        
        # Build the message with context if available
        if context:
            full_query = f"{context}\n\nUser question: {query}"
        else:
            full_query = query
        
        response = await self.client.add_message(
            thread_id=self.thread.thread_id,
            content=full_query,
            llm_provider="openai",
            model_name="gpt-4o",
            stream=False
        )
        
        return response.content
    
    async def get_response(self, user_query):
        """
        Main method to get a response - searches locally first, then uses AI
        
        Args:
            user_query: User's question/search query
            
        Returns:
            Dictionary with response and source information
        """
        # First, try to find events in local data
        matching_events = self.search_events_local(user_query)
        
        if matching_events:
            # Found events locally
            formatted_response = self.format_event_response(matching_events)
            return {
                'response': formatted_response,
                'source': 'local',
                'events': matching_events
            }
        else:
            # No local results, use AI
            context = "I searched the local meetings database but couldn't find specific matching meetings. Please provide a helpful response based on general knowledge about Kingston events and city council meetings."
            ai_response = await self.ask_ai(user_query, context)
            
            return {
                'response': ai_response,
                'source': 'ai',
                'events': []
            }


# Example usage
async def main():
    """Example usage of the chatbot"""
    chatbot = EventsChatbot()
    
    # Test with a local search
    print("=== Testing local search ===")
    response = await chatbot.get_response("planning committee")
    print(f"Source: {response['source']}")
    print(response['response'])
    
    print("\n=== Testing AI fallback ===")
    response = await chatbot.get_response("What is the weather like?")
    print(f"Source: {response['source']}")
    print(response['response'])


if __name__ == "__main__":
    asyncio.run(main())