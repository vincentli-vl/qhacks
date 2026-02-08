from flask import Blueprint, request, jsonify
import asyncio
import sys
import json
import traceback
import os
import tempfile
import ssl
import urllib.request
from pathlib import Path
from werkzeug.utils import secure_filename

# Add the chatbot_module directory to the Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from chatbot_module.chatbot import EventsChatbot

main_bp = Blueprint('main', __name__)
chat_bp = Blueprint('chat', __name__)

# Chatbot instance is created per request so each request runs in its own context
# (avoids Backboard client/thread tied to a previous request's event loop causing 500 on second prompt)
def get_chatbot():
    """Create a fresh chatbot instance for this request."""
    return EventsChatbot()

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

def get_meetings_file():
    """Get path to meetings JSON file"""
    project_root = Path(__file__).parent.parent.parent
    data_path = project_root / "backend" / "data"
    return data_path / "meeting_data.json"

def load_meetings():
    """Load meetings from JSON file"""
    file_path = get_meetings_file()
    if file_path.exists():
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading meetings: {e}")
            return []
    return []

def save_meetings(meetings):
    """Save meetings to JSON file"""
    try:
        file_path = get_meetings_file()
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(meetings, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"Error saving meetings: {e}")

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
        data = request.get_json() or {}
        message = (data.get('message') or '').strip()
        
        if not message:
            return jsonify({'error': 'No message provided'}), 400
        
        chatbot = get_chatbot()
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            response_data = loop.run_until_complete(chatbot.get_response(message))
        finally:
            loop.close()
        
        return jsonify({
            'response': response_data.get('response', ''),
            'source': response_data.get('source', 'ai'),
            'events': response_data.get('events', [])
        })
        
    except Exception as e:
        tb = traceback.format_exc()
        print(f"[CHAT 500] {e}\n{tb}", flush=True)
        return jsonify({
            'error': 'An error occurred processing your request',
            'details': str(e),
            'traceback': tb
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

@main_bp.route('/process-audio', methods=['POST'])
def process_audio():
    """Process audio file with speaker diarization and transcription"""
    try:
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400
        
        audio_file = request.files['audio']
        meeting_name = request.form.get('meeting_name', 'Untitled Meeting')
        
        if audio_file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Save uploaded file temporarily - detect format from filename
        file_ext = os.path.splitext(audio_file.filename)[1] or '.webm'
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp_file:
            audio_file.save(tmp_file.name)
            temp_audio_path = tmp_file.name
        
        try:
            # Import here to avoid loading heavy dependencies on startup
            from pyannote.audio import Pipeline
            import whisper
            from pydub import AudioSegment
            from pydub.utils import which
            import torch
            
            # Configure pydub to find ffmpeg
            # Try to find ffmpeg in common locations
            ffmpeg_path = None
            ffprobe_path = None
            
            # Check if ffmpeg is in PATH
            ffmpeg_path = which("ffmpeg")
            ffprobe_path = which("ffprobe")
            
            # If not found, try common macOS homebrew locations
            if not ffmpeg_path:
                common_paths = [
                    "/opt/homebrew/bin/ffmpeg",
                    "/usr/local/bin/ffmpeg",
                    "/opt/homebrew/opt/ffmpeg/bin/ffmpeg",
                ]
                for path in common_paths:
                    if os.path.exists(path):
                        ffmpeg_path = path
                        break
            
            if not ffprobe_path:
                common_paths = [
                    "/opt/homebrew/bin/ffprobe",
                    "/usr/local/bin/ffprobe",
                    "/opt/homebrew/opt/ffmpeg/bin/ffprobe",
                ]
                for path in common_paths:
                    if os.path.exists(path):
                        ffprobe_path = path
                        break
            
            # Set pydub to use the found paths
            if ffmpeg_path:
                AudioSegment.converter = ffmpeg_path
            if ffprobe_path:
                AudioSegment.ffprobe = ffprobe_path
            
            if not ffmpeg_path or not ffprobe_path:
                return jsonify({
                    'error': 'FFmpeg not found. Please install FFmpeg:\n'
                             'macOS: brew install ffmpeg\n'
                             'Linux: sudo apt-get install ffmpeg\n'
                             'Windows: Download from https://ffmpeg.org/\n\n'
                             f'ffmpeg: {"found" if ffmpeg_path else "not found"}\n'
                             f'ffprobe: {"found" if ffprobe_path else "not found"}'
                }), 500
            
            # Convert audio to wav format if needed
            print(f"Converting audio file: {temp_audio_path}", flush=True)
            print(f"Using ffmpeg: {ffmpeg_path}, ffprobe: {ffprobe_path}", flush=True)
            audio = AudioSegment.from_file(temp_audio_path)
            wav_path = temp_audio_path.rsplit('.', 1)[0] + '.wav'
            audio.export(wav_path, format='wav')
            print(f"Converted to WAV: {wav_path}", flush=True)
            
            # Initialize pyannote pipeline for speaker diarization
            # Note: You'll need to set HUGGINGFACE_TOKEN environment variable
            # and accept the model terms at https://huggingface.co/pyannote/speaker-diarization-3.1
            huggingface_token = os.getenv("HF_TOKEN")
            if not huggingface_token:
                return jsonify({
                    'error': 'HF_TOKEN environment variable not set. Please set it to use speaker diarization.\n'
                             'Get a token from https://huggingface.co/settings/tokens\n'
                             'And accept model terms at https://huggingface.co/pyannote/speaker-diarization-3.1'
                }), 500
            
            try:
                print("Loading pyannote pipeline...", flush=True)
                # Try new API first (token parameter), fallback to old API (use_auth_token)
                try:
                    pipeline = Pipeline.from_pretrained(
                        "pyannote/speaker-diarization-3.1",
                        token=huggingface_token
                    )
                    print("Pipeline loaded successfully with token parameter", flush=True)
                except TypeError as te:
                    print(f"TypeError with token parameter: {te}, trying use_auth_token...", flush=True)
                    # Fallback for older versions
                    pipeline = Pipeline.from_pretrained(
                        "pyannote/speaker-diarization-3.1",
                        use_auth_token=huggingface_token
                    )
                    print("Pipeline loaded successfully with use_auth_token parameter", flush=True)
                except Exception as e:
                    print(f"Error loading pipeline: {e}", flush=True)
                    raise
            except Exception as e:
                error_details = str(e)
                print(f"Failed to load pyannote pipeline: {error_details}", flush=True)
                return jsonify({
                    'error': f'Failed to load pyannote model: {error_details}. Make sure you have accepted the model terms at https://huggingface.co/pyannote/speaker-diarization-3.1'
                }), 500
            
            # Run diarization
            print("Running speaker diarization...", flush=True)
            try:
                # Configure pipeline for better speaker detection
                # For pyannote 3.1, try different API approaches
                # Since we know there are 2 speakers (male and female), we'll try to force detection
                
                # Method 1: Try with explicit speaker count (2 speakers) using dict format
                diarization_result = None
                try:
                    diarization_result = pipeline(
                        {"uri": "audio", "audio": wav_path},
                        min_speakers=2,
                        max_speakers=2
                    )
                    print("✓ Diarization with min_speakers=2, max_speakers=2 (dict format)", flush=True)
                except Exception as e1:
                    print(f"Method 1 failed: {e1}", flush=True)
                    # Method 2: Try with file path and parameters
                    try:
                        diarization_result = pipeline(wav_path, min_speakers=2, max_speakers=2)
                        print("✓ Diarization with min_speakers=2, max_speakers=2 (path format)", flush=True)
                    except Exception as e2:
                        print(f"Method 2 failed: {e2}", flush=True)
                        # Method 3: Try with flexible speaker count
                        try:
                            diarization_result = pipeline(
                                {"uri": "audio", "audio": wav_path},
                                min_speakers=1,
                                max_speakers=10
                            )
                            print("✓ Diarization with flexible speaker count (dict format)", flush=True)
                        except Exception as e3:
                            print(f"Method 3 failed: {e3}", flush=True)
                            # Method 4: Simple call
                            diarization_result = pipeline(wav_path)
                            print("✓ Diarization with simple call (no parameters)", flush=True)
                
                if diarization_result is None:
                    raise Exception("All diarization methods failed")
                
                print(f"Diarization completed. Type: {type(diarization_result)}", flush=True)
                
                # Handle different return types from pyannote pipeline
                # Newer versions return DiarizeOutput which has an 'annotation' attribute
                if hasattr(diarization_result, 'annotation'):
                    diarization = diarization_result.annotation
                    print("Using annotation from DiarizeOutput", flush=True)
                elif hasattr(diarization_result, 'itertracks'):
                    diarization = diarization_result
                    print("Using diarization result directly", flush=True)
                else:
                    # Try to use it as annotation directly
                    diarization = diarization_result
                    print("Using diarization result as annotation", flush=True)
                
                # Debug: Print all detected speakers and segments
                speakers = set()
                segment_count = 0
                try:
                    for turn, _, speaker in diarization.itertracks(yield_label=True):
                        speakers.add(speaker)
                        segment_count += 1
                        print(f"  Segment {segment_count}: {speaker} from {turn.start:.2f}s to {turn.end:.2f}s", flush=True)
                    print(f"Total diarization segments: {segment_count}", flush=True)
                    print(f"Detected {len(speakers)} unique speaker(s): {sorted(list(speakers))}", flush=True)
                except Exception as e:
                    print(f"Could not extract speaker list: {e}", flush=True)
                    # Try alternative method
                    if hasattr(diarization, 'labels'):
                        speakers = list(diarization.labels())
                        print(f"Detected speakers (via labels): {speakers}", flush=True)
            except Exception as e:
                error_details = str(e)
                print(f"Error during diarization: {error_details}", flush=True)
                return jsonify({
                    'error': f'Error during speaker diarization: {error_details}'
                }), 500
            
            # Initialize Whisper for transcription
            print("Loading Whisper model...", flush=True)
            try:
                # Handle SSL certificate issues for model download
                # Temporarily disable SSL verification for model downloads
                # Save original SSL context
                original_ssl_context = ssl._create_default_https_context
                
                # Create unverified SSL context
                ssl._create_default_https_context = ssl._create_unverified_context
                
                try:
                    model = whisper.load_model("base")
                    print("Whisper model loaded", flush=True)
                finally:
                    # Restore original SSL context
                    ssl._create_default_https_context = original_ssl_context
            except Exception as e:
                error_details = str(e)
                print(f"Error loading Whisper model: {error_details}", flush=True)
                # Restore SSL context even on error
                try:
                    ssl._create_default_https_context = original_ssl_context
                except:
                    pass
                return jsonify({
                    'error': f'Error loading Whisper model: {error_details}'
                }), 500
            
            print("Transcribing audio...", flush=True)
            try:
                result = model.transcribe(wav_path)
                print("Transcription completed", flush=True)
            except Exception as e:
                error_details = str(e)
                print(f"Error during transcription: {error_details}", flush=True)
                return jsonify({
                    'error': f'Error during transcription: {error_details}'
                }), 500
            
            # Combine diarization and transcription
            transcript_segments = []
            whisper_segments = result.get('segments', [])
            
            # Create a list of diarization segments
            # Handle different pyannote.audio API versions
            diarization_segments = []
            print("Extracting diarization segments...", flush=True)
            
            try:
                # Try the standard itertracks method
                for turn, _, speaker in diarization.itertracks(yield_label=True):
                    diarization_segments.append({
                        'start': turn.start,
                        'end': turn.end,
                        'speaker': speaker
                    })
                print(f"Extracted {len(diarization_segments)} diarization segments", flush=True)
            except AttributeError:
                # If itertracks doesn't exist, try iterating directly
                try:
                    # The diarization might be iterable directly
                    for turn in diarization:
                        # Try to get speaker label
                        speaker = 'SPEAKER_00'
                        if hasattr(diarization, 'get'):
                            # Try to get label for this segment
                            for label in diarization.labels():
                                if turn in diarization.label_timeline(label):
                                    speaker = label
                                    break
                        
                        diarization_segments.append({
                            'start': turn.start,
                            'end': turn.end,
                            'speaker': speaker
                        })
                    print(f"Extracted {len(diarization_segments)} diarization segments (direct iteration)", flush=True)
                except Exception as e:
                    print(f"Error extracting diarization segments: {e}", flush=True)
                    # Last resort: create empty segments and use transcription only
                    diarization_segments = []
            
            # Sort both by start time
            diarization_segments.sort(key=lambda x: x['start'])
            
            # Map transcription segments to diarization segments
            for whisper_seg in whisper_segments:
                seg_start = whisper_seg['start']
                seg_end = whisper_seg['end']
                seg_text = whisper_seg['text'].strip()
                
                if not seg_text:
                    continue
                
                # Find the diarization segment that best matches this transcription segment
                best_match = None
                best_overlap = 0
                
                for diar_seg in diarization_segments:
                    # Calculate overlap
                    overlap_start = max(seg_start, diar_seg['start'])
                    overlap_end = min(seg_end, diar_seg['end'])
                    overlap = max(0, overlap_end - overlap_start)
                    
                    if overlap > best_overlap:
                        best_overlap = overlap
                        best_match = diar_seg
                
                # If we found a match, add it to transcript
                if best_match and best_overlap > 0:
                    transcript_segments.append({
                        'speaker': best_match['speaker'],
                        'start': seg_start,
                        'end': seg_end,
                        'text': seg_text
                    })
                elif whisper_segments:  # Fallback: use first speaker if no match
                    transcript_segments.append({
                        'speaker': diarization_segments[0]['speaker'] if diarization_segments else 'SPEAKER_00',
                        'start': seg_start,
                        'end': seg_end,
                        'text': seg_text
                    })
            
            # Sort transcript segments by start time
            transcript_segments.sort(key=lambda x: x['start'])
            
            # Save audio file to data directory
            from datetime import datetime
            import shutil
            data_path = Path(__file__).parent.parent / "data"
            audio_dir = data_path / "recordings"
            audio_dir.mkdir(exist_ok=True)
            
            # Create a unique filename
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            safe_meeting_name = "".join(c for c in meeting_name if c.isalnum() or c in (' ', '-', '_')).rstrip()
            safe_meeting_name = safe_meeting_name.replace(' ', '_')[:50]  # Limit length
            audio_filename = f"{timestamp}_{safe_meeting_name}.wav"
            audio_file_path = audio_dir / audio_filename
            
            # Copy the WAV file to the recordings directory
            shutil.copy2(wav_path, audio_file_path)
            print(f"Saved audio file to: {audio_file_path}", flush=True)
            
            # Create meeting object
            new_meeting = {
                'date': datetime.now().strftime('%B %d, %Y %I:%M %p'),
                'meeting': meeting_name,
                'meeting_url': '',  # No URL for recorded meetings
                'documents': {},
                'transcript': transcript_segments,
                'audio_file': f'/api/recordings/{audio_filename}'  # API endpoint to serve the audio
            }
            
            # Save to meetings JSON
            meetings = load_meetings()
            meetings.insert(0, new_meeting)  # Add to beginning
            save_meetings(meetings)
            
            return jsonify({
                'success': True,
                'meeting': new_meeting,
                'message': 'Audio processed successfully'
            })
            
        except Exception as e:
            tb = traceback.format_exc()
            error_msg = str(e)
            print(f"[AUDIO PROCESSING ERROR] {error_msg}\n{tb}", flush=True)
            return jsonify({
                'error': f'Error processing audio: {error_msg}',
                'details': error_msg,
                'traceback': tb if os.getenv('FLASK_DEBUG') else None
            }), 500
        finally:
            # Clean up temporary files (but keep the saved recording)
            try:
                if os.path.exists(temp_audio_path):
                    os.unlink(temp_audio_path)
                # Don't delete wav_path if we saved it to recordings directory
                # Only delete if it's still in temp location
                wav_path = temp_audio_path.rsplit('.', 1)[0] + '.wav'
                if os.path.exists(wav_path) and 'recordings' not in str(wav_path):
                    os.unlink(wav_path)
            except Exception as cleanup_error:
                print(f"Error cleaning up temp files: {cleanup_error}", flush=True)
                
    except Exception as e:
        tb = traceback.format_exc()
        print(f"[AUDIO UPLOAD ERROR] {e}\n{tb}", flush=True)
        return jsonify({
            'error': 'Error uploading audio',
            'details': str(e)
        }), 500
