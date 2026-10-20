"""Persistent Rank E Akuma no Mi rules for the optional Python game service."""
from __future__ import annotations

import math
import sqlite3
import time
from pathlib import Path

FRUITS = {
    "akuma_kuku_kuku": {"type": "akuma_no_mi", "rank": "E", "name": "Kuku-Kuku no Mi", "cooldown": 15, "healing_received_percent": .05, "max_hp_percent": .03},
    "akuma_beri_beri": {"type": "akuma_no_mi", "rank": "E", "name": "Beri-Beri no Mi", "cooldown": 18, "impact_resistance_percent": .15},
}


class AkumaStore:
    def __init__(self, database: str | Path = ":memory:", clock=time.time):
        self.db = sqlite3.connect(str(database), check_same_thread=False)
        self.db.row_factory = sqlite3.Row
        self.clock = clock
        self.db.executescript("""
            PRAGMA foreign_keys=ON;
            CREATE TABLE IF NOT EXISTS fruits(id TEXT PRIMARY KEY, type TEXT NOT NULL, rank TEXT NOT NULL, name TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS players(id TEXT PRIMARY KEY, equipped TEXT, cooldown_until REAL NOT NULL DEFAULT 0, invulnerable_until REAL NOT NULL DEFAULT 0, FOREIGN KEY(equipped) REFERENCES fruits(id));
            CREATE TABLE IF NOT EXISTS fruit_cooldowns(player_id TEXT NOT NULL, fruit_id TEXT NOT NULL, ready_at REAL NOT NULL, PRIMARY KEY(player_id,fruit_id), FOREIGN KEY(player_id) REFERENCES players(id), FOREIGN KEY(fruit_id) REFERENCES fruits(id));
            CREATE TABLE IF NOT EXISTS unlocks(player_id TEXT NOT NULL, fruit_id TEXT NOT NULL, PRIMARY KEY(player_id,fruit_id), FOREIGN KEY(player_id) REFERENCES players(id), FOREIGN KEY(fruit_id) REFERENCES fruits(id));
            CREATE TABLE IF NOT EXISTS corpses(id TEXT PRIMARY KEY, player_id TEXT NOT NULL, instance TEXT NOT NULL, x REAL NOT NULL, y REAL NOT NULL, expires REAL NOT NULL, FOREIGN KEY(player_id) REFERENCES players(id));
            CREATE TABLE IF NOT EXISTS food(id TEXT PRIMARY KEY, player_id TEXT NOT NULL, instance TEXT NOT NULL, x REAL NOT NULL, y REAL NOT NULL, expires REAL NOT NULL, FOREIGN KEY(player_id) REFERENCES players(id));
        """)
        with self.db:
            self.db.executemany("INSERT OR IGNORE INTO fruits VALUES(?,?,?,?)", ((key, value["type"], value["rank"], value["name"]) for key, value in FRUITS.items()))

    def player(self, player_id: str):
        if not isinstance(player_id, str) or not player_id or len(player_id) > 80:
            raise ValueError("Jogador inválido")
        with self.db:
            self.db.execute("INSERT OR IGNORE INTO players(id) VALUES(?)", (player_id,))
        return self.state(player_id)

    def state(self, player_id: str):
        row = self.db.execute("SELECT * FROM players WHERE id=?", (player_id,)).fetchone()
        if row is None:
            raise ValueError("Jogador desconhecido")
        unlocked = [r[0] for r in self.db.execute("SELECT fruit_id FROM unlocks WHERE player_id=? ORDER BY fruit_id", (player_id,))]
        cooldowns = {r[0]: r[1] for r in self.db.execute("SELECT fruit_id,ready_at FROM fruit_cooldowns WHERE player_id=?", (player_id,))}
        return {"unlocked": unlocked, "equipped": row["equipped"], "cooldowns": cooldowns, "cooldown_until": cooldowns.get(row["equipped"], 0), "is_invulnerable": row["invulnerable_until"] > self.clock(), "invulnerable_until": row["invulnerable_until"]}

    def register(self, player_id: str, fruit_id: str):
        self.player(player_id)
        if fruit_id not in FRUITS:
            raise ValueError("Fruta desconhecida")
        with self.db:
            self.db.execute("INSERT OR IGNORE INTO unlocks VALUES(?,?)", (player_id, fruit_id))
        return self.state(player_id)

    def equip(self, player_id: str, fruit_id: str | None):
        self.player(player_id)
        if fruit_id is not None and not self.db.execute("SELECT 1 FROM unlocks WHERE player_id=? AND fruit_id=?", (player_id, fruit_id)).fetchone():
            raise ValueError("Fruta não desbloqueada")
        with self.db:
            self.db.execute("UPDATE players SET equipped=? WHERE id=?", (fruit_id, player_id))
        return self.state(player_id)

    def stats(self, player_id: str, base_hp: float, base_strength: float):
        state = self.state(player_id)
        if not all(math.isfinite(v) and v >= 0 for v in (base_hp, base_strength)):
            raise ValueError("Atributos inválidos")
        count = len(state["unlocked"])
        fruit = FRUITS.get(state["equipped"], {})
        return {"count": count, "max_hp": round(base_hp * (1 + .001 * count) * (1 + fruit.get("max_hp_percent", 0))), "strength": base_strength * (1 + .001 * count), "healing_received_percent": fruit.get("healing_received_percent", 0), "impact_resistance_percent": fruit.get("impact_resistance_percent", 0)}

    def record_corpse(self, player_id: str, corpse_id: str, instance: str, x: float, y: float):
        self.player(player_id)
        if not corpse_id or not instance or not all(math.isfinite(v) for v in (x, y)):
            raise ValueError("Cadáver inválido")
        with self.db:
            self.db.execute("INSERT OR REPLACE INTO corpses VALUES(?,?,?,?,?,?)", (corpse_id, player_id, instance, x, y, self.clock() + 12))

    def cast(self, player_id: str, instance: str, x: float, y: float, enemies=()):
        state = self.state(player_id)
        fruit_id = state["equipped"]
        if not fruit_id:
            raise ValueError("Nenhuma fruta equipada")
        now = self.clock()
        if state["cooldowns"].get(fruit_id, 0) > now:
            raise ValueError("Habilidade em recarga")
        if not instance or not all(math.isfinite(v) for v in (x, y)):
            raise ValueError("Posição inválida")
        fruit = FRUITS[fruit_id]
        with self.db:
            if fruit_id == "akuma_kuku_kuku":
                corpse = self.db.execute("SELECT * FROM corpses WHERE player_id=? AND instance=? AND expires>? ORDER BY ((x-?)*(x-?)+(y-?)*(y-?)) LIMIT 1", (player_id, instance, now, x, x, y, y)).fetchone()
                if corpse is None:
                    raise ValueError("Nenhum cadáver disponível na instância")
                self.db.execute("DELETE FROM corpses WHERE id=?", (corpse["id"],))
                self.db.execute("INSERT INTO food VALUES(?,?,?,?,?,?)", (corpse["id"], player_id, instance, corpse["x"], corpse["y"], float("inf")))
                effect = {"type": "food", "id": corpse["id"], "x": corpse["x"], "y": corpse["y"], "heal_percent": .15}
            else:
                moved = []
                for enemy in enemies:
                    ex, ey = float(enemy["x"]), float(enemy["y"])
                    distance = math.hypot(ex - x, ey - y)
                    if distance <= 130:
                        distance = max(1, distance)
                        moved.append({"id": enemy["id"], "x": ex + (ex - x) / distance * 65, "y": ey + (ey - y) / distance * 65})
                self.db.execute("UPDATE players SET invulnerable_until=? WHERE id=?", (now + 1.5, player_id))
                effect = {"type": "division", "duration": 1.5, "enemies": moved}
            self.db.execute("INSERT OR REPLACE INTO fruit_cooldowns VALUES(?,?,?)", (player_id, fruit_id, now + fruit["cooldown"]))
        return {"effect": effect, "state": self.state(player_id)}

    def pickup_food(self, player_id: str, food_id: str, instance: str, x: float, y: float):
        row = self.db.execute("SELECT * FROM food WHERE id=? AND player_id=? AND instance=? AND expires>?", (food_id, player_id, instance, self.clock())).fetchone()
        if row is None or math.hypot(row["x"] - x, row["y"] - y) > 25:
            raise ValueError("Comida indisponível")
        with self.db:
            self.db.execute("DELETE FROM food WHERE id=?", (food_id,))
        return {"heal_percent": .15}
