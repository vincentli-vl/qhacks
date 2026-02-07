from flask import Blueprint, request, jsonify
import asyncio
import sys
import json
from pathlib import Path

# Add the chatbot_module directory to the Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from chatbot_module.chatbot import EventsChatbot

main_bp = Blueprint('main', __name__)
chat_bp = Blueprint('chat', __name__)

# Initialize chatbot (will be created on first use)
chatbot_instance = None

def get_chatbot():
    """Get or create the chatbot instance"""
    global chatbot_instance
    if chatbot_instance is None:
        chatbot_instance = EventsChatbot()
    return chatbot_instance

def get_pending_requests_file():
    """Get path to pending requests JSON file"""
    project_root = Path(__file__).parent.parent.parent
    data_path = project_root / "backend" / "data"
    return data_path / "pending_requests.json"

def load_pending_requests():
    """Load pending requests from JSON file"""
    file_path = get_pending_requests_file()
    if file_path.exists():
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading pending requests: {e}")
            return []
    return []

def save_pending_requests(requests):
    """Save pending requests to JSON file"""
    try:
        file_path = get_pending_requests_file()
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(requests, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"Error saving pending requests: {e}")

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

@main_bp.route('/data', methods=['GET'])
def get_all_data():
    """Get all data from the data folder"""
    try:
        chatbot = get_chatbot()
        # Return all loaded data organized by category
        data = {}
        for category, items in chatbot.all_data.items():
            if isinstance(items, list):
                data[category] = items
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@chat_bp.route('/chat', methods=['POST'])
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
            'response': response_data['response'],
            'source': response_data['source'],
            'events': response_data.get('events', [])
        })
        
    except Exception as e:
        return jsonify({
            'error': 'An error occurred processing your request',
            'details': str(e)
        }), 500

@main_bp.route('/pending-requests', methods=['GET'])
def get_pending_requests():
    """Get all pending requests"""
    requests = load_pending_requests()
    return jsonify(requests)

@main_bp.route('/pending-requests', methods=['POST'])
def add_pending_request():
    """Add a new pending request"""
    try:
        data = request.get_json()
        requests = load_pending_requests()
        requests.append(data)
        save_pending_requests(requests)
        return jsonify({'success': True, 'message': 'Request added successfully'}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@main_bp.route('/pending-requests', methods=['PUT'])
def update_pending_request():
    """Update a pending request (mark as passed/failed)"""
    try:
        data = request.get_json()
        requests = load_pending_requests()
        
        # Find and update the request
        for i, req in enumerate(requests):
            if req.get('id') == data.get('id'):
                requests[i] = data
                save_pending_requests(requests)
                return jsonify({'success': True, 'message': 'Request updated successfully'})
        
        return jsonify({'error': 'Request not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@main_bp.route('/pending-requests/archive', methods=['POST'])
def archive_failed_request():
    """Archive a failed request to ai_responses.json"""
    try:
        data = request.get_json()
        project_root = Path(__file__).parent.parent.parent
        data_path = project_root / "backend" / "data"
        ai_responses_file = data_path / "ai_responses.json"
        
        # Load existing responses or create new list
        if ai_responses_file.exists():
            with open(ai_responses_file, 'r', encoding='utf-8') as f:
                ai_responses = json.load(f)
        else:
            ai_responses = []
        
        # Add the failed request
        ai_responses.append({
            'query': data.get('query'),
            'response': data.get('response'),
            'timestamp': data.get('timestamp')
        })
        
        # Save back to file
        with open(ai_responses_file, 'w', encoding='utf-8') as f:
            json.dump(ai_responses, f, indent=2, ensure_ascii=False)
        
        return jsonify({'success': True, 'message': 'Request archived successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
