'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const W=require('../tools/paper-doll-96-v3/weapons.js'),catalog=require('../tools/paper-doll-96-v3/weapons.json'),rigs=require('../tools/paper-doll-96-v3/appearance-rig.json'),manifest=require('../tools/paper-doll-96-v3/manifest.json');
const base=path.join(__dirname,'../tools/paper-doll-96-v3'),root=path.join(__dirname,'..'),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const expected=[2,3,4,5,14,15,16,17,31,32],items=catalog.items.filter(w=>w.attachment);
assert(W.validate(catalog));assert.equal(catalog.items.length,22);assert.deepEqual(items.map(w=>w.itemId).sort((a,b)=>a-b),expected);
assert.deepEqual(catalog.classes,{sword:'sword',rogue:'daggers',brawler:'unarmed',gunner:'firearm',cyborg:'tech',strategist:'focus',healer:'focus'});
assert.equal(manifest.productionEnabled,false);assert.equal(catalog.reviewOnly,true);
const legacy={"0":"2cd2280f0db818c0744c28a5daac1756e0bdb3e6f8ea2d8773035f3bf5f0f3a8","1":"3b38f31777ffff624ce4ceb91ec9f9ae1cd06f7bdbaf20c57467c8c90c0e8542","12":"ea057692687e722daad47577f1097eea96644d7cd5f60d4ed2a5afe277e932f8","13":"aba60ef6337d8d862100a27cf3175c08eb8ead22a866ebf9bfc721fd1af3af3f","67":"9fff4e55b19dfa0e329d3b6684b744099dac8ae713c46cf17693bcff111fd245","68":"1f86ba4021b5f57a238c89f90c3f29d74670f296f4e68e12cdba42a4d015b0ac","69":"048b14861a4fa571830774b9c1846c1fd18ddd172743f9b7340b4be98d4665ad","70":"3bf533053830fcd8442133c3d4a97b36f111c8f3b57c6e497942ea0b218d4441","71":"2f79f7699f53659263cc24d7f9e29ba9f3d2b640d73793bd43dcbfa20080ab30","72":"634b32d96a2a1d19269974a78f30123c7181e8dc50e40dfa359034da935e7189","73":"55346da56a114ee7a6c7407e2c1f591a732e9547428eb5b69eae4b7d52805462","74":"5ab8aab088d2f41995d1660c666ea30b0158194b968fcd24564e929035c7c03d"};for(const item of catalog.items.filter(w=>!w.attachment))assert.equal(item.sha256,legacy[item.itemId],'preserve previous twelve PixelLab blades');
for(const item of items){
 assert.equal(item.generation.tool,'pixellab');assert.equal(item.generation.model,'pro');assert.equal(item.effect,null);
 assert.equal(hash(fs.readFileSync(path.join(root,item.reference))),item.referenceSha256,'preserve existing inventory art');
 assert.equal(item.paired,[2,3].includes(item.itemId));
 for(const material of [item,...Object.values(item.views||{})]){const png=fs.readFileSync(path.join(base,material.source));assert.equal(hash(png),material.sha256);assert.equal(png.readUInt32BE(16),128);assert.equal(png.readUInt32BE(20),128);assert.equal(material.generation.tool,'pixellab');assert.equal(material.generation.model,'pro');assert(Number.isFinite(material.axisAngle));}
 if([4,5,15].includes(item.itemId))assert.deepEqual(Object.keys(item.views),['south','north'],'authored front/back firearm views');
}
assert.equal(items.find(w=>w.itemId===14).attackAction,'attack-unarmed','steel gauntlet punches instead of inheriting rifle pose');
for(const id of [16,32])assert(items.find(w=>w.itemId===id).generation.design,'final sprite derived from redesigned PixelLab artwork');
const renderer=W.create(catalog,rigs);let poses=0,contacts=0,viewCases=0;
for(const body of ['masculino','feminino'])for(const item of items)for(const action of ['idle','walk',item.attackAction||'attack-'+item.category])for(const direction of ['south','north','east']){
 const clip=manifest.bodies[body].clips[action][direction],size=clip.frame?.width||128,spec={width:size,height:size},selected={body,action,direction,clip},look={weapon:item.id},pad=renderer.padding(selected,spec,look);
 assert(pad.x>=0&&pad.top>=0&&pad.bottom>=0);assert(pad.x<=84&&pad.top<=84&&pad.bottom<=84);
 for(let f=0;f<clip.frames;f++){
  const plan=renderer.plan(selected,f,spec,look);assert.equal(plan.length,item.paired?2:1);poses++;
  const points=Object.fromEntries(rigs.clips[body][action][direction].poses[f].map(j=>[j.label,j]));
  for(const entry of plan){
   const socket=W.contact(points[entry.side+' ARM'],null,size,size,(size-128)/2,points[entry.side+' ELBOW']);assert.equal(entry.x,socket.x);assert.equal(entry.y,socket.y);assert(Number.isFinite(entry.angle));
   assert.equal(entry.depth,direction==='north'||direction==='east'&&entry.side==='LEFT'?'back':'front');
   const atGrip=renderer.point(entry,entry.model.grip);assert.equal(atGrip.x,entry.x);assert.equal(atGrip.y,entry.y);const tip=renderer.point(entry);assert(Number.isFinite(tip.x)&&Number.isFinite(tip.y));
   if(item.views?.[direction]){assert.equal(entry.model.source,item.views[direction].source);viewCases++;}
   if(['focus','book'].includes(item.attachment.kind)){assert(Math.abs(entry.angle)<=.3);assert.equal(entry.side,body==='masculino'&&direction!=='north'?'LEFT':'RIGHT','follow authored casting hand');}if(item.attachment.kind==='staff'){assert(Math.abs(entry.angle)<=.5);assert.equal(entry.side,direction==='south'&&body==='masculino'?'RIGHT':'LEFT','free frontal hand or far profile hand keeps the face clear');}
   contacts++;
  }
 }
}
assert.equal(poses,1200);assert.equal(contacts,1440);assert.equal(viewCases,240);
// Execute the catalog initialization: unrelated UI state must not affect equipment contracts.
// Literal tuples audited against the original native96 integration (82e7082).
const game=fs.readFileSync(path.join(root,'game.js'),'utf8');
const catalogStart=game.indexOf('  const itemDefs = ['),catalogEnd=game.indexOf('  const questDefs = [',catalogStart);
assert(catalogStart>=0&&catalogEnd>catalogStart,'catalog initialization must be found');
const definitions=require('node:vm').runInNewContext(game.slice(catalogStart,catalogEnd)+';itemDefs',{
 MareForge:require('../forge-system.js'),MarePrison:require('../prison-system.js'),
 MareHakiProgression:require('../haki-progression.js'),MareHaki:require('../haki-system.js'),MareAkuma:require('../akuma-system.js')
});
const expectedWeapons=[
 [0,"Espada de Ferro Salgado","weapon","sword",6,0,0,"common",false],
 [1,"Sabre de Coral","weapon","sword",11,0,0,"uncommon",false],
 [12,"Adagas da Bruma","weapon","rogue",8,0,0,"common",false],
 [13,"Lâminas Acrobáticas","weapon","rogue",13,0,0,"rare",false],
 [67,"Katana da Maelstrom","weapon","sword",11,0,0,"legendary",true],
 [68,"Nodachi de Kairouseki","weapon","sword",11,0,0,"epic",true],
 [69,"Nodachi de Fogo","weapon","sword",11,0,0,"legendary",true],
 [70,"Meito: Ame no Habakiri","weapon","sword",11,0,0,"supreme",true],
 [71,"Adaga de Cristal","weapon","rogue",13,0,0,"epic",true],
 [72,"Punhal de Netuno","weapon","rogue",13,0,0,"legendary",true],
 [73,"Punhal Flamejante","weapon","rogue",13,0,0,"legendary",true],
 [74,"Lâmina das Trevas","weapon","rogue",13,0,0,"supreme",true],
 [2,"Punhos de Bronze","weapon","brawler",7,1,0,"common",false],
 [4,"Mosquete de Convés","weapon","gunner",7,0,0,"common",false],
 [14,"Manopla de Aço","weapon","cyborg",8,3,12,"common",false],
 [16,"Compasso de Tempestade","weapon","strategist",8,0,0,"common",false],
 [3,"Luvas de Marfim","weapon","brawler",11,2,0,"uncommon",false],
 [5,"Mosquete dos Faróis","weapon","gunner",12,0,0,"rare",false],
 [15,"Canhão de Pulso","weapon","cyborg",14,2,0,"rare",false],
 [17,"Orbe das Correntes","weapon","strategist",14,1,0,"rare",false],
 [31,"Cajado do Farol","weapon","healer",7,1,0,"common",false],
 [32,"Relicário da Maré Viva","weapon","healer",12,2,8,"rare",false]
];
const actualWeapons=catalog.items.map(({itemId})=>{const d=definitions[itemId];return [itemId,d.name,d.slot,d.type,d.attack,d.defense,d.hp,d.rarity,!!d.fixedRarity]});
assert.deepEqual(actualWeapons,expectedWeapons,'saved weapon indices, identities, stats and rarity contracts unchanged');
assert(game.includes('lobby96.projectileOrigin(game,world.hero'));
console.log(JSON.stringify({newWeapons:items.length,classes:5,poses,contacts,viewCases,legacyBladesUnchanged:true}));
