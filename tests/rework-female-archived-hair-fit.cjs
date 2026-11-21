"use strict";
const fs=require('node:fs'),p=require('node:path'),a=require('node:assert/strict'),crypto=require('node:crypto');
const root=p.resolve(__dirname,'..');
const {make,cv}=require('./rework-integration-support.cjs');
const current=require('../player-rework-female-named-hair-hd.js');
const baseline=process.env.KAIZOKU_BASELINE_FEMALE_HAIR;
const oldModule=baseline?require(baseline):current;
global.MareFemaleNamedHairHD=oldModule;
const oldWorld=make(),nextModule=current;
let nextWorld;const vendor=global.ReworkAccessoryVendor,access=p.join(root,'tools/rework-accessories');
const index=require(p.join(access,'head-layer-index.json')),ownership=require(p.join(access,'female-original-face-ownership.json'));
const baseIndex=require(p.join(root,'tools/rework-base-hd/index.json')),baseFactory=global.MareReworkBaseHD.create(baseIndex);
const old=oldModule.create(index,ownership,{baseRegistry:baseFactory,makeCanvas:cv.createCanvas}),next=nextModule.create(index,ownership,{baseRegistry:baseFactory,makeCanvas:cv.createCanvas});
const adjFolder='hair_user_adjustments_source-only_v1', archive=require(p.join(access,adjFolder,'adjustments.json'));
a.equal(archive.adjustments.length,27);
a.equal(crypto.createHash('sha256').update(JSON.stringify(archive.adjustments)).digest('hex'),'9e882769200d595eb7a81d5329bde15e2ada3a216234b46e41a2543cb28a5ea9');
const incoming=archive;
const HP='tools/rework-accessories/assets/', checks=new Set, l=require(p.join(root,'tools/rework-hd-test-loader.cjs')).create(root),cm=new Map;
const load=async f=>{if(!cm.has(f)){if(f.startsWith(HP)&&!checks.has(f)){a.equal(crypto.createHash('sha256').update(fs.readFileSync(p.join(root,f))).digest('hex'),p.basename(f,'.png'));checks.add(f);}cm.set(f,l(f));}return cm.get(f);};
const files=async paths=>new Map(await Promise.all([...new Set(paths)].map(async f=>[f,await load(f)])));
const raster=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
const neutral={hair:'none',appearance:{skin:'original',face:'original',hairColor:'original',eyeColor:'original'}};
function sum(x,y){let n=0;for(let i=0;i<x.length;i+=4)if(x.readUInt32LE(i)!==y.readUInt32LE(i))n++;return n;}
function drawBase(b){
 const tagged=b.pack.directions[b.direction];
 return tagged.layers.find(l=>l.slot==='headBase');
}
async function proof(entry){
 const {direction,style}=entry.target, row=index.records.find(r=>r.package===adjFolder&&r.snapshot===entry.target.snapshot&&r.direction===direction&&r.style===style);
 a(row);a.deepEqual(row.adjustmentRecord.adjustment,entry.adjustment);
 const b=baseFactory.resolve({body:'female',direction,action:'attack-unarmed',appearance:{hair:'original',skin:'original',face:'original'},equipment:{}});
 a(b?.pack?.directions[direction]);a(drawBase(b));
 const head=next.resolve(b,{...neutral,hair:style}),behind=next.resolve(b,neutral),prev=old.resolve(b,{...neutral,hair:style});
 a(head&&behind&&prev);
 const images=await files([...next.requiredFiles(head),...next.requiredFiles(behind),...old.requiredFiles(prev),...row.sourceRefs.map(h=>HP+h+'.png')]);
 const map=new Map(row.sourceRefs.map(h=>[h,images.get(HP+h+'.png')]));
 const prep=vendor.hairPreview.prepare(row.entry,direction,map,vendor.hairFemale.adjustment(entry.adjustment,row.entry,direction),cv.createCanvas),
       qd=prep.pack.directions[direction];
 qd.layers=qd.layers.filter(x=>x.slot==='hair');
 const tile=cv.createCanvas(512,512);vendor.compositor.render(tile.getContext('2d'),prep.pack,prep.images,{direction,frame:0,density:4});
 const backing=next.compose(b,behind,images),expected=cv.createCanvas(backing.width,backing.height),ec=expected.getContext('2d');
 const bn=b.pack.directions[direction].rest.NECK, sn=row.rest.NECK;
 ec.drawImage(backing,0,0);ec.drawImage(tile,Math.round((bn.x-sn.x)*4),Math.round((bn.y-sn.y)*4));
 const reference=raster(expected),before=raster(old.compose(b,prev,images)),after=raster(next.compose(b,head,images));
 const mismatch=sum(reference,after),priorMismatch=sum(reference,before),moved=sum(before,after);
 console.log('VENDOR',direction,style,'priorMismatch',priorMismatch,'mismatch',mismatch,'changed',moved);
 a.equal(mismatch,0,`vendor RGBA mismatch ${direction}/${style}`);
}
async function capture(world,player,opt,frame,n){
 const options={...opt,progress:(frame+.1)/n,x:416,y:600};
 a(await world.prepare(player,options),JSON.stringify(world.snapshot()));
 const c=cv.createCanvas(832,832),ctx=c.getContext('2d'),orig=ctx.drawImage.bind(ctx);
 let tile;ctx.drawImage=(src,...args)=>{tile=src;return orig(src,...args);};a(world.draw(ctx,player,options));a(tile);const pixels=raster(tile);c.width=1;return pixels;
}
async function north(){
 const o={consumer:'world',direction:'north',action:'attack-firearm'};
 const appearance96={gender:'feminino',hairStyle:'hair-undercut',hairColor:'original',eyeColor:'original',eyeStyle:'original',skinColor:'original'};
 for(const item of [113,114])for(const head of [null,129,178]){
  const player={classId:'gunner',appearance96,equipment:{weapon:{def:item},...(head?{head:{def:head}}:{})}},save=JSON.stringify(player);
  const x=oldWorld.selectVisual(player,o),y=nextWorld.selectVisual(player,o);
  if(!x||!y){console.log('PREEXISTING_UNCOVERED',item,head);a.equal(!!x,!!y);continue;}
  a.deepEqual(x.states,y.states);a.deepEqual(x.pack,y.pack);a.deepEqual(x.northFirearmHeadRecoil,[0,0,0,0,9,0,0,0]);a.deepEqual(x.northFirearmHeadRecoil,y.northFirearmHeadRecoil);
  const xh=x.material,yh=y.material;a(xh&&yh);
  const images=await files([...old.requiredFiles(xh),...next.requiredFiles(yh)]);
  const oldH=old.compose(x.baseRecord,xh,images),nextH=next.compose(y.baseRecord,yh,images);
  const h0=raster(oldH),h1=raster(nextH),W=oldH.width,headDelta=sum(h0,h1);
  for(const f of [0,4,7]){
   const u=await capture(oldWorld,player,o,f,8),v=await capture(nextWorld,player,o,f,8),delta=sum(u,v);let out=0;
   for(let i=0;i<u.length;i+=4){if(u.readUInt32LE(i)===v.readUInt32LE(i))continue;const sy=Math.floor(i/4/W)-x.northFirearmHeadRecoil[f],sx=i/4%W,k=(sy*W+sx)*4;
    if(sy<0||!(h0[k+3]||h1[k+3])||h0.readUInt32LE(k)===h1.readUInt32LE(k))out++;}
   console.log('RUNTIME',item,head,f,'changed',delta,'head',headDelta,'outside',out);
   a.equal(out,0);if(head)a.equal(delta,0);else if(baseline)a(delta>0);
  }
  a.equal(JSON.stringify(player),save);
 }
}
async function lateral(){
 const appearance96=global.MareCharacterAppearance.normalize({gender:'feminino',hairStyle:'hair-long',hairColor:'pink',eyeStyle:'face-calm',eyeColor:'green',skinColor:'ebony'});
 const player={classId:'brawler',appearance96,equipment:{}},saved=JSON.stringify(player);
 for(const direction of ['east','west']){
  const o={consumer:'world',direction,action:'attack-unarmed'},x=oldWorld.selectVisual(player,o),y=nextWorld.selectVisual(player,o);
  a(x&&y);a.deepEqual(x.pack,y.pack);a.deepEqual(x.colorAppearance,y.colorAppearance);
  const r=x.femaleNamedHairRecord,s=y.femaleNamedHairRecord;a(r&&s);a.deepEqual(r,s);
  const images=await files([...old.requiredFiles(r),...next.requiredFiles(s)]);
  const h0=raster(old.compose(x,r,images)),h1=raster(next.compose(y,s,images)),n=x.pack.directions[direction].clip.frames;
  for(let f of [0,Math.floor(n/2),n-1]){
   const u=await capture(oldWorld,player,o,f,n),v=await capture(nextWorld,player,o,f,n),delta=sum(u,v);
   a.equal(u.length,h0.length);a.equal(v.length,h1.length);let out=0;
   for(let i=0;i<u.length;i+=4)if(u.readUInt32LE(i)!==v.readUInt32LE(i)&&h0.readUInt32LE(i)===h1.readUInt32LE(i))out++;
   console.log('LATERAL',direction,f,'changed',delta,'outside',out);
   if(baseline)a(delta>0);a.equal(out,0);
  }
 }
 a.equal(JSON.stringify(player),saved);
}
(async()=>{global.MareFemaleNamedHairHD=oldModule;await oldWorld.ready;global.MareFemaleNamedHairHD=nextModule;nextWorld=make();await nextWorld.ready;for(const e of incoming.adjustments)await proof(e);await north();await lateral();console.log('PASS, archived hairstyle fixtures and unchanged attack geometry');})().catch(e=>{console.error(e);process.exitCode=1;});
