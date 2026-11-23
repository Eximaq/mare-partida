"""Register the original East boot groups on the native articulated lower limbs.

Run this module to rebuild the small cropped phase atlas. Normal Pages builds
only unpack and verify its content-addressed textures with the standard library.
"""
import gzip
import hashlib
import io
import json
import struct
import zipfile
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'tools/rework-combat-wardrobe/articulated-boots.zip'
BANK = ROOT / 'tools/rework-weapon-layers-hd'
OUTFITS = ROOT / 'tools/rework-modular-outfits-hd'
DONOR = '059e39e9d0afe083e0d5e5d13bb53c4e215c4bbc1cf51c47f79483c5a16d1fbb'
DONORS = {
    "8": "frozen-v47-male-151-boot8-east-idle",
    "9": "male-coat151-pants133-gloves152-boots9-walk-east-source-v18-idle-frame0",
    "134": "male-coat151-pants133-gloves152-boots134-walk-east-source-v18-idle-frame0",
    "141": "frozen-v47-male-151-boot141-east-idle",
    "148": "frozen-v47-male-151-boot148-east-idle",
    "155": "frozen-male-pants133-east-idle-v47",
    "162": "frozen-v47-male-151-boot162-east-idle",
    "169": "frozen-v47-male-151-boot169-east-idle",
    "176": "frozen-v47-male-151-boot176-east-idle",
    "183": "frozen-v47-male-151-boot183-east-idle"
}
JOINTS = tuple(side + ' ' + part for side in ('LEFT', 'RIGHT') for part in ('KNEE', 'LEG', 'TOE'))


def index(bank):
    file = bank / 'index.json'
    return json.loads(file.read_bytes() if file.exists() else gzip.decompress(Path(str(file) + '.gz').read_bytes()))


def lower(pack, direction):
    d = pack['directions'][direction]
    anatomy = [layer for layer in d['layers'] if layer['id'] in ('underbody', 'legs')]
    if (pack['density'] != 4 or pack['frame'] != dict(width=160, height=160) or
            pack['pivot'] != dict(x=80, y=128) or len(d['poses']) != 8 or
            [l['id'] for l in anatomy] != ['underbody', 'legs'] or
            any(l['binding'] != {'kind': 'fixed'} or len(l['frames']) != 8 for l in anatomy)):
        raise ValueError('Unexpected lower body')
    return dict(anatomy=anatomy, poses=[{k: p[k] for k in JOINTS} for p in d['poses']])


def calibrate():
    import math
    import numpy as np
    from PIL import Image, ImageDraw
    banks = (OUTFITS, BANK)
    stores = [json.loads((b / 'archives/archive-index.json').read_bytes())['sources'] for b in banks]

    @lru_cache(maxsize=128)
    def original(key):
        for bank, sources in zip(banks, stores):
            if key in sources:
                row = sources[key]
                with zipfile.ZipFile(bank / 'archives' / row['archive']) as z:
                    data = z.read(row['path'])
                if hashlib.sha256(data).hexdigest() != key:
                    raise ValueError('Changed source ' + key)
                return Image.open(io.BytesIO(data)).convert('RGBA')
        raise KeyError(key)

    def shaft(alpha, ankle, knee):
        # The middle of the actual exposed tibia is measurable on two raster
        # rows. The skeleton localizes the correct limb in a two-foot image.
        samples = []
        widths = []
        for dy in (18, 34):
            y = round(ankle[1] - dy)
            guess = ankle[0] + dy * (knee[0] - ankle[0]) / (ankle[1] - knee[1])
            scan = alpha[y] > 32
            edges = np.where(np.diff(np.r_[False, scan, False]))[0].reshape(-1, 2)
            a, b = min(((a, b) for a, b in edges if b - a > 4), key=lambda ab: abs(sum(ab) / 2 - guess))
            samples.append(np.array([(a + b) / 2, y + .5]))
            widths.append(b-a)
        return samples[0], samples[1], sum(widths)/len(widths)

    def theta(vector):
        return math.atan2(vector[1], vector[0])

    # Physical coordinates in the 512px approved donor. Near = anatomical right.
    anchors = {'near': ([183.5, 416.5], [203, 440], [32, -58]),
               'far': ([311.5, 426.5], [340, 421], [-32, -58])}
    donor_alpha = np.asarray(original(DONOR))[:, :, 3]
    source = {}
    manifest = {'sources': {}, 'rigs': {}, 'tracks': {}}
    registered = {r['id']: r for r in index(OUTFITS)['records'] if r['id'] in DONORS.values()}
    for item, name in DONORS.items():
        r = registered[name]
        d = r['pack']['directions']['east']
        if (r['body'] != 'male' or r['action'] != 'idle' or r['equipment']['boots'] != int(item) or
                not any(DONOR in l.get('frames', [l.get('source')]) for l in d['layers'])):
            raise ValueError('Changed donor ' + name)
        group = [l for l in d['layers'] if l['id'].startswith(('boot' + item + '-', 'equip-boot' + item + '-'))]
        if not group or any(l['binding'] != {'kind': 'fixed'} for l in group):
            raise ValueError('Invalid boot ownership ' + name)
        manifest['sources'][item] = {'record': name, 'layers': [[l['id'], l.get('frames', [l.get('source')])[0]] for l in group]}
        source[item] = {}
        for side in anchors:
            parts = [l for l in group if '-' + side in l['id']]
            side_img = Image.new('RGBA', (512, 512))
            for l in sorted(parts, key=lambda a: a['depth']):
                side_img.alpha_composite(original(l.get('frames', [l.get('source')])[0]))
            bounds = side_img.getbbox()
            if not bounds or bounds[1] < 350 or (side == 'near' and bounds[2] > 260) or (side == 'far' and bounds[0] < 260):
                raise ValueError('Boot includes a different limb ' + name)
            source[item][side] = np.asarray(side_img)
    assets = {}
    def png(im):
        buf = io.BytesIO()
        im.save(buf, format='PNG', compress_level=9, **({'transparency':0} if im.mode=='1' else {}))
        data = buf.getvalue()
        key = hashlib.sha256(data).hexdigest()
        assets[key + '.png'] = data
        return key

    weapon_index = index(BANK)
    records = weapon_index['records']
    for family, exemplar in [('sword', 1), ('firearm', 4), ('orb', 17)]:
        rigs = {}
        for direction in ('east', 'west'):
            r = next(r for r in records if r['body'] == 'male' and r['direction'] == direction and r['item'] == exemplar)
            rigs[direction] = lower(r['basePack']['pack'], direction)
            manifest['rigs'][rigs[direction]['anatomy'][1]['frames'][0]] = {**rigs[direction], 'family': family, 'direction': direction}
        east, west = rigs['east'], rigs['west']
        tracks = manifest['tracks'][family] = {item: [] for item in source}
        for i, pose in enumerate(east['poses']):
            for k, j in pose.items():
                opposite = west['poses'][i][k]
                if abs(j['x'] + opposite['x'] - 160) > 1e-7 or abs(j['y'] - opposite['y']) > 1e-7:
                    raise ValueError('West is not the registered reflected limb')
            legs = Image.new('RGBA', (640, 640))
            for l, w in zip(east['anatomy'], west['anatomy'], strict=True):
                im = original(l['frames'][i])
                if not np.array_equal(np.asarray(im)[:, ::-1], np.asarray(original(w['frames'][i]))):
                    raise ValueError('Lower-limb mirror differs from source')
                legs.alpha_composite(im)
            alpha = np.asarray(legs)[:, :, 3]
            y, x = np.indices(alpha.shape)
            cut_line = (pose['RIGHT LEG']['x'] + pose['LEFT LEG']['x']) * 2
            packed = abs(pose['RIGHT LEG']['x']-pose['LEFT LEG']['x'])*4 < 45
            maps = {}
            for side, joint in [('far', 'LEFT'), ('near', 'RIGHT')]:
                a, b, delta = map(np.array, anchors[side])
                u, v, knee = (np.array([pose[joint + ' ' + k][coord] for coord in ('x','y')]) * 4 for k in ('LEG', 'TOE', 'KNEE'))
                src_lo, src_hi, src_width = shaft(donor_alpha, a, a + delta)
                dst_lo, dst_hi, dst_width = shaft(alpha, u, knee)
                if packed:
                    # The rear calf is partly behind the front calf. The outline
                    # on each outer side is visible; the shared silhouette's
                    # centre and total width do not describe either single leg.
                    sign = -1 if u[0] < cut_line else 1
                    for sample in (dst_lo, dst_hi):
                        sample[0] += sign * max(0, dst_width-src_width)/2
                    dst_width = src_width
                axis = dst_hi - dst_lo
                axis /= np.linalg.norm(axis)
                weight = np.clip(((x+.5-dst_lo[0])*axis[0] + (y+.5-dst_lo[1])*axis[1] + 17)/17, 0, 1)
                weight = weight * weight * (3 - 2 * weight)
                def inverse(start, target, angle):
                    c, s = math.cos(angle), math.sin(angle)
                    dx, dy = x + .5 - target[0], y + .5 - target[1]
                    return start[0] + c*dx + s*dy, start[1] - s*dx + c*dy
                sole = inverse(a, u, theta(v-u) - theta(b-a))
                cuff = inverse(src_lo, dst_lo, theta(axis) - theta(src_hi-src_lo))
                src_axis = (src_hi-src_lo) / np.linalg.norm(src_hi-src_lo)
                src_normal = np.array([-src_axis[1],src_axis[0]])
                width_ratio = dst_width*abs(axis[1]) / (src_width*abs(src_axis[1]))
                if not .65 < width_ratio < 1.55:
                    raise ValueError('Incompatible calf width ' + str(width_ratio))
                normal_distance = ((cuff[0]-src_lo[0])*src_normal[0] + (cuff[1]-src_lo[1])*src_normal[1])
                correction = normal_distance * (1/width_ratio-1)
                cuff = (cuff[0]+correction*src_normal[0], cuff[1]+correction*src_normal[1])
                ox, oy = (np.floor(f + weight*(t-f)).astype(int) for f,t in zip(sole,cuff))
                valid = (ox>=0) & (oy>=0) & (ox<512) & (oy<512)
                lateral = x < cut_line if u[0] < cut_line else x >= cut_line
                maps[side] = (ox, oy, valid, lateral, u, weight, dst_lo, axis)
            for item, pair in source.items():
                color = Image.new('RGBA', legs.size)
                cut = np.zeros(alpha.shape, dtype=bool)
                for side in ('far', 'near'):
                    ox, oy, valid, lateral, u, weight, center, axis = maps[side]
                    pixels = np.zeros((640, 640, 4), np.uint8)
                    pixels[valid] = pair[side][oy[valid], ox[valid]]
                    # Follow the measured shaft at the cuff, leaving the authored
                    # toe fixed. Some narrow cuffs need a few physical pixels of
                    # local width or registration on a broader receiving calf.
                    scan_x = np.arange(640)
                    mid = center[0] + (y+.5-center[1])*axis[0]/axis[1]
                    seal = None
                    for width in (() if packed else (1, 1.04, 1.08, 1.12, 1.16, 1.20, 1.24)):
                        for offset in (0,-1,1,-2,2,-3,3,-4,4,-5,5):
                            def remap(xx, yy):
                                sample = xx+.5 + weight[yy]*( (xx+.5-mid[yy])*(1/width-1) - offset/width )
                                return np.clip(np.floor(sample).astype(int),0,639)
                            for cy in range(int(u[1]-42), int(u[1]-10)):
                                calf = lateral[cy] & (alpha[cy]>12)
                                if calf.sum() >= 6 and np.all(pixels[cy,remap(scan_x,cy)[calf],3]>=160):
                                    seal = cy
                                    break
                            if seal is not None:
                                if width != 1 or offset:
                                    coords = x+.5 + weight*((x+.5-mid)*(1/width-1)-offset/width)
                                    pixels = pixels[y,np.clip(np.floor(coords).astype(int),0,639)]
                                break
                        if seal is not None:
                            break
                    if not packed and seal is None:
                        raise ValueError(f'No closed calf contact: {family}/{item}/{i}/{side}')
                    shoe = Image.fromarray(pixels)
                    color.alpha_composite(shoe)
                    # Retain recipient skin in enclosed openings. Outside or
                    # under the sole only the two original anatomy layers are cut.
                    if packed:
                        continue
                    bx, by, ex, ey = shoe.getbbox()
                    outside = Image.fromarray((pixels[by-1:ey+1,bx-1:ex+1,3] != 0).astype(np.uint8))
                    ImageDraw.floodfill(outside, (0, 0), 2)
                    limb = lateral & (y>=seal) & (alpha>0)
                    limb[by-1:ey+1,bx-1:ex+1] &= np.asarray(outside)!=0
                    cut |= limb
                if packed:
                    # Both soles are a single item. Check contact across the
                    # entire visible pair after the near boot occludes the far.
                    pixels = np.asarray(color)
                    ankle_y = min(pose[k+' LEG']['y'] for k in ('LEFT','RIGHT'))*4
                    seal = next((cy for cy in range(int(ankle_y-38), int(ankle_y)+4)
                                 if (alpha[cy]>12).any() and np.all(pixels[cy,alpha[cy]>12,3]>=160)), None)
                    if seal is None:
                        raise ValueError(f'No closed overlapping cuff: {family}/{item}/{i}')
                    bx,by,ex,ey = color.getbbox()
                    outside = Image.fromarray((pixels[by-1:ey+1,bx-1:ex+1,3] != 0).astype(np.uint8))
                    ImageDraw.floodfill(outside,(0,0),2)
                    cut = (y>=seal) & (alpha>0)
                    cut[by-1:ey+1,bx-1:ex+1] &= np.asarray(outside)!=0
                if family == 'orb':
                    # In the fifth recoil phase the opaque hem crosses the
                    # upper cuff. It is foreground on both original exports.
                    east_pack = next(r['basePack']['pack']['directions']['east'] for r in records
                                     if r['item']==exemplar and r['body']=='male' and r['direction']=='east')
                    hem = next(l for l in east_pack['layers'] if l['id']=='shorts')
                    opaque = np.asarray(original(hem['frames'][i]))[:,:,3] == 255
                    color_pixels = np.array(color)
                    color_pixels[opaque] = 0
                    color = Image.fromarray(color_pixels)
                    cut &= ~opaque
                mask = Image.fromarray((cut*255).astype(np.uint8))
                bbox = color.getbbox()
                mb = mask.getbbox()
                box = (min(bbox[0],mb[0]), min(bbox[1],mb[1]), max(bbox[2],mb[2]), max(bbox[3],mb[3]))
                if family == 'orb':
                    # The ordered weapon body is a different export. Within the
                    # sole/cuff footprint it must equal this rig pixel-for-pixel.
                    # Its weapon and hand restoration must stay outside the pass.
                    coverage = (np.asarray(color)[:,:,3]>0) | cut
                    for direction in ('east','west'):
                        domain = coverage if direction == 'east' else coverage[:,::-1]
                        expected = np.asarray(legs) if direction == 'east' else np.asarray(legs)[:,::-1]
                        for orb in (17,122):
                            o = next(r for r in weapon_index['orderedAttackProfiles'] if r['item']==orb and
                                     r['direction']==direction and r['body']=='male')
                            backing, metal, hand = o['states'][i]['layers']
                            if (not np.array_equal(np.asarray(original(backing['sha256']))[domain],expected[domain]) or
                                    np.asarray(original(metal['sha256']))[:,:,3][domain].any() or
                                    np.asarray(original(hand['mask']['sha256']))[:,:,0][domain].any()):
                                raise ValueError(f'Unowned ordered orb footprint: {orb}/{direction}/{i}/{item}')
                tracks[item].append(dict(x=box[0], y=box[1], width=box[2]-box[0], height=box[3]-box[1],
                                         art=png(color.crop(box)), mask=png(mask.crop(box).convert('1'))))
    assets['registration.json'] = json.dumps(manifest, separators=(',', ':')).encode()
    with zipfile.ZipFile(DEST, 'w') as z:
        for name, data in sorted(assets.items()):
            z.writestr(zipfile.ZipInfo(name), data, compress_type=zipfile.ZIP_DEFLATED)


def materialize(bank):
    with zipfile.ZipFile(DEST) as z:
        manifest = json.loads(z.read('registration.json'))
        if set(manifest['sources']) != set(DONORS) or len(manifest['rigs']) != 6:
            raise ValueError('Incomplete boot registration')
        for items in manifest['tracks'].values():
            if set(items) != set(DONORS) or any(len(track) != 8 for track in items.values()):
                raise ValueError('Incomplete boot cycle')
            for track in items.values():
                for row in track:
                    for role in ('mask','art'):
                        key = row[role]
                        data = z.read(key + '.png')
                        if hashlib.sha256(data).hexdigest() != key or struct.unpack('>II', data[16:24]) != (row['width'],row['height']):
                            raise ValueError('Invalid boot texture')
                        (bank / (key + '.png')).write_bytes(data)
    return manifest


if __name__ == '__main__':
    calibrate()
