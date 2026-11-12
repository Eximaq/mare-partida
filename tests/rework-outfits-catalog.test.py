import json,pathlib,unittest,zipfile,hashlib
ROOT=pathlib.Path(__file__).resolve().parents[1]
class CatalogTest(unittest.TestCase):
 def test_catalog_integrity(self):
  m=json.loads((ROOT/'tools/rework-outfits/catalog.json').read_text())
  self.assertEqual(m['schema'],'approved-composite-cycles-v1')
  self.assertGreaterEqual(len(m['cycles']),70)
  self.assertEqual(len({c['id'] for c in m['cycles']}),len(m['cycles']))
  for c in m['cycles']:
   self.assertIn(c['action'],['idle','walk'])
   self.assertTrue(c['frames']);self.assertTrue(c['timeline']);self.assertGreater(c['fps'],0)
   self.assertTrue(all(0<=i<len(c['frames']) for i in c['timeline']))
   self.assertEqual(len(c['archiveSha256']),64)
   self.assertTrue(c['originalBytesPreserved'] or c.get('originalLayersPreserved'));self.assertFalse(c['interchangeableEquipment'])
   self.assertTrue(all(len(f['sha256'])==64 and f['width']>0 for f in c['frames']))
 def test_rendered_assets(self):
  m=json.loads((ROOT/'tools/rework-outfits/catalog.json').read_text())
  for c in m['cycles']:
   if not c.get('archiveLocal'):continue
   p=ROOT/c['archive'];self.assertEqual(hashlib.sha256(p.read_bytes()).hexdigest(),c['archiveSha256'])
   with zipfile.ZipFile(p) as z:
    self.assertIsNone(z.testzip())
    for f in c['frames']:self.assertEqual(hashlib.sha256(z.read(f['path'])).hexdigest(),f['sha256'])
 def test_known_scope(self):
  m=json.loads((ROOT/'tools/rework-outfits/catalog.json').read_text())
  self.assertTrue(any(c['item']==147 and c['body']=='female' and c['direction']=='north' for c in m['cycles']))
  self.assertTrue(any(c['item']==0 and c['body']=='male' and c['action']=='walk' for c in m['cycles']))
  self.assertEqual(len(m['renderedSourceArchives']),12)
  self.assertEqual(len(m['cycles']),124)
  self.assertFalse(m['pendingArchives'])
if __name__=='__main__':unittest.main()
