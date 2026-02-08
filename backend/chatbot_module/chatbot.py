# Install: pip install backboard-sdk
import asyncio
import os
import json
import time
from pathlib import Path
from backboard import BackboardClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


def _extract_searchable_content(obj, max_chars=50000):
    """
    Recursively extract all string content from an item for search (titles, body text, nested content).
    Ensures archive search goes through full content, not just top-level keys.
    """
    out = []

    def _walk(val):
        if isinstance(val, str):
            out.append(val)
        elif isinstance(val, dict):
            for k, v in val.items():
                _walk(v)
        elif isinstance(val, list):
            for v in val:
                _walk(v)

    _walk(obj)
    text = " ".join(out)
    return (text[:max_chars] + " ") if len(text) > max_chars else text


def _item_to_readable_text(item, max_chars=700):
    """Turn a single archive item into readable text for AI context (actual content, not raw JSON)."""
    if isinstance(item, dict):
        parts = []
        if item.get("heading"):
            parts.append(f"Title: {item['heading']}")
        if item.get("text"):
            text = item["text"].strip()
            if len(text) > max_chars:
                text = text[: max_chars] + "..."
            parts.append(text)
        if not parts and item.get("response"):
            parts.append(item["response"][:max_chars])
        # Fallback: key human-readable fields
        for key in ("description", "name", "title", "summary", "content"):
            if key in item and item[key] and key not in ("heading", "text"):
                val = item[key]
                if isinstance(val, str) and len(val) > max_chars:
                    val = val[:max_chars] + "..."
                parts.append(f"{key}: {val}")
        if parts:
            return "\n".join(parts)
        # Generic: first N chars of JSON
        s = json.dumps(item, ensure_ascii=False)
        return s[:max_chars] + ("..." if len(s) > max_chars else "")
    if isinstance(item, (list, str)):
        s = json.dumps(item, ensure_ascii=False) if isinstance(item, list) else item
        return s[:max_chars] + ("..." if len(s) > max_chars else "")
    return str(item)[:max_chars]


class EventsChatbot:
    """Chatbot that uses the archive as context and always returns AI-generated answers."""
    
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
                system_prompt="""You are a helpful assistant for Kingston city services, events, permits, bylaws, and council information.

When the user asks a question, you will be given CONTEXT from the Kingston archive (search results or relevant data). Your job is to:
1. Answer the user's question in a natural, conversational way using that context.
2. Use the actual content from the archive—summarize, paraphrase, or quote it—so your answer is grounded in real data, not generic.
3. If the context clearly contains the answer, give a direct, helpful response and mention where the information comes from (e.g. building permits, bylaws, meeting minutes) when relevant.
4. If the context is only partly relevant, answer what you can from it and suggest related topics or next steps.
5. If the context is empty or not relevant, say you couldn't find that in the archive and offer to help with other Kingston city topics you do have information on.

Be concise, friendly, and accurate. Do not just list search results; write as if you are answering the question."""
            )
        
        # Create a new thread for this request (avoids 500 on second prompt when reusing thread across requests/event loops)
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
                
                # Build searchable text from full content (titles, body, nested strings), not just keys
                if file_name == "ai_responses" and isinstance(item, dict) and "response" in item:
                    item_text = (item.get("query", "") + " " + item.get("response", "")).lower()
                else:
                    item_text = _extract_searchable_content(item).lower()

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
    
    def build_archive_context(self, results, max_items_per_category=6, max_chars_per_item=700):
        """
        Build a single string of actual archive content for the AI to read and use in its answer.
        Each block is labeled with [Source: category] so the AI can cite and link answers to the data.
        """
        if not results:
            return ""
        lines = [
            "The following is relevant content from the Kingston city archive. Each block is labeled with [Source: category] so you can cite it (e.g. 'According to the Building Permits data...'). Use this content to answer the user's question. If the user's question is not answered by this content, say so and offer related information from the archive where possible.\n"
        ]
        for file_name, items in results.items():
            category_label = file_name.replace("_", " ").title()
            # Use file_name as stable reference (no spaces) for linking
            source_tag = f"[Source: {file_name}]"
            lines.append(f"\n--- {category_label} {source_tag} ---")
            for i, item in enumerate(items[:max_items_per_category]):
                text = _item_to_readable_text(item, max_chars=max_chars_per_item)
                if text.strip():
                    lines.append(f"\n{source_tag}\n{text.strip()}")
        return "\n".join(lines)
    
    def get_broader_context(self, query, max_items_total=12):
        """
        When keyword search returns little or nothing, pull in some content from archive
        so the AI still has something to work with (e.g. by category name or first items).
        """
        query_lower = query.lower()
        words = [w for w in query_lower.split() if len(w) > 2]
        collected = []
        for file_name, data_list in self.all_data.items():
            if file_name in ("ai_responses", "pending_requests") or not isinstance(data_list, list):
                continue
            # Prefer files whose name matches the query
            name_match = sum(1 for w in words if w in file_name.lower())
            items = list(data_list)[: 4 if name_match else 2]
            for item in items:
                if isinstance(item, dict):
                    collected.append((file_name, item))
            if len(collected) >= max_items_total:
                break
        if not collected:
            return ""
        # Build same format as build_archive_context
        by_file = {}
        for fn, item in collected[:max_items_total]:
            by_file.setdefault(fn, []).append(item)
        return self.build_archive_context(by_file, max_items_per_category=4, max_chars_per_item=500)
    
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
    
    def save_ai_response(self, query, response_text, sources=None):
        """
        Save AI response to persistent data file and link it to the archive records used.
        
        Args:
            query: User's original query
            response_text: AI's response text
            sources: Optional list of { 'category': str, 'data': dict } from the archive (links this prompt to JSON data)
        """
        try:
            ai_responses_file = self.data_path / "ai_responses.json"
            
            # Load existing responses or create new list
            if ai_responses_file.exists():
                with open(ai_responses_file, 'r', encoding='utf-8') as f:
                    ai_responses = json.load(f)
            else:
                ai_responses = []
            
            # Build minimal source refs for storage (category + title/heading so we can link to the data)
            source_refs = []
            if sources:
                for s in sources[:20]:  # cap for storage size
                    cat = s.get("category") or "data"
                    data = s.get("data")
                    if not isinstance(data, dict):
                        continue
                    title = (
                        data.get("heading")
                        or data.get("title")
                        or data.get("name")
                        or (data.get("text", "")[:80] + "..." if data.get("text") else None)
                    )
                    source_refs.append({
                        "category": cat,
                        "title": title or "(record)",
                    })
            
            # Add new response linked to archive sources
            ai_responses.append({
                "query": query,
                "response": response_text,
                "timestamp": str(time.time()),
                "sources": source_refs,
            })
            
            # Save back to file
            with open(ai_responses_file, 'w', encoding='utf-8') as f:
                json.dump(ai_responses, f, indent=2, ensure_ascii=False)
            
            # Update in-memory data
            self.all_data['ai_responses'] = ai_responses
        except Exception as e:
            print(f"Error saving AI response: {e}")
    
    async def ask_ai(self, query, archive_context=None):
        """
        Ask the AI assistant with optional archive context so it can give answers grounded in real data.
        Uses a new thread per request so multiple prompts in a row don't cause 500 errors.
        """
        try:
            await self.initialize_ai()
        except Exception as e:
            print(f"[ask_ai] initialize_ai failed: {e}", flush=True)
            raise RuntimeError(f"Failed to initialize AI: {e}") from e

        if archive_context and archive_context.strip():
            full_query = f"""ARCHIVE CONTEXT (use this to answer the user's question):\n\n{archive_context.strip()}\n\n---\nUser question: {query}"""
        else:
            full_query = f"""No specific archive results were found for this question. Please respond helpfully: suggest related Kingston city topics you can help with, or ask the user to rephrase.\n\nUser question: {query}"""

        if not self.thread or not getattr(self.thread, "thread_id", None):
            raise RuntimeError("No thread available after initialize_ai")

        try:
            response = await self.client.add_message(
                thread_id=self.thread.thread_id,
                content=full_query,
                llm_provider="openai",
                model_name="gpt-4o",
                stream=False,
            )
        except Exception as e:
            print(f"[ask_ai] add_message failed: {e}", flush=True)
            raise RuntimeError(f"AI request failed: {e}") from e

        # Handle different response shapes (e.g. .content string, or list of message parts)
        content = getattr(response, "content", None)
        if content is None and hasattr(response, "messages") and response.messages:
            last = response.messages[-1]
            content = getattr(last, "content", None) or str(last)
        if content is None:
            content = str(response) if response is not None else "I couldn't generate a response."
        if not isinstance(content, str):
            content = str(content)
        return content
    
    async def get_response(self, user_query):
        """
        Get a response by always using the AI, with archive content as context.
        Search results (and optionally broader archive content) are passed so the AI
        can give natural answers grounded in the actual data, not just list results.
        
        Args:
            user_query: User's question
            
        Returns:
            Dictionary with AI response, source, and events (for UI when we had matches)
        """
        # 1. Get relevant archive content via keyword search
        matching_results = self.search_events_local(user_query)
        archive_context = self.build_archive_context(matching_results) if matching_results else ""
        
        # 2. If search returned little or nothing, add broader context so the AI has something to use
        if len(archive_context.strip()) < 400:
            broader = self.get_broader_context(user_query)
            if broader:
                archive_context = (archive_context + "\n\nAdditional relevant archive content:\n" + broader).strip() if archive_context else broader
        
        # 3. Build events list for UI and for linking (so each prompt is linked to JSON data)
        all_events = []
        if matching_results:
            for category, items in matching_results.items():
                for item in items:
                    all_events.append({"category": category, "data": item})
        
        # 4. Always get an AI response using the archive context
        ai_response = await self.ask_ai(user_query, archive_context=archive_context)
        # Save response and link it to the archive sources used
        self.save_ai_response(user_query, ai_response, sources=all_events)
        
        return {
            "response": ai_response,
            "source": "local" if all_events else "ai",
            "events": all_events,
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