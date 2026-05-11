from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO, send, emit

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")


# let's keep track of connected clients and assign player numbers as a dictionary.
connected_players = {}



@app.route('/')
def index():
    return jsonify({"message": "Welcome to the backend for Cosmicon-Rollout!"})

@app.route('/api')
def api():
    return jsonify({"message": "This is a response from the backend API!"})

@socketio.on('connect')
def handle_connect():
    session_id = request.sid
    current_roles = connected_players.values()
    if 'Player 1' not in current_roles:
        role = 'Player 1'
    elif 'Player 2' not in current_roles:
        role = 'Player 2'
    else:
        role = 'Spectator'

    connected_players[session_id] = role

    print(f'Session ID: {session_id} role: {role}')
    print(f'Current connected players: {connected_players}')

    emit('role_assignment', {'role': role, 'message': f'You have been assigned the role: {role}'}, room=session_id)

@socketio.on('join')
def handle_join(data):
    print(f'Client joined with data: {data}')
    # Here you can implement logic to assign player numbers based on the order of joining
    # For example, you could maintain a list of connected clients and assign player numbers accordingly
    send({"message": f"Player joined with data: {data}"})

@socketio.on('message')
def handle_message(data):
    print(f'Client sent message: {data}')
    send('response', {"message": "Message received by the server!"})