from flask import Flask, send_from_directory, request, jsonify
from flask_cors import CORS
import os
import sqlite3
from datetime import datetime

app = Flask(__name__, static_folder='.')
CORS(app)

DB_PATH = 'vaultmusic_v5.db'

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    # Users: Account data
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            user_id TEXT PRIMARY KEY,
            username TEXT,
            first_name TEXT,
            nickname TEXT,
            photo_url TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Search history (queries)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS search_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            query TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(user_id)
        )
    ''')
    
    # Playback history (tracks)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS playback_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            track_id TEXT,
            track_data TEXT, -- JSON string of track metadata
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(user_id)
        )
    ''')
    
    # Likes
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS likes (
            user_id TEXT,
            track_id TEXT,
            track_data TEXT, -- JSON string
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY(user_id, track_id),
            FOREIGN KEY(user_id) REFERENCES users(user_id)
        )
    ''')
    
    # Playlists
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS playlists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            name TEXT,
            tracks TEXT, -- JSON array of tracks
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
    uid = str(data.get('user_id'))
    if not uid: return jsonify({"error": "Missing user_id"}), 400
    
    conn = get_db()
    cursor = conn.cursor()
    
    # Register/Update user
    cursor.execute('''
        INSERT INTO users (user_id, username, first_name, photo_url, last_seen)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id) DO UPDATE SET
            username=excluded.username,
            first_name=excluded.first_name,
            photo_url=excluded.photo_url,
            last_seen=CURRENT_TIMESTAMP
    ''', (uid, data.get('username'), data.get('first_name'), data.get('photo_url')))
    
    # Fetch data
    cursor.execute('SELECT nickname FROM users WHERE user_id = ?', (uid,))
    user_info = cursor.fetchone()
    
    cursor.execute('SELECT query FROM search_history WHERE user_id = ? ORDER BY timestamp DESC LIMIT 10', (uid,))
    search_history = [row['query'] for row in cursor.fetchall()]
    
    cursor.execute('SELECT track_data FROM playback_history WHERE user_id = ? ORDER BY timestamp DESC LIMIT 20', (uid,))
    playback_history = [row['track_data'] for row in cursor.fetchall()]
    
    cursor.execute('SELECT track_data FROM likes WHERE user_id = ? ORDER BY timestamp DESC', (uid,))
    likes = [row['track_data'] for row in cursor.fetchall()]
    
    cursor.execute('SELECT count(*) as count FROM playback_history WHERE user_id = ?', (uid,))
    stats_played = cursor.fetchone()['count']
    
    conn.commit()
    conn.close()
    
    return jsonify({
        "status": "success",
        "data": {
            "nickname": user_info['nickname'] if user_info else None,
            "search_history": search_history,
            "playback_history": playback_history,
            "likes": likes,
            "stats": {
                "played": stats_played,
                "likes": len(likes),
                "playlists": 0 # Placeholder
            }
        }
    })

@app.route('/api/profile/update', methods=['POST'])
def update_profile():
    data = request.json
    uid = str(data.get('user_id'))
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('UPDATE users SET nickname = ? WHERE user_id = ?', (data.get('nickname'), uid))
    conn.commit()
    conn.close()
    return jsonify({"status": "success"})

@app.route('/api/history/add', methods=['POST'])
def add_history():
    data = request.json
    uid = str(data.get('user_id'))
    cursor = get_db().cursor()
    # history can be search or playback. frontend will specify.
    if 'query' in data:
        get_db().execute('INSERT INTO search_history (user_id, query) VALUES (?, ?)', (uid, data['query']))
    elif 'track' in data:
        import json
        get_db().execute('INSERT INTO playback_history (user_id, track_id, track_data) VALUES (?, ?, ?)', 
                      (uid, data['track']['id'], json.dumps(data['track'])))
    get_db().commit()
    return jsonify({"status": "success"})

@app.route('/api/like/toggle', methods=['POST'])
def toggle_like():
    data = request.json
    uid = str(data.get('user_id'))
    track = data.get('track')
    import json
    
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT 1 FROM likes WHERE user_id = ? AND track_id = ?', (uid, track['id']))
    if cursor.fetchone():
        cursor.execute('DELETE FROM likes WHERE user_id = ? AND track_id = ?', (uid, track['id']))
        liked = False
    else:
        cursor.execute('INSERT INTO likes (user_id, track_id, track_data) VALUES (?, ?, ?)', 
                      (uid, track['id'], json.dumps(track)))
        liked = True
    conn.commit()
    conn.close()
    return jsonify({"status": "success", "liked": liked})

@app.route('/api/history/clear', methods=['POST'])
def clear_history():
    uid = str(request.json.get('user_id'))
    conn = get_db()
    conn.execute('DELETE FROM playback_history WHERE user_id = ?', (uid,))
    conn.execute('DELETE FROM search_history WHERE user_id = ?', (uid,))
    conn.commit()
    conn.close()
    return jsonify({"status": "success"})

if __name__ == '__main__':
    print("VaultMusic Backend v5.0 (Multi-User) started on port 5000")
    app.run(host='0.0.0.0', port=5000, debug=True)
