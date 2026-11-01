import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'server'))
from hierarchy import HierarchyStore, LOCKED_MESSAGE, TITLES


class HierarchyTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.store = HierarchyStore(Path(self.tmp.name) / 'rank.db')

    def tearDown(self):
        self.tmp.cleanup()

    def test_sequential_promotion_and_lock(self):
        self.store.sync('p', 'Pirata', 'pirate', 200, 100)
        for tier in range(2, 6):
            state = self.store.promote('p')
            self.assertEqual(state['player']['tier'], tier)
            self.assertEqual(state['player']['rank_title'], TITLES['pirate'][tier - 1])
        with self.assertRaisesRegex(ValueError, LOCKED_MESSAGE):
            self.store.promote('p')

    def test_level_requirement_and_faction_reset(self):
        self.store.sync('p', 'Pirata', 'pirate', 19, 10)
        with self.assertRaisesRegex(ValueError, 'Nível 20'):
            self.store.promote('p')
        self.store.sync('p', 'Pirata', 'pirate', 20, 10)
        self.store.promote('p')
        state = self.store.sync('p', 'Marinheiro', 'marine', 20, 10)
        self.assertEqual((state['player']['tier'], state['player']['rank_title']), (1, 'Recruta'))

    def test_top_ten_global_order(self):
        for index in range(12):
            self.store.sync(f'p{index}', f'P{index}', 'pirate', 20, index)
        self.store.sync('marine', 'Marine', 'marine', 200, 999)
        board = self.store.state('p0')['leaderboard']
        self.assertEqual(len(board), 10)
        self.assertEqual(board[0]['player_id'], 'marine')
        self.assertEqual(board[1]['player_id'], 'p11')
        self.assertEqual({entry['faction'] for entry in board}, {'pirate', 'marine'})
        self.store.promote('p0')
        self.assertEqual(self.store.state('p0')['leaderboard'][0]['player_id'], 'p0')

    def test_class_and_portrait_persist(self):
        import base64
        raw = b'\x89PNG\r\n\x1a\n' + b'\x00\x00\x00\x0dIHDR' + (72).to_bytes(4, 'big') * 2
        portrait = 'data:image/png;base64,' + base64.b64encode(raw).decode()
        row = self.store.sync('p', 'Pirata', 'pirate', 1, 50, 'sword', portrait)['player']
        self.assertEqual((row['class_id'], row['portrait']), ('sword', portrait))
        with self.assertRaisesRegex(ValueError, 'Retrato inválido'):
            self.store.sync('q', 'Marine', 'marine', 1, 50, 'sword', 'javascript:alert(1)')


    def test_faction_filter_precedes_limit_and_keeps_stable_order(self):
        for i in range(15):
            self.store.sync(f'pirate{i:02}', f'Pirata {i}', 'pirate', 200, 999)
        for faction in ('marine', 'revolutionary', 'government'):
            for i in range(12):
                self.store.sync(f'{faction}{i:02}', f'Teste {i}', faction, 20, i)
            board = self.store.ranking(faction)['leaderboard']
            self.assertEqual(len(board), 10)
            self.assertEqual({p['faction'] for p in board}, {faction})
            self.assertEqual(board[0]['power'], 11)
        self.assertEqual([p['player_id'] for p in self.store.ranking('pirate')['leaderboard']],
                         [f'pirate{i:02}' for i in range(10)])
        self.assertEqual(self.store.state('marine00')['player']['faction'], 'marine')
        with self.assertRaisesRegex(ValueError, 'Facção inválida'):
            self.store.ranking('unknown')

    def test_duplicate_confirmation_cannot_promote_twice(self):
        self.store.sync('p', 'Teste', 'pirate', 200, 200)
        self.assertEqual(self.store.promote('p', 1)['player']['tier'], 2)
        with self.assertRaisesRegex(ValueError, 'cargo mudou'):
            self.store.promote('p', 1)
        self.assertEqual(self.store.state('p')['player']['tier'], 2)
        self.assertEqual(self.store.ranking('marine')['leaderboard'], [])

if __name__ == '__main__':
    unittest.main()
