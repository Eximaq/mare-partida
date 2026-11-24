'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..');
require('../sprite-combat-v2-data.js');
const old=()=>false;
globalThis.MareNewIslandArt={monster:old};
globalThis.MareCharacters={monsterBalance:{moveSpeed:1},monsterAttackVisualDuration:()=>.5};
class PNGImage {
 addEventListener(){}
 set src(url){
  this.path=url;
  const png=fs.readFileSync(path.join(root,url));
  this.naturalWidth=png.readUInt32BE(16);this.naturalHeight=png.readUInt32BE(20);this.complete=true;
 }
 decode(){return Promise.resolve();}
}
globalThis.Image=PNGImage;
require('../sprite-combat-v2.js');
const api=globalThis.MareSpriteCombatV2;
const names=['shura','gendatsu','ohm'],directions=['south','north','east','west'];
test('three priests preserve the approved four-direction clip metadata and exact PNG strips',async()=>{
 for(const key of names){
  const folder='assets/sprites-combat-v2/'+key;
  const original=JSON.parse(fs.readFileSync(path.join(root,folder,'metadata.json')));
  const data=globalThis.MareSpriteCombatV2Data[key];
  assert.equal(data.name,original.name);
  assert.equal(data.monster,true);
  assert.equal(data.dungeonBoss,undefined);
  assert.equal(await api.prepare(key),true);
  for(const action of ['idle','walk','attack','hurt']) for(const direction of directions){
   const found=api.resolve(key,action,direction),{clip}=found,source=original.clips[action][direction];
   assert.equal(found.requested,true);
   assert.equal(found.facing,direction);
   assert.deepEqual({...clip,image:source.image,bounds:undefined,png_sha256:undefined},{...source,bounds:undefined,png_sha256:undefined});
   assert.equal(clip.image,folder+'/'+source.image);
   assert.equal(clip.bounds.length,clip.frames);
   assert(clip.bounds.every(([x0,y0,x1,y1])=>x0>=0&&y0>=0&&x1<=clip.size&&y1<=clip.size&&x1>x0&&y1>y0));
   assert.equal(createHash('sha256').update(fs.readFileSync(path.join(root,clip.image))).digest('hex'),clip.png_sha256);
   assert.equal(api.status(key,action,direction),'ready');
  }
 }
});
test('existing world monster adapter draws the correct strip and anchor for each priest and facing',()=>{
 for(const type of names) for(const emberFacing of directions){
  const m={type,emberFacing,x:300,y:400,alive:true,moving:0,attackAnim:0};
  const {bounds:[b]}=api.resolve(type,'idle',emberFacing).clip;
  const factor=api.monsterHeight(type)/(b[3]-b[1]), size=Math.round(128*factor);
  let draw;
  const ctx={save(){},restore(){},drawImage(im,...args){draw={im,args};}};
  for(const [action,frame] of [['idle',0],['walk',0],['attack',3],['hurt',0]]){
   m.moving=action==='walk'?1:0;m.attackAnim=action==='attack'?.5:0;
   if(action==='hurt')assert.equal(api.hurt(m,1,0),true);
   assert.equal(globalThis.MareNewIslandArt.monster(ctx,m,0),true);
   assert.equal(draw.im.path,`assets/sprites-combat-v2/${type}/${action}-${emberFacing}.png`);
   assert.deepEqual(draw.args,[frame*128,0,128,128,Math.round(300-size/2),Math.round(403-108*factor),size,size]);
   assert.equal(ctx.imageSmoothingEnabled,false);
  }
 }
 assert.equal(api.resolve('satori','hurt','north').facing,'south','legacy South Hurt unchanged');
 assert.deepEqual(api.diagnostics(),[]);
});
