'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const {createHash}=require('node:crypto');
const {composeRegisteredLayerGroups}=require('../player-rework-modular-outfits-hd.js');
const h=s=>createHash('sha256').update(s).digest('hex');
const layer=(id,slot,depth)=>({id,source:h(id),slot,depth,binding:{kind:'fixed'}});
const rig=layers=>({frame:{width:160,height:160},pivot:{x:80,y:128},density:4,directions:{north:{
 clip:{frames:2,fps:12,loop:false},rest:{},poses:[{},{}],layers
}}});
const skin=layer('anatomy','body',10),hair=layer('hair','hair',100);
const coat3=layer('coat3','top',50),coat4=layer('coat4','top',50),pants2=layer('pants2','pants',20);
const rear9=layer('b9-rear','underArms',0),front9=layer('b9-front','top',40);
const rear155=layer('b155-rear','underArms',0),front155=layer('b155-front','top',40),glove=layer('g25','foreground',60);
const base={body:'male',action:'attack-unarmed',direction:'north',id:'own-base-north',pack:rig([skin,hair]),sourceRefs:[skin.source,hair.source]};
const make=(label,equipment,groups,extra)=>({...base,id:label,equipment,equipmentLayerGroups:
 Object.fromEntries(Object.entries(groups).map(([k,v])=>[k,v.map(l=>l.id)])),
 pack:rig([skin,hair,...Object.values(groups).flat()]),sourceRefs:[skin,hair,...Object.values(groups).flat()].map(l=>l.source),...extra});
const donors=[
 make('coats-3-donor',{torso:3},{torso:[coat3]}),
 make('coats-4-with-b155',{torso:4,boots:155},{torso:[coat4],boots:[rear155,front155]}),
 make('boots-9-with-glove',{boots:9,gloves:25},{boots:[rear9,front9],gloves:[glove]}),
 make('own-pants',{pants:2},{pants:[pants2]})
];
const inspect=(r)=>r?.pack.directions.north.layers;
test('compose approved passes from different donors; changing one slot never changes the rest',()=>{
 const requested={torso:3,pants:2,boots:9,gloves:25};
 const want=(equipment)=>composeRegisteredLayerGroups({base,donors,equipment});
 const o=want(requested);
 assert(o,'combination does not exist in donor table; assemble it from individual pieces');
 assert.deepEqual(o.omitted,[]);
 assert.equal(o.slotRoutes.torso.item,3);
 const without=(r,ids)=>inspect(r).filter(l=>!ids.includes(l.id));
 const alteredCoat=want({...requested,torso:4});
 assert(alteredCoat);
 assert.deepEqual(without(alteredCoat,['coat4']),without(o,['coat3']));
 assert(!inspect(alteredCoat).some(l=>['coat3','b155-rear','b155-front'].includes(l.id)));
 const differentBoot=want({...requested,boots:155});
 assert(differentBoot);
 assert.deepEqual(without(differentBoot,['b155-rear','b155-front']),without(o,['b9-rear','b9-front']));
 const bareBoot=want({torso:3,pants:2,gloves:25});
 assert(bareBoot);
 assert.deepEqual(inspect(bareBoot),without(o,['b9-rear','b9-front']));
 assert.deepEqual(o.pack.directions.north.clip,base.pack.directions.north.clip);
 assert.deepEqual(o.pack.pivot,base.pack.pivot);
 assert.deepEqual(inspect(base),[skin,hair]);
});
test('dimensions alone never admit wrong timing or a non-owned pass',()=>{
 const bad=structuredClone(donors);
 bad[2].pack.directions.north.clip.fps=10;
 assert.equal(composeRegisteredLayerGroups({base,donors:bad,equipment:{boots:9}}),null);
 const wrongSource=structuredClone(donors);
 wrongSource[2].sourceRefs=wrongSource[2].sourceRefs.filter(s=>s!==front9.source);
 assert.equal(composeRegisteredLayerGroups({base,donors:wrongSource,equipment:{boots:9}}),null);
 assert.equal(composeRegisteredLayerGroups({base,donors,equipment:{boots:380}}),null);
});

test('inventory uses the same independent HD boot sources as the map and keeps the save unchanged',async()=>{
 const {make,cv}=require('./rework-integration-support.cjs'),native=make();
 await native.ready;
 const original={gender:'masculino',hairStyle:'original',hairColor:'original',eyeStyle:'original',eyeColor:'original',skinColor:'original'};
 const options={action:'idle',direction:'south',consumer:'world'};
 const state=(boot)=>({appearance96:original,classId:'sword',equipment:{coat:{def:151},gloves:{def:152},boots:{def:boot},legs:null}});
 const a=state(9),b=state(148),saved=JSON.stringify([a,b]);
 const resolve=async(player)=>{
  assert(await native.prepareClip(player,options));
  const c=cv.createCanvas(230,270),ctx=c.getContext('2d');
  const report=native.drawFittedAvatar(ctx,player,{consumer:'inventory'});
  assert(report&&report.source.includes(':registered-slots:'),JSON.stringify(report));
  assert.deepEqual(report.omitted,[]);
  assert.equal(report.slotRoutes.boots.item,player.equipment.boots.def);
  assert.equal(report.slotRoutes.coat.item,151);assert.equal(report.slotRoutes.gloves.item,152);
  const px=ctx.getImageData(0,0,c.width,c.height).data;assert(px.some((v,i)=>i%4===3&&v>0));
  const hash=h(Buffer.from(px));c.width=1;
  return {report,hash};
 };
 const x=await resolve(a),y=await resolve(b);
 assert.deepEqual(x.report.slotRoutes.coat,y.report.slotRoutes.coat);
 assert.deepEqual(x.report.slotRoutes.gloves,y.report.slotRoutes.gloves);
 assert.notEqual(x.hash,y.hash);
 assert.equal((await resolve(a)).hash,x.hash);
 assert.equal(JSON.stringify([a,b]),saved);
});
