"""Publish only item-owned, phase-registered plates from the signed editable archives."""
from collections import Counter
import gzip
import hashlib
import io
import json
from pathlib import Path
import struct
import tarfile

from export_north_firearm_wardrobe import materialize as rifle_wardrobe

from export_firearm_wardrobe import materialize as other_firearm_wardrobe
from export_male_dagger_coats import materialize as male_dagger_coats
from export_male_sword_coats import materialize as male_sword_coats
from export_articulated_boots import materialize as articulated_boots
from export_staff_coats import materialize as staff_coats
from register_staff_gloves import materialize as staff_gloves
from register_south_punch_coats import materialize as south_punch_coats
from export_male_sword_coats import receptors as sword_receivers
from export_north_focus_coats import materialize as north_focus_coats
from register_north_weapon_coats import materialize as north_weapon_coats
from register_north_focus_gloves import materialize as north_focus_gloves
from register_north_focus_sleeves import materialize as north_focus_sleeves
from register_north_articulated_boots import materialize as north_articulated_boots
from export_north_pistol_coats import materialize as north_pistol_coats

ARCHIVES = {
    'soco': 'e3c4d0cad2a2727a74aef567468eb3e337391e25f7e3eab363dc49d16fc69c91',
    'focus': '958a96547f8943671ee64f9419e2f26f00f93b770a8f883e39908917ecba1e91',
}
DIRECTIONS = ('north', 'south', 'east', 'west')


def sha(data):
    return hashlib.sha256(data).hexdigest()


def read_archive(folder, name):
    manifest = json.loads((folder / 'manifest.json').read_text(encoding='utf-8'))
    spec = next(r for r in manifest['archives'] if r['file'] == name + '-editable-sources.tgz')
    parts = []
    for p in spec['parts']:
        filename = p['file']
        if Path(filename).name != filename:
            raise ValueError('Invalid archive member')
        raw = (folder / filename).read_bytes()
        if len(raw) != p['bytes'] or sha(raw) != p['sha256']:
            raise ValueError('Invalid archive part ' + filename)
        parts.append(raw)
    data = b''.join(parts)
    if len(data) != spec['bytes'] or sha(data) != ARCHIVES[name] or spec['sha256'] != ARCHIVES[name]:
        raise ValueError('Invalid editable archive ' + name)
    prefix = name + '-editable-sources/checkpoint/'
    with tarfile.open(fileobj=io.BytesIO(data), mode='r:gz') as archive:
        return {m.name[len(prefix):]: archive.extractfile(m).read() for m in archive
                if m.isfile() and m.name.startswith(prefix) and m.name.endswith(('.json', '.png'))}


def materialize(folder, out):
    bank = out / 'assets'
    bank.mkdir(parents=True, exist_ok=True)
    records, rigs, assets = [], {}, set()
    base_file = Path(__file__).resolve().parents[1] / 'tools/rework-base-hd/index.json'
    fit = json.loads((base_file.parents[1] / 'rework-combat-wardrobe/focus-hand-registration.json').read_bytes())
    native = json.loads(base_file.read_bytes() if base_file.exists() else
                        gzip.decompress(Path(str(base_file) + '.gz').read_bytes()))['records']
    for family in ARCHIVES:
        source = read_archive(folder, family)
        meta = lambda name: json.loads(source[name])
        rasters = {sha(data): data for name, data in source.items() if name.endswith('.png')}
        action = 'attack-unarmed' if family == 'soco' else 'attack-focus'

        def add(slot, row, layers):
            if not layers or any(l['binding'] != {'kind': 'fixed'} or len(l['frames']) != 8 or
                                 l['source'] != l['frames'][0] for l in layers):
                raise ValueError(f'Invalid {family} {slot} phase registration')
            for layer in layers:
                for h in set(layer['frames']):
                    data = rasters.get(h)
                    if data is None or data[:16] != b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR' or struct.unpack('>II', data[16:24]) != (640, 640):
                        raise ValueError(f'Invalid {slot} raster {h}')
                    if h not in assets:
                        (bank / (h + '.png')).write_bytes(data)
                        assets.add(h)
            records.append(dict(action=action, direction=row['direction'], slot=slot, item=row['item'], layers=layers))

        for direction in DIRECTIONS:
            base = next(r for r in native if r['id'] == 'v7-female-' + ('punch' if family == 'soco' else 'focus') +
                        '-' + direction + '-ownership-candidate-' + direction)
            ref = meta('soco-pants-overlap-four/base/' + direction + '.json') if family == 'soco' else meta(
                'orbe-cajado-canonical-reviewed/records/17-' + direction + '.json')
            p, q = base['pack'], (ref.get('pack') or ref['baseRecord']['pack'])
            b, d = p['directions'][direction], q['directions'][direction]
            if any(p[k] != q[k] for k in ('frame', 'density', 'pivot')) or any(b[k] != d[k] for k in ('poses', 'rest', 'clip')):
                raise ValueError('Pose mismatch ' + family + direction)
            compare = b['layers'] if family == 'soco' else [l for l in b['layers'] if l['id'] in {
                'legs-base', 'left-leg', 'right-leg', 'pelvis', 'torso'}]
            if any(l not in d['layers'] for l in compare):
                raise ValueError('Underbody mismatch ' + family + direction)
            if family == 'focus':
                for side in ('left', 'right'):
                    tracks = [next(l['frames'] for l in group['layers'] if l['id'] == side + '-' + part)
                              for group in (d, b) for part in ('hand', 'forearm')]
                    registration = fit[direction + '/' + side]
                    if len(registration) != 8 or any(r['hashes'] != [t[i] for t in tracks]
                                                    for i, r in enumerate(registration)):
                        raise ValueError('Focus hand calibration belongs to another pose')
            rigs[action + '/' + direction] = dict(id=base['id'], digest=base['sourcePackSHA256'])

        if family == 'soco':
            for row in meta('soco-pants-overlap-four/fit-proof.json')['entries']:
                if not row['noBodyEdit'] or [x['phase'] for x in row['checks']] != list(range(8)):
                    raise ValueError('Unverified trousers')
                d = meta('soco-pants-overlap-four/base/' + row['direction'] + '.json')['baseRecord']['pack']['directions'][row['direction']]
                shorts = next(l for l in d['layers'] if l['id'] == 'shorts')
                add('pants', row, [dict(shorts, id='pants' + str(row['item']) + '-soco-local',
                                        source=row['frames'][0], frames=row['frames'])])
            overrides = {(r['direction'], r['item']): r['layers']
                         for r in meta('soco-three-slots-integration/verified-boot-overrides.json')}
            for row in meta('soco-boots40-native/proof.json')['rows']:
                di, item = row['direction'], row['item']
                layers = overrides.get((di, item))
                if not layers:
                    if not (row['closedCoveragePassed'] or row['openDesign']):
                        raise ValueError('Unverified boot registration')
                    d = meta(f'soco-boots40-native/{di}/{item}/source.json')['pack']['directions'][di]
                    layers = [l for l in d['layers'] if l['id'].startswith('boot' + str(item) + '-')]
                add('boots', row, layers)
            for row in meta('soco-technology-gloves/patches.json'):
                add('gloves', row, row['gloveLayers'])
        else:
            for row in meta('orbe-cajado-reviewed-lower-family/map.json')['rows']:
                add(row['slot'], row, row['layers'])
            for row in meta('orbe-cajado-reviewed-gloves/map.json')['rows']:
                if row['holds'] or len(row['layers']) != 2:
                    raise ValueError('Incomplete focus hand layers')
                for layer in row['layers']:
                    side = layer['id'].split(':')[-1]
                    if side not in ('left', 'right'):
                        raise ValueError('Unowned focus glove')
                    layer['receivingHand'] = side
                add('gloves', row, row['layers'])
    expected = {('attack-unarmed', k): 40 for k in ('boots', 'pants', 'gloves')}
    expected.update({('attack-focus', k): 40 for k in ('boots', 'pants', 'gloves')})
    if Counter((r['action'], r['slot']) for r in records) != expected or len({
        (r['action'], r['slot'], r['item'], r['direction']) for r in records}) != 240:
        raise ValueError('Incomplete combat wardrobe')
    rifle_rows, rifle_rig, rifle_assets = rifle_wardrobe(folder, bank, native)
    records.extend(rifle_rows)
    rigs['attack-firearm/north'] = rifle_rig
    assets.update(rifle_assets)
    other_rows, other_rigs, other_assets = other_firearm_wardrobe(folder, bank, native)
    records.extend(other_rows)
    rigs.update(other_rigs)
    assets.update(other_assets)
    (out / 'index.json').write_text(json.dumps(dict(schema='editable-combat-wardrobe-v1', rigs=rigs,
        records=records, maleDaggerCoats=male_dagger_coats(bank), maleSwordCoats=male_sword_coats(bank), articulatedBoots=articulated_boots(bank), daggerBoots=articulated_boots(bank,daggers=True), maleStaffCoats=staff_coats(bank), staffGloves=staff_gloves(bank),
        southPunchCoats=south_punch_coats(bank),
        southPunchGloves=staff_gloves(bank,Path(__file__).resolve().parent / 'rework-combat-wardrobe/south-punch-gloves.zip',phases=12),
        daggerGloves=staff_gloves(bank,Path(__file__).resolve().parent / 'rework-combat-wardrobe/dagger-gloves.zip'),
        orbGloves=staff_gloves(bank,Path(__file__).resolve().parent / 'rework-combat-wardrobe/orb-gloves.zip'),
        swordGloves=dict(staff_gloves(bank,Path(__file__).resolve().parent / 'rework-combat-wardrobe/sword-gloves.zip'),receivers=sword_receivers()),
        maleNorthPistolCoats=north_pistol_coats(bank), northFocusCoats=north_focus_coats(bank), northWeaponCoats=north_weapon_coats(bank), northBoots=north_articulated_boots(bank), northFocusGloves=north_focus_gloves(bank),
        northFocusSleeves=north_focus_sleeves(bank),
        southFocusBoots=json.loads((Path(__file__).resolve().parent / 'rework-combat-wardrobe/south-focus-boots.json').read_bytes()),
        southPunchWaist=json.loads((Path(__file__).resolve().parent / 'rework-combat-wardrobe/south-punch-waist.json').read_bytes()),
        northFocusTrousers=json.loads((Path(__file__).resolve().parent / 'rework-combat-wardrobe/north-focus-trousers.json').read_bytes()),
        southFocusPants=json.loads((Path(__file__).resolve().parent / 'rework-combat-wardrobe/south-focus-trousers.json').read_bytes()),
        northRiflePants=json.loads((Path(__file__).resolve().parent / 'rework-combat-wardrobe/north-rifle-trousers.json').read_bytes()),
        handFits={k: [r['matrix'] for r in phases] for k, phases in fit.items()}), separators=(',', ':')) + '\n', encoding='utf-8')
    return len(records), len(assets)
