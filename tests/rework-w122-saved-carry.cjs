'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),p=require('node:path'),R=p.resolve(process.env.KAIZOKU_REPO||p.dirname(__dirname)),C=process.env.CANDIDATE_DIR;
const {make,cv}=require(p.join(R,'tests/rework-integration-support.cjs')),V=global.ReworkAccessoryVendor.compositor,A=require(p.join(R,'character-appearance.js')),loader=require(p.join(R,'tools/rework-hd-test-loader.cjs')).create(R);
const idx=require(p.join(R,'tools/rework-base-hd/index.json')),plan=require(p.join(R,'tools/rework-weapon-layers-hd/carry-binding-plan.json')),stock=make();
const save=(skinColor='light',look={},equipment={weapon:{def:122}},classId='strategist')=>A.commit({id:'w122-carry-regression',classId,equipment},{...look,skinColor},()=>true);
const N=512,cap=()=>cv.createCanvas(N,N),rgba=c=>Buffer.from(c.getContext('2d').getImageData(0,0,N,N).data);
const orient=(slot,c)=>{if(!slot.base.mirrorX)return c;const o=cap(),x=o.getContext('2d');x.translate(N,0);x.scale(-1,1);x.drawImage(c,0,0);return o;};
const expectedPreview={"east/idle":["4b6dac1acf193551c23b7ff58268fd76801127569386e12a4b4870d6a504ae86"],"east/walk":["4b6dac1acf193551c23b7ff58268fd76801127569386e12a4b4870d6a504ae86","a2a936602e117dfbe61ffce9df1e8f5fa5bf84807992e9a3f1328429fde8250e","eb6b885d558c577a5738023d6fb9da75a3aeac0e34bb383ace974a590997c2dc","8a8d7ea070a9179e7b583512c90a7874c9f2324f479327952efc0850e34be338","df52c30694d0f5f0bdfbdc8f6bd1d0f00882452523dc569d988472945c4f9b4f","31cc7e0fbdb904fb34aa4d9a7f3b9ca8aafab4a8e302f5411b360b12cf0cd497","7fba83da4b1f32ae3b8a1f64719ccad9d410b14dc3ba0e5a97972f16c71adfd1","43e41474d8d776a9b46d659442017efa833b441843b3af30a1fdaa153201cb1b","952def10301eefe8de91c14cca9a8c626c52de5c70ca097d3b510a8f631c50c2","9dc11e412e764e60ede375d5eaa774e0dc68529b6b8309f2af8ad7e0009acc41","55ef4de3265b7cccdf8d411d035894117536b31ed60faf1ad73decbfbd588d0b","0ab6dfa6401981c002fd69df21da4d931bb6b8e2db73adf45ad28b53a9fb021c","afd673003ade9ecd262ef5107c84418ada64967347737021f5fa626d84ccbce5","2cf739a838e784d3b8dc9f889907e4dd951b3d5c5dae5a8db99495d2987f7fe5","40336d8ad721a905078a84c61f48e5f41abdb523c699b04691859d65c457e44a","0bfc4a7ae723584a62a768cd2c2fb6a07b5edce2e01a3c377515c35d9e574256"],"west/idle":["e45a371f9644b0883d97f258fb16ed30ad193d38c8c787be9b7f65b5074b412e"],"west/walk":["e45a371f9644b0883d97f258fb16ed30ad193d38c8c787be9b7f65b5074b412e","6120174b8f56724214936baf09d7022ed42fee1fe5244306d9ff93428cb47b4e","5481c5f555ee5008e7ad35d5d47855798b3a2ba2bbdc4dfc63e7bda604708844","72cc3500b3f3c3043b8bb7b39caaf4adea397879455465cd8263bdf29f487e89","cca88d074c90e79c12ef5edbb3b6c65a984c4b8ddc16cd970009200a8d037ecf","42ef449299b85d54b3050bf64ee9a96c351ceb654e0f695a73095f19875a6ca7","a940369d9f86d738313512c514c01146d2427be87710c4e1a097ce997ff374db","4c893896ce021589b26622aa76d3ff4366d0022785e8d7de2681e0730dca79bf","c99fa4117d44f9dc53999c2c9e339ed73e47aa023633a42c6fba0c598df3abd2","ca88cd9770110e385f7f43007c001397b52e4e6503fc6c59655c600405992cab","e51de87854d1baec5bdc27b29bd91ff8f80bb71944e90a5466d2f5d252127a0e","12a860f4d95db3c011941e96013b4fe159b2bc89f1f028b89faf35ae723591d3","e89d1404bd51f579a14884825d2887117c9959c4e795f4803ebc01ccdbf7c947","00c38a6c88458ba12e7995f7d4e95c690420a1ca44bfb6d5210ed7b9279ab646","967a6c2237b057ff1d45f609b2f71fd5ca491daa78750c6c2cedaa5c6125ce9c","42da9e752df9d12720eb944b11077594aeb92bb40634e507d47d600da534c8b7"]};
const hash=b=>require('node:crypto').createHash('sha256').update(b).digest('hex');
const rgbaEq=(got,exp)=>assert.equal(Buffer.compare(got,exp),0);
(async()=>{await stock.ready;let world=stock;
 if(C){global.MareReworkWeaponCarryHD=require(p.resolve(C,'player-rework-weapon-carry-hd.js'));world=require(p.resolve(C,'player-rework-native-hd.js')).create({fetchJSON:async f=>JSON.parse(fs.readFileSync(p.join(R,f))),loadImage:loader,makeCanvas:cv.createCanvas});await world.ready;}
 const hd=global.MareReworkWeaponCarryHD.create(idx,plan,{makeCanvas:cv.createCanvas}),east=new Map();
 for(const direction of ['east','west'])for(const action of ['idle','walk']){
  const o={direction,action,consumer:'world'},light=save(),ebony=save('ebony'),slot=world.selectVisual(light,o),darkSlot=world.selectVisual(ebony,o);
  assert(slot?.orb122SideSavedCarry,'W122 in actual normalized Light save');assert(darkSlot?.orb122SideSavedCarry);
  if(C)assert(!stock.selectVisual(light,o)?.orb122SideSavedCarry);
  assert.deepEqual(slot.plan,darkSlot.plan);assert.deepEqual(slot.base,darkSlot.base);
  const d=slot.base.pack.directions[direction],n=d.clip.frames;
  assert.equal(n,action==='idle'?1:16);if(action==='walk')assert.equal(d.clip.fps,16);
  for(const [who,opt] of [[save('light',{hairStyle:'hair-spiky'}),o],[save('light',{eyeColor:'green'}),o],[save('light',{hairColor:'brown'}),o],
   [save('light',{},{weapon:{def:122},coat:{def:151}}),o],[save('light',{},{weapon:{def:122,variant:'alt'}}),o],[save('light',{},{weapon:{def:122}},'healer'),o],[light,{...o,direction:'north'}],[light,{...o,direction:'south'}],
   [save('light',{},{weapon:{def:32}}),o],[light,{...o,action:'attack-focus'}],[light,{...o,consumer:'preview'}],[light,{...o,weaponless:true}]]){
   assert(!world.selectVisual(who,opt)?.orb122SideSavedCarry);if(C)assert.deepEqual(world.selectVisual(who,opt),stock.selectVisual(who,opt));
  }
  const [piece]=slot.plan.parts,a=piece.binding.a,b=piece.binding.b,lateral=['east','west'].includes(direction);
  assert.equal(piece.hideHandBeyondWrist,false);assert(!piece.replaceBoundLayer&&!piece.skinMaterial);assert.equal(piece.depthOffset,-.1);
  assert.equal(piece.source.sha256,'d52b77a02515aaf23be9cc1b84d7ad9441425438bb9bf7016464247a2b0735c6');assert.deepEqual(piece.calibrationOffsetPhysical,[-13,6]);
  assert.deepEqual(piece.sourceBone,{'RIGHT ELBOW':{x:88.71232876712328,y:50.43493150684931},'RIGHT ARM':{x:89.43150684931507,y:61.702054794520535}});
  const bare={...slot,plan:{...slot.plan,parts:[]}},rows=[];
 const extra=Object.keys(A.skins).filter(k=>!['light','ebony'].includes(k)).map(tone=>{const actor=save(tone),record=world.selectVisual(actor,o);
  assert(record?.orb122SideSavedCarry);assert.deepEqual(record.plan,slot.plan);assert.deepEqual(record.base,slot.base);
  return {tone,actor,record};
 });assert.equal(extra.length,6);
  for(let frame=0;frame<n;frame++){
   const refs=hd.requiredFiles(slot,{frame}),map=new Map(await Promise.all(refs.map(async s=>[s,await loader(s)]))),pose=d.poses[frame],m=V.rigid(piece.sourceBone[b],piece.sourceBone[a],pose[b],pose[a]);
   const render=(record)=>{const c=cap();hd.render(c.getContext('2d'),record,map,{frame});return rgba(c);};
   const full=render(slot),dark=render(darkSlot),body=render(bare),darkBody=render({...bare,colorAppearance:darkSlot.colorAppearance});
   const phases={...o,x:0,y:0,progress:(frame+.1)/n};let worldBytes;
   for(const [actor,ref] of [[light,full],[ebony,dark]]) {assert(await world.prepareStablePose(actor,phases));assert(world.draw({save(){},restore(){},drawImage(c){worldBytes=rgba(c);}},actor,phases));rgbaEq(ref,worldBytes);}
   let wand=cap(),ctx=wand.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.transform(...m.slice(0,4),m[4]*4-13,m[5]*4+6);
   if(piece.mirrorSource){ctx.translate(640,0);ctx.scale(-1,1);}
   ctx.drawImage(map.get('tools/rework-weapon-layers-hd/'+piece.source.url),0,0);const own=rgba(orient(slot,wand));
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
   for(const {tone,actor,record} of extra){
    const current=render(record),no=render({...bare,colorAppearance:record.colorAppearance}),hp=hand(tone);
    assert(await world.prepareStablePose(actor,phases));assert(world.draw({save(){},restore(){},drawImage(c){worldBytes=rgba(c);}},actor,phases));rgbaEq(current,worldBytes);
    let changedTone=0,safeGrip=0,unchangedOrb=0;
    for(let i=0;i<current.length;i+=4){
     const l=full.readUInt32LE(i),b=body.readUInt32LE(i),x=current.readUInt32LE(i),y=no.readUInt32LE(i),w=own.readUInt32LE(i);
     assert.equal(current[i+3],full[i+3]);assert.equal(no[i+3],body[i+3]);
     if(!own[i+3])assert.equal(x,y);
     if(own[i+3]&&hp[i+3]===255&&hp.readUInt32LE(i)===y){assert.equal(x,y);safeGrip++;}
     if(own[i+3]===255&&l===w&&w!==b){assert.equal(x,w);unchangedOrb++;}
     if(x!==l)changedTone++;
    }
    assert(changedTone>1000&&safeGrip===intact&&unchangedOrb===pure,JSON.stringify({direction,action,frame,tone,changedTone,safeGrip,unchangedOrb,intact,pure}));
   }
   assert.equal(hash(full),expectedPreview[direction+'/'+action][frame],'approved preview RGBA changed');
   if(process.env.PREVIEW_DIR){const expected=await cv.loadImage(p.join(process.env.PREVIEW_DIR,direction,action,'new-'+frame+'.png'));const c=cap();c.getContext('2d').drawImage(expected,0,0);rgbaEq(full,rgba(c));}
   const key=action+'/'+frame;
   if(direction==='east'){const c=cap(),x=c.getContext('2d'),z=x.createImageData(N,N);z.data.set(full);x.putImageData(z,0,0);east.set(key,rgba(orient({base:{mirrorX:true}},c)));}
   if(direction==='west'){rgbaEq(full,east.get(key));east.delete(key);}
   rows.push([frame,intact,darkIntact,visible,pure]);global.gc?.();
  }
  console.log(direction,action,"all 8 tones",JSON.stringify(rows));
 }
})().catch(e=>{console.error(e);process.exitCode=1});
