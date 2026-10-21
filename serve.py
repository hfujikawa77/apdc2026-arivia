#!/usr/bin/env python3
"""Serve the deck over HTTP and relay the current slide between devices.

usage: python3 serve.py [--port 8000]

- Static files are served from this folder (same as `python3 -m http.server`).
- The deck POSTs the current slide to /api/state on every slide change.
- presenter.html polls GET /api/state, so a phone or tablet on USB (adb reverse) follows the deck.
- POST /api/telemetry holds the latest vehicle telemetry for the HUD widget (hud.js) and stamps it with the server time.
"""
import argparse, json, os, time
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

ROOT = os.path.dirname(os.path.abspath(__file__))
ROUTES = {'/api/state': 'state', '/api/telemetry': 'telemetry'}
store = {}  # in memory only: {"state": {"h": slide index}, "telemetry": {...}}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        # the deck is edited often; never let the browser keep a stale copy
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_GET(self):
        key = ROUTES.get(self.path.split('?')[0])
        if key:
            self.send_json(store.get(key, {}))
        else:
            super().do_GET()

    def do_POST(self):
        key = ROUTES.get(self.path.split('?')[0])
        if not key:
            self.send_error(404)
            return
        body = self.rfile.read(int(self.headers.get('Content-Length', 0)) or 0)
        try:
            data = json.loads(body or b'{}')
        except ValueError:
            self.send_error(400)
            return
        if key == 'state' and isinstance(data.get('h'), int):
            store['state'] = {'h': data['h']}
        elif key == 'telemetry' and isinstance(data, dict):
            data['t'] = int(time.time() * 1000)  # server clock: the widget checks freshness against it
            store['telemetry'] = data
        self.send_json(store.get(key, {}))

    def send_json(self, obj):
        raw = json.dumps(obj).encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--port', type=int, default=8000)
    ap.add_argument('--host', default='127.0.0.1', help='0.0.0.0 to accept phones on the LAN (anyone on that network can then change the slide)')
    a = ap.parse_args()
    print(f'serving {ROOT} on http://{a.host}:{a.port}/ (deck: en-2/index.html, presenter: en-2/presenter.html)')
    ThreadingHTTPServer((a.host, a.port), Handler).serve_forever()
