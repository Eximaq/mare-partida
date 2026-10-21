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

    def test_top_ten_order_and_faction_filter(self):
        for index in range(12):
            self.store.sync(f'p{index}', f'P{index}', 'pirate', 20, index)
        self.store.sync('marine', 'Marine', 'marine', 200, 999)
        board = self.store.state('p0')['leaderboard']
        self.assertEqual(len(board), 10)
        self.assertEqual(board[0]['player_id'], 'p11')
        self.assertTrue(all(entry['faction'] == 'pirate' for entry in board))
        self.store.promote('p0')
        self.assertEqual(self.store.state('p0')['leaderboard'][0]['player_id'], 'p0')


if __name__ == '__main__':
    unittest.main()
