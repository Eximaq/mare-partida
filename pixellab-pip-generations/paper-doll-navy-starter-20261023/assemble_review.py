"""Package existing native layers; recoloring is exclusively the saved PixelLab result."""
import copy, hashlib, json, shutil
from pathlib import Path
from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
HAIR = HERE.parent/'paper-doll-hair-continuity-20261022'
WALK = HERE.parent/'paper-doll-walk-profiles-20261021'
ATTACK = HERE.parent/'paper-doll-east-fit-20261022'
def read(folder): return json.loads((folder/'review-pack.json').read_text(encoding='utf-8'))
def write(name, value): (HERE/name).write_text(json.dumps(value, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
audit = {'paid_generation_calls': 0, 'workbench_edit_id': '01c2c37e-9891-455f-94a5-7ce450f6080e', 'copied': []}
def transfer(folder, name):
    shutil.copy2(folder/name, HERE/name)
    audit['copied'].append({'source': (folder/name).relative_to(ROOT).as_posix(), 'file': name, 'sha256': hashlib.sha256((HERE/name).read_bytes()).hexdigest()})

# Validate the actual downloaded edit; never manufacture the expected output.
original = Image.open(HERE/'outfit-attack-original.png').convert('RGBA')
assert (HERE/'outfit-attack-original.png').read_bytes() == (ATTACK/'outfit-attack.png').read_bytes()
edited = Image.open(HERE/'outfit-attack-palette.png').convert('RGBA')
assert original.size == edited.size == (672, 336)
mapping = json.loads((HERE/'changes.json').read_text())[0]['colors']
decode = lambda value: tuple(bytes.fromhex(value[1:]))
colors = {decode(a): decode(b) for a,b in mapping.items()}
changed = 0
for before, after in zip(original.get_flattened_data(), edited.get_flattened_data()):
    assert after == colors.get(before, before), (before, after)
    changed += before != after
assert changed == 2745
audit['palette_edit'] = {'changed_pixels': changed, 'alpha_unchanged': True, 'shape_unchanged': True, 'source_sha256': hashlib.sha256((HERE/'outfit-attack-original.png').read_bytes()).hexdigest(), 'output_sha256': hashlib.sha256((HERE/'outfit-attack-palette.png').read_bytes()).hexdigest()}
# The east torso needs its own fitted surface, not the old incomplete garment.
# Extract cloud-edited pixels only; the base animation is never rewritten.
body = Image.open(HAIR/'body-attack.png').convert('RGBA')
fitted = Image.open(HERE/'east-clothing-workbench.png').convert('RGBA')
assert fitted.size == body.size
delta = Image.new('RGBA', body.size)
count = 0
for y in range(body.height):
    for x in range(body.width):
        before, after = body.getpixel((x,y)), fitted.getpixel((x,y))
        assert before[3] == after[3]
        if before != after:
            assert y >= 252 and 33 <= y-252 <= 46
            delta.putpixel((x,y), after); count += 1
edited.paste(delta.crop((0,252,672,336)), (0,252))
edited.save(HERE/'outfit-attack.png')
audit['east_fit'] = {'workbench_edit_id':'525c2254-997f-4e3f-9fb5-519cd453b894','extracted_changed_pixels':count,'source_body_unchanged':True,'outside_east_torso_unchanged':True,'output_sha256':hashlib.sha256((HERE/'outfit-attack.png').read_bytes()).hexdigest()}

pack = read(HAIR)
pack.pop('scope'); pack.pop('bodyCoverage', None)
pack['status'] = 'Four-layer navy starter, 80 poses; review only, visual transitions not production approved.'
pack['rig']['requiredSlots'] = ['body', 'hair', 'outfit', 'weapon']
walk, attack = read(WALK), read(ATTACK)
for piece in pack['pieces']:
    piece['id'] = 'navy-starter-'+piece['slot']
    # Preserve the original ordering of each source clip (north sword behind body).
    for action, clip in piece['animations'].items():
        origin = next(p for p in (attack if action == 'attack-sword' else walk)['pieces'] if p['slot'] == piece['slot'])
        clip['zIndex'] = origin['zIndex']
        transfer(HAIR, clip['url'])
for slot in ['outfit', 'weapon']:
    piece = copy.deepcopy(next(p for p in walk['pieces'] if p['slot'] == slot))
    piece['id'] = 'navy-starter-'+slot
    for clip in piece['animations'].values():
        for name in sorted({clip['url']} | {s['url'] for s in clip.get('sources', {}).values()}):
            transfer(WALK, name)
    donor = next(p for p in attack['pieces'] if p['slot'] == slot)
    clip = copy.deepcopy(donor['animations']['attack-sword'])
    clip['zIndex'] = donor['zIndex']
    piece['animations']['attack-sword'] = clip
    if slot == 'weapon': transfer(ATTACK, clip['url'])
    pack['pieces'].append(piece)
pack['appearance']['pieces'] = {p['slot']: p['id'] for p in pack['pieces']}
pack['coverage'] = {a: c['directions'] for a,c in pack['rig']['animations'].items()}
pack['bindings'] = {'weapon': {'slot': 'weapon', 'items': {'0': 'navy-starter-weapon'}}, 'coat': {'slot': 'outfit', 'items': {'6': 'navy-starter-outfit'}}}
write('review-pack.json', pack)
write('source-audit.json', audit)
write('navy-starter.blueprint.json', [{'_pixellab': {'paid_call_policy': 'explicit_user_run_request_required', 'output_directory': HERE.relative_to(ROOT).as_posix(), 'output_collision_policy': 'create_unique'}, 'MCP pixelart_workbench': {'argv': ['edit', '6199dd98-bc27-46de-9700-80a88d7d71ab', '--changes', json.dumps(json.loads((HERE/'changes.json').read_text()))], 'mode': 'low'}}, {'MCP pixelart_workbench': {'argv':['edit','dfe29b6e-70a0-4bef-b8b6-0ea040173263','--changes',json.dumps(json.loads((HERE/'east-clothing-changes.json').read_text()))],'mode':'low'}}, {'TASK': 'Preserve both downloaded frames.png outputs as outfit-attack-palette.png and east-clothing-workbench.png, and the original outfit. Run assemble_review.py to verify cloud edits and extract changed clothing pixels. Keep reviewOnly true and productionEnabled false.'}])
print('Navy starter: 4 native layers, 80 poses, 2745 cloud recolored pixels, no paid generation calls.')
