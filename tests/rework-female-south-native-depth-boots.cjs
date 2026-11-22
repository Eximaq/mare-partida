'use strict';
const path=require('node:path'),assert=require('node:assert/strict'),fs=require('node:fs');
const R=process.env.STAGE||path.resolve(__dirname,'..'),req=f=>require(path.join(R,f));
const {make,cv}=req('tests/rework-integration-support.cjs'),A=req('character-appearance'),load=req('tools/rework-hd-test-loader.cjs').create(R);
const items=req('item-catalog').create({forge:req('forge-system'),prison:req('prison-system'),haki:req('haki-system'),akuma:req('akuma-system'),hakiProgression:req('haki-progression')}).items;
const api=make(), baseRegistry=global.MareReworkBaseHD.create(req('tools/rework-base-hd/index.json'));
const appearanceRegistry=global.MareFemaleNamedHairHD.create(req('tools/rework-accessories/head-layer-index.json'),req('tools/rework-accessories/female-original-face-ownership.json'),{baseRegistry,makeCanvas:cv.createCanvas});
const reg=global.MareReworkFemaleEquipmentHD.create({schema:'female-native-equipment-registration-v1',records:[]},{appearanceRegistry,makeCanvas:cv.createCanvas});
const o={consumer:'world',action:'walk',direction:'south'},opts=(f,ticks)=>({...o,progress:(f+.125)/ticks});
const actor=(w,b,skinColor)=>A.commit({classId:items[w].type,equipment:{weapon:{def:w},boots:b==null?null:{def:b}}},{gender:'feminino',skinColor,...(skinColor==='ebony'?{hairStyle:'hair-cropped',hairColor:'blue'}:{})},()=>true);
const C=(w=512)=>cv.createCanvas(w,w),pixels=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
const bytes=(b,p,o)=>{let c;assert(b.draw({save(){},restore(){},drawImage(v){c=v;}},p,o));return pixels(c);};
const file=h=>'tools/rework-modular-outfits-hd/assets/'+h+'.png';
const sample=[[4,9],[12,134],[2,8],[69,169],[122,148],[32,9]];
(async()=>{
 await api.ready;
 let tested=0,blended=0;
 for(const [w,b] of sample)for(const skinColor of ['light','ebony']){
  const p=actor(w,b,skinColor),bare=actor(w,null,skinColor),src=api.selectVisual(p,o),off=api.selectVisual(bare,o),old=w===32;
  assert(old?src?.carrySouthBootOnly:src?.carrySouthNativeDepth,'must select signed boot source independently of weapon art '+[w,b,skinColor]);
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
 assert(tested===120&&blended>0);
 console.log('PASS South native depth families, including independent gear crossing at signed foot masks');
})().catch(e=>{console.error(e);process.exitCode=1;});
