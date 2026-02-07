from flask import Flask, jsonify
from flask_cors import CORS
import json
from pathlib import Path
from app.routes import main_bp, chat_bp

app = Flask(__name__)
CORS(
    app,
    resources={r"/*": {"origins": "http://localhost:3000"}}
)


# Register blueprints
app.register_blueprint(main_bp, url_prefix='/api')
app.register_blueprint(chat_bp, url_prefix='/api')

# Load meetings from your scraper output
data_path = Path(__file__).parent / "data" / "meeting_data.json"
with open(data_path, 'r', encoding='utf-8') as f:
    events_data = json.load(f)

@app.route('/api/events', methods=['GET'])
def get_events():
    """Return all meetings from the JSON file"""
    return jsonify(events_data)

if __name__ == '__main__':
    app.run(debug=True, host="localhost", port=5000)