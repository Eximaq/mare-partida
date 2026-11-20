'use strict';
const g=Number(process.env.GLOVE||26),pantsId=Number(process.env.PANTS||182);
const p=require('path'),a=require('node:assert/strict'),C=require('crypto');
if(!process.argv[2]){
 for(const def of (process.env.PANTS?[pantsId]:process.env.GLOVE?[182]:[182,147,161]))for(const item of (process.env.GLOVE?[g]:[25,26,131,138,145,152,159,166,173]))for(const d of ['east','west']){
  const r=require('node:child_process').spawnSync(process.execPath,[__filename,d],{stdio:'inherit',env:{...process.env,GLOVE:String(item),PANTS:String(def)}});
  if(r.error)throw r.error;if(r.status!==0)process.exit(r.status||1);
 }
 process.exit(0);
}
const R=p.resolve(process.env.KAIZOKU_REPO||p.join(__dirname,'..')),{make,cv}=require(p.join(R,'tests/rework-integration-support.cjs')),fs=require('fs');
const w=make();
const run=process.env.KAIZOKU_SELECTOR?require(process.env.KAIZOKU_SELECTOR).create({fetchJSON:async f=>JSON.parse(fs.readFileSync(p.join(R,f))),loadImage:require(p.join(R,'tools/rework-hd-test-loader.cjs')).create(R),makeCanvas:cv.createCanvas}):w;
const load=require(p.join(R,'tools/rework-hd-test-loader.cjs')).create(R),rows=require(p.join(R,'tools/rework-modular-outfits-hd/index.json')).records;
const px=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
const hash=b=>C.createHash('sha256').update(b).digest('hex');
const d=process.argv[2]||'east',o={action:'walk',direction:d,consumer:'world'};
a(['east','west'].includes(d));
const r=rows.find(r=>r.id===`frozen-female-glove${g}-${d}-walk-native-layers`);
const ownRefs={131:{east:'ref-1029',west:'ref-1030'},138:{east:'ref-0708',west:'ref-0709'},173:{east:'ref-0718',west:'ref-0719'},152:{east:'ref-0712',west:'ref-0713'},25:{east:'ref-0978',west:'ref-0979'}};
if(ownRefs[g])a.equal(r.frozenGloveSourceRef,ownRefs[g][d]);
const q=rows.find(r=>r.id===`approved-female151-v64-walk-${d}-pants${pantsId}`);
const x=q.pack.directions[d],y=r.pack.directions[d],gloves=y.layers.filter(l=>l.id.startsWith(`own-female${g}-`));
const pants=l=>l.id.startsWith('approved-'),extras=l=>l.id.startsWith('pants154-')||l.id.startsWith('boot155-')||gloves.includes(l);
const bootFront=y.layers.filter(l=>l.id.startsWith('boot155-')&&l.depth>29.5);
const {layers:lx,...gx}=x,{layers:ly,...gy}=y;
a.deepEqual(gx,gy);a.deepEqual(lx.filter(l=>!pants(l)),ly.filter(l=>!extras(l)));
a.deepEqual(gloves.map(l=>l.depth),[29.5,9.5]);a.deepEqual(gloves.map(l=>l.binding.kind),['fixed','fixed']);
if(g===131){
 a.deepEqual(gloves.map(l=>new Set(l.frames).size),[10,9]);
 a.equal(hash(JSON.stringify(gloves)),{east:'4f2bd9bac4f0f3dfda6755954a5f7b75763ed7e00c975f12015b07a11f44ad47',west:'426036e20a109c355d26fd87596b8a0b1fbda130292e7beead84e9ec239b00a7'}[d]);
}
a.deepEqual(q.pack.frame,r.pack.frame);a.deepEqual(q.pack.pivot,r.pack.pivot);
const refs=[...new Set(gloves.flatMap(l=>l.frames))];a(refs.every(h=>r.sourceRefs.includes(h)));
const appearance96=JSON.parse(JSON.stringify(global.MareCharacterAppearance.normalize({gender:'feminino',hairStyle:'original',hairColor:'brown',eyeStyle:'original',eyeColor:'brown',skinColor:'light'})));
for(const [key,value] of Object.entries({gender:'feminino',hairStyle:'original',hairColor:'brown',eyeStyle:'original',eyeColor:'brown',skinColor:'light'}))a.equal(appearance96[key],value);
const actor={appearance96,classId:'sword',equipment:{coat:{def:151},legs:{def:pantsId}}};
const raw=f=>'tools/rework-modular-outfits-hd/assets/'+f+'.png';
const mask=async (width,height,z,f)=>{
 const c=cv.createCanvas(width,height),cx=c.getContext('2d');
 for(const g of z){const im=await load(raw(g.frames?.[f]||g.source));a.equal(im.width,width);a.equal(im.height,height);cx.drawImage(im,0,0);}
 const m=px(c);c.width=1;return m;
};
async function stage(actor,source){
 const b=await run.prepareConfiguration([{player:actor,options:o,source}],{resolve:x=>x});
 return {release(){b.release();},draw(f,player=actor){let c;a(b.draw({save(){},restore(){},drawImage(v){c=v;}},player,{...o,progress:(f+.25)/40}));return c;}};
}
(async()=>{await run.ready;
 const native=run.selectVisual(actor,o);a.equal(native?.id,q.id);
 const gloveActor={...actor,equipment:{...actor.equipment,gloves:{def:g}}};
 const combo=run.selectVisual(gloveActor,o);
 a.deepEqual(combo?.slotRoutes?.gloves,{item:g,quality:'hd',source:r.id});
 a.deepEqual(combo.omitted,[]);a.equal(combo.slotRoutes.legs.item,pantsId);a.equal(combo.slotRoutes.coat.item,151);
 a.deepEqual(combo.pack.directions[d].layers,[...x.layers,...gloves]);
 a.deepEqual({...combo.pack.directions[d],layers:x.layers},x);
 a.deepEqual(combo.pack.pivot,native.pack.pivot);
 const swapId=g===26?([147,161].includes(pantsId)?166:145):26;
 const swapped={...gloveActor,equipment:{...gloveActor.equipment,gloves:{def:swapId}}},other=run.selectVisual(swapped,o);
 a.equal(other.slotRoutes.gloves.item,swapId);
 a.deepEqual(other.pack.directions[d].layers.filter(l=>!l.id.startsWith('own-female')),x.layers);
 a.notDeepEqual(other.pack.directions[d].layers.slice(-2),gloves);
 const controls=[
  {...gloveActor,appearance96:{...appearance96,skinColor:'ebony'}},
  {...gloveActor,appearance96:{...appearance96,hairStyle:'hair-bob'}},
  {...gloveActor,appearance96:{...appearance96,eyeColor:'green'}},
  {...gloveActor,equipment:{...gloveActor.equipment,legs:{def:175}}},
  {...gloveActor,equipment:{...gloveActor.equipment,gloves:{def:180}}},
  {...gloveActor,equipment:{...gloveActor.equipment,gloves:{def:g,variant:'other'}}},
  {...gloveActor,equipment:{...gloveActor.equipment,boots:{def:155}}}];
 for(const a0 of controls)a.notEqual(run.selectVisual(a0,o)?.slotRoutes?.gloves?.source,r.id);
 for(const delta of [{action:'idle'},{action:'attack-unarmed'},{direction:'north'},{direction:'south'}])
  a.notEqual(run.selectVisual(gloveActor,{...o,...delta})?.slotRoutes?.gloves?.source,r.id);
 const oldActor={...actor,equipment:{coat:{def:151},legs:{def:154},boots:{def:155},gloves:{def:g}}};
 const old={...r,hdKind:'outfit'};
 const kitBareActor={...oldActor,equipment:{coat:{def:151},legs:{def:154},boots:{def:155}}};
 const oldBare={...old,id:r.id+':local-bare-control',pack:{...r.pack,directions:{...r.pack.directions,[d]:{...y,layers:y.layers.filter(l=>!gloves.includes(l))}}}};
 const [u,v,j,k]=await Promise.all([stage(actor,native),stage(gloveActor,combo),stage(oldActor,old),stage(kitBareActor,oldBare)]);
 const results=[];
 for(let f=0;f<40;f++){
  const oc=u.draw(f),u0=px(oc),u1=px(v.draw(f)),j0=px(k.draw(f)),j1=px(j.draw(f));
  const oldLower=await mask(oc.width,oc.height,y.layers.filter(l=>extras(l)&&!gloves.includes(l)),f);
  const gm=await mask(oc.width,oc.height,gloves,f),lower=await mask(oc.width,oc.height,x.layers.filter(pants),f),arm=await mask(oc.width,oc.height,x.layers.filter(l=>l.id==='native-visible-near-arm-manual'),f),foot=await mask(oc.width,oc.height,bootFront,f);
  let covered=0,overlap=0,baseDiff=0,touchDiff=0,changed=0,out=0,opaqueDiff=0,footOverlap=0,armDiff=0,foreignBG=0;
  let exposed=0,exposedDiff=0;
  for(let i=0;i<u0.length;i+=4){
   if(arm[i+3]===255&&!gm[i+3]){
    exposed++;if(u1.readUInt32LE(i)!==j1.readUInt32LE(i))exposedDiff++;
   }
   if(u0.readUInt32LE(i)!==u1.readUInt32LE(i)){changed++;if(!gm[i+3])out++;}
   if(arm[i+3]===255&&u1.readUInt32LE(i)!==j1.readUInt32LE(i))armDiff++;
   if(!gm[i+3])continue;
   if(foot[i+3])footOverlap++;
   if(gm[i+3]===255&&u1.readUInt32LE(i)!==j1.readUInt32LE(i))opaqueDiff++;
   covered++;if(lower[i+3])overlap++;
   if(u0.readUInt32LE(i)!==j0.readUInt32LE(i))baseDiff++;
   if(u1.readUInt32LE(i)!==j1.readUInt32LE(i)){touchDiff++;if(!lower[i+3]&&!oldLower[i+3])foreignBG++;}
  }
  a(covered&&changed);
  delete gloveActor.equipment.gloves;
  a.equal(run.selectVisual(gloveActor,o).id,native.id);
  a(u0.equals(px(u.draw(f,gloveActor))),'un-equipping glove restores approved pants and C151 RGBA');
  gloveActor.equipment.gloves={def:g};
  a.equal(run.selectVisual(gloveActor,o).id,combo.id);
  a(u1.equals(px(v.draw(f,gloveActor))),'re-equipping glove restores the same HD combination');a.equal(out,0,'other body/material changes');
  a.equal(opaqueDiff+footOverlap+armDiff+foreignBG+exposedDiff,0,'skin/opaque glove/depth or unknown background changed');
  results.push({f,covered,overlap,baseDiff,touchDiff,changed,opaqueDiff,footOverlap,armDiff,foreignBG,exposed,exposedDiff,base:hash(u0),withGlove:hash(u1)});
 }
 for(const s of [u,v,j,k])s.release();
 const output={direction:d,approvedPants:q.id,gloveSource:r.id,gloveAssetCount:refs.length,poses:results,allMatched:results.every(z=>!z.opaqueDiff&&!z.footOverlap&&!z.armDiff&&!z.foreignBG)};
 a(output.allMatched);a.equal(results.length,40);
 console.log(g,d,output.allMatched,Object.fromEntries(['overlap','baseDiff','touchDiff','changed','opaqueDiff','footOverlap','armDiff','exposed','exposedDiff'].map(k=>[k,Math.max(...results.map(r=>r[k]))])));
})().catch(e=>{console.error(e);process.exitCode=1});
