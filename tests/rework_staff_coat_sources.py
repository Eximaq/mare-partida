"""Verify every authorised source frame and its shared anatomical mounting."""
import io
import sys
import unittest
import zipfile
import json
from pathlib import Path
import numpy as np
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tools'))
from export_staff_coats import BANK, COATS, package, weapons


class StaffSources(unittest.TestCase):
    def test_sources_and_fitting(self):
        index = weapons()
        lookup = json.loads((BANK / 'archives/archive-index.json').read_bytes())['sources']
        def native(key):
            row = lookup[key]
            with zipfile.ZipFile(BANK / 'archives' / row['archive']) as bank:
                return Image.open(io.BytesIO(bank.read(row['path']))).convert('RGBA')
        profiles = [r for r in index['orderedAttackProfiles']
                    if r['id'] in {'authored-ordered-124-east','authored-ordered-124-west'}]
        self.assertEqual(len(profiles), 2)
        checks = 0
        for direction in ('east','west'):
            receiver = next(p for p in profiles if p['direction'] == direction)
            fused = next(r for r in index['records'] if r['id'] == 'staff128-' + direction + '-native-original-source')
            for weapon in (124,128):
                with package(weapon) as source:
                    def image(member):
                        return Image.open(io.BytesIO(source.read(member)))
                    for i,state in enumerate(receiver['states']):
                        body = Image.new('RGBA', (640,640))
                        for layer in state['layers']:
                            body.alpha_composite(native(layer['sha256']))
                        reference = image(f'source-{i}.png').convert('RGBA')
                        directed = reference if direction=='east' else ImageOps.mirror(reference)
                        if weapon == 124:
                            self.assertTrue(np.array_equal(np.asarray(body), np.asarray(directed)))
                        else:
                            approved = native(fused['states'][i]['approved']['sha256'])
                            self.assertTrue(np.array_equal(np.asarray(approved), np.asarray(directed)))
                            hair = np.asarray(native(state['layers'][-1]['sha256']))[:, :, 3] > 0
                            self.assertEqual(hair.sum(),4994)
                            stock, other = np.asarray(body), np.asarray(directed)
                            self.assertTrue(np.array_equal(stock[hair],other[hair]))
                            self.assertTrue(np.array_equal(stock[375:],other[375:]))
                        for coat in COATS:
                            cloth = image(f'M{coat}/{i}-cloth.png').convert('RGBA')
                            keep = np.asarray(image(f'M{coat}/{i}-protected.png')) > 0
                            result = np.array(Image.alpha_composite(reference, cloth))
                            original = np.asarray(reference)
                            result[keep] = original[keep]
                            result[:205] = original[:205]
                            if direction == 'west':
                                result = result[:, ::-1]
                            target = np.asarray(image(f'M{coat}/{i}-{direction}.png').convert('RGBA'))
                            self.assertTrue(np.array_equal(result, target), (weapon,direction,coat,i))
                            checks += 1
        self.assertEqual(checks,128)


if __name__ == '__main__':
    unittest.main()
