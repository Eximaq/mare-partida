from pathlib import Path
import hashlib,json
p=Path(__file__).resolve().parent;m=json.loads((p/'MANIFEST.json').read_text());out=p.parent/m['original'];parts=[]
for entry in m['parts']:
 data=(p/entry['path']).read_bytes()
 assert len(data)==entry['bytes'] and hashlib.sha256(data).hexdigest()==entry['sha256'],entry['path']
 parts.append(data)
data=b''.join(parts)
assert len(data)==m['bytes'] and hashlib.sha256(data).hexdigest()==m['sha256']
if out.exists():assert out.read_bytes()==data,'Refusing to replace different existing file'
else:out.write_bytes(data)
print('Verified exact archive:',out.name)
