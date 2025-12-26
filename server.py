from flask import Flask, send_from_directory, request, jsonify
from flask_cors import CORS
import os
import sqlite3
import json

app = Flask(__name__, static_folder='.')
CORS(app)

DB_PATH = 'vaultmusic.db'

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    # Users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            user_id TEXT PRIMARY KEY,
            username TEXT,
            first_name TEXT,
            last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    # History table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            track_id TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(user_id)
        )
    ''')
    # Likes table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS likes (
            user_id TEXT,
            track_id TEXT,
            PRIMARY KEY(user_id, track_id),
            FOREIGN KEY(user_id) REFERENCES users(user_id)
        )
    ''')
    conn.commit()
    conn.close()

init_db()

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def send_static(path):
    return send_from_directory('.', path)

# --- API ENDPOINTS ---

@app.route('/api/sync', methods=['POST'])
def sync_user():
    data = request.json
    user_id = str(data.get('user_id'))
    username = data.get('username')
    first_name = data.get('first_name')

    if not user_id:
        return jsonify({"error": "No user_id"}), 400

    conn = get_db()
    cursor = conn.cursor()
    
    # Register/Update user
    cursor.execute('''
        INSERT OR REPLACE INTO users (user_id, username, first_name, last_seen)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ''', (user_id, username, first_name))

    # Fetch history
    cursor.execute('SELECT track_id FROM history WHERE user_id = ? ORDER BY timestamp DESC LIMIT 10', (user_id,))
    history = [row['track_id'] for row in cursor.fetchall()]

    # Fetch likes
    cursor.execute('SELECT track_id FROM likes WHERE user_id = ?', (user_id,))
    likes = [row['track_id'] for row in cursor.fetchall()]

    conn.commit()
    conn.close()

    return jsonify({
        "status": "success",
        "data": {
            "history": history,
            "likes": likes
        }
    })

@app.route('/api/history/add', methods=['POST'])
def add_history():
    data = request.json
    user_id = str(data.get('user_id'))
    track_id = str(data.get('track_id'))

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('INSERT INTO history (user_id, track_id) VALUES (?, ?)', (user_id, track_id))
    conn.commit()
    conn.close()
    return jsonify({"status": "success"})

@app.route('/api/history/clear', methods=['POST'])
def clear_history():
    user_id = str(request.json.get('user_id'))
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM history WHERE user_id = ?', (user_id,))
    conn.commit()
    conn.close()
    return jsonify({"status": "success"})

@app.route('/api/like/toggle', methods=['POST'])
def toggle_like():
    data = request.json
    user_id = str(data.get('user_id'))
    track_id = str(data.get('track_id'))

    conn = get_db()
    cursor = conn.cursor()
    
    # Check if exists
    cursor.execute('SELECT 1 FROM likes WHERE user_id = ? AND track_id = ?', (user_id, track_id))
    exists = cursor.fetchone()

    if exists:
        cursor.execute('DELETE FROM likes WHERE user_id = ? AND track_id = ?', (user_id, track_id))
        liked = False
    else:
        cursor.execute('INSERT INTO likes (user_id, track_id) VALUES (?, ?)', (user_id, track_id))
        liked = True

    conn.commit()
    conn.close()
    return jsonify({"status": "success", "liked": liked})

if __name__ == '__main__':
    print("Servidor VaultMusic Premium v2.3 (Backend Persistent) iniciado")
    app.run(host='0.0.0.0', port=5000, debug=True)
