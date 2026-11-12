"""Import the audited source catalogue without modifying approved pixels."""
import json,sys
from pathlib import Path
source=Path(sys.argv[1]);out=Path(__file__).parent/'catalog.json'
x=json.loads(source.read_text());cycles=[]
for c in x['cycles']:
 c={k:v for k,v in c.items() if k not in ['localArchive','directory','enabledByDefault']}
 c['archiveSource']='approved-repo'
 cycles.append(c)
y={'schema':'approved-weapon-cycles-v1','sourceCommit':'2801902fa2dad8e83069815faeaa3f53f90bc1b6','scope':'Exact approved composite cycles; independent of saved appearance. Not arbitrary modular combinations.','sourcePackagesVerified':x['verifiedArchiveCount'],'cycles':cycles}
out.write_text(json.dumps(y,ensure_ascii=False,separators=(',',':'))+'\n')
print(len(cycles),'cycles imported')
