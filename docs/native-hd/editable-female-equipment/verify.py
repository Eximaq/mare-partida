"""Check the source archive, without writing assets into the game."""
from pathlib import Path, PurePosixPath
from hashlib import sha256
from struct import unpack
from json import loads
from zipfile import ZipFile

path = Path(__file__).with_name('feminino-fontes-editaveis.zip')
digest = lambda content: sha256(content).hexdigest()
assert digest(path.read_bytes()) == '248e93a8db3af836da68b4502ccb17d6f69e432c3b9ccab903805006d017b176'
with ZipFile(path) as archive:
    assert archive.testzip() is None
    names = archive.namelist()
    assert len(names) == len(set(names)) == 454
    assert all(not PurePosixPath(n).is_absolute() and '..' not in PurePosixPath(n).parts for n in names)
    manifest = loads(archive.read('MANIFEST.json'))
    assert manifest['productionEnabled'] is False
    assert manifest['baseline'] == '74b107722d407992c5e280d7be4fc67686a328de'
    rows = manifest['files']
    assert len(rows) == len({r['editableName'] for r in rows}) == 928
    assert set(names) == {'MANIFEST.json', *(r['file'] for r in rows)}
    slots = ('pants', 'boots', 'gloves')
    for i, slot in enumerate(slots):
        assert len({r['item'] for r in rows if r['slot'] == slot}) == 10
        assert {r['item'] for r in rows if r['slot'] == slot} == {t[i] for t in manifest['tuples']}
    local = [r for r in rows if r['source']['kind'] == 'authorized-own-material-local-fit']
    assert {r['source']['phase'] for r in local} == set(range(8)) and len(local) == 8
    assert all((r['slot'], r['item'], r['direction']) == ('pants', 22, 'north') and not r['source']['runtimeEnabled'] for r in local)
    for r in rows:
        assert r['file'].startswith(f"{r['slot']}/{r['item']}/")
        raw = archive.read(r['file'])
        assert raw[:8] == b'\x89PNG\r\n\x1a\n' and digest(raw) == r['sha256'], r['file']
        assert list(unpack('>II', raw[16:24])) == r['canvas']
        # PNG colour types 4/6 have alpha; types 0/2/3 may carry a tRNS chunk.
        assert raw[25] in (4, 6) or b'tRNS' in raw, r['file']
    precedence = loads(path.with_name('PRECEDENCE.json').read_bytes())
    assert precedence['enabledInGame'] is False
    assert precedence['preserveAllOtherScopes'] is True
    assert precedence['baseReviewCommit'] == manifest['baseline']
    assert precedence['scopeKey'] == ['body', 'slot', 'item', 'action', 'direction', 'phase']
    assert precedence['priority'][0] == 'verified-editable-layer-for-the-exact-scope'
    overrides = precedence['exactOverridesForFutureVerifiedIntegration']
    assert len(overrides) == 1
    override = overrides[0]
    assert tuple(override[k] for k in ('body', 'slot', 'item', 'action', 'direction')) == ('female', 'pants', 22, 'attack-sword', 'north')
    assert override['requiresTargetMotionEquivalenceProof'] is True
    assert set(override['phases']) == {r['source']['phase'] for r in local}
print('PASS 30 items, 453 PNGs, 928 references, eight North-only pants-22 layers; runtime disabled')
