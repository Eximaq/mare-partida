"""Persistent Akuma no Mi rules for the optional Python game service."""
from __future__ import annotations

import json
import math
import sqlite3
import time
from pathlib import Path

SUPA_RULES = json.loads((Path(__file__).resolve().parents[1] / "assets/akuma/supa/rules.json").read_text(encoding="utf-8"))
SUPA_ID = "akuma_supa_supa"
NEKO_RULES = json.loads((Path(__file__).resolve().parents[1] / "assets/akuma/neko/rules.json").read_text(encoding="utf-8"))
NEKO_ID = NEKO_RULES["id"]

FRUITS = {
    NEKO_ID: {"type": "akuma_no_mi", "family": "zoan", "subtype": "Zoan Carnívora", "rank": "D", "name": "Neko Neko no Mi: Modelo Leopardo", "description": NEKO_RULES["description"], "cooldown": 12, "icon_path": "assets/akuma/neko/fruit.png"},
    SUPA_ID: {"type": "akuma_no_mi", "family": "paramecia", "rank": "D", "name": "Supa Supa no Mi", "cooldown": 10, "icon_path": "assets/akuma/supa/fruit.png"},
    "akuma_kuku_kuku": {"type": "akuma_no_mi", "rank": "E", "name": "Kuku-Kuku no Mi", "cooldown": 15, "healing_received_percent": .05, "max_hp_percent": .03},
    "akuma_beri_beri": {"type": "akuma_no_mi", "rank": "E", "name": "Beri-Beri no Mi", "cooldown": 18, "impact_resistance_percent": .15},
    "akuma_tori_albatroz": {"type": "akuma_no_mi", "family": "zoan", "rank": "E", "name": "Tori-Tori no Mi: Albatroz", "cooldown": 14, "move_speed_percent": .12, "evasion_percent": .05},
    "akuma_uma_uma": {"type": "akuma_no_mi", "family": "zoan", "rank": "E", "name": "Uma-Uma no Mi", "cooldown": 12, "move_speed_percent": .15, "max_hp_percent": .03},
    "akuma_inu_dachshund": {"type": "akuma_no_mi", "family": "zoan", "rank": "E", "name": "Inu-Inu no Mi: Dachshund", "cooldown": 10, "evasion_percent": .10, "physical_defense_percent": .03},
}

# Public catalog metadata for the HUD. Combat validation remains in cast().
SKILL_TOOLTIPS = {
    NEKO_ID: NEKO_RULES["skills"][0],
    SUPA_ID: SUPA_RULES["skills"][0],
    "akuma_kuku_kuku": {"name": "Banquete Relâmpago", "cooldown": 15, "cost": 0, "description": "Transforma o cadáver mais próximo da instância em comida. Quem a recolher recupera 15% da Vida máxima."},
    "akuma_beri_beri": {"name": "Divisão Esférica", "cooldown": 18, "cost": 0, "description": "Divide o corpo em seis esferas, concede 1,5s de invulnerabilidade e empurra inimigos próximos."},
    "akuma_tori_albatroz": {"name": "Plano de Alta Altitude", "cooldown": 14, "cost": 0, "description": "Aumenta a velocidade de movimento em 30% por 5s e ignora armadilhas de chão."},
    "akuma_uma_uma": {"name": "Arrancada Galopante", "cooldown": 12, "cost": 0, "damage_type": "physical", "description": "Avança 4 tiles em linha reta, causando dano físico leve e empurrando o primeiro inimigo."},
    "akuma_inu_dachshund": {"name": "Mordida de Calcanhar", "cooldown": 10, "cost": 0, "damage_type": "physical", "description": "Salta até o alvo, causa dano físico e aplica 30% de lentidão e −5% de Defesa por 3s."},
}


def public_catalog():
    """Return tooltip data alongside the existing, stable fruit catalog."""
    return {fruit_id: {**fruit, "skill": SKILL_TOOLTIPS[fruit_id].copy(), **({"skills": SUPA_RULES["skills"]} if fruit_id == SUPA_ID else {"skills": NEKO_RULES["skills"]} if fruit_id == NEKO_ID else {})} for fruit_id, fruit in FRUITS.items()}


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
            CREATE TABLE IF NOT EXISTS skill_cooldowns(player_id TEXT NOT NULL, fruit_id TEXT NOT NULL, skill_key TEXT NOT NULL, ready_at REAL NOT NULL, PRIMARY KEY(player_id,fruit_id,skill_key), FOREIGN KEY(player_id) REFERENCES players(id), FOREIGN KEY(fruit_id) REFERENCES fruits(id));
            CREATE TABLE IF NOT EXISTS unlocks(player_id TEXT NOT NULL, fruit_id TEXT NOT NULL, PRIMARY KEY(player_id,fruit_id), FOREIGN KEY(player_id) REFERENCES players(id), FOREIGN KEY(fruit_id) REFERENCES fruits(id));
            CREATE TABLE IF NOT EXISTS corpses(id TEXT PRIMARY KEY, player_id TEXT NOT NULL, instance TEXT NOT NULL, x REAL NOT NULL, y REAL NOT NULL, expires REAL NOT NULL, FOREIGN KEY(player_id) REFERENCES players(id));
            CREATE TABLE IF NOT EXISTS food(id TEXT PRIMARY KEY, player_id TEXT NOT NULL, instance TEXT NOT NULL, x REAL NOT NULL, y REAL NOT NULL, expires REAL NOT NULL, FOREIGN KEY(player_id) REFERENCES players(id));
        """)
        columns = {row[1] for row in self.db.execute("PRAGMA table_info(players)")}
        with self.db:
            if "transformed" not in columns:
                self.db.execute("ALTER TABLE players ADD COLUMN transformed INTEGER NOT NULL DEFAULT 0")
            if "high_altitude_until" not in columns:
                self.db.execute("ALTER TABLE players ADD COLUMN high_altitude_until REAL NOT NULL DEFAULT 0")
        with self.db:
            if "metallic_until" not in columns:
                self.db.execute("ALTER TABLE players ADD COLUMN metallic_until REAL NOT NULL DEFAULT 0")
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
        cooldowns.update({r[0]+":"+r[1]: r[2] for r in self.db.execute("SELECT fruit_id,skill_key,ready_at FROM skill_cooldowns WHERE player_id=?", (player_id,))})
        return {"metallic_until": row["metallic_until"], "unlocked": unlocked, "equipped": row["equipped"], "transformed": bool(row["transformed"]), "high_altitude_until": row["high_altitude_until"], "cooldowns": cooldowns, "cooldown_until": cooldowns.get(row["equipped"], 0), "is_invulnerable": row["invulnerable_until"] > self.clock(), "invulnerable_until": row["invulnerable_until"]}

    def register(self, player_id: str, fruit_id: str):
        self.player(player_id)
        if fruit_id not in FRUITS:
            raise ValueError("Fruta desconhecida")
        with self.db:
            self.db.execute("INSERT OR IGNORE INTO unlocks VALUES(?,?)", (player_id, fruit_id))
        return self.state(player_id)

    def equip(self, player_id: str, fruit_id: str | None):
        self.player(player_id)
        previous_fruit = self.state(player_id)["equipped"]
        if fruit_id is not None and not self.db.execute("SELECT 1 FROM unlocks WHERE player_id=? AND fruit_id=?", (player_id, fruit_id)).fetchone():
            raise ValueError("Fruta não desbloqueada")
        with self.db:
            self.db.execute("UPDATE players SET equipped=?, transformed=CASE WHEN equipped IS ? THEN transformed ELSE 0 END, metallic_until=CASE WHEN equipped IS ? THEN metallic_until ELSE 0 END WHERE id=?", (fruit_id, fruit_id, fruit_id, player_id))
        if fruit_id == NEKO_ID and previous_fruit != fruit_id:
            with self.db:
                self.db.execute("UPDATE players SET transformed=1 WHERE id=?", (player_id,))
        return self.state(player_id)

    def transform(self, player_id: str, enabled: bool):
        state = self.state(player_id)
        if enabled and FRUITS.get(state["equipped"], {}).get("family") != "zoan":
            raise ValueError("Equipe uma Zoan para transformar")
        with self.db:
            self.db.execute("UPDATE players SET transformed=? WHERE id=?", (int(bool(enabled)), player_id))
        return self.state(player_id)

    def stats(self, player_id: str, base_hp: float, base_strength: float):
        state = self.state(player_id)
        if not all(math.isfinite(v) and v >= 0 for v in (base_hp, base_strength)):
            raise ValueError("Atributos inválidos")
        count = len(state["unlocked"])
        fruit = FRUITS.get(state["equipped"], {})
        return {"count": count, "max_hp": round(base_hp * (1 + .001 * count) * (1 + fruit.get("max_hp_percent", 0))), "strength": base_strength * (1 + .001 * count), "healing_received_percent": fruit.get("healing_received_percent", 0), "impact_resistance_percent": fruit.get("impact_resistance_percent", 0), "move_speed_percent": fruit.get("move_speed_percent", 0), "evasion_percent": fruit.get("evasion_percent", 0), "physical_defense_percent": fruit.get("physical_defense_percent", 0)}

    def record_corpse(self, player_id: str, corpse_id: str, instance: str, x: float, y: float):
        self.player(player_id)
        if not corpse_id or not instance or not all(math.isfinite(v) for v in (x, y)):
            raise ValueError("Cadáver inválido")
        with self.db:
            self.db.execute("INSERT OR REPLACE INTO corpses VALUES(?,?,?,?,?,?)", (corpse_id, player_id, instance, x, y, self.clock() + 12))

    def cast(self, player_id: str, instance: str, x: float, y: float, enemies=(), direction=(0, 1), skill_key=None, energy=None, physical_attack=None, target_id=None, crit_multiplier=1.65):
        state = self.state(player_id)
        fruit_id = state["equipped"]
        if not fruit_id:
            raise ValueError("Nenhuma fruta equipada")
        if fruit_id == NEKO_ID:
            return self.cast_neko(player_id, instance, x, y, enemies, skill_key, energy, physical_attack, target_id, crit_multiplier)
        if fruit_id == SUPA_ID:
            return self.cast_supa(player_id, instance, x, y, enemies, skill_key, energy, physical_attack)
        now = self.clock()
        if state["cooldowns"].get(fruit_id, 0) > now:
            raise ValueError("Habilidade em recarga")
        if not instance or not all(math.isfinite(v) for v in (x, y)):
            raise ValueError("Posição inválida")
        fruit = FRUITS[fruit_id]
        if fruit.get("family") == "zoan" and not state["transformed"]:
            raise ValueError("Transforme-se antes de usar a habilidade Zoan")
        with self.db:
            if fruit_id == "akuma_kuku_kuku":
                corpse = self.db.execute("SELECT * FROM corpses WHERE player_id=? AND instance=? AND expires>? ORDER BY ((x-?)*(x-?)+(y-?)*(y-?)) LIMIT 1", (player_id, instance, now, x, x, y, y)).fetchone()
                if corpse is None:
                    raise ValueError("Nenhum cadáver disponível na instância")
                self.db.execute("DELETE FROM corpses WHERE id=?", (corpse["id"],))
                self.db.execute("INSERT INTO food VALUES(?,?,?,?,?,?)", (corpse["id"], player_id, instance, corpse["x"], corpse["y"], float("inf")))
                effect = {"type": "food", "id": corpse["id"], "x": corpse["x"], "y": corpse["y"], "heal_percent": .15}
            elif fruit_id == "akuma_beri_beri":
                moved = []
                for enemy in enemies:
                    ex, ey = float(enemy["x"]), float(enemy["y"])
                    distance = math.hypot(ex - x, ey - y)
                    if distance <= 130:
                        distance = max(1, distance)
                        moved.append({"id": enemy["id"], "x": ex + (ex - x) / distance * 65, "y": ey + (ey - y) / distance * 65})
                self.db.execute("UPDATE players SET invulnerable_until=? WHERE id=?", (now + 1.5, player_id))
                effect = {"type": "division", "duration": 1.5, "enemies": moved}
            elif fruit_id == "akuma_tori_albatroz":
                self.db.execute("UPDATE players SET high_altitude_until=? WHERE id=?", (now + 5, player_id))
                effect = {"type": "high_altitude", "duration": 5, "speed_percent": .30, "ignore_ground_traps": True}
            elif fruit_id == "akuma_uma_uma":
                dx, dy = map(float, direction)
                length = math.hypot(dx, dy)
                if not math.isfinite(length) or length < .5:
                    raise ValueError("Direção de galope inválida")
                dx, dy = dx / length, dy / length
                candidates = []
                for enemy in enemies:
                    ex, ey = float(enemy["x"]), float(enemy["y"])
                    forward = (ex - x) * dx + (ey - y) * dy
                    lateral = abs((ex - x) * dy - (ey - y) * dx)
                    if 0 <= forward <= 256 and lateral <= 32:
                        candidates.append((forward, enemy))
                hit = min(candidates, key=lambda entry: entry[0])[1] if candidates else None
                effect = {"type": "gallop", "distance": 256, "direction": [dx, dy], "hit_id": hit["id"] if hit else None, "knockback": 45, "damage_multiplier": .55}
            else:
                targets = [enemy for enemy in enemies if math.isfinite(float(enemy["x"])) and math.isfinite(float(enemy["y"])) and math.hypot(float(enemy["x"]) - x, float(enemy["y"]) - y) <= 130]
                if not targets:
                    raise ValueError("Nenhum alvo ao alcance da mordida")
                target = min(targets, key=lambda enemy: math.hypot(float(enemy["x"]) - x, float(enemy["y"]) - y))
                effect = {"type": "bite", "target_id": target["id"], "slow_percent": .30, "defense_percent": .05, "duration": 3, "damage_multiplier": .85}
            self.db.execute("INSERT OR REPLACE INTO fruit_cooldowns VALUES(?,?,?)", (player_id, fruit_id, now + fruit["cooldown"]))
        return {"effect": effect, "state": self.state(player_id)}

    def cast_supa(self, player_id, instance, x, y, enemies, skill_key, energy, physical_attack):
        state = self.state(player_id)
        skill = next((s for s in SUPA_RULES["skills"] if s["key"] == str(skill_key)), None)
        if state["equipped"] != SUPA_ID or skill is None:
            raise ValueError("Habilidade Supa inválida")
        if not instance or not all(math.isfinite(v) for v in (x, y)):
            raise ValueError("Posição inválida")
        if energy is None or isinstance(energy, bool) or not math.isfinite(float(energy)) or float(energy) < skill["cost"]:
            raise ValueError("Energia insuficiente")
        now = self.clock()
        if state["cooldowns"].get(SUPA_ID + ":" + skill["key"], 0) > now:
            raise ValueError("Habilidade em recarga")
        if skill["key"] == "1":
            if physical_attack is None or isinstance(physical_attack, bool) or not math.isfinite(float(physical_attack)) or float(physical_attack) < 0:
                raise ValueError("Ataque físico inválido")
            target_ids, hits = [], []
            for enemy in enemies:
                ex, ey = float(enemy["x"]), float(enemy["y"])
                if not all(math.isfinite(v) for v in (ex, ey)):
                    raise ValueError("Posição de inimigo inválida")
                if enemy.get("alive", True) and math.hypot(ex-x, ey-y) <= SUPA_RULES["radius"]:
                    if enemy["id"] not in target_ids:
                        armor = float(enemy.get("defense", 0))
                        if not math.isfinite(armor) or armor < 0:
                            raise ValueError("Defesa de inimigo inválida")
                        target_ids.append(enemy["id"])
                        hits.append({"id": enemy["id"], "damage": max(1, math.floor(float(physical_attack)*skill["damage_multiplier"]-armor*.30))})
            effect = {"type": "cutting_spiral", "damage_type": "physical", "damage_multiplier": skill["damage_multiplier"], "radius": SUPA_RULES["radius"], "target_ids": target_ids, "hits": hits, "x": x, "y": y}
        else:
            effect = {"type": "metallic_retaliation", "duration": SUPA_RULES["duration"]/1000, "expires_at": now+SUPA_RULES["duration"]/1000, "mitigation": SUPA_RULES["mitigation"], "reflect": SUPA_RULES["reflect"]}
        with self.db:
            if skill["key"] == "2":
                self.db.execute("UPDATE players SET metallic_until=? WHERE id=?", (effect["expires_at"], player_id))
            self.db.execute("INSERT OR REPLACE INTO skill_cooldowns VALUES(?,?,?,?)", (player_id, SUPA_ID, skill["key"], now+skill["cooldown"]))
        return {"effect": effect, "energy_spent": skill["cost"], "energy_remaining": float(energy)-skill["cost"], "state": self.state(player_id)}

    def receive_damage(self, player_id, original, received=None, physical=True, direct=False, reflected=False):
        """Resolve Supa after ordinary defense; reflected damage cannot reflect again.

        The optional prototype service receives combat inputs from the local client.
        It does not own monster HP or the complete player combat state yet.
        """
        state = self.state(player_id)
        received = original if received is None else received
        if not all(isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v) and v >= 0 for v in (original, received)):
            raise ValueError("Dano inválido")
        active = state["equipped"] == SUPA_ID and state["metallic_until"] > self.clock()
        enabled = active and physical and not direct and not reflected and original > 0 and received > 0
        return {"damage": received*(1-SUPA_RULES["mitigation"]) if enabled else received, "reflected": original*SUPA_RULES["reflect"] if enabled else 0}

    def end_protection(self, player_id):
        self.state(player_id)
        with self.db:
            self.db.execute("UPDATE players SET metallic_until=0 WHERE id=?", (player_id,))
        return self.state(player_id)

    @staticmethod
    def neko_backstab(dx, dy, facing):
        vectors = {"north": (0,-1), "south": (0,1), "east": (1,0), "west": (-1,0)}
        vector = vectors.get(facing)
        length = math.hypot(dx, dy)
        return bool(vector and length > 0 and (dx*vector[0]+dy*vector[1])/length >= math.sqrt(.5)-1e-9)

    @staticmethod
    def neko_damage(attack, armor, multiplier, critical=False, crit_multiplier=1.65):
        if not all(math.isfinite(v) and v >= 0 for v in (attack, armor, multiplier, crit_multiplier)):
            raise ValueError("Atributos de golpe inválidos")
        return max(1, math.floor(max(1, attack*multiplier-armor*.30)*(crit_multiplier if critical else 1)))

    def cast_neko(self, player_id, instance, x, y, enemies, skill_key, energy, attack, target_id, crit_multiplier):
        state = self.state(player_id)
        skill = next((s for s in NEKO_RULES["skills"] if s["key"] == str(skill_key)), None)
        if state["equipped"] != NEKO_ID or not state["transformed"] or skill is None:
            raise ValueError("Transforme-se em Leopardo para usar esta habilidade")
        if not instance or not all(math.isfinite(v) for v in (x, y)):
            raise ValueError("Posição inválida")
        if energy is None or isinstance(energy, bool) or not math.isfinite(float(energy)) or float(energy) < skill["cost"]:
            raise ValueError("Energia insuficiente")
        if attack is None or isinstance(attack, bool) or not math.isfinite(float(attack)) or float(attack) < 0:
            raise ValueError("Ataque físico inválido")
        target = next((enemy for enemy in enemies if str(enemy["id"]) == str(target_id) and enemy.get("alive", True)), None)
        if target is None:
            raise ValueError("Selecione um alvo vivo")
        ex, ey, armor = float(target["x"]), float(target["y"]), float(target.get("defense", 0))
        if not all(math.isfinite(v) for v in (ex, ey, armor)) or armor < 0:
            raise ValueError("Alvo inválido")
        dx, dy = ex-x, ey-y
        distance = math.hypot(dx, dy)
        reach = NEKO_RULES["dashRange"] if skill["key"] == "1" else NEKO_RULES["comboRange"]
        if distance > reach or skill["key"] == "1" and distance < 1:
            raise ValueError("Alvo fora do alcance")
        now = self.clock()
        if state["cooldowns"].get(NEKO_ID+":"+skill["key"], 0) > now:
            raise ValueError("Habilidade em recarga")
        if skill["key"] == "1":
            critical = self.neko_backstab(dx, dy, target.get("facing", "south"))
            effect = {"type": "ferocious_pounce", "target_id": target["id"], "direction": [dx/distance, dy/distance], "distance": min(reach+NEKO_RULES["dashBeyond"], distance+NEKO_RULES["dashBeyond"]), "damage_multiplier": skill["damage_multiplier"], "critical": critical, "damage": self.neko_damage(float(attack), armor, skill["damage_multiplier"], critical, float(crit_multiplier))}
        else:
            damage = self.neko_damage(float(attack), armor, skill["damage_multiplier"])
            effect = {"type": "feline_fury", "target_id": target["id"], "duration": NEKO_RULES["comboDuration"]/1000, "ticks": [{"at": t, "damage": damage} for t in NEKO_RULES["comboTimes"]], "damage_multiplier": skill["damage_multiplier"]}
        with self.db:
            self.db.execute("INSERT OR REPLACE INTO skill_cooldowns VALUES(?,?,?,?)", (player_id, NEKO_ID, skill["key"], now+skill["cooldown"]))
        return {"effect": effect, "energy_spent": skill["cost"], "energy_remaining": float(energy)-skill["cost"], "state": self.state(player_id)}

    def pickup_food(self, player_id: str, food_id: str, instance: str, x: float, y: float):
        row = self.db.execute("SELECT * FROM food WHERE id=? AND player_id=? AND instance=? AND expires>?", (food_id, player_id, instance, self.clock())).fetchone()
        if row is None or math.hypot(row["x"] - x, row["y"] - y) > 25:
            raise ValueError("Comida indisponível")
        with self.db:
            self.db.execute("DELETE FROM food WHERE id=?", (food_id,))
        return {"heal_percent": .15}
