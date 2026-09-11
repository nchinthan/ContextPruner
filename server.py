import os
from flask import Flask, request,render_template,jsonify
from flask_socketio import SocketIO, emit, disconnect
from parser import * 
import argparse 
from PromptNodes import PromptLoader
from prompt_bp import prompt_bp

# --- Flask & SocketIO Server Setup ---
app = Flask(__name__)
app.register_blueprint(prompt_bp)

prompt_loader = PromptLoader()
app.config['SECRET_KEY'] = 'secret!'
socketio = SocketIO(app, cors_allowed_origins="*")

# In-memory storage for active session root nodes { sid: Folder }
user_sessions = {}

@socketio.on('connect')
def handle_connect():
    print(f"Client connected: {request.sid}")

@socketio.on('disconnect')
def handle_disconnect():
    sid = request.sid
    if sid in user_sessions:
        del user_sessions[sid]
    print(f"Client disconnected: {sid}")

@socketio.on('init_session')
def handle_init_session(data):
    """
    Initializes a session with a root path.
    Data format: {'root_path': 'C:/path/to/project'}
    """
    sid = request.sid
    root_path = data.get('root_path')

    if not root_path or not os.path.exists(root_path):
        emit('session_initialized', {'status': 'error', 'message': 'Invalid root path'})
        return

    # Instantiate Folder and assign to the user's session
    user_sessions[sid] = Folder(root_path)
    emit('session_initialized', {'status': 'success', 'root': user_sessions[sid].name})

@socketio.on('execute_path')
def handle_path_request(data):
    """
    Handles path execution requests.
    Data format: {
        'path': 'frontend/src/dataInterface/API.js/ApiClient/edit_script',
        'new_script': '...',           # Required for 'edit_script'
        'child_node': {...},           # Required for 'add_child'
        'child_name': 'target_name'    # Required for 'delete_child'
    }
    """
    sid = request.sid
    if sid not in user_sessions:
        emit('error', {'message': 'Session not initialized. Call init_session first.'})
        return

    raw_path = data.get('path', '').strip('/')
    if not raw_path:
        emit('error', {'message': 'Path cannot be empty'})
        return

    # Separate trajectory from the action method (last segment)
    parts = raw_path.split('/')
    method = parts[-1]
    node_path = parts[:-1]  # List of path parts, e.g., ['frontend', 'src', 'API.js']

    # Retrieve root node for the current session
    root_node = user_sessions[sid]

    # Resolve target node
    target_node = root_node.get(node_path) if node_path else root_node

    if target_node is None:
        emit('response', {
            'path': raw_path,
            'status': 'error',
            'message': f"Node not found at path: {'/'.join(node_path)}"
        })
        return

    # Dispatch to appropriate method
    if method == 'script':
        result = target_node.get_script()
        emit('response', {'path': raw_path, 'status': 'success', 'data': result})

    elif method == 'children':
        result = target_node.get_children()
        emit('response', {'path': raw_path, 'status': 'success', 'data': result})

    elif method == 'edit_script':
        new_script = data.get('new_script')
        if new_script is None:
            emit('response', {
                'path': raw_path,
                'status': 'error',
                'message': "Missing required field 'new_script' for edit_script operation."
            })
            return

        success = target_node.set([], new_script)
        if success:
            emit('response', {'path': raw_path, 'status': 'success', 'message': 'Script updated successfully.'})
        else:
            emit('response', {'path': raw_path, 'status': 'error', 'message': 'Failed to update script.'})

    elif method == 'add_child':
        child_data = data.get('child_node', {})
        name = child_data.get('name')
        script = child_data.get('script', '')
        dead_end = child_data.get('dead_end', False)
        language = child_data.get('language', '')

        if not name:
            emit('response', {
                'path': raw_path,
                'status': 'error',
                'message': "Missing required field 'name' inside 'child_node' object."
            })
            return

        new_child = TreeNode(name=name, script=script, dead_end=dead_end, language=language)
        success = target_node.add_child([], new_child)

        if success:
            emit('response', {'path': raw_path, 'status': 'success', 'message': f"Child '{name}' added successfully."})
        else:
            emit('response', {'path': raw_path, 'status': 'error', 'message': 'Failed to add child node.'})

    elif method == 'delete_child':
        child_name = data.get('child_name')
        if not child_name:
            emit('response', {
                'path': raw_path,
                'status': 'error',
                'message': "Missing required field 'child_name' for delete_child operation."
            })
            return

        success = target_node.delete_child([child_name])
        if success:
            emit('response', {'path': raw_path, 'status': 'success', 'message': f"Child '{child_name}' deleted successfully."})
        else:
            emit('response', {'path': raw_path, 'status': 'error', 'message': f"Child '{child_name}' not found under target node."})

    else:
        emit('response', {
            'path': raw_path,
            'status': 'error',
            'message': f"Unsupported method '{method}'. Valid options: 'script', 'children', 'edit_script', 'add_child', 'delete_child'."
        })

@socketio.on('prompt_socket')
def handle_prompt_request(data):
    """
    Handles PromptLoader node requests.

    Supported methods:
        <path>/build_prompt
        <path>/children

    Data format:
    {
        'path': 'category/prompt_name/build_prompt',
        'kwargs': {
            'user': 'Alice',
            'role': 'Admin'
        }
    }
    """

    raw_path = data.get('path', '').strip('/')
    kwargs = data.get('kwargs', {})

    if not raw_path:
        emit('response', {
            'status': 'error',
            'message': 'Path cannot be empty'
        })
        return

    parts = raw_path.split('/')

    method = parts[-1]
    node_path = parts[:-1]

    target_node = (
        prompt_loader.get(node_path)
        if node_path
        else prompt_loader
    )

    if target_node is None:
        emit('response', {
            'path': raw_path,
            'status': 'error',
            'message': f"Prompt node not found at path: {'/'.join(node_path)}"
        })
        return

    if method == 'build_prompt':
        try:
            result = target_node.buildPrompt(**kwargs)

            emit('response', {
                'path': raw_path,
                'status': 'success',
                'data': result
            })

        except KeyError as e:
            emit('response', {
                'path': raw_path,
                'status': 'error',
                'message': f"Missing variable in kwargs: {str(e)}"
            })

        except Exception as e:
            emit('response', {
                'path': raw_path,
                'status': 'error',
                'message': str(e)
            })

    elif method == 'children':
        try:
            result = target_node.get_children()

            emit('response', {
                'path': raw_path,
                'status': 'success',
                'data': result
            })

        except Exception as e:
            emit('response', {
                'path': raw_path,
                'status': 'error',
                'message': str(e)
            })

    else:
        emit('response', {
            'path': raw_path,
            'status': 'error',
            'message': (
                f"Unsupported method '{method}'. "
                "Valid options: 'build_prompt', 'children'."
            )
        })

@app.route("/prompt-manager")
def prompt_manager():
    return render_template("prompt_manager.html")

@app.route("/suggestions")
def suggestions():
    body = request.args.get('body', '')

@app.route('/suggestions', methods=['POST'])
def post_handler():
    data = request.get_json()
    with open('suggestions.txt','a',encoding='utf-8') as fp:
        fp.write(data.get('suggestion') + '\n' + '='*100 + '\n')
    return jsonify({'status': 'success'}), 200

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Run the SocketIO server.")
    parser.add_argument('--port', type=int, default=5000, help='Port to run the server on')
    
    # Parse the arguments
    args = parser.parse_parser_args() if hasattr(parser, 'parse_parser_args') else parser.parse_args()
    
    socketio.run(app, debug=True, port=args.port)
