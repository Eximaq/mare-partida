"""Verify supplied bytes and all original PixelLab frame pixels in imported atlases."""
import hashlib,json
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]
folder=root/'assets/akuma/wolf'
manifest=json.loads((folder/'manifest.json').read_text())
for asset in manifest['assets']:
    assert hashlib.sha256((folder/asset['asset']).read_bytes()).hexdigest()==asset['sha256'],asset
count=0
for action,dirs in json.loads((folder/'clips.json').read_text()).items():
    for direction,clip in dirs.items():
        image=Image.open(root/clip['image']).convert('RGBA')
        assert image.size==(96*clip['frames'],96)
        for frame,((w,h),digest) in enumerate(zip(clip['source_sizes'],clip['rgba_sha256'])):
            x,y=(96-w)//2,(96-h)//2
            original=image.crop((frame*96+x,y,frame*96+x+w,y+h))
            assert hashlib.sha256(original.tobytes()).hexdigest()==digest,(action,direction,frame)
            count+=1
assert count==92
print('Wolf art: supplied PNG/JSON bytes and all 92 original frame pixels preserved')

for name in ['firelight-take-2','firelight-take-4']:
    data=json.loads((folder/(name+'.json')).read_text())
    im=Image.open(folder/(name+'.png'))
    assert len(data['frames'])==13
    for entry in data['frames']:
        f=entry['frame']
        assert f['x']>=0 and f['y']>=0 and f['x']+f['w']<=im.width and f['y']+f['h']<=im.height
        assert entry['duration']>0
