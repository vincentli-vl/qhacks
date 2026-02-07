from flask import Flask, jsonify, request
from flask_cors import CORS
import json

app = Flask(__name__)
CORS(app)

# Load events from your scraper output
with open('events_detailed.json', 'r') as f:
    events_data = json.load(f)

@app.route('/api/events', methods=['GET'])
def get_events():
    return jsonify(events_data)

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    message = data.get('message', '')
    
    # TODO: Connect to your Backboard AI assistant here
    response = {
        'response': f'You asked: {message}'
    }
    
    return jsonify(response)

if __name__ == '__main__':
    app.run(debug=True, port=5000)