"""Progressão e ranking local da Hierarquia dos Mares."""
from __future__ import annotations
import math
import base64
import binascii
import re
import sqlite3
from contextlib import contextmanager
from pathlib import Path

LEVELS = (1, 20, 50, 75, 100, 135, 170, 200)
TITLES = {
    "pirate": ("Pirata Novato", "Pirata Promissor", "Capitão Pirata", "Supernova", "Shichibukai", "Comandante Yonkou", "Yonkou (Imperador)", "Rei dos Piratas"),
    "marine": ("Recruta", "Marinheiro", "Sargento", "Capitão", "Comodoro", "Vice-Almirante", "Almirante", "Almirante de Frota"),
    "revolutionary": ("Simpatizante", "Guerrilheiro", "Oficial Revolucionário", "Executivo", "Comandante de Tropa", "Comandante de Exército", "Chefe de Gabinete", "Líder Supremo"),
    "government": ("Agente Menor", "Agente Oficial", "Inspetor do Governo", "Agente Cipher Pol", "Elite Cipher Pol (CP9)", "Agente Aegis (CP0)", "Comandante Aegis Zero", "Diretor Geral"),
}
LOCKED_MESSAGE = "Esta ascensão requer itens especiais ainda não descobertos nos mares."
CLASSES = frozenset(('sword', 'brawler', 'gunner', 'rogue', 'cyborg', 'strategist', 'healer'))
PORTRAIT = re.compile(r'^data:image/png;base64,([A-Za-z0-9+/]+={0,2})$')

class HierarchyStore:
    def __init__(self, path: Path):
        self.path = path
        with self._db() as db:
            db.execute("""CREATE TABLE IF NOT EXISTS hierarchy_players (
                player_id TEXT PRIMARY KEY, name TEXT NOT NULL, faction TEXT NOT NULL,
                level INTEGER NOT NULL, power INTEGER NOT NULL, tier INTEGER NOT NULL DEFAULT 1,
                rank_title TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )""")
            db.execute("CREATE INDEX IF NOT EXISTS hierarchy_ranking ON hierarchy_players(faction, tier DESC, level DESC, power DESC)")
            columns = {row[1] for row in db.execute('PRAGMA table_info(hierarchy_players)')}
            if 'class_id' not in columns:
                db.execute("ALTER TABLE hierarchy_players ADD COLUMN class_id TEXT NOT NULL DEFAULT ''")
            if 'portrait' not in columns:
                db.execute("ALTER TABLE hierarchy_players ADD COLUMN portrait TEXT NOT NULL DEFAULT ''")
            db.execute("CREATE INDEX IF NOT EXISTS hierarchy_ranking_global ON hierarchy_players(tier DESC, level DESC, power DESC, player_id)")

    @contextmanager
    def _db(self):
        connection = sqlite3.connect(self.path)
        try:
            with connection:
                yield connection
        finally:
            connection.close()

    @staticmethod
    def _id(value):
        if not isinstance(value, str) or not 1 <= len(value) <= 80 or not all(c.isalnum() or c in '-_' for c in value):
            raise ValueError("Identificador de jogador inválido")
        return value

    def sync(self, player_id, name, faction, level, power, class_id='', portrait=''):
        player_id = self._id(player_id)
        if faction not in TITLES: raise ValueError("Facção inválida")
        if not isinstance(name, str) or not 1 <= len(name.strip()) <= 40: raise ValueError("Nome inválido")
        if isinstance(level, bool) or not isinstance(level, int) or not 1 <= level <= 999: raise ValueError("Nível inválido")
        if isinstance(power, bool) or not isinstance(power, (int, float)) or not math.isfinite(power) or not 0 <= power <= 1_000_000_000: raise ValueError("Poder inválido")
        if class_id and class_id not in CLASSES: raise ValueError("Classe inválida")
        if portrait:
            match = PORTRAIT.fullmatch(portrait) if isinstance(portrait, str) and len(portrait) <= 50000 else None
            if not match: raise ValueError("Retrato inválido")
            try: raw = base64.b64decode(match[1], validate=True)
            except (ValueError, binascii.Error) as exc: raise ValueError("Retrato inválido") from exc
            if len(raw) < 24 or raw[:8] != b'\x89PNG\r\n\x1a\n' or raw[12:16] != b'IHDR' or not 1 <= int.from_bytes(raw[16:20], 'big') <= 128 or not 1 <= int.from_bytes(raw[20:24], 'big') <= 128:
                raise ValueError("Retrato inválido")
        with self._db() as db:
            db.execute("""INSERT INTO hierarchy_players(player_id,name,faction,level,power,tier,rank_title,class_id,portrait)
                VALUES(?,?,?,?,?,1,?,?,?) ON CONFLICT(player_id) DO UPDATE SET
                name=excluded.name, faction=excluded.faction, level=excluded.level, power=excluded.power,
                class_id=excluded.class_id, portrait=excluded.portrait,
                rank_title=CASE WHEN faction != excluded.faction THEN
                    CASE excluded.faction WHEN 'pirate' THEN ? WHEN 'marine' THEN ?
                    WHEN 'revolutionary' THEN ? ELSE ? END ELSE rank_title END,
                tier=CASE WHEN faction != excluded.faction THEN 1 ELSE tier END,
                updated_at=CURRENT_TIMESTAMP""",
                (player_id,name.strip(),faction,level,int(power),TITLES[faction][0],class_id,portrait,
                 *(TITLES[key][0] for key in ('pirate','marine','revolutionary','government'))))
        return self.state(player_id)

    def promote(self, player_id, expected_tier=None):
        player_id = self._id(player_id)
        with self._db() as db:
            db.execute('BEGIN IMMEDIATE')
            row = db.execute('SELECT faction,level,tier FROM hierarchy_players WHERE player_id=?',(player_id,)).fetchone()
            if row is None: raise ValueError("Jogador não registrado")
            faction, level, tier = row
            if expected_tier is not None and (isinstance(expected_tier, bool) or not isinstance(expected_tier, int) or expected_tier != tier):
                raise ValueError("O cargo mudou. Confira o título antes de confirmar.")
            next_tier = tier + 1
            if next_tier > 8: raise ValueError("Patamar máximo alcançado")
            if next_tier >= 6: raise ValueError(LOCKED_MESSAGE)
            if level < LEVELS[next_tier-1]: raise ValueError(f"Nível {LEVELS[next_tier-1]} necessário")
            db.execute('UPDATE hierarchy_players SET tier=?,rank_title=?,updated_at=CURRENT_TIMESTAMP WHERE player_id=?',
                       (next_tier,TITLES[faction][next_tier-1],player_id))
        return self.state(player_id)

    def ranking(self, faction=None):
        if faction is not None and faction not in TITLES:
            raise ValueError("Facção inválida")
        with self._db() as db:
            db.row_factory = sqlite3.Row
            rows = db.execute("""SELECT player_id,name,faction,level,power,tier,rank_title,class_id,portrait
                FROM hierarchy_players """ + ("WHERE faction=? " if faction else "") +
                "ORDER BY tier DESC,level DESC,power DESC,player_id ASC LIMIT 10",
                (faction,) if faction else ()).fetchall()
        return {'faction': faction, 'leaderboard': [dict(row) for row in rows]}

    def state(self, player_id):
        player_id = self._id(player_id)
        with self._db() as db:
            db.row_factory = sqlite3.Row
            row = db.execute('SELECT player_id,name,faction,level,power,tier,rank_title,class_id,portrait FROM hierarchy_players WHERE player_id=?',(player_id,)).fetchone()
            if row is None: raise ValueError("Jogador não registrado")
            board = db.execute('''SELECT player_id,name,faction,level,power,tier,rank_title,class_id,portrait FROM hierarchy_players
                ORDER BY tier DESC,level DESC,power DESC,player_id ASC LIMIT 10''').fetchall()
        return {'player':dict(row),'leaderboard':[dict(item) for item in board]}
