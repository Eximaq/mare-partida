"""Read-only tracked-file audit. Ambiguous/dynamic resources are never deletion candidates automatically."""
import argparse, collections, csv, hashlib, json, subprocess, re, posixpath
from pathlib import Path

def audit(root):
    tracked = subprocess.check_output(['git', 'ls-files', '-z'], cwd=root).decode('utf-8').split('\0')
    rows, texts, hashes = [], [], collections.defaultdict(list)
    for name in filter(None, tracked):
        path = root / name
        if not path.is_file():
            continue
        data = path.read_bytes()
        row = {'path': name, 'bytes': len(data), 'type': path.suffix.lower(), 'sha256': hashlib.sha256(data).hexdigest()}
        rows.append(row); hashes[row['sha256']].append(name)
        if path.suffix.lower() in {'.js','.cjs','.mjs','.ts','.mts','.css','.html','.json','.py','.md','.yml','.yaml','.txt'}:
            texts.append((name, data.decode('utf-8', errors='replace')))
    reference_index = collections.defaultdict(set)
    tracked_names = {row["path"] for row in rows}
    for source, text in texts:
        for token in re.findall(r"[\w./-]+\.(?:js|cjs|mjs|ts|mts|css|html|json|png|webp|jpg|jpeg|gif|ttf|woff2|mp3|ogg|md|py|yml|yaml|sql)", text):
            candidates = (token, posixpath.normpath(posixpath.join(posixpath.dirname(source), token)))
            for name in candidates:
                if name in tracked_names and source != name: reference_index[name].add(source)
    for row in rows:
        name = row['path']
        row['system'] = '/'.join(name.split('/')[:3]) if name.startswith('assets/') else name.split('/')[0]
        row['references'] = sorted(reference_index[name])
        row['published'] = (root / 'dist' / name).is_file()
        row['classification'] = 'B' if row['published'] or name.startswith(('pixellab-pip-generations/','tools/','tests/','docs/','apps/','packages/','infra/','.github/')) else 'C'
        row['decision'] = 'preserve: published or development dependency' if row['classification'] == 'B' else 'preserve: indirect/dynamic use needs manual proof'
    return {'commit': subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip(), 'files':len(rows), 'bytes':sum(r['bytes'] for r in rows), 'assetsBytes':sum(r['bytes'] for r in rows if r['path'].startswith('assets/')), 'duplicates':[{'sha256':digest,'paths':paths} for digest,paths in hashes.items() if len(paths)>1], 'inventory':rows}

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--out',type=Path,default=Path('.maintenance-local/inventory.json'))
    args=parser.parse_args(); root=Path(__file__).resolve().parent.parent
    report=audit(root); args.out.parent.mkdir(parents=True,exist_ok=True)
    args.out.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    csv_path=args.out.with_suffix('.csv')
    with csv_path.open('w',newline='',encoding='utf-8-sig') as file:
        writer=csv.DictWriter(file,fieldnames=['path','bytes','type','sha256','system','classification','decision','published','references']); writer.writeheader()
        for row in report['inventory']: writer.writerow({**row,'references':'; '.join(row['references'])})
    print(json.dumps({k:report[k] for k in ['commit','files','bytes','assetsBytes']},ensure_ascii=False)); print(args.out); print(csv_path)
if __name__=='__main__': main()
