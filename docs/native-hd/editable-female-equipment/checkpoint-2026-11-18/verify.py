from pathlib import Path, PurePosixPath
from hashlib import sha256
import argparse,io,json,re,tarfile,zipfile

ROOT=Path(__file__).resolve().parent
manifest=json.loads((ROOT/'manifest.json').read_text(encoding='utf-8'))
assert manifest['runtimeActivated'] is False
assert manifest['browserValidated'] is False
bad_path=re.compile(rb'/workspace/|/home/agent/|(?:[A-Za-z]:[/\\]Users[/\\])|sediment://|sandbox:/')
sensitive=re.compile(rb'-----BEGIN (?:[A-Z0-9]+ )?PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{24,}')

def check_member(name, raw):
    p=PurePosixPath(name)
    assert not p.is_absolute() and '..' not in p.parts and '\\' not in name, name
    assert p.suffix.lower() not in {'.mp4','.webm','.mov','.gif','.avi'}, name
    if p.suffix.lower() in {'.json','.txt','.md','.cjs','.js','.py','.patch','.tap','.sha256','.jsonl'}:
        assert not bad_path.search(raw), f'path in {name}'
        assert not sensitive.search(raw), f'credential pattern in {name}'

parser=argparse.ArgumentParser()
parser.add_argument('--materialize', type=Path, help='save verified original archives in this directory')
args=parser.parse_args()

def payload(row):
    f=ROOT/row['file']
    assert f.name==row['file'] and f.exists()
    b=f.read_bytes()
    assert len(b)==row['bytes'] and sha256(b).hexdigest()==row['sha256'], f.name
    return b

for r in manifest['archives']:
    f=Path(r['file'])
    assert f.name==r['file']
    b=b''.join(payload(row) for row in r['parts']) if r.get('parts') else payload(r)
    assert len(b)==r['bytes'] and sha256(b).hexdigest()==r['sha256'], f.name
    if f.suffix=='.zip':
        with zipfile.ZipFile(io.BytesIO(b)) as z:
            assert z.testzip() is None
            for m in z.infolist():
                if not m.is_dir():
                    assert (m.external_attr>>16)&0o170000 != 0o120000
                    check_member(m.filename,z.read(m))
    elif f.suffix=='.tgz':
        with tarfile.open(fileobj=io.BytesIO(b),mode='r:gz') as t:
            for m in t:
                assert m.isdir() or m.isfile()
                if m.isfile():
                    check_member(m.name,t.extractfile(m).read())
    else: raise ValueError(f.name)
    if args.materialize:
        args.materialize.mkdir(parents=True,exist_ok=True)
        target=args.materialize/f.name
        if target.exists():
            assert target.read_bytes()==b, f'refusing to overwrite {target}'
        else:
            with target.open('xb') as output: output.write(b)
    print('OK',f.name)
print(f"{len(manifest['archives'])} pacotes verificados; runtime não ativado")
