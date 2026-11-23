'use strict';
const path=require('node:path'),assert=require('node:assert/strict');
const R=process.env.STAGE||path.resolve(__dirname,'..'),req=f=>require(path.join(R,f));
const {make,cv}=req('tests/rework-integration-support.cjs'),A=req('character-appearance'),load=req('tools/rework-hd-test-loader.cjs').create(R);
const items=req('item-catalog').create({forge:req('forge-system'),prison:req('prison-system'),haki:req('haki-system'),akuma:req('akuma-system'),hakiProgression:req('haki-progression')}).items;
const baseRegistry=global.MareReworkBaseHD.create(req('tools/rework-base-hd/index.json'));
const appearanceRegistry=global.MareFemaleNamedHairHD.create(req('tools/rework-accessories/head-layer-index.json'),req('tools/rework-accessories/female-original-face-ownership.json'),{baseRegistry,makeCanvas:cv.createCanvas});
const reg=global.MareReworkFemaleEquipmentHD.create({schema:'female-native-equipment-registration-v1',records:[]},{appearanceRegistry,makeCanvas:cv.createCanvas});
const o={consumer:'world',action:'walk',direction:'south'},opts=(f,ticks)=>({...o,progress:(f+.125)/ticks});
const actor=(w,b,skinColor)=>A.commit({classId:items[w].type,equipment:{weapon:{def:w},boots:b==null?null:{def:b}}},{gender:'feminino',skinColor,...(skinColor==='ebony'?{hairStyle:'hair-cropped',hairColor:'blue'}:{})},()=>true);
const C=(w=512)=>cv.createCanvas(w,w),pixels=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
const bytes=(b,p,o)=>{let c;assert(b.draw({save(){},restore(){},drawImage(v){c=v;}},p,o));return pixels(c);};
const file=h=>'tools/rework-modular-outfits-hd/assets/'+h+'.png';
const sample=[[4,176],[12,176],[5,176],[119,176]].filter(([w])=>!process.env.WEAPON||+process.env.WEAPON===w);
const palettes=process.env.SKIN?[process.env.SKIN]:['light','ebony'];
async function run(){
 const api=make();await api.ready;
 let tested=0,blended=0;
 const clean=(skin,equipped)=>A.commit({classId:'brawler',equipment:equipped?{boots:{def:176}}:{}},{gender:'feminino',skinColor:skin},()=>true);
 if(!process.env.SKIP_BARE)for(const skin of palettes){
  const wearing=clean(skin,true),without=clean(skin,false),keep=api.selectVisual(without,o),selected=api.selectVisual(wearing,o);
  assert(selected?.authoredPantsLayer?.item==null&&selected?.authoredPantsLayer?.layers.length===4,'B176 needs independently selected gait');
  assert(selected.authoredPantsLayer.layers.every(l=>l.id.startsWith('boot176-')));
  assert.deepEqual(selected.anatomyBase.pack,keep.pack);
  const dressed=await api.prepareConfiguration([{player:wearing,options:o}]),base=await api.prepareConfiguration([{player:without,options:o}]);
  const {spec,layers}=selected.authoredPantsLayer;
  const official=req('tools/rework-modular-outfits-hd/index.json').records.find(r=>r.id==='frozen-v47-female-151-boot176-south-walk');
  assert.equal(official.sourceAuthoritySHA256,'3009aa550bb34d93e914518f5ac55d36e5e2ace8900fc9b546149db7df8aec4d');
  try{for(let t=0;t<40;t++){
   const phase=spec.frameToPhase[t];
   if(spec.frameToPhase[t-1]===phase)continue;
   const expected=C(),ctx=expected.getContext('2d'),body=C(),bc=body.getContext('2d'),saved=bytes(base,without,opts(spec.phaseMap[phase],8));
   const bodyPixels=bc.createImageData(512,512);bodyPixels.data.set(saved);
   const contact=spec.contacts.find(v=>v.targetAuthoredPhase===phase),mask=C();
   if(contact){
    mask.getContext('2d').drawImage(await load(file(contact.mask)),0,0);
    const m=pixels(mask),incoming=bytes(base,without,opts(contact.incomingPhase,8));
    for(let n=0;n<m.length;n+=4)if(m[n])bodyPixels.data.set(incoming.subarray(n,n+4),n);
   }
   bc.putImageData(bodyPixels,0,0);
   const pngs=await Promise.all(layers.map(l=>{
    assert.equal(l.frames[phase],official.pack.directions.south.layers.find(x=>x.id===l.id).frames[t]);
    return load(file(l.frames[phase]));
   }));
   for(const [i,l] of layers.entries())if(l.depth===-1)ctx.drawImage(pngs[i],0,0);
   ctx.drawImage(body,0,0);
   for(const [i,l] of layers.entries())if(l.depth===45)ctx.drawImage(pngs[i],0,0);
   const actual=bytes(dressed,wearing,opts(t,40));assert.deepEqual(actual,pixels(expected));
   for(const c of [expected,body,mask])c.width=1;
  }}finally{dressed.release();base.release();global.gc?.();}
 }

 for(const [w,b] of sample)for(const skinColor of palettes){
  const p=actor(w,b,skinColor),bare=actor(w,null,skinColor),src=api.selectVisual(p,o),off=api.selectVisual(bare,o);
  assert(src?.carrySouthNativeDepth,'must select signed boot source independently of weapon art '+[w,b,skinColor]);
  assert.equal(src.slotRoutes.weapon.item,w);assert.equal(src.slotRoutes.boots.item,b);assert.deepEqual(src.omitted??[],[]);
  assert.deepEqual(src.carrySouth,off);
  const {spec,layers}=src.authoredPantsLayer;
  const decoded=new Map(await Promise.all(reg.requiredFiles(off).map(async f=>[f,await load(f)])));
  const capture=phase=>{const c=C(),arr=[];reg.render(c.getContext('2d'),off,decoded,{frame:phase,captureOps:x=>arr.push(x)});return {c,arr};};
  const all=await api.prepareConfiguration([{player:p,options:o}]);assert.equal(all.coverage[0].frames,40);
  const pad=off.paddingPhysical||0,W=512+2*pad,save=JSON.stringify(p);
  try{
   for(let tick=0;tick<40;tick++){
    const phase=spec.frameToPhase[tick];if(spec.frameToPhase[tick-1]===phase)continue;
    const bodyPhase=spec.phaseMap[phase],contact=spec.contacts.find(x=>x.targetAuthoredPhase===phase),{c,arr}=capture(bodyPhase),native=pixels(c);
    const blend=C(W),bc=blend.getContext('2d'),domain=C(W),dc=domain.getContext('2d');
    const contactMask=C();
    if(contact)contactMask.getContext('2d').drawImage(await load(file(contact.mask)),0,0);
    const m=pixels(contactMask),incoming=contact?capture(contact.incomingPhase):null;
    const images=await Promise.all(layers.map(l=>load(file(l.frames[phase]))));
    for(const im of images)dc.drawImage(im,pad,pad);
    for(const [i,l] of layers.entries())if(l.depth===-1)bc.drawImage(images[i],pad,pad);
    for(const op of arr){
      if(op.op.depth>4&&op.op.depth<5||op.op.depth===5){ // determine insert point below first gear/arms
        if(!blend.bootsDrawn){for(const [i,l] of layers.entries())if(l.depth===45)bc.drawImage(images[i],pad,pad);blend.bootsDrawn=true;}
      }
      if(contact&&op.op.layer){
        const tile=op.canvas.getContext('2d'),edit=tile.getImageData(0,0,W,W);
        const src=pixels(incoming.arr.find(v=>v.op.layer?.id===op.op.layer.id).canvas);
        for(let y=0;y<512;y++)for(let x=0;x<512;x++)if(m[(y*512+x)*4]){const n=((y+pad)*W+x+pad)*4; edit.data.set(src.subarray(n,n+4),n);}
        tile.putImageData(edit,0,0);
      }
      bc.drawImage(op.canvas,0,0);
    }
    assert(blend.bootsDrawn);
    const support=pixels(domain),expected=pixels(blend),actual=bytes(all,p,opts(tick,40));
    const armMask=off.states[bodyPhase].baseMasks?.['arms-phase'],arms=armMask?C():null;
    if(arms){
      arms.getContext('2d').drawImage(await load(armMask),0,0);
      const shape=pixels(arms);
      for(let y=0;y<512;y++)for(let x=0;x<512;x++){
       const n=(y*512+x)*4;
       if(shape[n+3])assert(!m[n]&&!support[((y+pad)*W+x+pad)*4+3],'signed arm mask is outside boot/contact support');
      }
      arms.width=1;
    }
    let changes=0,alphaOverlap=0;
    const ga=arr.filter(x=>x.op.part).map(x=>pixels(x.canvas));
    for(let y=0;y<W;y++)for(let x=0;x<W;x++){
      const n=(y*W+x)*4, inBoot=!!support[n+3],inContact=x>=pad&&x<pad+512&&y>=pad&&y<pad+512&&m[((y-pad)*512+x-pad)*4];
      if(inBoot||inContact){
       if(ga.some(a=>a[n+3]))alphaOverlap++;
       const chosen=expected;
       for(let k=0;k<4;k++)if(Math.abs(actual[n+k]-chosen[n+k])>1)throw Error('incorrect projected boot/gear order: '+[w,b,skinColor,tick,x,y,k,actual[n+k],chosen[n+k]]);
       if(native.readUInt32LE(n)!==actual.readUInt32LE(n))changes++;
      }else if(native.readUInt32LE(n)!==actual.readUInt32LE(n))throw Error('changed outside owned support: '+[w,b,skinColor,tick,x,y]);
    }
    assert(changes>100);blended+=alphaOverlap;tested++;
    for(const block of [c,blend,domain,contactMask,...arr.map(x=>x.canvas),...(incoming?[incoming.c,...incoming.arr.map(x=>x.canvas)]:[])])block.width=1;
   }
  }finally{all.release();global.gc?.();}
  assert.equal(JSON.stringify(p),save);assert.deepEqual(api.selectVisual(bare,o),off);
  assert(!api.selectVisual({...p,equipment:{...p.equipment,boots:{def:b,variant:'not-approved'}}},o)?.carrySouthNativeDepth);
  assert(!api.selectVisual({...p,equipment:{...p.equipment,head:{def:18}}},o)?.carrySouthNativeDepth);
  console.log('PASS',w,b,skinColor,tested,blended);
 }
 assert(tested===sample.length*palettes.length*10);if(sample.length&&(!process.env.WEAPON||+process.env.WEAPON!==119))assert(blended>0);
 console.log('PASS B176 signed South foot and original arm mask through native depth');
}
if(process.env.SKIN||process.env.WEAPON)run().catch(e=>{console.error(e);process.exitCode=1;});
else{
 const {spawnSync}=require('node:child_process');
 for(const SKIN of ['light','ebony'])for(const WEAPON of ['0','4','12','5','119']){
  const child=spawnSync(process.execPath,[...process.execArgv,__filename],{env:{...process.env,WEAPON,SKIN,SKIP_BARE:WEAPON==='0'?'':'1'},stdio:'inherit'});
  assert.equal(child.status,0,child.error?.message||'B176 source test '+WEAPON+'/'+SKIN);
 }
 console.log('PASS B176: 20 stand-alone, 80 signed armed phase checks');
}
