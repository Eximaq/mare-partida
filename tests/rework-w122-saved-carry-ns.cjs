'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),p=require('node:path'),R=p.resolve(process.env.KAIZOKU_REPO||p.dirname(__dirname)),C=process.env.CANDIDATE_DIR;
const {make,cv}=require(p.join(R,'tests/rework-integration-support.cjs')),V=global.ReworkAccessoryVendor.compositor,A=require(p.join(R,'character-appearance.js')),loader=require(p.join(R,'tools/rework-hd-test-loader.cjs')).create(R);
const idx=require(p.join(R,'tools/rework-base-hd/index.json')),plan=require(p.join(R,'tools/rework-weapon-layers-hd/carry-binding-plan.json')),stock=make();
const save=(skinColor='light',look={},equipment={weapon:{def:122}},classId='strategist')=>A.commit({id:'w122-carry-regression',classId,equipment},{...look,skinColor},()=>true);
const N=512,cap=()=>cv.createCanvas(N,N),rgba=c=>Buffer.from(c.getContext('2d').getImageData(0,0,N,N).data);
const orient=(slot,c)=>{if(!slot.base.mirrorX)return c;const o=cap(),x=o.getContext('2d');x.translate(N,0);x.scale(-1,1);x.drawImage(c,0,0);return o;};
const expectedPreview={"north/idle":["be9de4503858e208090c1185eb2c4ddd33dd94438b4fb0ff9eed422c7e300ae1"],"north/walk":["be9de4503858e208090c1185eb2c4ddd33dd94438b4fb0ff9eed422c7e300ae1","8bd496fefe54680bd009dbff5d062610502c86375bb93ddc5eb2fd45e6e22121","e7fd71955be879f23d5a3443a4966a7bd2bc8d84908609b779d9ae838e658f2a","991f66e935d283761e53ec55bcd10438dfc50ae0bca87526e8c862af7e8b5af1","38503b1081405cd2259df1a43b87770f662f53ed55e5414e5c19aca90f597043","31f4f2c9226a9ba35284074e512dda32234fa9b241546c80092f1987a18fa9c1","6d78d09764f454db89eb3eda70b0b922d2c623514e682aa4af900cafc9959fab","ad770ad85a5f6c6cec879b30e434e7710a541bc5f8a6e78cba3960227e7ca782","44ce80e0ecef3d6a31abe33aca59477d092724e00044692fb27dae1d7f962cd1","8bed86557f23b50ae0b9b46d6a42c683dc50cc6d9e86a0e5a4dc22d1a290b6d9","d59fc8a58dd64899752aab3817abdaa372c808dad838ad013a038510937537c4","bb38d044ae52de6dd2889995d6c62047bf54ff9e41562a55fbf64c4ad2de986b","572f57bb221e0b96ae5ecdf9965d011a41dfb9c10f0492875e6c4b67b61b4f71","aaa8a2f7c7e391f222ae42ee1f9f8ed833f8119bff425178a6deafb4c8a56c64","b4e003a180f8e6efd186871fc3476fab016aed3307c4e0981b07117675cb6230","fcba2c13f34802717412deca13bd312ce46ec8768e053e44fc2d9ade2cf6b0bb"],"south/idle":["4fd0144ebecef62940a1150f3a611fb531ac4ab6979cf972a2a3ef0755624fa2"],"south/walk":["4fd0144ebecef62940a1150f3a611fb531ac4ab6979cf972a2a3ef0755624fa2","e5dbe26b6b419637ee5b47cd659a6023b85b581c9fc34890bbc84496bbb86d27","add7570925c059f4620b1ab28c3e63797f5b1dc2f134cbf92e58c74107e71391","370ff6f5cba22801a2244934d414521c35f482560009f2b81c1d507782aab3c3","390e2137f219b87615042b49f383374f50728cfc82623067091e88594a51f77f","188ea28f786ca30655816e4e48dddf16058433f51f13b1d43105ec9edb530161","d36ccf5510fb6405d0c375372beb13cb01e9bf9b882dbdb730d65a7d2d2f376a","17d01a59c5b1d95ea4499ebf656bffe25cdfbc81b4c1c54c552a953d63299e46","0e7ec5548cddf6fdcd70bfd3858073e220b90c1ec66b23e665712ef7c3e7c81a","ce131b3bfea3529130b86d1e9dd550622b47b8adb45a803808f315bb7ee33248","fa2b1509a4a23570c61c8121cccccc5318faf42659e548a599636663d3820d20","411cbd7faa287fbac44c3747571e89e13735adea0a6f883a8d99c668b9d58728","e566d2ad2ab66ce224f988cf74a2cfbf2b2f8813b0f3e901fa24d459687d94ac","441a9abaaf45a7a0ec5d2ff0aecc832aca0a73aae4f72d26ec421e438f43153c","a88da587e090872a3ccc4a3b91f0f367d4568974df820461a44f59d75b52240e","c575124b4a378ac548c787072edb4c2da2659ff6e986c23cf7ba5bcd67504f93"]};
const hash=b=>require('node:crypto').createHash('sha256').update(b).digest('hex');
const rgbaEq=(got,exp)=>assert.equal(Buffer.compare(got,exp),0);
(async()=>{await stock.ready;let world=stock;
 if(C){global.MareReworkWeaponCarryHD=require(p.resolve(C,'player-rework-weapon-carry-hd.js'));world=require(p.resolve(C,'player-rework-native-hd.js')).create({fetchJSON:async f=>JSON.parse(fs.readFileSync(p.join(R,f))),loadImage:loader,makeCanvas:cv.createCanvas});await world.ready;}
 const hd=global.MareReworkWeaponCarryHD.create(idx,plan,{makeCanvas:cv.createCanvas}),east=new Map();
 for(const direction of ['north','south'])for(const action of ['idle','walk']){
  const o={direction,action,consumer:'world'},light=save(),ebony=save('ebony'),slot=world.selectVisual(light,o),darkSlot=world.selectVisual(ebony,o);
  assert(slot?.orb122NorthSouthSavedCarry,'W122 in actual normalized Light save');assert(darkSlot?.orb122NorthSouthSavedCarry);
  if(C)assert(!stock.selectVisual(light,o)?.orb122NorthSouthSavedCarry);
  assert.deepEqual(slot.plan,darkSlot.plan);assert.deepEqual(slot.base,darkSlot.base);
  const d=slot.base.pack.directions[direction],n=d.clip.frames;
  assert.equal(n,action==='idle'?1:16);if(action==='walk')assert.equal(d.clip.fps,16);
  for(const [who,opt] of [[save('light',{hairStyle:'hair-spiky'}),o],[save('light',{eyeColor:'green'}),o],[save('light',{hairColor:'brown'}),o],
   [save('light',{},{weapon:{def:122},coat:{def:151}}),o],[save('light',{},{weapon:{def:122,variant:'alt'}}),o],[save('light',{},{weapon:{def:122}},'healer'),o],[light,{...o,direction:'east'}],[light,{...o,direction:'west'}],
   [save('light',{},{weapon:{def:32}}),o],[light,{...o,action:'attack-focus'}],[light,{...o,consumer:'preview'}],[light,{...o,weaponless:true}]]){
   assert(!world.selectVisual(who,opt)?.orb122NorthSouthSavedCarry);if(C)assert.deepEqual(world.selectVisual(who,opt),stock.selectVisual(who,opt));
  }
  const [piece]=slot.plan.parts,a=piece.binding.a,b=piece.binding.b,lateral=['east','west'].includes(direction);
  assert.equal(piece.hideHandBeyondWrist,false);assert(!piece.replaceBoundLayer&&!piece.skinMaterial);assert.equal(piece.depthOffset,-.1);
  assert.equal(piece.source.sha256,'d52b77a02515aaf23be9cc1b84d7ad9441425438bb9bf7016464247a2b0735c6');assert.deepEqual(piece.calibrationOffsetPhysical,[0,0]);
  const source0=plan.records.find(x=>x.item===122&&x.direction===direction).parts[0];
  const expected=Object.fromEntries(Object.entries(source0.sourceBone).map(([k,v])=>[k,{x:v.x+(direction==='north'?1:4.25),y:v.y-(direction==='north'?23.75:32.5)}]));
  assert.deepEqual(piece.sourceBone,expected);assert.deepEqual(piece.targetRestBone,source0.targetRestBone);
  assert.equal(slot.relicEyes?.samples.length,direction==='south'?45:undefined);
  for(const dir of ['east','west'])assert.deepEqual(world.selectVisual(light,{...o,direction:dir}),stock.selectVisual(light,{...o,direction:dir}));

  const bare={...slot,plan:{...slot.plan,parts:[]}},rows=[];
 const extra=Object.keys(A.skins).filter(k=>!['light','ebony'].includes(k)).map(tone=>{const actor=save(tone),record=world.selectVisual(actor,o);
  assert(record?.orb122NorthSouthSavedCarry);assert.deepEqual(record.plan,slot.plan);assert.deepEqual(record.base,slot.base);
  return {tone,actor,record};
 });assert.equal(extra.length,6);
  for(let frame=0;frame<n;frame++){
   const refs=hd.requiredFiles(slot,{frame}),map=new Map(await Promise.all(refs.map(async s=>[s,await loader(s)]))),pose=d.poses[frame],m=V.rigid(piece.sourceBone[b],piece.sourceBone[a],pose[b],pose[a]);
   const render=(record)=>{const c=cap();hd.render(c.getContext('2d'),record,map,{frame});return rgba(c);};
   const full=render(slot),dark=render(darkSlot),body=render(bare),darkBody=render({...bare,colorAppearance:darkSlot.colorAppearance});
   const phases={...o,x:0,y:0,progress:(frame+.1)/n};let worldBytes;
   for(const [actor,ref] of [[light,full],[ebony,dark]]) {assert(await world.prepareStablePose(actor,phases));assert(world.draw({save(){},restore(){},drawImage(c){worldBytes=rgba(c);}},actor,phases));rgbaEq(ref,worldBytes);}
   let wand=cap(),ctx=wand.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.transform(...m.slice(0,4),m[4]*4,m[5]*4);
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
   rows.push([frame,intact,darkIntact,visible,pure]);global.gc?.();
  }
  console.log(direction,action,"all 8 tones",JSON.stringify(rows));
 }
})().catch(e=>{console.error(e);process.exitCode=1});
