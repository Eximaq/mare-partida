'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const W=require('../tools/paper-doll-96-v3/weapons.js'),allCatalog=require('../tools/paper-doll-96-v3/weapons.json'),rigs=require('../tools/paper-doll-96-v3/appearance-rig.json'),manifest=require('../tools/paper-doll-96-v3/manifest.json');
const catalog={...allCatalog,items:allCatalog.items.filter(w=>!w.attachment)};
assert(W.validate(allCatalog));
const base=path.join(__dirname,'../tools/paper-doll-96-v3'),root=path.join(__dirname,'..'),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
assert(W.validate(catalog));assert.equal(catalog.items.length,12);assert.deepEqual(catalog.items.map(w=>w.itemId),[0,1,12,13,67,68,69,70,71,72,73,74]);
assert.deepEqual(catalog.items.filter(w=>w.effect).map(w=>w.itemId),[70,74]);
for(const mutate of [c=>c.items[0].effect='gold-sheen',c=>c.items[0].source='../bad.png',c=>c.items[0].grip.x=128,c=>c.items[0].axisAngle=Infinity,c=>c.items.push(c.items[0])]){const c=structuredClone(catalog);mutate(c);assert.throws(()=>W.validate(c));}
for(const item of catalog.items){
 assert.equal(item.generation.tool,'pixellab');assert.equal(item.generation.model,'pro');
 const png=fs.readFileSync(path.join(base,item.source));assert.equal(hash(png),item.sha256);assert.equal(png.readUInt32BE(16),128);assert.equal(png.readUInt32BE(20),128);
 assert.equal(hash(fs.readFileSync(path.join(root,item.reference))),item.referenceSha256,'preserve original inventory artwork');assert.equal(item.paired,item.category==='daggers');
}
assert.equal(catalog.items.find(w=>w.itemId===70).generation.galleryId,'2823533c-c099-5562-8779-c2bb98eae0d8');assert.equal(catalog.items.find(w=>w.itemId===70).generation.candidate,1);
assert(catalog.items.find(w=>w.itemId===68).visibleHeight>catalog.items.find(w=>w.itemId===67).visibleHeight);assert(catalog.items.filter(w=>w.category==='daggers').every(w=>w.visibleHeight<=44));
for(const item of catalog.items){assert(item.bounds.x0>=0&&item.bounds.x1<128&&item.bounds.y0>=0&&item.bounds.y1<128);assert(item.grip.x>=item.bounds.x0&&item.grip.x<=item.bounds.x1);assert(item.grip.y>=item.bounds.y0&&item.grip.y<=item.bounds.y1);if(item.axisAngle!==undefined)assert(Number.isFinite(item.axisAngle));}
const renderer=W.create(catalog,rigs);let poses=0,contacts=0;
for(const body of ['masculino','feminino'])for(const item of catalog.items)for(const action of ['idle','walk','attack-'+item.category])for(const direction of ['south','north','east']){
 const clip=manifest.bodies[body].clips[action][direction],size=clip.frame?.width||128,spec={width:size,height:size},selected={body,action,direction,clip},look={weapon:item.id},pad=renderer.padding(selected,spec,look);
 assert(pad.x>=0&&pad.top>=0&&pad.bottom>=0);assert(pad.x<=84&&pad.top<=84&&pad.bottom<=84,'derive sufficient bounds without changing the body frame');
 for(let f=0;f<clip.frames;f++){
  const plan=renderer.plan(selected,f,spec,look);assert.equal(plan.length,item.paired?2:1);poses++;
  const points=Object.fromEntries(rigs.clips[body][action][direction].poses[f].map(j=>[j.label,j]));
  for(const p of plan){const socket=W.contact(points[p.side+' ARM'],null,size,size,(size-128)/2,points[p.side+' ELBOW']);assert.equal(p.x,socket.x);assert.equal(p.y,socket.y);assert(Number.isFinite(p.angle));if(p.model.edgeSide){const sign=p.model.edgeSide*(p.flip?-1:1);assert(sign*(Math.cos(p.angle)*p.outward.x+Math.sin(p.angle)*p.outward.y)>=-1e-10,'cutting edge must face outwards');}assert.equal(p.depth,direction==='north'||direction==='east'&&p.side==='LEFT'?'back':'front');contacts++;}
 }
}
const mask=new Uint8Array(128*128);mask[75*128+47]=1;assert.deepEqual(W.contact({x:45/128,y:75/128},mask,128,128,0),{x:47,y:75,distance:4,visible:true});assert.equal(W.contact({x:.5,y:.5},mask,128,128,0).visible,false,'occluded hands do not borrow another limb');
const wardrobe=fs.readFileSync(path.join(base,'wardrobe.js'),'utf8');assert(wardrobe.indexOf("weaponPlan,'back'")<wardrobe.indexOf('ctx.drawImage(originalFrame,0,0);'));
assert(wardrobe.indexOf("weaponPlan,'front'")<wardrobe.indexOf('visibleArm(frontHands);'),'hands/gloves must cover the grip');
const runtime=fs.readFileSync(path.join(root,'paper-doll-96-lobby.js'),'utf8');assert(runtime.includes('progress/hit*.5'));assert(runtime.includes("key:[body,action,direction].join(':')"),'attachment caches must distinguish animation families');assert(runtime.includes('weaponPadding'));
assert(wardrobe.includes("drawGrips(ctx,weaponPlan,'back'"));assert(wardrobe.includes("drawGrips(ctx,weaponPlan,'front'"));
assert.equal(manifest.productionEnabled,false);console.log(JSON.stringify({weaponMaterials:12,effects:[70,74],poses,contacts,originalsUnchanged:true}));
