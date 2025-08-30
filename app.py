
from flask import Flask, send_from_directory
import os

app = Flask(__name__, static_folder=os.path.dirname(os.path.abspath(__file__)))


@app.route('/')
def index():
	return send_from_directory(app.static_folder, 'index.html')


@app.route('/<path:path>')
def static_files(path):
	return send_from_directory(app.static_folder, path)


if __name__ == '__main__':
	# Bind to the port provided by the environment (Railway sets PORT)
	port = int(os.environ.get('PORT', 5000))
	# listen on all interfaces so the container receives traffic
	app.run(host='0.0.0.0', port=port)
