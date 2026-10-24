"""Verify every supplied PNG/JSON byte and every frame boundary without rewriting art."""
import hashlib,json
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]
folder=root/'assets/akuma/doru'
manifest=json.loads((folder/'manifest.json').read_text())
for asset in manifest['assets']:
    assert hashlib.sha256((folder/asset['asset']).read_bytes()).hexdigest()==asset['sha256'],asset
for name,count in [('effect-take-1',9),('firelight-take-1',13)]:
    data=json.loads((folder/(name+'.json')).read_text())
    im=Image.open(folder/(name+'.png'))
    assert len(data['frames'])==count
    for entry in data['frames']:
        f=entry['frame']
        assert f['x']>=0 and f['y']>=0 and f['x']+f['w']<=im.width and f['y']+f['h']<=im.height
        assert entry['duration']>0
print('Doru art: seven supplied file hashes, nine explosion frames and thirteen root frames passed')
