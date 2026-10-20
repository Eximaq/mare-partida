"""Local same-origin game preview with the Akuma no Mi Python API.

Run: python server/app.py. Only binds loopback; do not expose publicly without accounts/auth.
"""
from __future__ import annotations

import json
import os
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from akuma import AkumaStore, public_catalog

ROOT = Path(__file__).resolve().parents[1]
DATA = Path(os.environ.get("MARE_AKUMA_DB", Path.home() / ".mare-partida" / "akuma.sqlite3"))
DATA.parent.mkdir(parents=True, exist_ok=True)
STORE = AkumaStore(DATA)
LOCK = threading.RLock()


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def reply(self, code, value):
        body = json.dumps(value, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        route = urlparse(self.path)
        if route.path == "/api/akuma/catalog":
            return self.reply(200, public_catalog())
        if route.path == "/api/akuma/state":
            try:
                with LOCK:
                    return self.reply(200, STORE.state(parse_qs(route.query).get("player_id", [""])[0]))
            except ValueError as exc:
                return self.reply(400, {"error": str(exc)})
        return super().do_GET()

    def do_POST(self):
        routes = {
            "/api/akuma/player": lambda d: STORE.player(d["player_id"]),
            "/api/akuma/register": lambda d: STORE.register(d["player_id"], d["fruit_id"]),
            "/api/akuma/equip": lambda d: STORE.equip(d["player_id"], d.get("fruit_id")),
            "/api/akuma/transform": lambda d: STORE.transform(d["player_id"], d["enabled"]),
            "/api/akuma/stats": lambda d: STORE.stats(d["player_id"], float(d["base_hp"]), float(d["base_strength"])),
            "/api/akuma/corpse": lambda d: STORE.record_corpse(d["player_id"], d["corpse_id"], d["instance"], float(d["x"]), float(d["y"])),
            "/api/akuma/cast": lambda d: STORE.cast(d["player_id"], d["instance"], float(d["x"]), float(d["y"]), d.get("enemies", []), d.get("direction", [0, 1])),
            "/api/akuma/pickup": lambda d: STORE.pickup_food(d["player_id"], d["food_id"], d["instance"], float(d["x"]), float(d["y"])),
        }
        action = routes.get(urlparse(self.path).path)
        if action is None:
            return self.reply(404, {"error": "Rota desconhecida"})
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if size < 2 or size > 65536:
                raise ValueError("Corpo inválido")
            data = json.loads(self.rfile.read(size))
            with LOCK:
                result = action(data)
            self.reply(200, result or {"ok": True})
        except (ValueError, KeyError, TypeError, json.JSONDecodeError) as exc:
            self.reply(400, {"error": str(exc)})


if __name__ == "__main__":
    print("Maré Partida: http://127.0.0.1:8123/")
    ThreadingHTTPServer(("127.0.0.1", 8123), Handler).serve_forever()
