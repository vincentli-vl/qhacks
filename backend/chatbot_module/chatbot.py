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
    """Chatbot that searches local data files first, then falls back to AI"""
    
    def __init__(self, data_folder_path=None):
        """
        Initialize the chatbot with data from all JSON files
        
        Args:
            data_folder_path: Path to data folder. If None, will look in project root
        """
        # Load all JSON data from the data folder
        if data_folder_path is None:
            # Get the project root (3 levels up from this file)
            project_root = Path(__file__).parent.parent.parent
            data_folder_path = project_root / "backend" / "data"
        
        self.all_data = {}
        self.data_path = Path(data_folder_path)
        data_path = Path(data_folder_path)
        
        if data_path.exists():
            for json_file in data_path.glob("*.json"):
                try:
                    with open(json_file, 'r', encoding='utf-8') as f:
                        file_name = json_file.stem
                        self.all_data[file_name] = json.load(f)
                        print(f"Loaded {file_name}: {len(self.all_data[file_name])} items")
                except Exception as e:
                    print(f"Error loading {json_file}: {e}")
        else:
            raise ValueError(f"Data folder not found at {data_path}")
        
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
        Search for data across all local JSON files
        Uses AND logic - ALL keywords must match for a result to be included
        For AI responses, only checks if keywords match the response content (not the original query)
        
        Args:
            query: User's search query (string)
            
        Returns:
            dict with matching data grouped by file or None if no matches found
        """
        query_lower = query.lower()
        keywords = [k for k in query_lower.split() if len(k) > 2]  # Filter out short words
        
        # If no valid keywords, return None
        if not keywords:
            return None
        
        matching_results = {}
        
        # Fuzzy matching function
        def fuzzy_match(text, keywords):
            for keyword in keywords:
                if keyword not in text:
                    # Check if any word in text contains this keyword as substring
                    words = text.split()
                    if not any(keyword in word for word in words):
                        return False
            return True
        
        # Search across all loaded data files
        for file_name, data_list in self.all_data.items():
            if not isinstance(data_list, list):
                continue
                
            matching_items = []
            seen_in_category = set()  # Track duplicates within this category only
            
            for item in data_list:
                item_hash = json.dumps(item, sort_keys=True)  # Create unique hash
                
                # Skip if we've already seen this exact item in this category
                if item_hash in seen_in_category:
                    continue
                
                # Special handling for AI responses - only check response content relevance
                if file_name == 'ai_responses' and isinstance(item, dict) and 'response' in item:
                    # For AI responses, only check the response content, not the original query
                    item_text = item['response'].lower()
                else:
                    # For all other data, check the entire item
                    item_text = json.dumps(item).lower()
                
                # Check if ALL keywords match using fuzzy substring matching
                if fuzzy_match(item_text, keywords):
                    # Calculate match score based on how many times keywords appear
                    match_score = sum(item_text.count(keyword) for keyword in keywords)
                    seen_in_category.add(item_hash)
                    matching_items.append({
                        'item': item,
                        'score': match_score
                    })
            
            # Sort by match score (highest first) and keep top results
            if matching_items:
                matching_items.sort(key=lambda x: x['score'], reverse=True)
                matching_results[file_name] = [item['item'] for item in matching_items[:5]]
        
        return matching_results if matching_results else None
    
    def format_event_response(self, results):
        """
        Format search results into a readable response
        
        Args:
            results: Dictionary with file_name: [items] structure
            
        Returns:
            Formatted string response
        """
        if not results:
            return None
        
        response = f"I found matching results in {len(results)} data categor{'ies' if len(results) != 1 else 'y'}:\n\n"
        
        total_items = sum(len(items) for items in results.values())
        response += f"Total: {total_items} matching item(s)\n\n"
        
        for file_name, items in results.items():
            response += f"**{file_name.replace('_', ' ').title()}** ({len(items)} item(s)):\n"
            for i, item in enumerate(items[:3], 1):  # Show top 3 per category
                # Display item as formatted JSON
                item_str = json.dumps(item, indent=2)
                # Truncate long items
                if len(item_str) > 300:
                    item_str = item_str[:300] + "..."
                response += f"\n{i}. {item_str}\n"
            response += "\n"
        
        return response
    
    def save_ai_response(self, query, response_text):
        """
        Save AI response to persistent data file
        
        Args:
            query: User's original query
            response_text: AI's response text
        """
        try:
            ai_responses_file = self.data_path / "ai_responses.json"
            
            # Load existing responses or create new list
            if ai_responses_file.exists():
                with open(ai_responses_file, 'r', encoding='utf-8') as f:
                    ai_responses = json.load(f)
            else:
                ai_responses = []
            
            # Add new response
            ai_responses.append({
                'query': query,
                'response': response_text,
                'timestamp': str(asyncio.get_event_loop().time())
            })
            
            # Save back to file
            with open(ai_responses_file, 'w', encoding='utf-8') as f:
                json.dump(ai_responses, f, indent=2, ensure_ascii=False)
            
            # Update in-memory data
            self.all_data['ai_responses'] = ai_responses
        except Exception as e:
            print(f"Error saving AI response: {e}")
    
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
        # First, try to find data in local files
        matching_results = self.search_events_local(user_query)
        
        if matching_results:
            # Found results locally
            formatted_response = self.format_event_response(matching_results)
            # Create events list with category information
            all_events = []
            for category, items in matching_results.items():
                for item in items:
                    all_events.append({
                        'category': category,
                        'data': item
                    })
            return {
                'response': formatted_response,
                'source': 'local',
                'events': all_events
            }
        else:
            # No local results, use AI
            context = "I searched the local Kingston city data but couldn't find specific matching records. Please provide a helpful response based on general knowledge about Kingston city services and events."
            ai_response = await self.ask_ai(user_query, context)
            
            # Save AI response to persistent data file
            self.save_ai_response(user_query, ai_response)
            
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