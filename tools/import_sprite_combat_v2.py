"""Import existing PixelLab exports losslessly. No API generation or resampling."""
import concurrent.futures, hashlib, io, json, re, urllib.request, zipfile
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'pixellab-pip-generations/sprites-combat-v2'
OUT = ROOT / 'assets/sprites-combat-v2'

def category(key, name):
    n = name.lower()
    if any(s in n for s in ['sofrer','jerk','flinch','flash_red','tense']): return 'hurt'
    if 'special' in n or 'especial' in n:
        return 'special-2' if key == 'ryu' and '2' in n else 'special'
    if any(s in n for s in ['walk', 'caminh', 'glide', 'corrida', 'running', 'step_forward', 'heavy_step']):
        return 'run' if any(s in n for s in ['corrida', 'running']) else 'walk'
    return 'attack'

def import_one(record):
    key, cid = record['key'], record['id']
    archive = SOURCE / (key + '.zip')
    if not archive.exists():
        with urllib.request.urlopen(f'https://api.pixellab.ai/mcp/characters/{cid}/download', timeout=120) as r:
            data = r.read()
        zipfile.ZipFile(io.BytesIO(data)).testzip()
        archive.write_bytes(data)
    with zipfile.ZipFile(archive) as z:
        meta = json.loads(z.read('metadata.json'))
        state = next(s for s in meta['states'] if s['character']['id'] == cid)
        frames = state['frames']
        entry = {'id': cid, 'name': re.search(r'^name: (.+)$', record['source'], re.M)[1],
                 'source': 'Existing owner PixelLab export', 'archive_sha256': hashlib.sha256(archive.read_bytes()).hexdigest(),
                 'clips': {}, 'fps_source': 'Not provided by export; playback FPS configured locally'}
        groups = {'idle': frames['rotations']}
        groups.update(frames['animations'])
        dest = OUT / key
        dest.mkdir(parents=True, exist_ok=True)
        for original, directions in groups.items():
            action = 'idle' if original == 'idle' else category(key, original)
            if action in entry['clips']: raise ValueError((key, action, original))
            entry['clips'][action] = {}
            normalized = {}
            for original_direction, files in directions.items():
                match = re.fullmatch(r'(south|north|east|west)-([a-f0-9]{8})', original_direction) if action != 'idle' else None
                direction = match[1] if match else original_direction
                chosen = record.get('direction_selection', {}).get(action+':'+direction)
                if match and chosen and match[2] != chosen: continue
                if direction not in normalized or match: normalized[direction] = files
            for direction, files in normalized.items():
                files = [files] if isinstance(files, str) else files
                images = [Image.open(io.BytesIO(z.read(f))).convert('RGBA') for f in files]
                size = max(max(im.size) for im in images)
                sheet = Image.new('RGBA', (size * len(images), size))
                hashes, bounds = [], []
                for i, im in enumerate(images):
                    dx, dy = (size-im.width)//2, (size-im.height)//2
                    sheet.paste(im, (i*size+dx, dy))
                    assert sheet.crop((i*size+dx, dy, i*size+dx+im.width, dy+im.height)).tobytes() == im.tobytes()
                    hashes.append(hashlib.sha256(im.tobytes()).hexdigest())
                    b = im.getbbox()
                    bounds.append([b[0]+dx, b[1]+dy, b[2]+dx, b[3]+dy] if b else [0,0,0,0])
                filename = f'{action}-{direction}.png'
                sheet.save(dest / filename)
                entry['clips'][action][direction] = {
                    'image': f'assets/sprites-combat-v2/{key}/{filename}', 'size': size,
                    'frames': len(images), 'fps': 12 if len(images)<=9 else 24, 'loop': action in ['idle','walk','run'],
                    'bounds': bounds, 'source_sizes': [list(im.size) for im in images], 'rgba_sha256': hashes,
                    'source_animation': original}
        (dest/'metadata.json').write_text(json.dumps(entry, ensure_ascii=False, indent=2)+'\n', encoding='utf8')
        print(key, {a: {d:c['frames'] for d,c in ds.items()} for a,ds in entry['clips'].items()}, flush=True)
        return key, entry

def main():
    inventory = SOURCE/'source-inventory.json'
    records = json.loads(inventory.read_text(encoding='utf8')) if inventory.exists() else [
        {'key':p.parent.name,'id':d['id'],'source':'name: '+d['name']}
        for p in sorted(OUT.glob('*/metadata.json'))
        for d in [json.loads(p.read_text(encoding='utf8'))]]
    playback = json.loads((OUT/'playback.json').read_text(encoding='utf8'))
    native = playback.get('native_monsters', {})
    known = {r['key'] for r in records}
    for key, cfg in native.items():
        if key not in known: records.append({'key':key,'id':cfg['id'],'source':'name: '+cfg['name']})
    for record in records:
        if record['key'] in native: record['direction_selection'] = native[record['key']].get('direction_selection', {})
    SOURCE.mkdir(parents=True,exist_ok=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        entries = dict(pool.map(import_one, records))
    playback = json.loads((OUT/'playback.json').read_text(encoding='utf8'))
    for key, entry in entries.items():
        if key in playback.get('world_scale', {}): entry['world_scale'] = playback['world_scale'][key]
        if key in playback.get('match_profile_extent', []):
            b = entry['clips']['idle']['east']['bounds'][0]
            entry['idle_extent_ratio'] = max(b[2]-b[0],b[3]-b[1])/(b[3]-b[1])
        for action, ds in entry['clips'].items():
            for direction, clip in ds.items():
                # Retain the source canvas origin and motion, including jumps and weapon trails.
                # Compensate only the first-frame transparent margin; do not chase each bbox.
                clip['anchor'] = [clip['size']/2, clip['bounds'][0][3]]
                loop = playback.get('locomotion_loops', {}).get(key, {}).get(direction)
                if action in ['walk','run'] and loop:
                    assert 0 <= loop[0] < loop[1] < clip['frames'], (key,direction,loop)
                    clip['loop_start'],clip['loop_end'] = loop
                if key in playback.get(action, {}):
                    impact = playback[action][key]
                    clip['impact_frame'] = impact[direction] if isinstance(impact, dict) else impact
                if action == 'hurt':
                    clip['playback_start'] = playback['hurt_start'][key]
                    clip['playback_frames'] = 4
                    clip['playback_seconds'] = .18
        if key in native:
            entry.update(legacyHeight=native[key]['worldHeight'],worldHeight=native[key]['worldHeight'],world_scale=1,idle_extent_ratio=1,monster=True)
            (OUT/key/'metadata.json').write_text(json.dumps(entry,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
            continue
        if key in ['tori','uma','inu']:
            old = ROOT / f'assets/akuma/zoan/{key}-idle-south.png'; old_scale = 1
        elif key == 'cocox':
            old = ROOT / 'assets/rare-animals/cocox/idle.png'; old_scale = 2.25
        elif key in ['neko','ushi','wolf','ryu','bison','hoya']:
            old = ROOT / f'assets/akuma/{key}/idle-south.png'; old_scale = 1
        else:
            old = ROOT / f'assets/new-islands/{key}/idle.png'
            old_scale = 2.25 if key in ['sham','buchi','pearl','gin','chew','kuroobi'] else None
        im = Image.open(old).convert('RGBA')
        cell = im.height//4 if key not in ['tori','uma','inu','neko','ushi','wolf','ryu','bison','hoya'] else im.height
        b = im.crop((0,0,cell,cell)).getbbox()
        entry['legacyHeight'] = b[3]-b[1]
        if key in ['tori','uma','inu']:
            entry['logical_attack'] = {}
            for direction in ['south','north','west','east']:
                attack = Image.open(ROOT/f'assets/akuma/zoan/{key}-attack-{direction}.png')
                count = attack.width//attack.height
                entry['logical_attack'][direction] = {'frames':count,'fps':12,'impact_frame':int(count*.45),'loop':False}
        if key in ['ryu','hoya']:
            rulesfile = ROOT / f'assets/akuma/{key}/rules.json'
            rules = json.loads(rulesfile.read_text(encoding='utf8'))
            old_scale = rules['worldSize']/cell
        entry['monster'] = key not in ['tori','uma','inu','neko','ushi','wolf','ryu','bison','hoya']
        entry['worldHeight'] = entry['legacyHeight']*(old_scale if old_scale is not None else (128 if key=='helmeppo' else 168 if key=='bananawani' else 80)/cell)
        if key in ['uma','tori','inu']:
            target = entry['legacyHeight']*(104/64 if key=='tori' else 74/48)*entry.get('world_scale',1)
            heights = []
            for direction in ['south','north','west','east']:
                b = entry['clips']['idle'][direction]['bounds'][0]
                ref = max(b[2]-b[0],b[3]-b[1])/entry['idle_extent_ratio'] if 'idle_extent_ratio' in entry else b[3]-b[1]
                heights.append(target/ref*(b[3]-b[1]))
            entry['world_header_height'] = max(heights)
        (OUT/key/'metadata.json').write_text(json.dumps(entry,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    # Keep complete source metrics in per-character metadata; runtime needs only playback fields.
    runtime = json.loads(json.dumps(entries))
    for entry in runtime.values():
        for ds in entry['clips'].values():
            for clip in ds.values():
                for field in ['rgba_sha256','source_sizes']: clip.pop(field)
    (ROOT/'sprite-combat-v2-data.js').write_text("'use strict';\nglobalThis.MareSpriteCombatV2Data="+json.dumps(runtime,ensure_ascii=False,separators=(',',':'))+';\n', encoding='utf8')
    print('Imported',len(entries),'existing characters without generation or pixel changes.')

if __name__ == '__main__': main()
