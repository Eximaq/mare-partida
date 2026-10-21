"""Progressão e ranking local da Hierarquia dos Mares."""
from __future__ import annotations
import math
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

    def sync(self, player_id, name, faction, level, power):
        player_id = self._id(player_id)
        if faction not in TITLES: raise ValueError("Facção inválida")
        if not isinstance(name, str) or not 1 <= len(name.strip()) <= 40: raise ValueError("Nome inválido")
        if isinstance(level, bool) or not isinstance(level, int) or not 1 <= level <= 999: raise ValueError("Nível inválido")
        if isinstance(power, bool) or not isinstance(power, (int, float)) or not math.isfinite(power) or not 0 <= power <= 1_000_000_000: raise ValueError("Poder inválido")
        with self._db() as db:
            db.execute("""INSERT INTO hierarchy_players(player_id,name,faction,level,power,tier,rank_title)
                VALUES(?,?,?,?,?,1,?) ON CONFLICT(player_id) DO UPDATE SET
                name=excluded.name, faction=excluded.faction, level=excluded.level, power=excluded.power,
                rank_title=CASE WHEN faction != excluded.faction THEN
                    CASE excluded.faction WHEN 'pirate' THEN ? WHEN 'marine' THEN ?
                    WHEN 'revolutionary' THEN ? ELSE ? END ELSE rank_title END,
                tier=CASE WHEN faction != excluded.faction THEN 1 ELSE tier END,
                updated_at=CURRENT_TIMESTAMP""",
                (player_id,name.strip(),faction,level,int(power),TITLES[faction][0],
                 *(TITLES[key][0] for key in ('pirate','marine','revolutionary','government'))))
        return self.state(player_id)

    def promote(self, player_id):
        player_id = self._id(player_id)
        with self._db() as db:
            db.execute('BEGIN IMMEDIATE')
            row = db.execute('SELECT faction,level,tier FROM hierarchy_players WHERE player_id=?',(player_id,)).fetchone()
            if row is None: raise ValueError("Jogador não registrado")
            faction, level, tier = row
            next_tier = tier + 1
            if next_tier > 8: raise ValueError("Patamar máximo alcançado")
            if next_tier >= 6: raise ValueError(LOCKED_MESSAGE)
            if level < LEVELS[next_tier-1]: raise ValueError(f"Nível {LEVELS[next_tier-1]} necessário")
            db.execute('UPDATE hierarchy_players SET tier=?,rank_title=?,updated_at=CURRENT_TIMESTAMP WHERE player_id=?',
                       (next_tier,TITLES[faction][next_tier-1],player_id))
        return self.state(player_id)

    def state(self, player_id):
        player_id = self._id(player_id)
        with self._db() as db:
            db.row_factory = sqlite3.Row
            row = db.execute('SELECT player_id,name,faction,level,power,tier,rank_title FROM hierarchy_players WHERE player_id=?',(player_id,)).fetchone()
            if row is None: raise ValueError("Jogador não registrado")
            board = db.execute('''SELECT player_id,name,faction,level,power,tier,rank_title FROM hierarchy_players
                WHERE faction=? ORDER BY tier DESC,level DESC,power DESC,player_id ASC LIMIT 10''',(row['faction'],)).fetchall()
        return {'player':dict(row),'leaderboard':[dict(item) for item in board]}
