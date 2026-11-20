'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const R=path.dirname(__dirname),load=require(path.join(R,'tools/rework-hd-test-loader.cjs')).create(R);
const {cv}=require(path.join(R,'tests/rework-integration-support.cjs')),A=require(path.join(R,'character-appearance'));
const playerFile=path.join(R,'player-rework-native-hd.js');
const live=require(path.resolve(playerFile));
const opts={fetchJSON:async f=>{const p=path.join(R,f);return JSON.parse(fs.existsSync(p)?fs.readFileSync(p):require('node:zlib').gunzipSync(fs.readFileSync(p+'.gz')))},loadImage:load,makeCanvas:cv.createCanvas};
const api=live.create(opts),o={action:'walk',direction:'east',consumer:'world',x:320,y:640},from=Number(process.env.FROM||0),to=Number(process.env.TO||10),tone=process.env.SKIN||'ebony';
const look={gender:'feminino',hairStyle:'original',hairColor:'black',eyeStyle:'original',eyeColor:'green',skinStyle:'natural'};
const saved=(skin,coat,extra={},override={})=>JSON.parse(JSON.stringify(A.commit({id:'disposable-coat67',classId:'brawler',equipment:{...(coat?{coat:{def:coat}}:{}),...extra}},{...look,skinColor:skin,...override},()=>true)));
const tag=':authored-east-neck',own='female-coat67-east-own-bare-v1',D=r=>r.pack.directions.east;
const imgCache=new Map(),PNG=(h,base=false)=>{const k='tools/rework-'+(base?'base':'modular-outfits')+'-hd/assets/'+h+'.png';if(!imgCache.has(k))imgCache.set(k,load(k));return imgCache.get(k);};
const C=()=>cv.createCanvas(512,512),pixels=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
const registry=require(path.join(R,'tools/rework-modular-outfits-hd/index.json')),ownership=require(path.join(R,'tools/rework-accessories/female-original-face-ownership.json')).directions.east;
const sample=[6,7].map(i=>registry.records.find(r=>r.id==='female-torso'+i+'-east-frozen-walk-native'));
const core=D(sample[0]).layers.filter(l=>l.id.startsWith('base:')),head=core.at(-1),plan={...sample[0].pack,directions:{east:{...D(sample[0]),layers:[head]}}};
const ord=global.ReworkAccessoryVendor.compositor,skin=global.MareNativeSkinHD,pal=global.MareAppearance96;
const render=async(q,p,f)=>{
 const opt={...o,time:(f+.25)/40};let image,args;
 assert(await q.prepare(p,opt),q.failureFor(p,opt)||'Native prepare failed');
 assert(q.draw({save(){},restore(){},drawImage(c,...a){image=c;args=a;}},p,opt),q.failureFor(p,opt)||'Native draw failed');
 const s=q.snapshot().last;
 assert(s.state==='rendered'&&s.consumer==='world'&&s.direction==='east'&&s.action==='walk'&&s.frame===f&&s.sourceScale===1);
 assert(image.width===512&&image.height===512);
 return {px:pixels(image),args};
};
const paintAt=(im,f)=>{const c=C();ord.render(c.getContext('2d'),plan,new Map([[head.source,im]]),{direction:'east',frame:f,density:4});const p=pixels(c);c.width=1;return p;};
async function union(layers,f){
 const c=C(),ctx=c.getContext('2d');
 for(const l of layers){assert.equal(l.binding.kind,'fixed');ctx.drawImage(await PNG(l.frames?.[f]||l.source),0,0);}
 const p=pixels(c);c.width=1;return p;
}
function control(){
 // Test-only compilation of the same module with only the proof's head-material
 // flag disabled. The registered routes, equipment, base and clock remain genuine.
 const src=fs.readFileSync(playerFile,'utf8'),anchor='return {...material,id:material.id+\':authored-east-neck\',profileNeckRestore:true};';
 assert.equal(src.split(anchor).length,2,'the control must disable exactly one narrowly registered flag');
 const m={exports:{}},previous=global.MareReworkNativeHD;
 try{new Function('module','require',src.replace(anchor,anchor.replace('Restore:true','Restore:false')))(m,require);}
 finally{global.MareReworkNativeHD=previous;}
 return m.exports.create(opts);
}
const plansEqual=(a,b)=>{const {layers:L,...t}=D(a),{layers:M,...u}=D(b);assert.deepEqual(t,u);for(const field of ['pivot','density','frame'])assert.deepEqual(a.pack[field],b.pack[field]);};
const noneRoute=(q,p,opt=o)=>!q.selectVisual(p,opt)?.id.includes(own)&&!q.selectVisual(p,opt)?.id.endsWith(tag);
(async()=>{
 await api.ready;
 for(const sk of Object.keys(A.skins)){
  const p=saved(sk),initial=JSON.stringify(p),bare=api.selectVisual(p,o);
  assert(bare.id.startsWith(own)&&bare.id.endsWith(tag));
  assert.deepEqual(bare.equipment,{});assert.deepEqual(bare.omitted,[]);assert.deepEqual(bare.slotRoutes,{});
  for(const coat of [6,7,6]){
   p.equipment.coat={def:coat};const w=api.selectVisual(p,o);
   assert(w.id.startsWith('female-torso'+coat+'-east-frozen-walk-native')&&w.id.endsWith(tag));
   assert.deepEqual(D(bare).layers,D(w).layers.filter(l=>l.id.startsWith('base:')));plansEqual(w,bare);
   assert.deepEqual(w.baseMaterialSources,bare.baseMaterialSources);assert.deepEqual(w.colorAppearance,bare.colorAppearance);
   for(const r of [w,bare]){const h=r.femaleNamedHairRecord;assert(h.profileNeckRestore&&!h.profileNeckBridge);assert.equal(h.ownership.walkHead,head.source);assert.equal(h.eyeColor,'green');assert.equal(h.hairColor,'black');assert.equal(h.skinColor,sk);}
   assert.deepEqual(D(w).clip,{frames:40,fps:40,loop:true});
   delete p.equipment.coat;assert.deepEqual(api.selectVisual(p,o),bare);assert.equal(JSON.stringify(p),initial);
  }
 }
 const original={appearance96:{...look,version:1,hairColor:'original',eyeColor:'original',skinColor:'original'},equipment:{}};
 for(const coat of [null,6,7]){original.equipment=coat?{coat:{def:coat}}:{};assert(noneRoute(api,original));}
 for(const e of [{gloves:{def:26}},{legs:{def:133}},{boots:{def:155}},{weapon:{def:0}},{head:{def:19}},{coat:{def:6,variant:'alt'}}])assert(noneRoute(api,{...saved(tone,null,e),preferences:{hideHeadgear:true}}));
 for(const p of [{hairStyle:'hair-bob'},{eyeStyle:'face-calm'},{eyeColor:'blue'},{hairColor:'blonde'},{gender:'masculino'}])assert(noneRoute(api,saved(tone,null,{},p)));
 for(const p of [{direction:'west'},{direction:'north'},{direction:'south'},{action:'idle'},{consumer:'portrait'},{weaponless:true}])assert(noneRoute(api,saved(tone),{...o,...p}));
 if(process.env.SELECT_ONLY){console.log('8 saves and strict route guards');return;}
 const off=control();await off.ready;
 const wc=C(),wcCtx=wc.getContext('2d'),wide=cv.createCanvas(640,640),ox=wide.getContext('2d');
 wcCtx.drawImage(await PNG(ownership.walkHead,true),0,0);
 for(const l of [...ownership.attackLayers].sort((a,b)=>a.depth-b.depth))ox.drawImage(await PNG(l.source,true),0,0);
 const raw=pixels(wc),body=Buffer.from(ox.getImageData(64,64,512,512).data),matte=C(),mc=matte.getContext('2d'),im=mc.createImageData(512,512),safe=C(),safeCtx=safe.getContext('2d');
 let n=0;
 for(const l of ownership.attackLayers.filter(l=>['iris','hair'].includes(l.id)))safeCtx.drawImage(await PNG(l.source,true),-64,-64);
 assert.deepEqual(ownership.walkDifferenceBounds,[246,166,271,169]);
 for(let y=166;y<=169;y++)for(let x=246;x<=271;x++){const j=(y*512+x)*4;if(raw[j+3]===255&&raw.readUInt32LE(j)!==body.readUInt32LE(j)){im.data.set(raw.subarray(j,j+4),j);n++;}}
 assert.equal(n,103);mc.putImageData(im,0,0);
 const expected=C(),ec=expected.getContext('2d'),pix=ec.createImageData(512,512);pix.data.set(pal.recolor(im.data,skin.mask(im.data,512,'anatomy'),pal.skins[tone].ramp));ec.putImageData(pix,0,0);
 for(let f=from;f<to;f++){
  const m=paintAt(matte,f),e=paintAt(expected,f),s=paintAt(safe,f),p=saved(tone,6),visible={},old={};
  const masks=await Promise.all(sample.map(r=>union(D(r).layers.filter(l=>!l.id.startsWith('base:')),f)));
  for(const [key,coat] of [['A',6],['B',7],['bare',null],['restored',6]]){
   if(coat)p.equipment.coat={def:coat};else delete p.equipment.coat;
   const save=JSON.stringify(p);visible[key]=await render(api,p,f);assert.equal(JSON.stringify(p),save);
   if(key!=='restored')old[key]=await render(off,p,f);
  }
  assert(visible.A.px.equals(visible.restored.px));for(const k of ['B','bare','restored'])assert.deepEqual(visible.A.args,visible[k].args);
  for(const [u,v,indices] of [['A','B',[0,1]],['A','bare',[0]],['B','bare',[1]]]){
   let changed=0;for(let j=0;j<m.length;j+=4)if(visible[u].px.readUInt32LE(j)!==visible[v].px.readUInt32LE(j)){assert(indices.some(i=>masks[i][j+3]>0),'equipment change outside authored coat');changed++;}
   assert(changed>1000);
  }
  const metrics={};
  for(const k of ['A','B','bare']){
   let delta=0,residual=0,anchors=0;const a=visible[k].px,b=old[k].px;
   for(let j=0;j<m.length;j+=4){
    const aa=a.readUInt32LE(j),bb=b.readUInt32LE(j);assert.equal(a[j+3],b[j+3]);
    if(aa!==bb){assert(m[j+3]&&!s[j+3],'neck correction beyond own matte / hair / iris');delta++;}
    if(k==='bare'&&m[j+3]===255&&bb===m.readUInt32LE(j)){anchors++;assert.equal(aa,e.readUInt32LE(j));residual+=+(aa===bb);}
   }
   if(k==='bare'){assert(delta===103&&!residual);if(tone==='ebony')assert.equal(anchors,19);}
   metrics[k]=[delta,anchors];
  }
  const counts={},bare=visible.bare.px,ownBody={};
  for(const [label,minimumY] of [['arms',260],['legs',390]]){
   const l=core.find(x=>x.id==='base:'+label),source=await union([l],f),colored=Buffer.from(pal.recolor(source,skin.mask(source,512,'anatomy'),pal.skins[tone].ramp));
   ownBody[label]=source;const active=[0,0];
   for(let j=minimumY*512*4;j<source.length;j+=4)if(source[j+3]===255&&source.readUInt32LE(j)!==colored.readUInt32LE(j)&&bare.readUInt32LE(j)===colored.readUInt32LE(j))active[+(j/4%512>=280)]++;
   assert(label==='legs'?active.every(n=>n>50):active[0]+active[1]>50,`own saved ${label} absent`);counts[label]=active;
  }
  const cloth=await union(core.filter(l=>['base:shorts','base:top'].includes(l.id)),f);let clothPixels=0;
  for(let j=210*512*4;j<cloth.length;j+=4)if(cloth[j+3]===255&&!ownBody.arms[j+3]){
   assert.equal(bare.readUInt32LE(j),cloth.readUInt32LE(j),'other outfit piece was recolored');clothPixels++;
  }
  assert(clothPixels>1000);
  console.log(tone,f,JSON.stringify({metrics,counts,clothPixels}));global.gc?.();
 }
})().catch(e=>{console.error(e);process.exitCode=1});
