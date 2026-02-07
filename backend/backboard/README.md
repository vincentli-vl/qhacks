# Events Chatbot

This chatbot searches local Kingston events data first, then falls back to AI when needed.

## How It Works

1. **Local Search First**: When a user asks a question, the chatbot searches the `events_detailed.json` file for matching events based on keywords in the title, date, and content.

2. **AI Fallback**: If no relevant events are found locally, the chatbot uses the Backboard AI to provide a helpful response.

3. **Smart Matching**: The local search uses a scoring system where:
   - Title matches = 3 points
   - Date matches = 2 points  
   - Content matches = 1 point

## API Response Format

```json
{
  "reply": "The formatted response text",
  "source": "local" or "ai",
  "events": [...array of matching events if source is local...]
}
```

## Example Queries

**Local Search Examples** (will return events from JSON):
- "planning committee"
- "heritage properties"
- "February 2026 meetings"
- "council meeting"

**AI Fallback Examples** (will use AI):
- "What is the weather like?"
- "How do I contact city hall?"
- General questions not about specific events

## Testing

Run the chatbot standalone:
```bash
cd backend/backboard
python chatbot.py
```

This will test both local search and AI fallback functionality.
