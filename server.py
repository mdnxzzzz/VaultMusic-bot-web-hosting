from flask import Flask, send_from_directory
from flask_cors import CORS
import os

app = Flask(__name__, static_folder='.')
CORS(app) # Permitir peticiones desde Telegram

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def send_static(path):
    return send_from_directory('.', path)

if __name__ == '__main__':
    # El servidor corre en el puerto 5000 por defecto
    print("Servidor de VaultMusic UI iniciado en http://localhost:5000")
    print("RECUERDA: Telegram requiere HTTPS. Usa Ngrok: 'ngrok http 5000'")
    app.run(host='0.0.0.0', port=5000)
