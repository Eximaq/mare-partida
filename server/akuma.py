"""Persistent Akuma no Mi rules for the optional Python game service."""
from __future__ import annotations

import json
import math
import sqlite3
import time
import uuid
from combat_vfx import CombatVfxService, player_statuses
from jiki import JikiService, RULES as JIKI_RULES, JIKI
from ryu import RyuService, RULES as RYU_RULES, RYU
from hoya import HoyaService, RULES as HOYA_RULES, HOYA
from rank_s import RULES as RANK_S_RULES
from rank_a import RankAService, RULES as RANK_A_RULES, OPE, MERO
from rank_b import RankBService, RULES as RANK_B_RULES, BETA, HANA, mitigate
from rank_c_expansion import RankCExpansionService, RULES as EXPANSION_RULES, BISON, BOMU, KOBU
from rank_c import RankCService, RULES as RANK_C_RULES, HORU, MATO
from fruit_stats import DEVIL_FRUIT_STATS, passive_stats, apply_stats
from pathlib import Path

SUPA_RULES = json.loads((Path(__file__).resolve().parents[1] / "assets/akuma/supa/rules.json").read_text(encoding="utf-8"))
SUPA_ID = "akuma_supa_supa"
NEKO_RULES = json.loads((Path(__file__).resolve().parents[1] / "assets/akuma/neko/rules.json").read_text(encoding="utf-8"))
NEKO_ID = NEKO_RULES["id"]
USHI_RULES = json.loads((Path(__file__).resolve().parents[1] / "assets/akuma/ushi/rules.json").read_text(encoding="utf-8"))
USHI_ID = USHI_RULES["id"]
DORU_RULES = json.loads((Path(__file__).resolve().parents[1] / "assets/akuma/doru/rules.json").read_text(encoding="utf-8"))
DORU_ID = DORU_RULES["id"]
WOLF_RULES = json.loads((Path(__file__).resolve().parents[1] / "assets/akuma/wolf/rules.json").read_text(encoding="utf-8"))
WOLF_ID = WOLF_RULES['id']

FRUITS = {
    RYU: {'type':'akuma_no_mi','family':'zoan','subtype':'Zoan Ancestral','rank':'B','name':RYU_RULES['name'],'description':RYU_RULES['description'],'icon_path':'assets/akuma/ryu/fruit.png','cooldown':18,'skills':RYU_RULES['skills']},
    WOLF_ID: {"type":"akuma_no_mi", "family":"zoan", "subtype":"Zoan Carnívora", "rank":"D", "name":"Inu Inu no Mi: Modelo Lobo", "description":WOLF_RULES['description'], "cooldown":14, "icon_path":"assets/akuma/wolf/fruit.png"},
    DORU_ID: {"type":"akuma_no_mi", "family":"paramecia", "rank":"D", "name":"Doru Doru no Mi", "description":DORU_RULES['description'], "cooldown":12, "icon_path":"assets/akuma/doru/fruit.png"},
    USHI_ID: {"type":"akuma_no_mi", "family":"zoan", "rank":"D", "name":"Ushi-Ushi no Mi: Modelo Girafa", "description":USHI_RULES["description"], "cooldown":12, "icon_path":"assets/akuma/ushi/fruit.png"},
    NEKO_ID: {"type": "akuma_no_mi", "family": "zoan", "subtype": "Zoan Carnívora", "rank": "D", "name": "Neko Neko no Mi: Modelo Leopardo", "description": NEKO_RULES["description"], "cooldown": 12, "icon_path": "assets/akuma/neko/fruit.png"},
    SUPA_ID: {"type": "akuma_no_mi", "family": "paramecia", "rank": "D", "name": "Supa Supa no Mi", "cooldown": 10, "icon_path": "assets/akuma/supa/fruit.png"},
    "akuma_kuku_kuku": {"type": "akuma_no_mi", "rank": "E", "name": "Kuku-Kuku no Mi", "cooldown": 15, "healing_received_percent": .05, "max_hp_percent": .03},
    "akuma_beri_beri": {"type": "akuma_no_mi", "rank": "E", "name": "Beri-Beri no Mi", "cooldown": 18, "impact_resistance_percent": .15},
    "akuma_tori_albatroz": {"type": "akuma_no_mi", "family": "zoan", "rank": "E", "name": "Tori-Tori no Mi: Albatroz", "cooldown": 14, "move_speed_percent": .12, "evasion_percent": .05},
    "akuma_uma_uma": {"type": "akuma_no_mi", "family": "zoan", "rank": "E", "name": "Uma-Uma no Mi", "cooldown": 12, "move_speed_percent": .15, "max_hp_percent": .03},
    "akuma_inu_dachshund": {"type": "akuma_no_mi", "family": "zoan", "rank": "E", "name": "Inu-Inu no Mi: Dachshund", "cooldown": 10, "evasion_percent": .10, "physical_defense_percent": .03},
}

for rule in RANK_C_RULES.values():
    FRUITS[rule['id']]={'type':'akuma_no_mi','family':'paramecia','rank':'C','name':rule['name'],'description':rule['description'],'icon_path':'assets/akuma/'+('horu' if rule['id']==HORU else 'mato')+'/fruit.png','cooldown':rule['skills'][0]['cooldown']}

for rule in EXPANSION_RULES.values():
    FRUITS[rule['id']]={'type':'akuma_no_mi','family':rule['family'],'rank':'C','name':rule['name'],'description':rule['description'],'cooldown':rule['skills'][0]['cooldown'],'skills':rule['skills'],'isImmuneToExplosions':rule.get('isImmuneToExplosions',False)}

for rule in RANK_B_RULES.values():
    FRUITS[rule['id']]={'type':'akuma_no_mi','family':rule['family'],'rank':'B','name':rule['name'],'description':rule['description'],'cooldown':rule['skills'][0]['cooldown'],'skills':rule['skills'],'physicalDamageReduction':rule.get('physicalDamageReduction',0)}

FRUITS[HOYA]={'type':'akuma_no_mi','family':'paramecia','rank':'B','name':HOYA_RULES['name'],'description':HOYA_RULES['description'],'cooldown':90,'skills':HOYA_RULES['skills']}

FRUITS[JIKI]={'type':'akuma_no_mi','family':'paramecia','rank':'B','name':JIKI_RULES['name'],'description':JIKI_RULES['description'],'cooldown':22,'skills':JIKI_RULES['skills']}

for key,rule in RANK_A_RULES.items():
    FRUITS[rule['id']]={'type':'akuma_no_mi','family':'paramecia','rank':'A','name':rule['name'],'description':rule['description'],'icon_path':'assets/akuma/'+key+'/fruit.png','cooldown':rule['skills'][0]['cooldown'],'skills':rule['skills']}

for key,rule in RANK_S_RULES.items():
    FRUITS[rule['id']]={'type':'akuma_no_mi','family':'logia','rank':'S','name':rule['name'],'description':rule['description'],'icon_path':'assets/akuma/'+key+'/fruit.png','cooldown':rule['skills'][0]['cooldown'],'skills':rule['skills']}

for fruit_id, modifiers in DEVIL_FRUIT_STATS.items():
    FRUITS[fruit_id]['passive_stats']=dict(modifiers)
    FRUITS[fruit_id]['passiveStats']=dict(modifiers)


# Public catalog metadata for the HUD. Combat validation remains in cast().
SKILL_TOOLTIPS = {
    **{r['id']:r['skills'][0] for r in RANK_S_RULES.values()},
    **{r['id']:r['skills'][0] for r in RANK_A_RULES.values()},
    RYU:RYU_RULES['skills'][0],
    JIKI:JIKI_RULES['skills'][0],
    HOYA:HOYA_RULES['skills'][0],
    **{r['id']:r['skills'][0] for r in RANK_B_RULES.values()},
    **{rule['id']:rule['skills'][0] for rule in EXPANSION_RULES.values()},
    HORU:RANK_C_RULES['horu']['skills'][0],MATO:RANK_C_RULES['mato']['skills'][0],
    WOLF_ID: WOLF_RULES['skills'][0],
    DORU_ID: DORU_RULES['skills'][0],
    USHI_ID: USHI_RULES["skills"][0],
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
    return {fruit_id: {**fruit, **({'skills':RANK_C_RULES['horu' if fruit_id==HORU else 'mato']['skills']} if fruit_id in (HORU,MATO) else {}), "skill": SKILL_TOOLTIPS[fruit_id].copy(), **({"skills": WOLF_RULES['skills']} if fruit_id == WOLF_ID else {"skills": DORU_RULES['skills']} if fruit_id == DORU_ID else {"skills": USHI_RULES["skills"]} if fruit_id == USHI_ID else {"skills": SUPA_RULES["skills"]} if fruit_id == SUPA_ID else {"skills": NEKO_RULES["skills"]} if fruit_id == NEKO_ID else {})} for fruit_id, fruit in FRUITS.items()}


class AkumaStore:
    def __init__(self, database: str | Path = ":memory:", clock=time.time):
        self.db = sqlite3.connect(str(database), check_same_thread=False)
        self.db.row_factory = sqlite3.Row
        self.clock = clock
        self.rank_c=RankCService(clock)
        self.rank_b=RankBService(clock)
        self.rank_a=RankAService(clock)
        self.hoya=HoyaService(clock)
        self.jiki=JikiService(clock)
        self.ryu=RyuService(clock)
        self.vfx=CombatVfxService(clock)
        self.rank_c_expansion=RankCExpansionService(clock)
        # World enemies and projectiles are transient, scoped by player/instance.
        self.doru_projectiles = {}
        self.doru_roots = {}
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
            if "wolf_aura_until" not in columns:
                self.db.execute("ALTER TABLE players ADD COLUMN wolf_aura_until REAL NOT NULL DEFAULT 0")
            if "wild_fury_until" not in columns:
                self.db.execute("ALTER TABLE players ADD COLUMN wild_fury_until REAL NOT NULL DEFAULT 0")
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
        result={"wolf_aura_until":row['wolf_aura_until'],"wild_fury_until": row["wild_fury_until"], "metallic_until": row["metallic_until"], "rank_c":self.rank_c.state(player_id), "rank_b":self.rank_b.state(player_id), "rank_a":self.rank_a.state(player_id), "hoya":self.hoya.state(player_id),"jiki":self.jiki.state(player_id), "unlocked": unlocked, "passive_stats": passive_stats(row["equipped"]), "equipped": row["equipped"], "transformed": bool(row["transformed"]), "high_altitude_until": row["high_altitude_until"], "cooldowns": cooldowns, "cooldown_until": cooldowns.get(row["equipped"], 0), "is_invulnerable": row["invulnerable_until"] > self.clock() or self.hoya.active(player_id),"is_untargetable":self.hoya.active(player_id), "invulnerable_until": row["invulnerable_until"]}

        return {**result,'vfx_statuses':player_statuses(result,self.clock())}

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
        if previous_fruit != fruit_id:
            self.rank_c.clear(player_id)
            self.rank_b.clear(player_id)
            self.rank_a.clear(player_id)
            self.hoya.clear(player_id)
            self.jiki.clear(player_id)
            self.ryu.clear(player_id)
            self.vfx.clear(player_id)
            self.rank_c_expansion.clear(player_id)
            with self.db:
                self.db.execute("UPDATE players SET wild_fury_until=0 WHERE id=?", (player_id,))
                self.db.execute("UPDATE players SET wolf_aura_until=0 WHERE id=?", (player_id,))
        if fruit_id in (NEKO_ID, USHI_ID, WOLF_ID, BISON, RYU) and previous_fruit != fruit_id:
            with self.db:
                self.db.execute("UPDATE players SET transformed=1 WHERE id=?", (player_id,))
        return self.state(player_id)

    def transform(self, player_id: str, enabled: bool):
        state = self.state(player_id)
        if enabled and FRUITS.get(state["equipped"], {}).get("family") != "zoan":
            raise ValueError("Equipe uma Zoan para transformar")
        with self.db:
            self.db.execute("UPDATE players SET transformed=? WHERE id=?", (int(bool(enabled)), player_id))
            if not enabled:
                self.ryu.clear(player_id)
                self.vfx.clear(player_id)
                self.rank_c_expansion.clear(player_id)
                self.db.execute("UPDATE players SET wild_fury_until=0 WHERE id=?", (player_id,))
                self.db.execute("UPDATE players SET wolf_aura_until=0 WHERE id=?", (player_id,))
        return self.state(player_id)

    def stats(self, player_id: str, base_hp: float, base_strength: float, base_stats=None):
        state = self.state(player_id)
        if not all(math.isfinite(v) and v >= 0 for v in (base_hp, base_strength)):
            raise ValueError("Atributos inválidos")
        count = len(state["unlocked"])
        fruit = FRUITS.get(state["equipped"], {})
        result = {"count": count, "max_hp": round(base_hp * (1 + .001 * count) * (1 + fruit.get("max_hp_percent", 0))), "strength": base_strength * (1 + .001 * count), "healing_received_percent": fruit.get("healing_received_percent", 0), "impact_resistance_percent": fruit.get("impact_resistance_percent", 0), "move_speed_percent": fruit.get("move_speed_percent", 0), "evasion_percent": fruit.get("evasion_percent", 0), "physical_defense_percent": fruit.get("physical_defense_percent", 0)}

        if base_stats is not None and not isinstance(base_stats,dict):raise ValueError('Atributos base inválidos')
        derived=apply_stats({**(base_stats or {}),'max_hp':result['max_hp'],'healing_received_percent':(base_stats or {}).get('healing_received_percent',0)+(result['healing_received_percent'] if not passive_stats(state['equipped']) else 0)},state['equipped'])
        return {**result,**self.rank_a.apply_stats(player_id,self.rank_c_expansion.apply_stats(player_id,self.rank_c.apply_stats(player_id,derived))),'passive_stats':passive_stats(state['equipped']),'physicalDamageReduction':FRUITS.get(state['equipped'],{}).get('physicalDamageReduction',0)}

    def record_corpse(self, player_id: str, corpse_id: str, instance: str, x: float, y: float):
        self.player(player_id)
        if not corpse_id or not instance or not all(math.isfinite(v) for v in (x, y)):
            raise ValueError("Cadáver inválido")
        with self.db:
            self.db.execute("INSERT OR REPLACE INTO corpses VALUES(?,?,?,?,?,?)", (corpse_id, player_id, instance, x, y, self.clock() + 12))

    def cast(self, player_id: str, instance: str, x: float, y: float, enemies=(), direction=(0, 1), skill_key=None, energy=None, physical_attack=None, target_id=None, crit_multiplier=None, rank_c_context=None):
        state = self.state(player_id)
        fruit_id = state["equipped"]
        if not fruit_id:
            raise ValueError("Nenhuma fruta equipada")
        if (rank_c_context or {}).get('silenced'):raise ValueError('Akuma no Mi silenciada')
        if fruit_id in {r['id'] for r in [*RANK_A_RULES.values(),*RANK_S_RULES.values()]}:return self.rank_a.cast(self,player_id,fruit_id,instance,x,y,enemies,str(skill_key),energy,physical_attack,{**(rank_c_context or {}),'target_id':target_id},direction)
        if fruit_id==RYU:return self.ryu.cast(self,player_id,instance,x,y,enemies,str(skill_key),energy,physical_attack,{**(rank_c_context or {}),'target_id':target_id})
        if fruit_id==JIKI:return self.jiki.cast(self,player_id,instance,x,y,enemies,str(skill_key),energy,physical_attack,{**(rank_c_context or {}),'target_id':target_id})
        if fruit_id==HOYA:return self.hoya.cast(self,player_id,instance,x,y,str(skill_key),energy,rank_c_context or {})
        if fruit_id in (BETA,HANA):return self.rank_b.cast(self,player_id,fruit_id,instance,x,y,enemies,str(skill_key),energy,physical_attack,{**(rank_c_context or {}),'target_id':target_id})
        if fruit_id in (BISON,BOMU,KOBU):return self.rank_c_expansion.cast(self,player_id,fruit_id,instance,x,y,enemies,direction,str(skill_key),energy,physical_attack,{**(rank_c_context or {}),'target_id':target_id})
        if fruit_id in (HORU,MATO):return self.rank_c.cast(self,player_id,fruit_id,instance,x,y,enemies,direction,str(skill_key),energy,physical_attack,{**(rank_c_context or {}),'target_id':target_id})
        if fruit_id == WOLF_ID:
            return self.cast_wolf(player_id, instance, x, y, enemies, skill_key, energy, physical_attack, target_id)
        if fruit_id == DORU_ID:
            return self.cast_doru(player_id, instance, x, y, direction, skill_key, energy, physical_attack)
        if fruit_id == USHI_ID:
            return self.cast_ushi(player_id, instance, x, y, enemies, skill_key, energy, physical_attack, target_id)
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

    def receive_damage(self, player_id, original, received=None, physical=True, direct=False, reflected=False, damage_type=None, has_haki=False, projectile=False, melee=False):
        """Resolve Supa after ordinary defense; reflected damage cannot reflect again.

        The optional prototype service receives combat inputs from the local client.
        It does not own monster HP or the complete player combat state yet.
        """
        state = self.state(player_id)
        received = original if received is None else received
        if not all(isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v) and v >= 0 for v in (original, received)):
            raise ValueError("Dano inválido")
        if state['equipped']==BOMU and damage_type=='explosion':return {'damage':0,'reflected':0,'immune':True}
        if self.hoya.active(player_id):return {'damage':0,'reflected':0,'isUntargetable':True,'isInvulnerable':True}
        if self.rank_a.expansion.active(player_id):return self.rank_a.expansion.protect(player_id,received,projectile,melee,reflected)
        received=mitigate(received,state['equipped'],physical,has_haki is True)
        active = state["equipped"] == SUPA_ID and state["metallic_until"] > self.clock()
        enabled = active and physical and not direct and not reflected and original > 0 and received > 0
        damage = received*(1-SUPA_RULES["mitigation"]) if enabled else received
        if self.ushi_active(player_id):
            damage *= 1-USHI_RULES["mitigation"]
        thorns=damage*passive_stats(state['equipped']).get('damage_reflection',0) if physical and not direct and not reflected and damage>0 else 0
        return {"damage": damage, "reflected": (original*SUPA_RULES["reflect"] if enabled else 0)+thorns}

    def end_protection(self, player_id):
        self.state(player_id)
        self.rank_c.clear(player_id)
        self.rank_b.clear(player_id)
        self.rank_a.clear(player_id)
        self.hoya.clear(player_id)
        self.jiki.clear(player_id)
        self.ryu.clear(player_id)
        self.vfx.clear(player_id)
        self.rank_c_expansion.clear(player_id)
        with self.db:
            self.db.execute("UPDATE players SET metallic_until=0 WHERE id=?", (player_id,))
            self.db.execute("UPDATE players SET wild_fury_until=0 WHERE id=?", (player_id,))
            self.db.execute("UPDATE players SET wolf_aura_until=0 WHERE id=?", (player_id,))
        return self.state(player_id)

    def wolf_bonuses(self, player_id):
        row=self.db.execute('SELECT equipped,transformed,wolf_aura_until FROM players WHERE id=?',(player_id,)).fetchone()
        if row is None:raise ValueError('Jogador desconhecido')
        active=row['equipped']==WOLF_ID and row['transformed'] and row['wolf_aura_until']>self.clock()
        p=passive_stats(row['equipped'])
        return {'attack_speed_percent':(1+p.get('attack_speed',0))*(1+(WOLF_RULES['attackSpeed'] if active else 0))-1,'lifesteal_percent':p.get('lifesteal',0)+(WOLF_RULES['lifesteal'] if active else 0)}

    def wolf_heal(self, player_id, actual_damage):
        if isinstance(actual_damage,bool) or not isinstance(actual_damage,(int,float)) or not math.isfinite(actual_damage) or actual_damage<0:raise ValueError('Dano efetivo inválido')
        return actual_damage*self.wolf_bonuses(player_id)['lifesteal_percent']

    def cast_wolf(self, player_id, instance, x, y, enemies, skill_key, energy, attack, target_id):
        state=self.state(player_id);skill=next((s for s in WOLF_RULES['skills'] if s['key']==str(skill_key)),None)
        if state['equipped']!=WOLF_ID or not state['transformed'] or skill is None:raise ValueError('Transforme-se em Lobo para usar esta habilidade')
        if not instance or not all(math.isfinite(v) for v in (x,y)):raise ValueError('Posição inválida')
        if energy is None or isinstance(energy,bool) or not math.isfinite(float(energy)) or float(energy)<skill['cost']:raise ValueError('Energia insuficiente')
        now=self.clock()
        if state['cooldowns'].get(WOLF_ID+':'+skill['key'],0)>now:raise ValueError('Habilidade em recarga')
        if skill['key']=='1':
            if attack is None or isinstance(attack,bool) or not math.isfinite(float(attack)) or float(attack)<0:raise ValueError('Ataque inválido')
            target=next((e for e in enemies if str(e['id'])==str(target_id) and e.get('alive',True)),None)
            if target is None:raise ValueError('Selecione um alvo vivo')
            ex,ey,armor=float(target['x']),float(target['y']),float(target.get('defense',0))
            if not all(math.isfinite(v) for v in (ex,ey,armor)) or armor<0:raise ValueError('Alvo inválido')
            length=math.hypot(ex-x,ey-y)
            if length<1 or length>WOLF_RULES['range']:raise ValueError('Alvo fora de alcance')
            damage=lambda mult:max(1,math.floor(float(attack)*mult-armor*.30))
            effect={'type':'incessant_hunger','target_id':target['id'],'direction':[(ex-x)/length,(ey-y)/length],'damage':damage(1),'ticks':[{'at':i,'damage':damage(.2)} for i in range(1,6)],'range':WOLF_RULES['range'],'controllable':True}
        else:effect={'type':'bloodthirsty_aura','duration':WOLF_RULES['auraDuration']/1000,'expires_at':now+WOLF_RULES['auraDuration']/1000,'attack_speed_percent':WOLF_RULES['attackSpeed'],'lifesteal_percent':WOLF_RULES['lifesteal']}
        with self.db:
            if skill['key']=='2':self.db.execute('UPDATE players SET wolf_aura_until=? WHERE id=?',(effect['expires_at'],player_id))
            self.db.execute('INSERT OR REPLACE INTO skill_cooldowns VALUES(?,?,?,?)',(player_id,WOLF_ID,skill['key'],now+skill['cooldown']))
        return {'effect':effect,'energy_spent':skill['cost'],'energy_remaining':float(energy)-skill['cost'],'state':self.state(player_id)}

    def ushi_active(self, player_id):
        row = self.db.execute("SELECT equipped,transformed,wild_fury_until FROM players WHERE id=?", (player_id,)).fetchone()
        return bool(row and row['equipped']==USHI_ID and row['transformed'] and row['wild_fury_until']>self.clock())

    def cast_doru(self, player_id, instance, x, y, direction, skill_key, energy, attack):
        state=self.state(player_id)
        skill=next((s for s in DORU_RULES['skills'] if s['key']==str(skill_key)),None)
        if state['equipped']!=DORU_ID or skill is None:raise ValueError('Habilidade Doru inválida')
        if not instance or not all(math.isfinite(v) for v in (x,y)):raise ValueError('Posição inválida')
        if energy is None or isinstance(energy,bool) or not math.isfinite(float(energy)) or float(energy)<skill['cost']:raise ValueError('Energia insuficiente')
        if attack is None or isinstance(attack,bool) or not math.isfinite(float(attack)) or float(attack)<0:raise ValueError('Poder de Ataque inválido')
        if len(direction)!=2:raise ValueError('Direção inválida')
        dx,dy=map(float,direction);length=math.hypot(dx,dy)
        if not math.isfinite(length) or length<.001:raise ValueError('Direção inválida')
        now=self.clock()
        if state['cooldowns'].get(DORU_ID+':'+skill['key'],0)>now:raise ValueError('Habilidade em recarga')
        self.doru_projectiles={k:v for k,v in self.doru_projectiles.items() if v['expires']>now}
        self.doru_roots={k:v for k,v in self.doru_roots.items() if v>now}
        pid=uuid.uuid4().hex
        self.doru_projectiles[pid]={'player':player_id,'instance':instance,'key':skill['key'],'x':x,'y':y,'dx':dx/length,'dy':dy/length,'attack':float(attack),'expires':now+10}
        with self.db:self.db.execute('INSERT OR REPLACE INTO skill_cooldowns VALUES(?,?,?,?)',(player_id,DORU_ID,skill['key'],now+skill['cooldown']*(1-passive_stats(DORU_ID).get('cooldown_reduction',0))))
        return {'effect':{'type':'wax_projectile','projectile_id':pid,'key':skill['key'],'direction':[dx/length,dy/length],'range':DORU_RULES['range'],'speed':DORU_RULES['speed']},'energy_spent':skill['cost'],'energy_remaining':float(energy)-skill['cost'],'state':self.state(player_id)}

    def impact_doru(self, player_id, projectile_id, x, y, enemies, hit_id=None):
        self.state(player_id)
        shot=self.doru_projectiles.get(projectile_id)
        if not shot or shot['player']!=player_id or shot['expires']<=self.clock():raise ValueError('Projétil inválido ou já concluído')
        if not all(isinstance(v,(int,float)) and not isinstance(v,bool) and math.isfinite(v) for v in (x,y)):raise ValueError('Impacto inválido')
        dx,dy=x-shot['x'],y-shot['y'];forward=dx*shot['dx']+dy*shot['dy'];side=abs(dx*shot['dy']-dy*shot['dx'])
        if forward<-.0001 or forward>DORU_RULES['range']+.0001 or side>.001:raise ValueError('Impacto fora da trajetória')
        targets=[];seen=set()
        for e in enemies:
            if not e.get('alive',True) or str(e['id']) in seen:continue
            ex,ey,armor=float(e['x']),float(e['y']),float(e.get('defense',0))
            if not all(math.isfinite(v) for v in (ex,ey,armor)) or armor<0:raise ValueError('Alvo inválido')
            targets.append((e,math.hypot(ex-x,ey-y),armor));seen.add(str(e['id']))
        hits=[];root=None
        if shot['key']=='1':
            hits=[{'id':e['id'],'damage':max(1,math.floor(shot['attack']*DORU_RULES['skills'][0]['damage_multiplier']-armor*.30))} for e,d,armor in targets if d<=DORU_RULES['explosionRadius']]
        elif hit_id is not None:
            target=next((e for e,d,a in targets if str(e['id'])==str(hit_id) and d<=DORU_RULES['hitRadius']+.001),None)
            if target is None:raise ValueError('Alvo fora do impacto')
            until=self.clock()+DORU_RULES['rootDuration']
            self.doru_roots[(player_id,shot['instance'],str(target['id']))]=until
            root={'id':target['id'],'duration':DORU_RULES['rootDuration'],'until':until}
        del self.doru_projectiles[projectile_id]
        return {'hits':hits,'root':root}

    def doru_can_move(self, player_id, instance, enemy_id):
        self.state(player_id)
        return self.doru_roots.get((player_id,instance,str(enemy_id)),0)<=self.clock()

    def basic_attack(self, player_id, damage):
        if isinstance(damage,bool) or not isinstance(damage,(int,float)) or not math.isfinite(damage) or damage<0:
            raise ValueError('Dano inválido')
        return damage*(1+USHI_RULES['basicBonus']) if self.ushi_active(player_id) else damage

    def cast_ushi(self, player_id, instance, x, y, enemies, skill_key, energy, attack, target_id):
        state=self.state(player_id)
        skill=next((s for s in USHI_RULES['skills'] if s['key']==str(skill_key)),None)
        if state['equipped']!=USHI_ID or not state['transformed'] or skill is None:
            raise ValueError('Transforme-se em Girafa para usar esta habilidade')
        if not instance or not all(math.isfinite(v) for v in (x,y)):
            raise ValueError('Posição inválida')
        if energy is None or isinstance(energy,bool) or not math.isfinite(float(energy)) or float(energy)<skill['cost']:
            raise ValueError('Energia insuficiente')
        now=self.clock()
        if state['cooldowns'].get(USHI_ID+':'+skill['key'],0)>now:
            raise ValueError('Habilidade em recarga')
        if skill['key']=='1':
            if attack is None or isinstance(attack,bool) or not math.isfinite(float(attack)) or float(attack)<0:
                raise ValueError('Ataque físico inválido')
            target=next((e for e in enemies if str(e['id'])==str(target_id) and e.get('alive',True)),None)
            if target is None:raise ValueError('Selecione um alvo vivo')
            ex,ey,armor=float(target['x']),float(target['y']),float(target.get('defense',0))
            if not all(math.isfinite(v) for v in (ex,ey,armor)) or armor<0:raise ValueError('Alvo inválido')
            if math.hypot(ex-x,ey-y)>USHI_RULES['range']:raise ValueError('Alvo fora do alcance')
            penetration=min(.6,USHI_RULES['penetration']+passive_stats(USHI_ID).get('armor_penetration',0))
            damage=max(1,math.floor(float(attack)*skill['damage_multiplier']-armor*(1-penetration)*.30))
            effect={'type':'ivory_whip','target_id':target['id'],'damage':damage,'knockback':USHI_RULES['knockback'],'penetration':penetration,'impact_at':USHI_RULES['impactAt']}
        else:
            effect={'type':'wild_fury','duration':5,'expires_at':now+5,'mitigation':USHI_RULES['mitigation'],'basic_bonus':USHI_RULES['basicBonus']}
        with self.db:
            if skill['key']=='2':self.db.execute('UPDATE players SET wild_fury_until=? WHERE id=?',(now+5,player_id))
            self.db.execute('INSERT OR REPLACE INTO skill_cooldowns VALUES(?,?,?,?)',(player_id,USHI_ID,skill['key'],now+skill['cooldown']))
        return {'effect':effect,'energy_spent':skill['cost'],'energy_remaining':float(energy)-skill['cost'],'state':self.state(player_id)}

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
        if crit_multiplier is None:crit_multiplier=1.65+passive_stats(NEKO_ID).get('crit_damage',0)
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
