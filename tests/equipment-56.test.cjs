'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const map=require('../docs/art/equipment-56/mapa_56_itens.json'),receipt=require('../docs/art/equipment-56/geracoes_pixellab.json'),styles=require('../tools/paper-doll-96-v3/appearance-catalog.json').styles;
const forge=require('../forge-system.js'),catalog=require('../item-catalog.js').create({forge,prison:require('../prison-system.js'),haki:require('../haki-system.js'),akuma:require('../akuma-system.js'),hakiProgression:require('../haki-progression.js')}),art=require('../item-art.js'),policy=require('../tools/paper-doll-96-v3/weapons.js').composition;
const root=path.join(__dirname,'..'),hash=b=>crypto.createHash('sha256').update(b).digest('hex'),read=f=>fs.readFileSync(path.join(root,f));
test('56 append-only universal definitions preserve every previous item and the source-path catalog order',()=>{
 assert.equal(catalog.items.length,188);assert.equal(hash(JSON.stringify(catalog.items.slice(0,129))),'215500faa3c5c5053ff483910a805b14e8fa4a18eb5f19a4575ec7d5cd8a673c');
 assert.equal(map.length,56);assert.equal(new Set(map.map(r=>r.id)).size,56);assert.equal(new Set(map.map(r=>r.arquivo)).size,56);
 assert.deepEqual(map.map(r=>r.id),Array.from({length:56},(_,i)=>129+i));
 for(const [n,r]of map.entries()){
  const d=catalog.items[r.id];assert.equal(d.name,r.nome);assert.equal(d.slot,r.slot);assert.equal(d.rarity,r.raridadeJogo);assert.equal(d.fixedRarity,true);assert.equal(d.type,undefined,'universal, without a class restriction');assert.equal(d.setBonus,undefined);
  assert(r.arquivo.includes('/')&&r.referencia.file.endsWith(r.arquivo));assert.equal(hash(read(r.referencia.file)),r.referencia.sha256);assert.equal(hash(read(r.icone.file)),r.icone.sha256);
  assert.equal(art.path(r.id,d).split('?')[0],r.icone.file);assert.equal(d.icon_path,r.icone.file);assert.equal(r.raridadeJogo,['rare','rare','rare','epic','epic','epic','legendary','supreme'][Math.floor(n/7)]);
  const item=forge.normalizeItem({id:'equipment56-'+r.id,def:r.id,rarity:r.raridadeJogo,level:1,plus:0},catalog.items,()=>.4);assert.deepEqual(forge.normalizeItem(JSON.parse(JSON.stringify(item)),catalog.items),item,'save/reload preserves native equipment fields');assert(forge.itemStats(item,catalog.items).hp>0);
 }
});
test('56 icons have native 128px alpha PNGs, isolated cells and completed PixelLab provenance',()=>{
 assert.equal(receipt.icons,56);assert.equal(receipt.jobs.length,57);assert.equal(receipt.chargedGenerations,770);assert.equal(receipt.remainingGenerations,163.65);
 for(const r of map){const png=read(r.icone.file);assert.equal(png.readUInt32BE(16),128);assert.equal(png.readUInt32BE(20),128);assert.equal(png[25],6,'RGBA, not a solid fake background');assert.equal(r.icone.tool,'pixellab');assert(receipt.jobs.some(j=>j.jobId===r.icone.jobId&&j.items.includes(r.id)));assert([0,1,2,3].includes(r.icone.cell));}
});
test('40 pieces own male and female panels for every native direction and attack family',()=>{
 const visible=map.filter(r=>r.visivel);assert.equal(visible.length,40);assert.equal(visible.flatMap(r=>Object.keys(r.corpos)).length,80);
 for(const r of visible){const s=styles.find(s=>s.itemId===r.id);assert.equal(s.id,'item-'+r.id);assert.equal(s.nativeFit,'registered-panels-v1');assert.equal(s.reviewed,true);assert.equal(s.generation.tool,'pixellab');assert.equal(s.sourceReference,r.arquivo);assert(!['belt','cloak'].includes(r.slot));
  for(const [row,body]of ['masculino','feminino'].entries()){
   const variant=r.corpos[body];assert.equal(variant.sourceGenderRow,row);assert.equal(variant.animations.length,8);assert.equal(variant.directions.length,4);assert.deepEqual(s.layers[body],variant.layers);assert.deepEqual(s.parts[body],variant.parts);
   for(const dir of ['south','north','east','west']){assert(variant.layers[dir].includes('-'+body+'-'));const png=read('tools/paper-doll-96-v3/'+variant.layers[dir]);assert.equal(png.readUInt32BE(16),128);assert.equal(png.readUInt32BE(20),128);assert.equal(png[25],6);}
  }
 }
 assert.notEqual(visible.find(r=>r.id===148).corpos.feminino.jobId,visible.find(r=>r.id===148).corpos.masculino.jobId,'only the failed female boot variant was regenerated');
});
test('16 inventory-only slots retain their records and stats while torso mantles remain visible',()=>{
 const invisible=map.filter(r=>!r.visivel);assert.equal(invisible.length,16);for(const r of invisible){assert.equal(policy.rendersSlot(r.slot),false);assert.equal(r.corpos,undefined);assert(!styles.some(s=>s.itemId===r.id));assert(catalog.items[r.id].hp>0);}
 for(const id of [23,24,29,30])assert.equal(policy.rendersSlot(catalog.items[id].slot),false);
 for(const id of [144,158]){assert.equal(catalog.items[id].slot,'coat');assert.equal(policy.rendersSlot('coat'),true);assert(styles.some(s=>s.itemId===id&&s.kind==='torso'));}
});
