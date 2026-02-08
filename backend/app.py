from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from pathlib import Path
from app.routes import main_bp, chat_bp, load_meetings

app = Flask(__name__)
CORS(
    app,
    resources={r"/*": {"origins": "http://localhost:3000"}}
)


# Register blueprints
app.register_blueprint(main_bp, url_prefix='/api')
app.register_blueprint(chat_bp, url_prefix='/api')

@app.route('/api/events', methods=['GET'])
def get_events():
    """Return all meetings from the JSON file"""
    events_data = load_meetings()
    return jsonify(events_data)

@app.route('/api/recordings/<filename>', methods=['GET'])
def get_recording(filename):
    """Serve audio recording files"""
    from werkzeug.utils import secure_filename
    # Secure the filename to prevent directory traversal
    safe_filename = secure_filename(filename)
    recordings_dir = Path(__file__).parent / "data" / "recordings"
    return send_from_directory(str(recordings_dir), safe_filename)

if __name__ == '__main__':
    app.run(debug=True, host="localhost", port=5001)