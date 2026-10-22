"""Persistent monster catalog for the local Python server."""
from __future__ import annotations

import json
import sqlite3
from contextlib import closing
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW_CATALOG = json.loads((ROOT / "data" / "monsters.json").read_text(encoding="utf-8"))
GROWTH = {"max_hp": 1.065, "physical_attack": 1.055, "physical_defense": 1.05, "magic_defense": 1.04}
WORLD_LEVEL_BANDS = {
    "beach": (1, 5), "swamp": (6, 10), "orange": (11, 15),
    "rare": (16, 20), "syrup": (21, 25), "baratie": (26, 30),
    "arlong": (31, 35), "loguetown": (36, 40),
}


def scale_monster(monster, base):
    """Use Cocox at the beginning of the second world band as the baseline."""
    result = dict(monster)
    delta = result["level"] - base["level"]
    if delta < 0:
        raise ValueError("Scaled monster level must not precede the baseline")
    for stat, growth in GROWTH.items():
        multiplier = float(result.get("multipliers", {}).get(stat, 1))
        result[stat] = round(base[stat] * growth ** delta * multiplier)
    result.pop("multipliers", None)
    return result


CATALOG = {key: scale_monster(value, RAW_CATALOG["cocox"]) if value.get("base_id") else value
           for key, value in RAW_CATALOG.items()}


class MonsterStore:
    def __init__(self, path: Path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with closing(self._connect()) as conn, conn:
            conn.execute("""CREATE TABLE IF NOT EXISTS monster_catalog (
                id TEXT PRIMARY KEY, name TEXT NOT NULL, level INTEGER NOT NULL,
                area TEXT NOT NULL, data TEXT NOT NULL
            )""")
            for monster in CATALOG.values():
                conn.execute(
                    """INSERT INTO monster_catalog (id, name, level, area, data)
                    VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET
                    name=excluded.name, level=excluded.level, area=excluded.area, data=excluded.data""",
                    (monster["id"], monster["name"], monster["level"],
                     monster["area"], json.dumps(monster, ensure_ascii=False)),
                )

    def _connect(self):
        return sqlite3.connect(self.path)

    def catalog(self):
        with closing(self._connect()) as conn:
            return [json.loads(row[0]) for row in conn.execute(
                "SELECT data FROM monster_catalog ORDER BY level, id"
            )]
