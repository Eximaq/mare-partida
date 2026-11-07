const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),manifest=path.join(root,'assets/weekly-boss/akainu/manifest.json');
test('Akainu art has four directional actions, stable foot pivots and no map spawn',()=>{
 assert(fs.existsSync(manifest),'normalized Akainu manifest must exist');const m=JSON.parse(fs.readFileSync(manifest));
 assert.equal(m.enabledByDefault,false);assert.equal(m.spawn,null);assert.equal(m.baseSize,96);
 for(const action of ['idle','walk','hurt','punch','aoe'])for(const dir of ['south','west','east','north']){const c=m.clips[action][dir];assert(c.frames>0);assert(c.size>=96);assert(c.anchor[0]>=0&&c.anchor[1]<c.size);const bytes=fs.readFileSync(path.join(root,c.image));assert(bytes.length>100);assert.equal(bytes.subarray(0,4).toString(),'RIFF');}
 assert.equal(m.vfx.frames,24);assert.equal(m.vfx.columns,6);
});
