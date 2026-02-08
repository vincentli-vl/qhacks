from flask import Flask, jsonify
from flask_cors import CORS
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

if __name__ == '__main__':
    app.run(debug=True, host="localhost", port=5001)