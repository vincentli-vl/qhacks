from flask import Flask
from flask_cors import CORS

def create_app():
    app = Flask(__name__)
    CORS(app)
    
    from app.routes import main_bp, chat_bp
    app.register_blueprint(main_bp)
    app.register_blueprint(chat_bp)
    
    return app
