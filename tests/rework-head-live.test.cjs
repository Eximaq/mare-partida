const test=require('node:test'),assert=require('node:assert/strict');
const {create}=require('../player-rework-head-live.js');
test('live adapter activates without query, preserves look, and prepares exact registry files',async()=>{
 const notices=[],look={hair:'hair-cropped',head:'original'},original=JSON.stringify(look),entry={id:'m-s'};
 const registry={resolve:o=>o.look.hair==='hair-cropped'?entry:null,requiredFiles:()=>['x.png'],compose:()=>({headBase:new Uint8ClampedArray(4)})};
 const a=create({loadRegistry:async()=>registry,loadImage:async()=>({width:512,height:512}),notify:s=>notices.push(s)});
 assert.equal(await a.prepare({body:'masculino',direction:'south'},look),true);assert.ok(a.compose({body:'masculino',direction:'south'},look,{}));assert.equal(JSON.stringify(look),original);assert.equal(a.snapshot().applied,1);assert.ok(notices.length);
});
test('uncovered and loading states keep existing pieces explicitly; errors never delete native support',async()=>{
 const a=create({loadRegistry:async()=>({resolve:()=>null}),notify:()=>{}});
 assert.equal(a.compose({}, {}, {}),null);assert.equal(await a.prepare({},{}),false);assert.match(a.snapshot().reason,/fora do rework/);
 const bad=create({loadRegistry:async()=>{throw Error('offline')},notify:()=>{}});assert.equal(await bad.prepare({},{}),false);assert.equal(bad.snapshot().state,'failed');assert.equal(bad.compose({}, {},{}),null);
});

test('Original gets a declared candidate style without mutating saved appearance',async()=>{
 let got;const look={hair:'original'};const a=create({loadRegistry:async()=>({resolve:o=>{got=o;return null;}}),notify:()=>{}});await a.prepare({body:'masculino',direction:'south'},look);assert.equal(got.look.originalHairStyle,'cropped');assert.equal(got.body,'male');assert.deepEqual(look,{hair:'original'});
});

test('headgear hide preference removes the equipped overlay but not the equipment',async()=>{
 let got;const look={hair:'hair-cropped',head:'item-129',hideHeadgear:true};const a=create({loadRegistry:async()=>({resolve:o=>{got=o;return null;}}),notify:()=>{}});await a.prepare({body:'masculino',direction:'south'},look);assert.equal(got.look.head,'original');assert.equal(look.head,'item-129');
});
test('normal runtime and Pages wire the live family, independently of review query flags',()=>{
 const fs=require('node:fs'),path=require('node:path'),read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
 for(const html of ['index.html','ui-preview.html']){const s=read(html);assert.ok(s.indexOf('player-rework-head-family.js')<s.indexOf('paper-doll-96-lobby.js'));assert.ok(s.includes('player-rework-head-live.js'));}
 assert.match(read('paper-doll-96-lobby.js'),/await reworkHead.prepare\(sel,look\)/);
 assert.match(read('tools/paper-doll-96-v3/wardrobe.js'),/options.reworkHead\?\.compose/);
 assert.match(read('tools/build_pages.py'),/head-layer-index.json/);
});
