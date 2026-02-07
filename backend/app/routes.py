from flask import Blueprint, request, jsonify
import asyncio
import sys
from pathlib import Path

# Add the backboard directory to the Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from backboard.chatbot import EventsChatbot

main_bp = Blueprint('main', __name__)
chat_bp = Blueprint('chat', __name__, url_prefix='/chat')

# Initialize chatbot (will be created on first use)
chatbot_instance = None

def get_chatbot():
    """Get or create the chatbot instance"""
    global chatbot_instance
    if chatbot_instance is None:
        chatbot_instance = EventsChatbot()
    return chatbot_instance

# Sample data for stats
STATS = {
    'totalUsers': 1245,
    'activeUsers': 342,
    'totalMessages': 5829,
    'avgResponseTime': 145
}

@main_bp.route('/stats', methods=['GET'])
def get_stats():
    """Get dashboard statistics"""
    return jsonify(STATS)

@chat_bp.route('', methods=['POST'])
def chat():
    """Handle chat messages with local JSON search and AI fallback"""
    try:
        data = request.get_json()
        message = data.get('message', '')
        
        if not message:
            return jsonify({'error': 'No message provided'}), 400
        
        # Get chatbot instance
        chatbot = get_chatbot()
        
        # Run async chatbot response in sync context
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            response_data = loop.run_until_complete(chatbot.get_response(message))
        finally:
            loop.close()
        
        return jsonify({
            'reply': response_data['response'],
            'source': response_data['source'],
            'events': response_data.get('events', [])
        })
        
    except Exception as e:
        return jsonify({
            'error': 'An error occurred processing your request',
            'details': str(e)
        }), 500
