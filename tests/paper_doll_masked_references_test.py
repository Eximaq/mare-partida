"""Real masked pilot assets must preserve native pixels and remain review-only."""
import json
import unittest
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
RUN = ROOT/'pixellab-pip-generations/paper-doll-wardrobe-masked-20261028'
GALLERY = ROOT/'pixellab-pip-generations/paper-doll-wardrobe-auto-20261028'


class MaskedReferences(unittest.TestCase):
    def test_native_layers_and_protected_pixels(self):
        for direction, count in [('west', 91), ('east', 104)]:
            with self.subTest(direction=direction):
                source = RUN/'inputs'/f'body-{direction}.png'
                self.assertEqual(source.read_bytes(), (GALLERY/'source'/f'body-{direction}.png').read_bytes())
                body = Image.open(source).convert('RGBA')
                mask = Image.open(RUN/'inputs'/f'mask-{direction}.png').convert('RGB')
                original = RUN/'originals'/f'{direction}-layer.png'
                layer = Image.open(original).convert('RGBA')
                self.assertEqual(body.size, (64, 64))
                self.assertEqual(layer.size, body.size)
                self.assertEqual(mask.size, body.size)
                self.assertEqual(sum(mask.getpixel((x, y)) == (255, 255, 255) for y in range(64) for x in range(64)), count)
                composite = Image.alpha_composite(body, layer)
                self.assertEqual(composite.tobytes(), Image.open(RUN/f'{direction}-composite.png').convert('RGBA').tobytes())
                for y in range(64):
                    for x in range(64):
                        allowed = mask.getpixel((x, y)) == (255, 255, 255)
                        pixel = layer.getpixel((x, y))
                        self.assertIn(pixel[3], (0, 255), 'No interpolated alpha')
                        if not allowed:
                            self.assertEqual(pixel[3], 0)
                            self.assertEqual(composite.getpixel((x, y)), body.getpixel((x, y)))
                self.assertEqual(original.read_bytes(), (GALLERY/'candidates'/f'pants-{direction}-masked-layer.png').read_bytes())
                padded = Image.open(GALLERY/'candidates'/f'pants-{direction}-masked-layer-84.png').convert('RGBA')
                self.assertEqual(padded.size, (84, 84))
                self.assertEqual(padded.crop((10, 13, 74, 77)).tobytes(), layer.tobytes())
                for x, y in [(0, 0), (83, 83), (10, 0), (0, 13)]:
                    self.assertEqual(padded.getpixel((x, y))[3], 0)

    def test_scope_and_receipts_are_not_production_approval(self):
        summary = json.loads((RUN/'result-summary.json').read_text(encoding='utf-8'))
        self.assertEqual(summary['chargedGenerations'], 10)
        self.assertEqual(summary['overallConfirmedGenerations'], 46)
        self.assertEqual(summary['overallCommittedGenerations'], 47)
        self.assertFalse(summary['approved'])
        self.assertFalse(summary['productionEnabled'])
        self.assertFalse(summary['complete'])
        recipe = json.loads((RUN/'masked-trousers.blueprint.json').read_text(encoding='utf-8-sig'))
        calls = [step['MCP inpaint_image_pro_flash'] for step in recipe if 'MCP inpaint_image_pro_flash' in step]
        self.assertEqual(len(calls), 2)
        for call in calls:
            self.assertEqual(call['output_method'], 'New layer with changes')
            self.assertTrue(call['crop_to_mask'])
            self.assertTrue(call['no_background'])
            self.assertEqual(call['seed'], 1350402902)
            self.assertTrue((RUN/call['image_base64']).is_file())
            self.assertTrue((RUN/call['mask_image_base64']).is_file())


if __name__ == '__main__':
    unittest.main()
