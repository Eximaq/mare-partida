"""Fit the signed side-view garment passes to the two legs of the native eight-phase rifle pose."""
import gzip
import hashlib
import io
import json
from pathlib import Path
import zipfile

import numpy as np
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[1]
STORE = ROOT / 'tools/rework-base-hd'
SOURCE = ROOT / 'docs/native-hd/editable-female-equipment/checkpoint-2026-11-18/pistolas114-laterais.zip'
OUTPUT = ROOT / 'tools/rework-combat-wardrobe/firearm-leg-fits.zip'
DIR = 'pistolas114-laterais/'
# Physical pixel landmarks on the editable EAST lower body, from waistband to sole.
# The far ankle ends higher on the standing donor. The native recoil brings the feet together
# at contact and moves them apart on discharge. Both approved WEST strips are exact mirrors.
Y = [300, 318, 350, 382, 411, 437, 462, 474, 486, 513, 530]
NEAR = [330, 324, 314, 311, 311, 297, 292, 289, 289, 289, 289]
FAR = [330, 335, 344, 347, 345, 340, 341, 341, 341, 341, 341]
NEAR_Y = [294, 306, 339, 373, 405, 435, 460, 473, 486, 511, 528]
FAR_Y = [294, 306, 339, 373, 405, 438, 471, 484, 498, 524, 541]
NEAR_X = [
 [329,327,316,317,322,317,318,318,318,318,318],
 [325,324,315,317,321,312,311,310,309,309,309],
 [321,318,309,310,317,304,300,297,296,296,296],
 [311,309,296,293,296,276,266,260,257,257,257],
 [322,320,310,309,316,295,280,271,266,266,266],
 [332,330,325,327,332,312,297,288,282,282,282],
 [323,320,312,314,321,307,302,298,295,295,295],
 [327,325,314,316,320,312,311,310,310,310,310],
]
FAR_X = [
 [329,332,339,337,326,323,322,322,322,322,322],
 [325,329,340,340,336,327,326,326,326,326,326],
 [321,326,340,345,344,336,329,328,328,328,328],
 [311,321,339,350,361,355,357,356,356,356,356],
 [322,332,354,369,380,369,365,363,363,363,363],
 [332,343,365,378,384,373,368,363,363,363,363],
 [323,330,345,355,360,353,357,356,356,356,356],
 [327,330,340,339,333,327,325,325,325,325,325],
]


def load_png(archive, member, key):
    raw = archive.read(member)
    if hashlib.sha256(raw).hexdigest() != key:
        raise ValueError('Source digest changed: ' + member)
    return Image.open(io.BytesIO(raw)).convert('RGBA')


def coordinates(phase, near):
    # Inverse sampling preserves each garment's own colors and alpha, including holes.
    y, x = np.mgrid[282:543, 196:443]
    src = np.array(NEAR if near else FAR)
    dst = np.array((NEAR_X if near else FAR_X)[phase])
    sy = np.interp(y, NEAR_Y if near else FAR_Y, Y)
    at = np.interp(sy, Y, src)
    delta = np.interp(sy, Y, dst - src)
    seam = np.interp(sy, [300, 350, 382, 410, 440, 466, 485, 513, 530],
                     [330, 330, 331, 329, 321, 317, 317, 326, 326])
    # A single continuous pelvis above the crotch. At the lower pass boundary each
    # leg follows its own track, so boots keep their original width during closure.
    start = np.interp(sy, [335, 395], [0, 1])
    center_delta = np.interp(sy, Y, (np.array(NEAR_X[phase]) + FAR_X[phase] - np.array(NEAR) - FAR) / 2)
    width = np.interp(sy, [315, 368, 395], [32, 25, 0])
    half = np.maximum(0.01, width)
    # Invert the linear transition between the hip edge and the material seam.
    mid = seam + center_delta * (1 - start) + delta * start
    edge = seam + (-half if near else half) + delta
    t = np.clip((x - mid) / np.where(np.abs(edge - mid) < .001, .001, edge - mid), 0, 1)
    sx = x - ((1 - t) * (mid - seam) + t * delta)
    dest = np.empty((*y.shape, 2), dtype=int)
    dest[:, :, 0] = np.rint(sy)
    dest[:, :, 1] = np.rint(sx)
    return dest, (sx < seam if near else sx >= seam) & (y >= 294) & (y < 541)


def make_fit(image, fields):
    data = np.asarray(image)
    panels = []
    for coords, mask in fields:
        tile = data[coords[:, :, 0], coords[:, :, 1]].copy()
        tile[~mask] = 0
        panels.append(Image.fromarray(tile))
    fitted = Image.new('RGBA', image.size)
    fitted.paste(Image.alpha_composite(*panels), (196, 282))
    return fitted


def encode(im):
    buf = io.BytesIO()
    im.save(buf, format='PNG', compress_level=9)
    data = buf.getvalue()
    return hashlib.sha256(data).hexdigest(), data


def main():
    index = STORE / 'index.json'
    records = json.loads(index.read_bytes() if index.exists() else gzip.decompress(Path(str(index)+'.gz').read_bytes()))['records']
    sources = json.loads((STORE / 'archives/archive-index.json').read_bytes())['sources']
    approved = {'east':'d00cdab7b70e17f8ef44a4979fdc8446c8c32e3a327f5e10edb1251945c6d500',
                'west':'c651cf0dc35e0e8e4561e9a54f461178a45aedb34429afef00c48b3772162aa9'}
    rigs, bodies = {}, {}
    def read_body(h):
        entry = sources[h]
        with zipfile.ZipFile(STORE / 'archives' / entry['archive']) as bank:
            return load_png(bank, entry['path'], h)

    for direction in ('east', 'west'):
        rec = next(r for r in records if r['id'] == f'v7-female-firearm-{direction}-ownership-candidate-{direction}')
        if rec['sourcePackSHA256'] != approved[direction]:
            raise ValueError('Re-register recoil landmarks for changed native body')
        rigs[direction] = next(l for l in rec['pack']['directions'][direction]['layers'] if l['id']=='body-clothed')['frames']
        bodies[direction] = [read_body(h) for h in rigs[direction]]
    for e, w in zip(bodies['east'], bodies['west'], strict=True):
        if ImageChops.difference(e.transpose(Image.Transpose.FLIP_LEFT_RIGHT), w).getbbox(alpha_only=False):
            raise ValueError('Re-register WEST: native anatomy is no longer the exact EAST mirror')
    fields = [[coordinates(i, False), coordinates(i, True)] for i in range(8)]
    fitted, tracks, indices = {}, {}, {}
    def entry(out, key, data):
        info = zipfile.ZipInfo(key)
        info.compress_type = zipfile.ZIP_DEFLATED
        out.writestr(info, data)
    with zipfile.ZipFile(SOURCE) as catalog, zipfile.ZipFile(OUTPUT, 'w') as out:
        if hashlib.sha256(SOURCE.read_bytes()).hexdigest() != 'c21e95336154c31508dffbebdff65c5703cff1b8499b9da8cfbb9310acf86fc0':
            raise ValueError('Editable wardrobe source changed')
        items = json.loads(catalog.read(DIR + 'catalog.json'))
        donor = json.loads(catalog.read(DIR + 'canonical-east.json'))['pack']['directions']['east']['layers'][3]
        checks = {}
        def sole_gap(body, alpha):
            anatomical = np.asarray(body)[488:,:,3] > 150
            missing = np.count_nonzero(anatomical & (alpha[488:,:] < 50))
            return round(missing / anatomical.sum(), 5)
        for key, parts in items.items():
            di, slot, item = key.split('/')
            if di != 'east' or slot not in ('pants', 'boots'):
                continue
            silhouettes = {}
            for part, source in parts.items():
                west = items['west/' + slot + '/' + item][part]
                for i, (eh, wh) in enumerate(zip(source, west, strict=True)):
                    cache_key = (eh, wh, i)
                    if slot == 'boots':
                        source_mask = load_png(catalog, DIR + 'assets/' + eh + '.png', eh)
                        adapted_mask = make_fit(source_mask, fields[i])
                        silhouettes.setdefault(i, []).append((np.asarray(source_mask)[:,:,3], np.asarray(adapted_mask)[:,:,3]))
                    if cache_key not in fitted:
                        a, b = [load_png(catalog, DIR + 'assets/' + h + '.png', h) for h in (eh, wh)]
                        if ImageChops.difference(a.transpose(Image.Transpose.FLIP_LEFT_RIGHT), b).getbbox(alpha_only=False):
                            raise ValueError('Source pair is not an RGBA mirror')
                        fi = make_fit(a, fields[i])
                        fitted[cache_key] = []
                        for im in (fi, fi.transpose(Image.Transpose.FLIP_LEFT_RIGHT)):
                            h, data = encode(im)
                            if h not in indices:
                                entry(out, h + '.png', data)
                                indices[h] = True
                            fitted[cache_key].append(h)
                    for j, (direction, original) in enumerate((('east', eh), ('west', wh))):
                        s = f'{direction}/{slot}/{item}/{part}'
                        tracks.setdefault(s, []).append([original, fitted[cache_key][j]])
            if slot == 'boots':
                checks[key] = []
                for i, parts in sorted(silhouettes.items()):
                    original = np.maximum.reduce([pair[0] for pair in parts])
                    adapted = np.maximum.reduce([pair[1] for pair in parts])
                    dh = donor['frames'][i]
                    base = load_png(catalog, DIR + 'assets/' + dh + '.png', dh)
                    reference = sole_gap(base, original)
                    before = sole_gap(bodies['east'][i], original)
                    after = sole_gap(bodies['east'][i], adapted)
                    if after > reference + .085 or after >= before:
                        raise ValueError(f'Foot outside registered boot in {key} phase {i}: {reference}, {before}, {after}')
                    checks[key].append(dict(reference=reference, before=before, fitted=after))
        if len(checks) != 10 or any(len(t) != 8 for t in checks.values()):
            raise ValueError('Incomplete native foot-contact regression')
        if len(tracks) != 60 or any(len(t) != 8 for t in tracks.values()):
            raise ValueError('Incomplete leg phase registration')
        entry(out, 'registration.json', json.dumps(dict(body=rigs, tracks=tracks, soleChecks=checks), separators=(',', ':')))
    print(f'{len(tracks)} garment passes, {len(indices)} unique fitted rasters')


if __name__ == '__main__':
    main()
