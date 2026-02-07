from flask import Blueprint, request, jsonify

main_bp = Blueprint('main', __name__)
chat_bp = Blueprint('chat', __name__, url_prefix='/chat')

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
    """Handle chat messages"""
    data = request.get_json()
    message = data.get('message', '').lower()
    
    # Simple chatbot logic - you can replace with more sophisticated logic
    responses = {
        'hello': 'Hi there! How can I assist you?',
        'help': 'I can help you with information about this dashboard and answer your questions.',
        'stats': f'Current stats - Total Users: {STATS["totalUsers"]}, Active Users: {STATS["activeUsers"]}',
        'hi': 'Hello! What can I help you with?',
    }
    
    # Check for keyword matches
    reply = None
    for keyword, response in responses.items():
        if keyword in message:
            reply = response
            break
    
    # Default response
    if not reply:
        reply = "I'm not sure how to respond to that. Can you try asking something else or type 'help' for assistance."
    
    return jsonify({'reply': reply})
