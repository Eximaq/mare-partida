"""Locate the three signed North blade arm rigs and their original pixels."""
import hashlib
import io
import json
import zipfile
from functools import lru_cache

from export_articulated_boots import BANK, ROOT, index

BASE=ROOT/'tools/rework-base-hd'
ARMS=('upper-arm-far','forearm-hand-far','upper-arm-near','forearm-hand-near')


def rigs():
    native={r['id']:r for r in index(BASE)['records']}
    # These recovered arm drawings are embedded with their exact pack in
    # the normal renderer. The 67/70 editorial poses differ from sword 1.
    runtime=(ROOT/'player-rework-weapon-native-hd.js').read_text(encoding='utf8')
    prefix='const restoredRearSwords='
    if runtime.count(prefix)!=1:raise ValueError('Missing restored North sword source')
    restored,_=json.JSONDecoder().raw_decode(runtime.split(prefix,1)[1])
    return {family:native[f'v7-{family}-north-modular8-north']['pack'] for family in ('sword','daggers')}|{'restored':restored['pack']['pack']}


@lru_cache(maxsize=1)
def archives():
    return [(bank,json.loads((bank/'archives/archive-index.json').read_bytes())['sources']) for bank in (BASE,BANK)]


@lru_cache(maxsize=128)
def original(sha):
    from PIL import Image
    bank,ref=next((b,rows[sha]) for b,rows in archives() if sha in rows)
    with zipfile.ZipFile(bank/'archives'/ref['archive']) as z:raw=z.read(ref['path'])
    if hashlib.sha256(raw).hexdigest()!=sha:raise ValueError('Changed North blade source '+sha)
    im=Image.open(io.BytesIO(raw)).convert('RGBA')
    if im.size!=(640,640):raise ValueError('Changed physical coordinates')
    return im
