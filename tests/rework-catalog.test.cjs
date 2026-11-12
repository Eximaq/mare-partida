const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),api=require('../player-rework-weapons.js');
for(const category of ['weapons','outfits'])test(`${category} checked catalogue: pinned archives and packaged local sources`,()=>{
 const manifest=api.validate(JSON.parse(fs.readFileSync(path.join(root,`tools/rework-${category}/catalog.json`),'utf8')));
 assert.ok(manifest.cycles.length>100);
 for(const c of manifest.cycles){
  if(c.archiveSource==='local')assert.ok(fs.existsSync(path.join(root,c.archive)),c.archive);
  else assert.ok(c.archive.startsWith('art-approved/'));
  if(c.worldEligible===false)continue;
  assert.ok(c.logicalFrame.every(n=>n>0));
 }
});
test('immutable remote commit and ZIP integrity decoder are mandatory',()=>{
 assert.match(api.APPROVED_ORIGIN,/\/2801902fa2dad8e83069815faeaa3f53f90bc1b6\/$/);
 const code=fs.readFileSync(path.join(root,'player-rework-weapons.js'),'utf8');
 assert.match(code,/loadArchive\(bytes,c.archiveSha256\)/);
 assert.match(code,/hash!==f.sha256/);
});
