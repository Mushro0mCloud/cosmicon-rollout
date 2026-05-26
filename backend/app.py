import os
import random
import threading
import json
from datetime import datetime
import pika

from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from redis_store import CosmiconStore
from game_logic import GameLogic

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

RABBITMQ_HOST = os.getenv('RABBITMQ_HOST', 'rabbitmq')
RABBITMQ_ACTION_QUEUE = os.getenv('RABBITMQ_ACTION_QUEUE', 'cosmicon_actions')
RABBITMQ_EVENT_QUEUE = os.getenv('RABBITMQ_EVENT_QUEUE', 'cosmicon_game_events')

connected_players = {}
store = CosmiconStore()
game_initialized = False
temporary_rolls = {}  # Store rolls in memory temporarily: {turn: {'attack': [...], 'defense': [...]}}

# Try to initialize at startup, but don't fail if Redis isn't ready
try:
    store.initialize_game()
    game_initialized = True
except Exception as e:
    print(f"Warning: Could not initialize game at startup (Redis may not be running): {e}")

def ensure_game_initialized():
    global game_initialized
    if not game_initialized:
        try:
            store.initialize_game()
            game_initialized = True
        except Exception as e:
            print(f"Error initializing game: {e}")


# rabbit stuff?
import time

rabbitmq_publish_warning_logged = False


def make_rabbit_connection():
    if pika is None:
        raise RuntimeError('pika is not installed in this Python environment.')
    return pika.BlockingConnection(pika.ConnectionParameters(RABBITMQ_HOST))

def publish_to_queue(payload, queue_name):
    global rabbitmq_publish_warning_logged
    if pika is None:
        if not rabbitmq_publish_warning_logged:
            print('RabbitMQ unavailable: pika is not installed.')
            rabbitmq_publish_warning_logged = True
        return False

    try:
        connection = make_rabbit_connection()
        channel = connection.channel()
        channel.queue_declare(queue=queue_name, durable=True)
        channel.basic_publish(
            exchange="",
            routing_key=queue_name,
            body=json.dumps(payload),
            properties=pika.BasicProperties(
                content_type="application/json",
                delivery_mode=2,
            ),
        )
        connection.close()
        return True
    except Exception as e:
        if not rabbitmq_publish_warning_logged:
            print(f"RabbitMQ unavailable, falling back to local processing: {repr(e)}")
            rabbitmq_publish_warning_logged = True
        return False


def queue_action(action_type, data=None, queue_name=None):
    payload = {
        'type': action_type,
        'data': data or {},
        'created_at': datetime.utcnow().isoformat() + 'Z',
    }
    if not publish_to_queue(payload, queue_name or RABBITMQ_ACTION_QUEUE):
        process_action(payload)


def publish_game_event(event, data=None, room=None, queue_name=None):
    payload = {
        'event': event,
        'data': data or {},
        'room': room,
        'created_at': datetime.utcnow().isoformat() + 'Z',
    }
    if not publish_to_queue(payload, queue_name or RABBITMQ_EVENT_QUEUE):
        if room:
            socketio.emit(event, data or {}, room=room)
        else:
            socketio.emit(event, data or {})


def event_queue_callback(ch, method, properties, body):
    payload = json.loads(body)
    event = payload.get('event', 'rabbit_message')
    data = payload.get('data', {})
    room = payload.get('room')
    if room:
        socketio.emit(event, data, room=room)
    else:
        socketio.emit(event, data)
    ch.basic_ack(delivery_tag=method.delivery_tag)


def action_queue_callback(ch, method, properties, body):
    action = json.loads(body)
    process_action(action)
    ch.basic_ack(delivery_tag=method.delivery_tag)


def start_rabbit_consumer(queue_name, callback):
    while True:
        try:
            connection = make_rabbit_connection()
            channel = connection.channel()
            channel.queue_declare(queue=queue_name, durable=True)
            channel.basic_qos(prefetch_count=1)
            channel.basic_consume(queue=queue_name, on_message_callback=callback)
            channel.start_consuming()
        except Exception as exc:
            print(f"RabbitMQ consumer for queue '{queue_name}' failed: {exc}")
            if pika is None:
                print('RabbitMQ is unavailable because pika is not installed.')
                return
            time.sleep(5)


def start_rabbitmq_consumers():
    threading.Thread(target=start_rabbit_consumer, args=(RABBITMQ_ACTION_QUEUE, action_queue_callback), daemon=True).start()
    threading.Thread(target=start_rabbit_consumer, args=(RABBITMQ_EVENT_QUEUE, event_queue_callback), daemon=True).start()


def get_player_role(session_id):
    return connected_players.get(session_id, 'Unknown')





game_logic = GameLogic(store, connected_players, temporary_rolls, publish_game_event)


def process_action(action):
    return game_logic.process_action(action)


def process_turn_change():
    player_roles = connected_players.values()
    if 'Player 1' in player_roles and 'Player 2' in player_roles:
        game_state = store.get_game_state()
        next_turn = game_state['current_turn'] + 1
        current_attacker = 'Player 1' if next_turn % 2 == 1 else 'Player 2'
        current_defender = 'Player 2' if current_attacker == 'Player 1' else 'Player 1'

        store.create_turn(
            next_turn,
            current_attacker,
            current_defender,
            0,
            0,
            0,
            game_state['player1_hp'],
            game_state['player2_hp'],
        )
        store.set_game_state(
            next_turn,
            current_attacker,
            current_defender,
            game_state['player1_hp'],
            game_state['player2_hp'],
            last_attack=0,
            last_defense=0,
            last_total_damage=0,
        )

        publish_game_event('turn_changed', {
            'current_turn': next_turn,
            'current_player': current_attacker,
            'message': f'{current_attacker} will now attack. {current_defender} will defend.'
        })
        publish_game_event('game_state', store.get_game_state())



def emit_game_log(message, room=None):
    try:
        publish_game_event('game_log', {'message': message}, room=room)
    except Exception as e:
        print(f"RabbitMQ publish failed: {e}")
        if room:
            socketio.emit('rabbit_message', {'message': message}, room=room)
        else:
            socketio.emit('rabbit_message', {'message': message})






@app.route('/')
def index():
    return jsonify({"message": "Welcome to the backend for Cosmicon-Rollout!"})

@app.route('/api')
def api():
    return jsonify({"message": "This is a response from the backend API."})

@app.route('/api/state')
def api_state():
    ensure_game_initialized()
    return jsonify(store.get_game_state())

@app.route('/api/reset', methods=['POST'])
def api_reset():
    ensure_game_initialized()
    temporary_rolls.clear()
    store.initialize_game()
    publish_game_event('game_state', store.get_game_state())
    publish_game_event('reset', {'message': 'Game reset. New round started.'})
    return jsonify({'message': 'Game reset successfully.'})

@socketio.on('connect')
def handle_connect():
    ensure_game_initialized()
    session_id = request.sid
    player_roles = connected_players.values()

    if "Player 1" not in player_roles:
        role = "Player 1"
    elif "Player 2" not in player_roles:
        role = "Player 2"
    else:
        role = "Spectator"

    connected_players[session_id] = role
    print(f'{role} connected with session ID: {session_id}')

    emit('player_assigned', {'role': role, 'message': f'{role} has joined.'}, room=session_id)
    emit('game_state', store.get_game_state(), room=session_id)

@socketio.on('request_game_state')
def request_game_state():
    emit('game_state', store.get_game_state(), room=request.sid)

@socketio.on('turn_change')
def change_turn():
    queue_action('turn_change', {'session_id': request.sid})
    socketio.emit('action_queued', {'message': 'Turn change queued.'}, room=request.sid)

@socketio.on('confirm_action')
def confirm_action():
    queue_action('confirm_action', {'session_id': request.sid})
    socketio.emit('action_queued', {'message': 'Confirm action queued.'}, room=request.sid)

@socketio.on('roll_attack')
def handle_roll_attack():
    queue_action('roll_attack', {'session_id': request.sid})
    socketio.emit('action_queued', {'message': 'Attack roll queued.'}, room=request.sid)


@socketio.on('roll_defense')
def handle_roll_defense():
    queue_action('roll_defense', {'session_id': request.sid})
    socketio.emit('action_queued', {'message': 'Defense roll queued.'}, room=request.sid)


# confirms the atk, then updates.
@socketio.on('confirm_attack_selection')
def confirm_attack_selection(data):
    selected_indices = data.get('selected_indices', []) if isinstance(data, dict) else []
    queue_action('confirm_attack_selection', {'session_id': request.sid, 'selected_indices': selected_indices})
    socketio.emit('action_queued', {'message': 'Attack selection queued.'}, room=request.sid)

# confirms the defense selection.
@socketio.on('confirm_defense_selection')
def confirm_defense_selection(data):
    selected_indices = data.get('selected_indices', []) if isinstance(data, dict) else []
    queue_action('confirm_defense_selection', {'session_id': request.sid, 'selected_indices': selected_indices})
    socketio.emit('action_queued', {'message': 'Defense selection queued.'}, room=request.sid)


    

if __name__ == '__main__':
    start_rabbitmq_consumers()
    socketio.run(app, debug=False, host='0.0.0.0', port=5000, allow_unsafe_werkzeug=True)
