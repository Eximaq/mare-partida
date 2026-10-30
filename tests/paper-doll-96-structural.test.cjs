'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const root=path.join(__dirname,'../tools/paper-doll-96-v3');
const rig=require(path.join(root,'appearance-rig.json')),manifest=require(path.join(root,'manifest.json'));
assert.equal(manifest.productionEnabled,false);assert.equal(rig.compositionRevision,'directional-depth-v10');
const template=require(path.join(root,'fit-template.json')),catalog=require(path.join(root,'appearance-catalog.json')),torso=require(path.join(root,'torso.js'));
assert.deepEqual(template.restContacts,rig.rests,'Reusable template must use the current contacts');
assert.equal(template.referenceGallery['template-mask-torso'],catalog.gallery.templateSheets.find(v=>v.key==='template-mask-torso').id);
assert.equal(catalog.compositionRevision,rig.compositionRevision);
const dorsal=structuredClone(rig.rests.masculino.north);for(const side of ['LEFT','RIGHT']){const hand=dorsal.find(p=>p.label===side+' ARM');hand.x=.5;hand.y=.49;}
const skin=new Uint8ClampedArray(128*128*4),pixel=(62*128+64)*4;skin.set([220,145,80,255],pixel);
const owned=torso.ownership(skin,dorsal,0,128,128);assert.equal(owned.hands[pixel/4],0,'Hands behind back cannot own its visible skin');assert.equal(owned.cloth[pixel/4],1);
let poses=0,depth=0;
for(const [body,actions]of Object.entries(rig.clips))for(const [action,dirs]of Object.entries(actions))for(const [direction,r]of Object.entries(dirs)){
 for(const p of r.poses){const j=Object.fromEntries(p.map(v=>[v.label,v])),n=j.NECK,l=j['LEFT SHOULDER'],rr=j['RIGHT SHOULDER'];const span=Math.hypot(l.x-rr.x,l.y-rr.y)*128,offset=Math.hypot(n.x-(l.x+rr.x)/2,n.y-(l.y+rr.y)/2)*128;
  assert.ok(offset<=Math.max(4,span*.3),'Neck outside shoulder midpoint: '+[body,action,direction]);poses++;
  if(direction==='north')for(const side of ['LEFT','RIGHT'])assert.ok(j[side+' ARM'].z_index<n.z_index,'North arms are behind the back');
  if(['east','west'].includes(direction))for(const side of ['LEFT','RIGHT'])for(const part of ['ARM','ELBOW','SHOULDER']){assert.equal(j[side+' '+part].z_index>n.z_index,side==='RIGHT','Canonical camera depth');depth++;}
 }
 assert.equal(r.poses.length,manifest.bodies[body].clips[action][direction].frames);
}
for(const body of Object.keys(rig.clips))assert.deepEqual(rig.clips[body]['attack-tech'],rig.clips[body]['attack-firearm']);
for(const [action,frame]of [['attack-sword',3],['attack-sword',7],['attack-focus',5]]){
 const r=rig.clips.feminino[action].south,n=r.poses[frame].find(p=>p.label==='NECK'),rest=r.rest.find(p=>p.label==='NECK');
 assert.deepEqual(r.sockets[frame],{x:Math.round((n.x-rest.x)*128)||0,y:Math.round((n.y-rest.y)*128)||0,angle:0});
 assert.deepEqual(manifest.bodies.feminino.clips[action].south.headSockets[frame],r.sockets[frame]);
 assert.ok(Math.abs(r.sockets[frame].x)<=1,'Head must not jump to a shoulder');
}
console.log(JSON.stringify({poses,depthReferences:depth,correctedHeadPoses:3}));
