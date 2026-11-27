"""Validate the current release closure separately from optional historical workbenches."""
import json, re, sys, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'dist'
class ProductionPages(unittest.TestCase):
    def test_inventory_rarity_frames_are_published_unchanged(self):
        for rarity in ['common','uncommon','rare','epic','legendary','supreme']:
            relative=Path('assets/ui/inventory-slots')/(rarity+'.png')
            self.assertEqual((ROOT/relative).read_bytes(),(OUT/relative).read_bytes())
    def test_current_html_dependencies(self):
        for name in ['index.html','ui-preview.html','bancada-hd.html']:
            text=(OUT/name).read_text(encoding='utf-8')
            for url in re.findall(r'(?:src|href)="([^"?#]+)',text):
                if url.endswith(('.js','.css','.ttf')) and not url.startswith(('http:','https:')):
                    self.assertTrue((OUT/url).is_file(),f'{name}: {url}')
    def test_workbench_loads_the_dungeon_catalog_dependencies_in_order(self):
        html = (OUT/'bancada-hd.html').read_text(encoding='utf-8')
        scripts = re.findall(r'<script defer src="([^"?]+)', html)
        dungeon = scripts.index('boss-dungeon-system.js')
        for name in ['cp9-monsters.js', 'thriller-monsters.js', 'sabaody-monsters.js', 'prepared-dungeon-bosses.js']:
            self.assertLess(scripts.index(name), dungeon, name)
        self.assertLess(dungeon, scripts.index('item-catalog.js'))

    def test_every_native96_release_resource_is_present_unchanged(self):
        base=Path('tools/paper-doll-96-v3')
        release=json.loads((ROOT/base/'player-pack.json').read_text(encoding='utf-8'))
        for name in release['resources']:
            self.assertEqual((OUT/base/name).read_bytes(),(ROOT/base/name).read_bytes(),name)
    def test_current_character_hud_and_font(self):
        for name in ['Alabasta_Pirate.ttf','hd/status.png','hd/poster.png','hd/wood.png','hd/parchment.png']:
            self.assertTrue((OUT/'assets/ui/character-hud'/name).is_file(),name)
        for name in ['status.png','poster.png','portrait.png','ribbon.png','hp.png','energy.png','bounty.png']:
            self.assertFalse((OUT/'assets/ui/character-hud'/name).exists(),name)
    def test_original_generation_sheets_stay_in_development(self):
        for name in ["contracts-hd/family-source.png","forge-hd/icons-source.png","inventory-final/icons-source.png","inventory-hd/source-kit.png"]:
            self.assertTrue((ROOT/"assets/ui"/name).is_file(),name)
            self.assertFalse((OUT/"assets/ui"/name).exists(),name)
    def test_isolated_art_reviews_stay_out_of_publication(self):
        for name in [
            'daily-sword-boss-preview.html', 'daily-sword-boss-preview.js',
            'daily-sword-boss-preview.css', 'daily-sword-boss-specials.json',
            'player-rework-test.js', 'player-rework-weapons.js',
            'tools/rework10917', 'tools/rework-donor-f6-north',
            'tools/rework-weapons/catalog.json', 'tools/rework-weapons/generated',
            'tools/rework-outfits',
        ]:
            self.assertTrue((ROOT/name).exists(), name)
            self.assertFalse((OUT/name).exists(), name)
        self.assertTrue((OUT/'bancada-hd.html').is_file())
        self.assertTrue((OUT/'daily-sword-boss-art-data.js').is_file())
        self.assertTrue((OUT/'daily-sword-boss-combat.js').is_file())

    def test_live_weapon_grip_corrections_are_published_unchanged(self):
        folder = Path('tools/rework-weapons/grip-corrections')
        corrections = sorted((ROOT/folder).glob('*.png'))
        self.assertTrue(corrections, 'No grip corrections found in the source')
        for name in corrections:
            self.assertEqual(name.read_bytes(), (OUT/folder/name.name).read_bytes(), name.name)

    def test_default_is_current_game_only(self):
        for name in ['paper-doll-review.js','paper-doll-assets.js','tools/paper-doll-inspector/index.html','pixellab-pip-generations/paper-doll-basic-sword-20261021/preview.html']:
            self.assertFalse((OUT/name).exists(),name)
        self.assertTrue((OUT/'.nojekyll').is_file())
        self.assertTrue((ROOT/'pixellab-pip-generations/paper-doll-basic-sword-20261021/preview.html').is_file())
if __name__=='__main__': unittest.main()
