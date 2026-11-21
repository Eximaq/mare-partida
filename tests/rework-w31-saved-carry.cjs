'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),p=require('node:path'),R=p.resolve(process.env.KAIZOKU_REPO||p.dirname(__dirname)),C=process.env.CANDIDATE_DIR;
const {make,cv}=require(p.join(R,'tests/rework-integration-support.cjs')),V=global.ReworkAccessoryVendor.compositor,A=require(p.join(R,'character-appearance.js')),loader=require(p.join(R,'tools/rework-hd-test-loader.cjs')).create(R);
const idx=require(p.join(R,'tools/rework-base-hd/index.json')),plan=require(p.join(R,'tools/rework-weapon-layers-hd/carry-binding-plan.json')),stock=make();
const save=(skinColor='light',look={},equipment={weapon:{def:31}},classId='healer')=>JSON.parse(JSON.stringify(A.commit({id:'w31-carry-regression',classId,equipment},{...look,skinColor},()=>true)));
const N=512,cap=()=>cv.createCanvas(N,N),rgba=c=>Buffer.from(c.getContext('2d').getImageData(0,0,N,N).data);
const orient=(slot,c)=>{if(!slot.base.mirrorX)return c;const o=cap(),x=o.getContext('2d');x.translate(N,0);x.scale(-1,1);x.drawImage(c,0,0);return o;};
const rgbaEq=(got,exp)=>assert.equal(Buffer.compare(got,exp),0);
(async()=>{await stock.ready;let world=stock;
 if(C){global.MareReworkWeaponCarryHD=require(p.resolve(C,'player-rework-weapon-carry-hd.js'));world=require(p.resolve(C,'player-rework-native-hd.js')).create({fetchJSON:async f=>JSON.parse(fs.readFileSync(p.join(R,f))),loadImage:loader,makeCanvas:cv.createCanvas});await world.ready;}
 const hd=global.MareReworkWeaponCarryHD.create(idx,plan,{makeCanvas:cv.createCanvas}),east=new Map();
 for(const direction of ['north','south','east','west'])for(const action of ['idle','walk']){
  const o={direction,action,consumer:'world'},light=save(),ebony=save('ebony'),slot=world.selectVisual(light,o),darkSlot=world.selectVisual(ebony,o);
  assert(slot?.relic31SavedCarry,'W31 in actual normalized Light save');assert(darkSlot?.relic31SavedCarry);
  const historian=save('light',{},undefined,'strategist');
  assert.deepEqual(world.selectVisual(historian,o),slot,'the historical strategist alias stays pixel-identical');
  if(C){assert(!stock.selectVisual(light,o)?.relic31SavedCarry);assert.deepEqual(world.selectVisual(historian,o),stock.selectVisual(historian,o));}
  assert.deepEqual(slot.plan,darkSlot.plan);assert.deepEqual(slot.base,darkSlot.base);
  assert(!world.selectVisual(light,{...o,action:'attack-focus'})?.relic31SavedCarry);
  const d=slot.base.pack.directions[direction],n=d.clip.frames;
  assert.equal(n,action==='idle'?1:16);if(action==='walk')assert.equal(d.clip.fps,16);
  for(const [who,opt] of [[save('porcelain',{},undefined,'strategist'),o],[save('light',{hairStyle:'hair-spiky'}),o],[save('light',{eyeColor:'green'}),o],[save('light',{hairColor:'brown'}),o],
   [save('light',{},{weapon:{def:31},coat:{def:151}}),o],[save('light',{},{weapon:{def:31,variant:'alt'}}),o],[save('light',{},{weapon:{def:31}},'sword'),o],
   [save('light',{},{weapon:{def:32}}),o],[light,{...o,consumer:'preview'}],[light,{...o,weaponless:true}]]){
   assert(!world.selectVisual(who,opt)?.relic31SavedCarry);if(C)assert.deepEqual(world.selectVisual(who,opt),stock.selectVisual(who,opt));
  }
  const [piece]=slot.plan.parts,a=piece.binding.a,b=piece.binding.b,lateral=['east','west'].includes(direction);
  assert.equal(piece.hideHandBeyondWrist,false);assert(!piece.replaceBoundLayer&&!piece.skinMaterial);assert.equal(piece.depthOffset,-.1);
  if(lateral)assert.deepEqual(piece.relic31PivotTilt,{x:370,y:312,radians:Math.PI/9});else assert.equal(piece.relic31PivotTilt,undefined);
  const bare={...slot,plan:{...slot.plan,parts:[]}},rows=[];
  for(let frame=0;frame<n;frame++){
   const refs=hd.requiredFiles(slot,{frame}),map=new Map(await Promise.all(refs.map(async s=>[s,await loader(s)]))),pose=d.poses[frame],m=V.rigid(piece.sourceBone[b],piece.sourceBone[a],pose[b],pose[a]);
   const render=(record)=>{const c=cap();hd.render(c.getContext('2d'),record,map,{frame});return rgba(c);};
   const full=render(slot),dark=render(darkSlot),body=render(bare),darkBody=render({...bare,colorAppearance:darkSlot.colorAppearance});
   const phases={...o,x:0,y:0,progress:(frame+.1)/n};let worldBytes;
   assert(await world.prepareStablePose(light,phases));assert(world.draw({save(){},restore(){},drawImage(c){worldBytes=rgba(c);}},light,phases));rgbaEq(full,worldBytes);
   let wand=cap(),ctx=wand.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.transform(...m.slice(0,4),m[4]*4,m[5]*4+8);
   if(piece.mirrorSource){ctx.translate(640,0);ctx.scale(-1,1);}
   if(lateral){ctx.translate(370,312);ctx.rotate(Math.PI/9);ctx.translate(-370,-312);}
   ctx.drawImage(map.get('tools/rework-weapon-layers-hd/'+piece.source.url),0,0);const own=rgba(orient(slot,wand));
   if(lateral){
    const apply=([x,y])=>[m[0]*x+m[2]*y+m[4]*4,m[1]*x+m[3]*y+m[5]*4+8],rotate=([x,y])=>[370+(x-370)*Math.cos(Math.PI/9)-(y-312)*Math.sin(Math.PI/9),312+(x-370)*Math.sin(Math.PI/9)+(y-312)*Math.cos(Math.PI/9)];
    assert.deepEqual(apply(rotate([370,312])),apply([370,312]));const original=apply([370,198]),tip=apply(rotate([370,198]));assert(tip[0]>original[0]+25);
   }
   const op=V.plan(slot.base.pack,direction,frame).find(l=>l.binding?.a===a&&l.binding?.b===b),arm=d.layers.find(l=>l.id===op.id),armImg=map.get('tools/rework-base-hd/assets/'+op.source+'.png'),M=global.MareNativeSkinHD,P=global.MareAppearance96;
   const hand=(tone)=>{const hc=cap(),ht=hc.getContext('2d');ht.drawImage(armImg,0,0);const px=ht.getImageData(0,0,N,N);px.data.set(P.recolor(px.data,M.mask(px.data,N,'anatomy'),P.skins[tone].ramp));ht.putImageData(px,0,0);
    const out=cap();V.render(out.getContext('2d'),{...slot.base.pack,directions:{[direction]:{...d,layers:[arm]}}},new Map([[op.source,hc]]),{direction,frame,density:4});return rgba(orient(slot,out));};
   const lhand=hand('light'),dhand=hand('ebony');let intact=0,darkIntact=0,visible=0,pure=0;
   for(let i=0;i<full.length;i+=4){
    const l=full.readUInt32LE(i),e=dark.readUInt32LE(i),lb=body.readUInt32LE(i),eb=darkBody.readUInt32LE(i);
    if(!own[i+3]){assert.equal(l,lb);assert.equal(e,eb);}
    else{
     if(l!==lb)visible++;
     if(lhand[i+3]===255&&lhand.readUInt32LE(i)===lb){assert.equal(l,lb);intact++;}
     if(dhand[i+3]===255&&dhand.readUInt32LE(i)===eb){assert.equal(e,eb);darkIntact++;}
     if(own[i+3]===255&&l===own.readUInt32LE(i)&&l!==lb){assert.equal(l,e);pure++;}
    }
   }
   assert(intact>100&&darkIntact>100&&visible>300&&pure>0,JSON.stringify({direction,action,frame,intact,darkIntact,visible,pure}));
   const key=action+'/'+frame;
   if(direction==='east'){const c=cap(),x=c.getContext('2d'),z=x.createImageData(N,N);z.data.set(full);x.putImageData(z,0,0);east.set(key,rgba(orient({base:{mirrorX:true}},c)));}
   if(direction==='west'){rgbaEq(full,east.get(key));east.delete(key);}
   rows.push([frame,intact,darkIntact,visible,pure]);global.gc?.();
  }
  console.log(direction,action,JSON.stringify(rows));
 }
})().catch(e=>{console.error(e);process.exitCode=1});
