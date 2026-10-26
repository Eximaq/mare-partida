"""Resolve saved input paths to data URLs; never submits requests."""
import base64,json,sys
from pathlib import Path
P=Path(__file__).resolve().parent
r=json.loads((P/sys.argv[1]).read_text(encoding='utf-8'))
def url(path):
    if path.startswith(('https:','data:')):return path
    return 'data:image/png;base64,'+base64.b64encode((P/path).read_bytes()).decode()
for k in ('first_frame_url','last_frame_url','image_url','reference_image_url'):
    if k in r:r[k]=url(r[k])
if 'frame_urls' in r:r['frame_urls']=[url(v) for v in r['frame_urls']]
print(json.dumps(r))
