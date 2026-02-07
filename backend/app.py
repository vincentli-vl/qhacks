from flask import Flask, jsonify
from flask_cors import CORS
import json
from app.routes import main_bp, chat_bp

app = Flask(__name__)
CORS(app)

# Register blueprints
app.register_blueprint(main_bp, url_prefix='/api')
app.register_blueprint(chat_bp, url_prefix='/api')

# Load events from your scraper output
with open('events_detailed.json', 'r') as f:
    events_data = json.load(f)

@app.route('/api/events', methods=['GET'])
def get_events():
    """Return all events from the JSON file"""
    return jsonify(events_data)

if __name__ == '__main__':
    app.run(debug=True, port=5000)