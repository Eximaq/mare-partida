'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const {createCanvas}=require('@napi-rs/canvas');
global.MareCosmetics=require('../cosmetics.js');
require('../character-appearance.js');
require('../headgear-visibility.js');
const art=require('../cosmetic-art.js');
const {selectWorldHDOnly}=require('../paper-doll-96-lobby.js');

const chosen=Object.fromEntries(MareCosmetics.demoIds.map(id=>[MareCosmetics.get(id).slot,id]));
const equipment={head:{def:150},coat:{def:151},legs:{def:133},boots:{def:148},gloves:{def:25},weapon:{def:0}};

test('cosmetics alter only the HD projection and respect explicit hiding and transformations',()=>{
 const player={equipment,cosmetics:{equipped:chosen},appearance96:{gender:'masculino'}};
 const active=art.selection(player);
 assert.deepEqual(active,chosen);
 const projected=art.project(player,active);
 assert.deepEqual(projected.player.equipment,{gloves:{def:25},weapon:{def:0}});
 assert.deepEqual(player.equipment,equipment);
 assert.equal(projected.player.cosmetics,null);
 assert.equal(art.selection({...player,zoanTransformed:true}),null);
 assert.equal(art.selection({...player,equipment:{...equipment,visual_completo:{def:1}}}),null);
 const hide={...player,preferences:{hideHeadgear:true}},masked=art.project(hide,art.selection(hide));
 assert.equal(masked.shown.head,undefined);
 assert.deepEqual(art.selection({...player,cosmetics:{head:chosen.coat,weapon:chosen.legs}}),null);
 const helmet18={...player,equipment:{...player.equipment,head:{def:18}}};
 assert.equal(MareHeadgear.hidden(helmet18),false);
 assert.equal(art.project(helmet18,art.selection(helmet18)).shown.head,chosen.head);
 assert.equal(MareHeadgear.hidden({...helmet18,cosmetics:null}),true);
 assert.equal(MareHeadgear.hidden({...helmet18,preferences:{hideHeadgear:true}}),true);
});

test('female actors retain the original HD selection with this kit equipped in old data',()=>{
 const source={id:'female-base',direction:'south',action:'idle'};
 const actor={equipment,cosmetics:{equipped:chosen},appearance96:{gender:'feminino'}};
 const options={direction:'south',action:'idle',consumer:'world'};
 const nativeHD={selectVisual(player){assert.equal(player,actor);return source;}};
 assert.equal(art.selection(actor),null);
 assert.equal(selectWorldHDOnly(nativeHD,null,actor,options),source);
 assert.equal(actor.equipment,equipment);
});

function fixture(body){
 const canvas=createCanvas(512,512),ctx=canvas.getContext('2d');
 ctx.fillStyle='#edb17d';ctx.fillRect(45*4,17*4,37*4,94*4);
 if(body==='female'){ctx.fillStyle='#dfd1bc';ctx.fillRect(54*4,46*4,20*4,19*4);}
 ctx.fillStyle='#253050';ctx.fillRect(54*4,67*4,20*4,21*4);
 ctx.fillStyle='#b3b1a5';ctx.fillRect(49*4,50*4,3*4,33*4);
 const pose={NECK:{x:64,y:44},NOSE:{x:64,y:37},HIP:{x:64,y:68}};
 pose['LEFT SHOULDER']={x:75,y:48};pose['RIGHT SHOULDER']={x:53,y:48};
 return {canvas,ctx,info:{density:4,pivot:{x:256,y:448},pose},record:{id:'body',direction:'south',body}};
}
const raster=ctx=>ctx.getImageData(0,0,512,512).data;
function compare(a,b){
 const pixels=new Map();
 for(let i=0;i<a.length;i+=4)if(a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2]||a[i+3]!==b[i+3])pixels.set(i,b.slice(i,i+4));
 return pixels;
}

test('independent transparent passes compose on the male native frame',()=>{
 const body='male';
 const all=fixture(body),original=raster(all.ctx),record=art.decorate(all.record,chosen);
 const actual=art.compose(all,record,0,createCanvas);
 assert.equal(record.id,'body');
 assert.equal(actual.info.density,all.info.density);
 assert.deepEqual(actual.info.pivot,all.info.pivot);
 assert.deepEqual(actual.info.cosmeticPasses,['legs','boots','coat','head']);
 const mask=new Map();
 for(const [slot,id] of Object.entries(chosen)){
  const pose=fixture(body);
  const result=art.compose(pose,art.decorate(pose.record,{[slot]:id}),0,createCanvas);
  assert.deepEqual(result.info.cosmeticPasses,[slot]);
  const changes=compare(original,raster(pose.ctx));
  assert.ok(changes.size>60,slot+' must change the composite');
  for(const [pixel,value] of changes){
   assert.equal(mask.has(pixel),false,slot+' must stay inside its own region');
   mask.set(pixel,value);
  }
 }
 assert.deepEqual(compare(original,raster(all.ctx)),mask);
 const coat=fixture(body),before=raster(coat.ctx);
 art.compose(coat,art.decorate(coat.record,{coat:chosen.coat}),0,createCanvas);
 const low=raster(coat.ctx),evidence=compare(before,low);
 assert([...evidence.keys()].some(i=>i/4%512<64*4&&Math.floor(i/4/512)<48*4),'left shoulder is covered');
 assert([...evidence.keys()].some(i=>i/4%512>64*4&&Math.floor(i/4/512)<48*4),'right shoulder is covered');
});

test('the Chapéu de Palha must be granted separately from the starter set',()=>{
 const id='straw-hat-v3',actor={gender:'masculino'};
 const starter=MareCosmetics.execute(null,'cosmetics.claim-demo',{},actor);
 assert.equal(starter.owned.length,4);
 assert.ok(!starter.owned.includes(id));
 assert.throws(()=>MareCosmetics.execute(starter,'cosmetics.equip',{cosmeticId:id},actor),{code:'cosmetic_not_owned'});
 const granted={...starter,owned:[...starter.owned,id]};
 const equipped=MareCosmetics.execute(granted,'cosmetics.equip',{cosmeticId:id},actor);
 const switched=MareCosmetics.execute(equipped,'cosmetics.equip',{cosmeticId:'east-blue-hat'},actor);
 assert.equal(equipped.equipped.head,id);
 assert.equal(switched.equipped.head,'east-blue-hat');
 assert.deepEqual(switched.owned,granted.owned);
});

test('the imported hat uses native pixels and replaces hair only above its brim',()=>{
 const original=fixture('male'),bare=fixture('male'),asset=createCanvas(512,512);
 original.ctx.fillStyle='#172135';
 original.ctx.fillRect(201,68,12,78);
 bare.ctx.clearRect(201,68,6,24);
 bare.ctx.fillStyle='#e4ab72';
 bare.ctx.fillRect(207,93,6,35);
 const ink=asset.getContext('2d');
 ink.fillStyle='#d79739';ink.fillRect(196,72,120,51);
 const actor={appearance96:{gender:'masculino',hairStyle:'hair-wavy',eyeColor:'green'}};
 const record=art.decorate(original.record,{head:'straw-hat-v3'},actor,player=>{
  assert.equal(player.appearance96.hairStyle,'none');
  assert.equal(player.appearance96.eyeColor,'green');
  return bare.record;
 });
 assert.equal(actor.appearance96.hairStyle,'hair-wavy');
 assert.equal(art.hatFile(record),'assets/player-cosmetics/straw-hat-v3/sul.png');
 assert.equal(art.hatHairless(record),bare.record);
 const out=art.compose(original,record,0,createCanvas,null,{image:asset,hairless:bare});
 const rgba=(x,y)=>Array.from(original.ctx.getImageData(x,y,1,1).data);
 assert.deepEqual(out.info.cosmeticPasses,['head']);
 assert.deepEqual(rgba(203,70),[0,0,0,0]);
 assert.deepEqual(rgba(203,122),[215,151,57,255]);
 assert.deepEqual(rgba(203,123),[23,33,53,255]);
 assert.deepEqual(rgba(185,160),[237,177,125,255]);
});

test('the side views move one logical pixel toward the face',()=>{
 const {info,record}=fixture('male');
 const cases=[
  ['south',64,44,0],
  ['north',64,41.5,0],
  ['east',64.75,42,4],
  ['west',63.25,42,-4]
 ];
 for(const [direction,x,y,offset] of cases){
  const {x:dx,y:dy}=art.hatPlacement({...record,direction},{...info,pose:{NECK:{x,y}}},0);
  assert.deepEqual([dx,dy],[offset,0],direction);
 }
});
