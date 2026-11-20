/* Calibratable carry candidate. Exact source PNGs, full native canvas and authored walk bones. */
(function(root){'use strict';
const skinMaterials=root.MareNativeSkinHD||(typeof require==='function'?require('./player-rework-skin-hd.js'):null);
const hairAnatomy=root.MareHairAnatomyHD||(typeof require==='function'?require('./player-rework-hair-anatomy-hd.js'):null);
function create(baseIndex,carryIndex,{vendor=root.ReworkAccessoryVendor,basePrefix='tools/rework-base-hd/assets/',weaponPrefix='tools/rework-weapon-layers-hd/',makeCanvas=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h})}={}){
 if(!vendor?.compositor)throw Error('Carry needs original compositor');const V=vendor.compositor;
 function resolveHair(base,style){
  if(style==='original')return {};
  const d=base.pack.directions[base.direction],target=d.layers.filter(l=>l.slot==='hair');
  if(style==='none')return {hairLayers:[]};
  const sourceDir=base.mirrorX?'east':base.direction;
  const hair=baseIndex.records.find(r=>r.body===base.body&&r.action==='idle'&&r.direction===sourceDir&&r.hairStyle===style);
  const source=hair?.pack.directions[sourceDir],layer=source?.layers.find(l=>l.slot==='hair');
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  if(target.length!==1||!layer||layer.binding.kind!=='fixed'||layer.frames||
     !same(base.pack.frame,hair.pack.frame)||base.pack.density!==hair.pack.density||
     !same(base.pack.pivot,hair.pack.pivot)||!['NECK','NOSE'].every(k=>same(d.rest[k],source.rest[k])))return null;
  return {hairLayers:[{...target[0],id:layer.id,source:layer.source}],hairSource:hair.id};
 }
 function verifiedMechanical119SouthPlan(p){
  const xy=(q,x,y)=>q?.x===x&&q.y===y,wh=(q,w,h)=>q?.length===2&&q[0]===w&&q[1]===h,
    bones=[['RIGHT SHOULDER',68.97607655502392,64.45933014354067],
      ['RIGHT ELBOW',65.30143540669857,75.86602870813397],['RIGHT ARM',63.464114832535884,89.41626794258373]],
    shas=['69546df73ee8ceba1a6432a57b715868ae669c49f03122969ce13cd694606dc7',
      '43562d1350ba4b1602f6c7e68387761930b9bac71c8e5d7874696648d431d629'];
  return p.item===119&&p.body==='male'&&p.direction==='south'&&p.sourceDirection==='south'&&
    p.targetWalkRecord==='male-walk-south-r7'&&wh(p.targetNativeCanvas,512,512)&&p.paddingPhysical==null&&
    p.mirrorEntireComposition===false&&p.segmentedArm===true&&p.canUseSameRegistrationForIdle===false&&p.parts.length===2&&
    p.parts.every((q,i)=>{const a=bones[i][0],b=bones[i+1][0],h=shas[i],s=q.source;
      return q.side==='RIGHT'&&q.binding?.kind==='rigid'&&q.binding.a===a&&q.binding.b===b&&
        q.replaceBoundLayer===true&&!q.hideHandBeyondWrist&&!q.skinMaterial&&!q.mirrorSource&&q.depthOffset===0&&
        wh(q.calibrationOffsetPhysical,0,0)&&s?.sha256===h&&s.url==='assets/'+h+'.png'&&
        wh(s.size,640,640)&&wh(s.nativeSize,640,640)&&!s.sourceClip&&bones.slice(i,i+2).every(([k,x,y])=>
          xy(q.sourceBone?.[k],x,y)&&xy(q.targetRestBone?.[k],x-16,y-16));
    });
 }
 function resolve({joinedLuvas3Saved=false,joinedManopla14Saved=false,item,body,action,direction,appearance={},equipment={},pureRelic32Saved=false,pureCompass16Saved=false,joinedArm117Saved=false,joinedCannon15Saved=false,joinedCannon118Saved=false,joinedGauntlet111Saved=false,joinedGauntletSouthSaved=false,joinedGauntlet2NorthSaved=false,joinedCyborgFringeSaved=false,mechanical119SouthSaved=false,pureRelic31Saved=false,pureOrb122SideSaved=false,pureOrb122NorthSouthSaved=false}={}){
  if(item==null)return null;
  if(![0,123,124,125,126,127,128,14,16,110,121,31,32,118,119,120,112,71,72,73,74,12,13,2,3,15,1,68,67,70,69,117,109,111,17,122,4,5,113,114,115,116].includes(Number(item))||!['male','masculino'].includes(body)||!['walk','idle'].includes(action))return null;
  if(Object.entries(equipment).some(([k,v])=>k!=='weapon'&&v!=null&&!['original','none'].includes(v)))return null;
  let plan=carryIndex.records.find(r=>r.item===Number(item)&&r.direction===direction);if(!plan)return null;
  const skin=appearance.skin||appearance.skinColor;
  const skinLocked=[123,124,125,126,127,128,14,16,110,121,31,32,118,119,120,112,2,3,15,17,122,111,117].includes(Number(item));
  const item32SHA='b5ef89a85da05dae52d7151d74991cc81290932a9bc102856d71c985305991b8',part=plan.parts[0];
  const walks={north:'v7-male-walk-drawn-north-north',south:'male-walk-south-r7',east:'v7-male-walk-drawn-east-east',west:'v7-male-walk-drawn-east-east-mirror-west-candidate'},
   lateral=['east','west'].includes(direction),side=lateral?'RIGHT':'LEFT';
  const pure=Number(item)===32&&Object.hasOwn(walks,direction)&&pureRelic32Saved&&
    Object.keys(equipment).length===1&&equipment.weapon===32&&plan.targetWalkRecord===walks[direction]&&
    plan.item===32&&plan.body==='male'&&plan.sourceDirection==='east'&&plan.interfaceSkinLocked===false&&plan.parts.length===1&&
    part?.source?.sourceMember==='original/equipment/00-unoccluded.png'&&part.source.sha256===item32SHA&&part.source.url==='assets/'+item32SHA+'.png'&&
    JSON.stringify(part.source.nativeSize)==='[640,640]'&&part.side===side&&part.binding?.kind==='rigid'&&part.binding.a===side+' ELBOW'&&part.binding.b===side+' ARM'&&
    !part.skinMaterial&&!part.replaceBoundLayer&&!part.source.sourceClip&&!part.hideHandBeyondWrist&&part.mirrorSource===(direction==='west')&&part.depthOffset===-0.1&&
    JSON.stringify(part.calibrationOffsetPhysical)==='[0,18]';
  const compass=Number(item)===16&&Object.hasOwn(walks,direction)&&pureCompass16Saved&&Object.keys(equipment).length===1&&equipment.weapon===16&&
    plan.item===16&&plan.body==='male'&&plan.sourceDirection==='east'&&plan.targetWalkRecord===walks[direction]&&plan.interfaceSkinLocked===false&&plan.parts.length===1&&
    part?.source?.sourceMember==='Original equipment pixels under approved authored protection mask'&&
    part.source.sha256==='a5d7c7ee814eaf3c1e4ec9ae32c074eb6f53e879288b7b6eab65e468b73e91bd'&&part.source.url==='assets/'+part.source.sha256+'.png'&&
    JSON.stringify(part.source.nativeSize)==='[640,640]'&&part.side===side&&part.binding?.kind==='rigid'&&part.binding.a===side+' ELBOW'&&part.binding.b===side+' ARM'&&
    [[part.binding.a,76],[part.binding.b,89]].every(([k,y])=>part.sourceBone?.[k]?.x===(direction==='west'?71.25:88.75)&&part.sourceBone[k]?.y===y)&&
    !part.skinMaterial&&!part.replaceBoundLayer&&!part.source.sourceClip&&!part.hideHandBeyondWrist&&part.mirrorSource===(direction==='west')&&part.depthOffset===-0.1&&
    JSON.stringify(part.calibrationOffsetPhysical)==='[0,14]';
  if(compass){
   // Original full equipment layer from the same W16 EAST F0 composite as the
   // former masked carry source, including pixels concealed by its original palm.
   const sha256='b9ff9fb23315eeae625bac311953a4fb1b1c63500045fba42be3f9954f70d0fd';
   plan={...plan,parts:[{...part,source:{...part.source,sha256,url:'assets/'+sha256+'.png',sourceMember:'authored-ordered-16-east/0/equipment'}}]};
  }
  const mech=Number(item)===119&&direction==='south'&&mechanical119SouthSaved&&Object.keys(equipment).length===1&&equipment.weapon===119&&
    // Own F0 upper and lower arm are byte-exact to the signed anatomy+equipment
    // source and have zero contact with its independently ranked skin matte.
    verifiedMechanical119SouthPlan(plan);
  const rl31=Number(item)===31&&pureRelic31Saved===true&&Object.hasOwn(walks,direction)&&Object.keys(equipment).length===1&&equipment.weapon===31&&
    plan.item===31&&plan.body==='male'&&plan.sourceDirection==='east'&&plan.targetWalkRecord===walks[direction]&&plan.parts.length===1&&
    plan.targetNativeCanvas==null&&plan.paddingPhysical==null&&
    plan.mirrorEntireComposition==null&&part.side==='RIGHT'&&part.binding?.kind==='rigid'&&
    part.binding.a==='RIGHT ELBOW'&&part.binding.b==='RIGHT ARM'&&
    part.source.sha256==='01dc643b144c0f9add31481140c694dd76dfbacfe50f9ee4b361bd87f369b827'&&
    part.source.url==='assets/'+part.source.sha256+'.png'&&JSON.stringify(part.source.nativeSize)==='[640,640]'&&
    part.source.sourceMember==='M158/0-source.png masked by original protected region excluding head'&&
    part.mirrorSource===(direction==='south')&&part.hideHandBeyondWrist===true&&part.depthOffset===.1&&
    !part.skinMaterial&&!part.replaceBoundLayer&&!part.source.sourceClip&&JSON.stringify(part.calibrationOffsetPhysical)==='[0,8]'&&
    [['RIGHT ELBOW',73.75],['RIGHT ARM',86.75]].every(([k,y])=>part.sourceBone?.[k]?.x===(direction==='south'?58.25:101.75)&&part.sourceBone[k]?.y===y);
  if(rl31){
   // Pure W31 from its own ordered East attack F0. (370,312) is
   // the authored equipment/grip overlap center, not a new hand sprite.
   const sha256='9acb8f39056d3f761b73d6d32cb2f28b446b535473c09e08be5cc609b053eb77',
    x=part.mirrorSource?270:370,y=312,[a,b]=[part.binding.a,part.binding.b];
   plan={...plan,parts:[{...part,source:{...part.source,sha256,url:'assets/'+sha256+'.png',sourceMember:'authored-ordered-31-east/0/gear'},
    sourceBone:{[a]:{x:x/4,y:y/4-13},[b]:{x:x/4,y:y/4}},hideHandBeyondWrist:false,depthOffset:-.1,
    ...(lateral?{relic31PivotTilt:{x,y,radians:Math.PI/9}}:{})}]};
  }
  const arm117=Number(item)===117&&lateral&&joinedArm117Saved&&Object.keys(equipment).length===1&&equipment.weapon===117&&
   plan.item===117&&plan.body==='male'&&plan.sourceDirection==='east'&&plan.targetWalkRecord===walks[direction]&&plan.parts.length===1&&
   plan.mirrorEntireComposition===(direction==='west')&&JSON.stringify(plan.targetNativeCanvas)==='[512,512]'&&
   part?.source?.sha256==='c86602712a9c0a7295e2e509ee2726553a24ce83172b573876bdde263fc17f96'&&part.source.url==='assets/'+part.source.sha256+'.png'&&
   JSON.stringify(part.source.nativeSize)==='[640,640]'&&part.side==='RIGHT'&&part.binding?.kind==='rigid'&&part.binding.a==='RIGHT ELBOW'&&part.binding.b==='RIGHT ARM'&&
   JSON.stringify(part.sourceBone)==='{"RIGHT ELBOW":{"x":75.5,"y":73.5},"RIGHT ARM":{"x":80,"y":88.75}}'&&
   !part.skinMaterial&&!part.replaceBoundLayer&&!part.source.sourceClip&&part.hideHandBeyondWrist===true&&!part.mirrorSource&&part.depthOffset===undefined&&
   JSON.stringify(part.calibrationOffsetPhysical)==='[0,0]';
  if(arm117)plan={...plan,parts:[{...part,joined117Sources:[
   'b0979f9817371731bb761db0dfed65de422a64c6fdd053232e50dc8966a21b6a',
   '34d57b1b89acb48177dbd83d05fdfc893ca5538fd9bf1984f80b397142c38b0b',
   '4577ab047ecdde54c165b5322df7525a1296f8e6a236c94e1cfe22628e4c8472'
  ].map(h=>'assets/'+h+'.png')}]};
  // SOUTH F0 layers/0-equipment.png from W117 full-return source archive
  // SHA95477e58…; only the own pass which recreates the existing carry crop.
  const arm117South=Number(item)===117&&direction==='south'&&joinedArm117Saved&&Object.keys(equipment).length===1&&equipment.weapon===117&&
   plan.item===117&&plan.body==='male'&&plan.sourceDirection==='south'&&plan.targetWalkRecord===walks.south&&plan.parts.length===1&&
   plan.mirrorEntireComposition===false&&JSON.stringify(plan.targetNativeCanvas)==='[512,512]'&&
   part?.source?.sha256==='ee7b9253c9d68852cbcf6d48ed2c306005093ce94c9ffd7193f4317d5076b467'&&part.source.url==='assets/'+part.source.sha256+'.png'&&
   JSON.stringify(part.source.nativeSize)==='[640,640]'&&part.side==='RIGHT'&&part.binding?.kind==='rigid'&&part.binding.a==='RIGHT ELBOW'&&part.binding.b==='RIGHT ARM'&&
   JSON.stringify(part.sourceBone)==='{"RIGHT ELBOW":{"x":65.30143540669857,"y":75.86602870813397},"RIGHT ARM":{"x":63.464114832535884,"y":89.41626794258373}}'&&
   !part.skinMaterial&&!part.replaceBoundLayer&&!part.source.sourceClip&&part.hideHandBeyondWrist===true&&!part.mirrorSource&&part.depthOffset===undefined&&
   JSON.stringify(part.calibrationOffsetPhysical)==='[0,0]';
  if(arm117South)plan={...plan,parts:[{...part,joined117Sources:[
   '0b7ee1b711b485637652f65c64610a73741c2fb1c0cf8213759ff7488f929f3e',
   '3da05f94849279f5dd3cceb75958b0afaa4d7953429b614a542e248114da5f4f',
   'ece41fc00ac65c312a4f33408c4f69c2d02d3a7eac42db26fc70b95c3da3de93'
  ].map(h=>'assets/'+h+'.png'),joined117South:true}]};
  const cannon15=Number(item)===15&&lateral&&joinedCannon15Saved&&Object.keys(equipment).length===1&&equipment.weapon===15&&
   plan.item===15&&plan.body==='male'&&plan.sourceDirection==='east'&&plan.targetWalkRecord===walks[direction]&&plan.parts.length===1&&
   plan.mirrorEntireComposition===(direction==='west')&&JSON.stringify(plan.targetNativeCanvas)==='[512,512]'&&
   part?.source?.sha256==='59a23e1acdd6999e206079a0e01ca812c743a31c18e0234bb445ac1f375e1651'&&part.source.url==='assets/'+part.source.sha256+'.png'&&
   JSON.stringify(part.source.nativeSize)==='[640,640]'&&part.side==='RIGHT'&&part.binding?.kind==='rigid'&&part.binding.a==='RIGHT ELBOW'&&part.binding.b==='RIGHT ARM'&&
   JSON.stringify(part.sourceBone)==='{"RIGHT ELBOW":{"x":75.5,"y":73.5},"RIGHT ARM":{"x":80,"y":88.75}}'&&
   !part.skinMaterial&&!part.replaceBoundLayer&&!part.source.sourceClip&&part.hideHandBeyondWrist===true&&!part.mirrorSource&&part.depthOffset===undefined&&
   JSON.stringify(part.calibrationOffsetPhysical)==='[0,0]';
  if(cannon15)plan={...plan,parts:[{...part,joined15Sources:[
   'b0979f9817371731bb761db0dfed65de422a64c6fdd053232e50dc8966a21b6a',
   '34d57b1b89acb48177dbd83d05fdfc893ca5538fd9bf1984f80b397142c38b0b',
   '590bd6324117727edfef6806975ae1e82e3171015b544442472bea2dce699009'
  ].map(h=>'assets/'+h+'.png')}]};
  // Approved Canhao15_Aros_Editavel_Backup.zip SHA46c48bda… / camada0.png.
  // Preserve the live original joined NORTH crop; draw only its own skin contribution.
  const cannon15North=Number(item)===15&&direction==='north'&&joinedCannon15Saved&&Object.keys(equipment).length===1&&equipment.weapon===15&&
   plan.item===15&&plan.body==='male'&&plan.sourceDirection==='north'&&plan.targetWalkRecord===walks.north&&plan.parts.length===1&&
   plan.mirrorEntireComposition===false&&JSON.stringify(plan.targetNativeCanvas)==='[512,512]'&&
   part?.source?.sha256==='f5482aa957130425b88d61515857d12c139058eefdb7389acb845acb889f1efa'&&part.source.url==='assets/'+part.source.sha256+'.png'&&
   JSON.stringify(part.source.nativeSize)==='[640,640]'&&part.side==='RIGHT'&&part.binding?.kind==='rigid'&&part.binding.a==='RIGHT ELBOW'&&part.binding.b==='RIGHT ARM'&&
   JSON.stringify(part.sourceBone)==='{"RIGHT ELBOW":{"x":93.5,"y":74},"RIGHT ARM":{"x":95.25,"y":88.25}}'&&
   !part.skinMaterial&&!part.replaceBoundLayer&&!part.source.sourceClip&&part.hideHandBeyondWrist===true&&!part.mirrorSource&&part.depthOffset===undefined&&
   JSON.stringify(part.calibrationOffsetPhysical)==='[0,0]';
  if(cannon15North)plan={...plan,parts:[{...part,joined15Sources:[
   '9a11a56a800ed3150aedc977c240821ce7e644be94065736933f9721f6885f97',
   '2d63629d17384dce855b82c242fe109bbeaacbeacd654184ee8c972cd52239c0',
   '42bc1a7c0d327a4506a3867c5188b4ab656d4788c9ffb5dd998391df6d9ea6ef'
  ].map(h=>'assets/'+h+'.png'),joined15North:true}]};
  // SOUTH own rest pose from archive SHA9255b3f0… / retracted-rest-study-v3,
  // including the archive's approved composition match using the F0 hand path.
  const cannon15South=Number(item)===15&&direction==='south'&&joinedCannon15Saved&&Object.keys(equipment).length===1&&equipment.weapon===15&&
   plan.item===15&&plan.body==='male'&&plan.sourceDirection==='south'&&plan.targetWalkRecord===walks.south&&plan.parts.length===1&&
   plan.mirrorEntireComposition===false&&JSON.stringify(plan.targetNativeCanvas)==='[512,512]'&&
   part?.source?.sha256==='79ca605a6ecb835d3c2eb785f301d48c7e4943665723b9c6bbf588112da324ec'&&part.source.url==='assets/'+part.source.sha256+'.png'&&
   JSON.stringify(part.source.nativeSize)==='[640,640]'&&part.side==='RIGHT'&&part.binding?.kind==='rigid'&&part.binding.a==='RIGHT ELBOW'&&part.binding.b==='RIGHT ARM'&&
   JSON.stringify(part.sourceBone)==='{"RIGHT ELBOW":{"x":65.30143540669857,"y":75.86602870813397},"RIGHT ARM":{"x":63.464114832535884,"y":89.41626794258373}}'&&
   !part.skinMaterial&&!part.replaceBoundLayer&&!part.source.sourceClip&&part.hideHandBeyondWrist===true&&!part.mirrorSource&&part.depthOffset===undefined&&
   JSON.stringify(part.calibrationOffsetPhysical)==='[0,0]';
  if(cannon15South)plan={...plan,parts:[{...part,joined15Sources:[
   '0b7ee1b711b485637652f65c64610a73741c2fb1c0cf8213759ff7488f929f3e',
   '3da05f94849279f5dd3cceb75958b0afaa4d7953429b614a542e248114da5f4f',
   '3fc83f9af20f59a919cfe299e8f213aedc9b808af243d69ddd5388207c839377'
  ].map(h=>'assets/'+h+'.png'),joined15South:true}]};
  const cannon118South=Number(item)===118&&direction==='south'&&joinedCannon118Saved&&Object.keys(equipment).length===1&&equipment.weapon===118&&
   plan.item===118&&plan.body==='male'&&plan.sourceDirection==='south'&&plan.targetWalkRecord===walks.south&&plan.parts.length===1&&
   plan.mirrorEntireComposition===false&&JSON.stringify(plan.targetNativeCanvas)==='[512,512]'&&
   part?.source?.sha256==='9fadba42a015194fcbde9afaec3c6a266ad4ab566580b79e5353d4e6a2f9c31e'&&part.source.url==='assets/'+part.source.sha256+'.png'&&
   JSON.stringify(part.source.nativeSize)==='[640,640]'&&part.side==='RIGHT'&&part.binding?.kind==='rigid'&&part.binding.a==='RIGHT ELBOW'&&part.binding.b==='RIGHT ARM'&&
   JSON.stringify(part.sourceBone)==='{"RIGHT ELBOW":{"x":65.30143540669857,"y":75.86602870813397},"RIGHT ARM":{"x":63.464114832535884,"y":89.41626794258373}}'&&
   !part.skinMaterial&&!part.replaceBoundLayer&&!part.source.sourceClip&&part.hideHandBeyondWrist===true&&!part.mirrorSource&&part.depthOffset===undefined&&
   JSON.stringify(part.calibrationOffsetPhysical)==='[0,0]';
  // W118 own archive static01: separate mechanism and explicit distal cut, exact original F0.
  if(cannon118South)plan={...plan,parts:[{...part,joined118Sources:["0b7ee1b711b485637652f65c64610a73741c2fb1c0cf8213759ff7488f929f3e", "3da05f94849279f5dd3cceb75958b0afaa4d7953429b614a542e248114da5f4f", "00f7479870eb2432690c4becba4699479c995d9279684f98eb7e51e1f800f5ca", "a3677f4c6dde088c5370561b77104286424e2a4371725d8565eb43fd988f1337"].map(h=>'assets/'+h+'.png')}]};
  // W120 own F0: under-gear skin contribution only. Preserve full existing crop.
  // Own W111 South F0: the archive recipe registers both hands at .048, not
  // the stale .04 in its manifest. Preserve authored carry crops and binding.
  const gauntlet111=Number(item)===111&&direction==='south'&&joinedGauntlet111Saved===true&&Object.keys(equipment).length===1&&equipment.weapon===111&&
   plan.item===111&&plan.body==='male'&&plan.direction==='south'&&plan.sourceDirection==='south'&&plan.targetWalkRecord===walks.south&&
   plan.targetNativeCanvas?.length===2&&plan.targetNativeCanvas.every(v=>v===512)&&plan.mirrorEntireComposition===false&&plan.paddingPhysical==null&&plan.parts.length===2&&
   plan.parts.every((q,i)=>{
    const side=i?'LEFT':'RIGHT',a=side+' ELBOW',b=side+' ARM',x=i?94.69856459330144:65.30143540669857,u=i?96.53588516746412:63.464114832535884,
     y=75.86602870813397,v=89.41626794258373,h=i?'c7c182d0bc4a57b485251dec7f0dc08904f2f47e2ce2fbde69267a391375b430':'85b0df18f50f6f9dc2e13764e9f2a7a9e9905ae8166e81eab61f3dc429adeacc',
     at=(p,x,y)=>p?.x===x&&p.y===y;
    return q.side===side&&q.binding?.kind==='rigid'&&q.binding.a===a&&q.binding.b===b&&q.source?.sha256===h&&q.source.url==='assets/'+h+'.png'&&
     q.source.nativeSize?.length===2&&q.source.nativeSize.every(v=>v===640)&&at(q.sourceBone?.[a],x,y)&&at(q.sourceBone?.[b],u,v)&&
     at(q.targetRestBone?.[a],x-16,y-16)&&at(q.targetRestBone?.[b],u-16,v-16)&&
     !q.source.sourceClip&&!q.skinMaterial&&!q.replaceBoundLayer&&!q.hideHandBeyondWrist&&!q.mirrorSource&&q.depthOffset==null&&
     q.calibrationOffsetPhysical?.length===2&&q.calibrationOffsetPhysical.every(v=>v===0);
   });
  if(gauntlet111)plan={...plan,parts:plan.parts.map((q,i)=>({...q,joinedFringe:{count:i?754:767,support:908,urls:[
   '0b7ee1b711b485637652f65c64610a73741c2fb1c0cf8213759ff7488f929f3e', i?'eedaa9291c0580ec921a1bf836d383e428f0860f150036ee1d743b213692e92b':'2e862c3194b67931585b76e0f9f42c80a463fe6362c3d98a476b01236f026891'
  ].map(h=>'assets/'+h+'.png')}}))};
  // W111 NORTH exact own layered F0 from left-contact v2. Retain the
  // original Canvas encoding, applying only skin's RGB contribution delta.
  const gauntlet111North=Number(item)===111&&direction==='north'&&joinedGauntlet111Saved===true&&Object.keys(equipment).length===1&&equipment.weapon===111&&
   plan.item===111&&plan.body==='male'&&plan.direction==='north'&&plan.sourceDirection==='north'&&plan.targetWalkRecord===walks.north&&
   plan.targetNativeCanvas?.length===2&&plan.targetNativeCanvas.every(v=>v===512)&&plan.mirrorEntireComposition===false&&plan.paddingPhysical==null&&plan.parts.length===2&&
   plan.parts.every((q,i)=>{
    const side=i?'LEFT':'RIGHT',a=side+' ELBOW',b=side+' ARM',x=i?66.5:93.5,u=i?64.5:95.25,
     y=74,v=88.25,h=i?'fa1b1529739aced049d7c0e68421af4c78d0c7906dc55cccfe15714c017f118c':'692d9a0a1e43e7904dc3980d139e67b55c93f55c1e638c33e6a2393f69748e6a',
     at=(p,x,y)=>p?.x===x&&p.y===y;
    return q.side===side&&q.binding?.kind==='rigid'&&q.binding.a===a&&q.binding.b===b&&q.source?.sha256===h&&q.source.url==='assets/'+h+'.png'&&
     q.source.nativeSize?.length===2&&q.source.nativeSize.every(v=>v===640)&&at(q.sourceBone?.[a],x,y)&&at(q.sourceBone?.[b],u,v)&&
     at(q.targetRestBone?.[a],x-16,y-16)&&at(q.targetRestBone?.[b],u-16,v-16)&&
     !q.source.sourceClip&&!q.skinMaterial&&!q.replaceBoundLayer&&!q.hideHandBeyondWrist&&!q.mirrorSource&&q.depthOffset==null&&
     q.calibrationOffsetPhysical?.length===2&&q.calibrationOffsetPhysical.every(v=>v===0);
   });
  if(gauntlet111North)plan={...plan,parts:plan.parts.map((q,i)=>({...q,joinedFringe:{count:i?1033:1039,support:i?1870:1887,clothing:i?0:1,rgbTolerance:1,urls:[
   '9a11a56a800ed3150aedc977c240821ce7e644be94065736933f9721f6885f97','9cdf75f440de5dad8df7bf95bd0461e1d21c7bb919bc363dab164e4028ad042c','2d63629d17384dce855b82c242fe109bbeaacbeacd654184ee8c972cd52239c0'
  ].map(h=>'assets/'+h+'.png')}}))};
  // Own W2 and W110 South F0. Their existing carry rigs name east as a
  // sourceDirection; preserve those exact rigid matrices, depth and wrist cuts.
  const southGauntletProof={"2":{"gear":"6cd0e307510af68f77903c01e110f8f8c50d0372996d2ecb3e72964b7a999ed5","support":[1184,1205],"skin":[886,874],"parts":[["88eda32297377802e38d8f818b115a7e95827d25d1f77496296147b27df6caba",66.20198675496688],["b672de04bb8c43f9570eb288c80f01753d405e995605ec3a74926c0cf612c221",96.125]]},"110":{"gear":"fb29ed32436ac87af4318d12803630f6db7dbc379dda4b61bd4f5c076d0f53cb","support":[1225,1202],"skin":[878,859],"parts":[["a40fd49400ac3ef3c2d6b375f7cd331ba0b31019d2fa608e37d54c1af6754dcf",66.12068965517241],["49ffe35da0c5fe9bc8bbc9513a07db793fb33152911b1c1f436603ed4cc0aa0f",96.35036496350365]]}}[Number(item)];
  const southGauntlet=!!southGauntletProof&&joinedGauntletSouthSaved===true&&direction==='south'&&Object.keys(equipment).length===1&&Number(item)===equipment.weapon&&
   plan.item===Number(item)&&plan.body==='male'&&plan.direction==='south'&&plan.targetWalkRecord===walks.south&&plan.sourceDirection==='east'&&
   plan.interfaceSkinLocked===true&&!plan.targetNativeCanvas&&plan.mirrorEntireComposition==null&&plan.paddingPhysical==null&&plan.parts.length===2&&
   plan.parts.every((q,i)=>{
    const s=i?'LEFT':'RIGHT',a=s+' ELBOW',b=s+' ARM',[h,x]=southGauntletProof.parts[i],at=(p,x,y)=>p?.x===x&&p.y===y;
    return q.side===s&&q.binding?.kind==='rigid'&&q.binding.a===a&&q.binding.b===b&&q.source?.sha256===h&&q.source.url==='assets/'+h+'.png'&&
     JSON.stringify(q.source.size)==='[640,640]'&&JSON.stringify(q.source.nativeSize)==='[640,640]'&&
     at(q.sourceBone[a],x,70.5)&&at(q.sourceBone[b],x,83.5)&&at(q.targetRestBone[a],i?78.69856459330144:49.30143540669857,59.86602870813397)&&
     at(q.targetRestBone[b],i?80.53588516746412:47.464114832535884,73.41626794258373)&&q.depthOffset===0.1&&q.hideHandBeyondWrist===true&&
     !q.source.sourceClip&&!q.skinMaterial&&!q.replaceBoundLayer&&!q.mirrorSource&&!q.calibrationOffsetPhysical;
   });
  if(southGauntlet)plan={...plan,parts:plan.parts.map((q,i)=>({...q,joinedFringe:{count:southGauntletProof.skin[i],support:southGauntletProof.support[i],
   clothing:i?0:1,rgbTolerance:1,urls:['0b7ee1b711b485637652f65c64610a73741c2fb1c0cf8213759ff7488f929f3e',southGauntletProof.gear,
   '3da05f94849279f5dd3cceb75958b0afaa4d7953429b614a542e248114da5f4f'].map(h=>'assets/'+h+'.png')}}))};
  // Published own W2 North-v7 F0 layers are 640px; the existing carry crops
  // occupy the same center of a 768px canvas. No resampling or retargeting.
  const gauntlet2North=Number(item)===2&&direction==='north'&&joinedGauntlet2NorthSaved===true&&Object.keys(equipment).length===1&&equipment.weapon===2&&
    plan.item===2&&plan.body==='male'&&plan.direction==='north'&&plan.sourceDirection==='east'&&plan.targetWalkRecord===walks.north&&
    plan.interfaceSkinLocked===true&&!plan.targetNativeCanvas&&plan.paddingPhysical==null&&plan.mirrorEntireComposition==null&&plan.parts.length===2&&
    plan.parts.every((q,i)=>{
     const side=i?'RIGHT':'LEFT',a=side+' ELBOW',b=side+' ARM',x=i?111.4369658119658:80.5827067669173,y=i?88.75:88,
      h=i?'c50f7fe4385bb9007bd314143a5059c8e0478a5aad967613bc0a49571e07c07b':'33136493d49bc376f0dc943348d314dbcca9f3a288cccea8c8d055f395670b6e',
      at=(p,x,y)=>p?.x===x&&p.y===y,wh=v=>v?.length===2&&v.every(n=>n===768);
     return q.side===side&&q.binding?.kind==='rigid'&&q.binding.a===a&&q.binding.b===b&&q.source?.sha256===h&&q.source.url==='assets/'+h+'.png'&&
      wh(q.source.size)&&wh(q.source.nativeSize)&&at(q.sourceBone?.[a],x,y)&&at(q.sourceBone?.[b],x,y+13)&&
      at(q.targetRestBone?.[a],i?77.5:50.5,58)&&at(q.targetRestBone?.[b],i?79.25:48.5,72.25)&&
      q.depthOffset===.1&&q.hideHandBeyondWrist===true&&!q.source.sourceClip&&!q.skinMaterial&&!q.replaceBoundLayer&&!q.mirrorSource&&!q.calibrationOffsetPhysical;
    });
  if(gauntlet2North)plan={...plan,parts:plan.parts.map((q,i)=>({...q,joinedFringe:{count:i?198:151,support:i?962:1011,clothing:i?1:0,rgbTolerance:1,centerPadding:64,urls:[
    '9a11a56a800ed3150aedc977c240821ce7e644be94065736933f9721f6885f97',i?'8a704b6088addc1e828b6149b691f7bd650f4e5f3d30db900f33a19f66ef5acf':'e29fdaaeb5357aff1ea51dfc0450ce22759dae8b1300eb26a7b461efff6144bf','2d63629d17384dce855b82c242fe109bbeaacbeacd654184ee8c972cd52239c0'
   ].map(h=>'assets/'+h+'.png')}}))};
  const cyborgFringe=Number(item)===120&&direction==='south'&&joinedCyborgFringeSaved&&Object.keys(equipment).length===1&&equipment.weapon===120&&
   plan.item===120&&plan.body==='male'&&plan.sourceDirection==='south'&&plan.targetWalkRecord===walks.south&&plan.parts.length===1&&
   plan.mirrorEntireComposition===false&&JSON.stringify(plan.targetNativeCanvas)==='[512,512]'&&
   part?.source?.sha256==='71f3e23a634f5b09648b9eb6ca5494a4ccbf723418974947332492b346a6d8ad'&&part.source.url==='assets/'+part.source.sha256+'.png'&&
   JSON.stringify(part.source.nativeSize)==='[640,640]'&&part.side==='RIGHT'&&part.binding?.kind==='rigid'&&part.binding.a==='RIGHT ELBOW'&&part.binding.b==='RIGHT ARM'&&
   JSON.stringify(part.sourceBone)==='{"RIGHT ELBOW":{"x":65.30143540669857,"y":75.86602870813397},"RIGHT ARM":{"x":63.464114832535884,"y":89.41626794258373}}'&&
   !part.skinMaterial&&!part.replaceBoundLayer&&!part.source.sourceClip&&part.hideHandBeyondWrist===true&&!part.mirrorSource&&part.depthOffset===undefined&&
   JSON.stringify(part.calibrationOffsetPhysical)==='[0,0]';
  if(cyborgFringe)plan={...plan,parts:[{...part,joinedFringe:{count:143,support:1542,urls:[
   '0b7ee1b711b485637652f65c64610a73741c2fb1c0cf8213759ff7488f929f3e','06966ed64eb2c4c7b27187e46baa51a3c46ae7059d8ea416e174dfe4cdaf86d0'
  ].map(h=>'assets/'+h+'.png')}}]};
  // Owner-approved L/O carry alternate: exact own Orbe122 layer from East F2.
  // The source registration is the approved preview offset; the existing native
  // carry hand goes in front. No cropped, copied, or recolored hand in the gear.
  const orb122=Number(item)===122&&pureOrb122SideSaved===true&&lateral&&Object.keys(equipment).length===1&&equipment.weapon===122&&
    plan.item===122&&plan.body==='male'&&plan.sourceDirection==='east'&&plan.targetWalkRecord===walks[direction]&&
    plan.interfaceSkinLocked===true&&plan.parts.length===1&&plan.targetNativeCanvas==null&&plan.paddingPhysical==null&&plan.mirrorEntireComposition==null&&
    part?.source?.sha256==='46a99d0dc1e29cb0f02a5a774fc64483f7923bd4780abfe1277c15ba8e114b0a'&&
    part.source.url==='assets/'+part.source.sha256+'.png'&&JSON.stringify(part.source.nativeSize)==='[640,640]'&&
    part.side==='RIGHT'&&part.binding?.kind==='rigid'&&part.binding.a==='RIGHT ELBOW'&&part.binding.b==='RIGHT ARM'&&
    !part.mirrorSource&&part.hideHandBeyondWrist===true&&part.depthOffset==null&&!part.skinMaterial&&!part.replaceBoundLayer&&!part.source.sourceClip&&
    JSON.stringify(part.calibrationOffsetPhysical)==='[-13,6]'&&
    JSON.stringify(part.sourceBone)==='{"RIGHT ELBOW":{"x":88.21232876712328,"y":76.18493150684931},"RIGHT ARM":{"x":88.93150684931507,"y":87.45205479452054}}';
  if(orb122){
   const sha256='d52b77a02515aaf23be9cc1b84d7ad9441425438bb9bf7016464247a2b0735c6',sourceBone=Object.fromEntries(Object.entries(part.sourceBone).map(([k,v])=>[k,{x:v.x+.5,y:v.y-25.75}]));
   plan={...plan,parts:[{...part,sourceBone,source:{sha256,url:'assets/'+sha256+'.png',nativeSize:[640,640],sourceMember:'authored-orb-122-east/2/gear'},
    hideHandBeyondWrist:false,depthOffset:-.1}]};
  }
  // Owner-approved W122 North/South carry preview. Same pure own F2 orb;
  // every target wrist and its authored depth/motion remains unchanged.
  const orbNS={north:{side:'RIGHT',sha:'a957407f45eedfab734f008aa99bd1bf9c44249759ff36ffeae7e91497ab4313',
     bones:[93.85967741935484,74.61935483870968,95.22419354838709,85.08064516129032],rest:[77.5,58,79.25,72.25],dx:1,dy:-23.75},
    south:{side:'LEFT',sha:'7f3a26856839d9be8eaec8e6343ac21c863593243da65925ddd39fa75eee6700',
     bones:[94.69856459330144,75.86602870813397,96.53588516746412,89.41626794258373],rest:[78.69856459330144,59.86602870813397,80.53588516746412,73.41626794258373],dx:4.25,dy:-32.5}}[direction];
  const orbPair=(p,k,l,v)=>p?.[k]?.x===v[0]&&p[k].y===v[1]&&p?.[l]?.x===v[2]&&p[l].y===v[3];
  const orb122NS=Number(item)===122&&pureOrb122NorthSouthSaved===true&&orbNS&&Object.keys(equipment).length===1&&equipment.weapon===122&&
    plan.item===122&&plan.body==='male'&&plan.direction===direction&&plan.sourceDirection===direction&&plan.targetWalkRecord===walks[direction]&&
    plan.interfaceSkinLocked===true&&plan.parts.length===1&&plan.targetNativeCanvas==null&&plan.paddingPhysical==null&&plan.mirrorEntireComposition==null&&
    part?.source?.sha256===orbNS.sha&&part.source.url==='assets/'+orbNS.sha+'.png'&&part.source.nativeSize?.length===2&&part.source.nativeSize.every(n=>n===640)&&
    part.side===orbNS.side&&part.binding?.kind==='rigid'&&part.binding.a===orbNS.side+' ELBOW'&&part.binding.b===orbNS.side+' ARM'&&
    orbPair(part.sourceBone,part.binding.a,part.binding.b,orbNS.bones)&&orbPair(part.targetRestBone,part.binding.a,part.binding.b,orbNS.rest)&&
    !part.mirrorSource&&!part.hideHandBeyondWrist&&part.depthOffset==null&&!part.skinMaterial&&!part.replaceBoundLayer&&!part.source.sourceClip&&
    part.calibrationOffsetPhysical?.length===2&&part.calibrationOffsetPhysical.every(n=>n===0);
  if(orb122NS){
   const sha256='d52b77a02515aaf23be9cc1b84d7ad9441425438bb9bf7016464247a2b0735c6',sourceBone=Object.fromEntries(Object.entries(part.sourceBone).map(([k,v])=>[k,{x:v.x+orbNS.dx,y:v.y+orbNS.dy}]));
   plan={...plan,parts:[{...part,sourceBone,source:{sha256,url:'assets/'+sha256+'.png',nativeSize:[640,640],sourceMember:'authored-orb-122-east/2/gear'},
    hideHandBeyondWrist:false,depthOffset:-.1}]};
  }
  // Manopla14: the North crop is the exact pure own F0; E/W and South
  // preserve their historic mounting and split only material at the fringe.
  const manopla14Authority={"south":{"sha":"8c5dfc4d424bf22567d89f6bce1b1b17b095d27e448cf308f39b37e9f7d94a84","targetWalkRecord":"male-walk-south-r7","sourceBone":{"RIGHT ELBOW":{"x":66.12068965517241,"y":70.5},"RIGHT ARM":{"x":66.12068965517241,"y":83.5}},"fringe":{"count":944,"support":1034,"clothing":1,"rgbTolerance":1,"urls":["assets/0b7ee1b711b485637652f65c64610a73741c2fb1c0cf8213759ff7488f929f3e.png","assets/393a9057810171c354946e1e2482d91eaaf0642f076abadc55361d4667e09291.png","assets/3da05f94849279f5dd3cceb75958b0afaa4d7953429b614a542e248114da5f4f.png"]}},"north":{"sha":"35710a540ca7697fb527c00ef103c620de5f0a597deeba628c303d792b95b461","targetWalkRecord":"v7-male-walk-drawn-north-north","sourceBone":{"RIGHT ELBOW":{"x":111.80813953488372,"y":86.75},"RIGHT ARM":{"x":111.80813953488372,"y":99.75}}},"east":{"sha":"8ff81ee85ed4eb038dfa08d0413266fa50a17a44e3c4f5c2b2b95361ef26bc9b","targetWalkRecord":"v7-male-walk-drawn-east-east","sourceBone":{"RIGHT ELBOW":{"x":79.48958333333333,"y":70.5},"RIGHT ARM":{"x":79.48958333333333,"y":83.5}},"fringe":{"count":46,"support":1273,"clothing":36,"rgbTolerance":0,"urls":["assets/b0979f9817371731bb761db0dfed65de422a64c6fdd053232e50dc8966a21b6a.png","assets/0d35afdf6b7e36243c02b53f9c21c64a581d95a7adaf7ed6a32079b31cdecf34.png","assets/34d57b1b89acb48177dbd83d05fdfc893ca5538fd9bf1984f80b397142c38b0b.png"]}},"west":{"sha":"8ff81ee85ed4eb038dfa08d0413266fa50a17a44e3c4f5c2b2b95361ef26bc9b","targetWalkRecord":"v7-male-walk-drawn-east-east-mirror-west-candidate","sourceBone":{"RIGHT ELBOW":{"x":79.48958333333333,"y":70.5},"RIGHT ARM":{"x":79.48958333333333,"y":83.5}},"fringe":{"count":46,"support":1273,"clothing":36,"rgbTolerance":0,"urls":["assets/b0979f9817371731bb761db0dfed65de422a64c6fdd053232e50dc8966a21b6a.png","assets/0d35afdf6b7e36243c02b53f9c21c64a581d95a7adaf7ed6a32079b31cdecf34.png","assets/34d57b1b89acb48177dbd83d05fdfc893ca5538fd9bf1984f80b397142c38b0b.png"]}}}, own14=manopla14Authority[direction],eq14=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const manopla14=Number(item)===14&&joinedManopla14Saved===true&&Object.keys(equipment).length===1&&equipment.weapon===14&&
   own14&&plan.item===14&&plan.body==='male'&&plan.sourceDirection==='east'&&plan.parts.length===1&&plan.interfaceSkinLocked===true&&
   plan.targetWalkRecord===own14.targetWalkRecord&&plan.targetNativeCanvas==null&&plan.paddingPhysical==null&&plan.mirrorEntireComposition==null&&
   part?.source?.sha256===own14.sha&&part.source.url==='assets/'+own14.sha+'.png'&&eq14(part.source.nativeSize,direction==='north'?[768,768]:[640,640])&&
   part.side==='RIGHT'&&eq14(part.binding,{kind:'rigid',a:'RIGHT ELBOW',b:'RIGHT ARM'})&&eq14(part.sourceBone,own14.sourceBone)&&
   part.hideHandBeyondWrist===true&&part.depthOffset===.1&&!part.source.sourceClip&&!part.skinMaterial&&!part.replaceBoundLayer&&!part.mirrorSource&&part.calibrationOffsetPhysical==null;
  if(manopla14&&own14.fringe)plan={...plan,parts:[{...part,joinedFringe:own14.fringe}]};
  // W3 own South F0: both metal/skin crops reconstitute exactly from
  // independent gear, anatomy and shorts. Preserve archived +/-1 rounding.
  const w3source=[{"sha":"ef58814bafb7ebba5238ecde3b36840fbd1320b5be88126e8782582c5cfb297e","sourceBone":{"RIGHT ELBOW":{"x":66.065625,"y":70.5},"RIGHT ARM":{"x":66.065625,"y":83.5}},"targetRestBone":{"RIGHT ELBOW":{"x":49.30143540669857,"y":59.86602870813397},"RIGHT ARM":{"x":47.464114832535884,"y":73.41626794258373}}},{"sha":"1cbd3e71348f06d0908e219da9e6dce067d866a4154c4112f303360d90dd84ca","sourceBone":{"LEFT ELBOW":{"x":96.23407643312102,"y":70.5},"LEFT ARM":{"x":96.23407643312102,"y":83.5}},"targetRestBone":{"LEFT ELBOW":{"x":78.69856459330144,"y":59.86602870813397},"LEFT ARM":{"x":80.53588516746412,"y":73.41626794258373}}}], w3fringes=[{"count":944,"support":1029,"clothing":1,"rgbTolerance":1,"urls":["assets/0b7ee1b711b485637652f65c64610a73741c2fb1c0cf8213759ff7488f929f3e.png","assets/2b10e18cda0f0cf5d4875ea1e03be2ebff3ad47955ae0cb1d451c08febba829c.png","assets/3da05f94849279f5dd3cceb75958b0afaa4d7953429b614a542e248114da5f4f.png"]},{"count":922,"support":1021,"clothing":0,"rgbTolerance":1,"urls":["assets/0b7ee1b711b485637652f65c64610a73741c2fb1c0cf8213759ff7488f929f3e.png","assets/44c65ab76b8a35134158b546b31c055fd2244c68511b28cbb7043249491e4e61.png","assets/3da05f94849279f5dd3cceb75958b0afaa4d7953429b614a542e248114da5f4f.png"]}],eq3=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const luvas3=Number(item)===3&&direction==='south'&&joinedLuvas3Saved===true&&Object.keys(equipment).length===1&&equipment.weapon===3&&
   plan.item===3&&plan.body==='male'&&plan.sourceDirection==='east'&&plan.parts.length===2&&plan.interfaceSkinLocked===true&&
   plan.targetWalkRecord===walks.south&&plan.targetNativeCanvas==null&&plan.paddingPhysical==null&&plan.mirrorEntireComposition==null&&
   plan.parts.every((q,i)=>{
    const own=w3source[i],side=i?'LEFT':'RIGHT';
    return q.side===side&&eq3(q.binding,{kind:'rigid',a:side+' ELBOW',b:side+' ARM'})&&q.source?.url==='assets/'+own.sha+'.png'&&q.source.sha256===own.sha&&
     eq3(q.source.nativeSize,[640,640])&&eq3(q.sourceBone,own.sourceBone)&&eq3(q.targetRestBone,own.targetRestBone)&&
     q.hideHandBeyondWrist===true&&q.depthOffset===.1&&!q.source.sourceClip&&!q.skinMaterial&&!q.replaceBoundLayer&&!q.mirrorSource&&q.calibrationOffsetPhysical==null;
   });
  if(luvas3)plan={...plan,parts:plan.parts.map((q,i)=>({...q,joinedFringe:w3fringes[i]}))};
  if(skin&&skin!=='original'&&skinLocked&&!manopla14&&!luvas3&&!pure&&!compass&&!arm117&&!arm117South&&!cannon15&&!cannon15North&&!cannon15South&&!cannon118South&&!cyborgFringe&&!gauntlet111&&!gauntlet111North&&!southGauntlet&&!gauntlet2North&&!mech&&!rl31&&!orb122&&!orb122NS&&!plan.parts.every(p=>p.skinMaterial?.sourceSHA256===p.source.sha256&&p.skinMaterial?.url))return null;
  const hair=(appearance.hairStyle||appearance.hair||'original').replace(/^hair-/,'');
  const base=baseIndex.records.find(r=>r.body==='male'&&r.direction===direction&&r.action===action&&r.hairStyle==='original');if(!base)return null;
  let relicEyes;
  if(luvas3||manopla14||pure||compass||mech||rl31||orb122||orb122NS||arm117||arm117South||cannon15||cannon15North||cannon15South||cannon118South||cyborgFringe||gauntlet111||gauntlet111North||southGauntlet||gauntlet2North){
   const d=base.pack.directions[direction],faces=d.layers.filter(x=>x.slot==='face'),north=direction==='north';
   if(base.id!==(action==='walk'?walks[direction]:'male-idle-original-'+direction+'-from-walk0')||!!base.mirrorX!==(direction==='west')||hair!=='original'||
      !base.headHairSeparated||!['headBase','hair','lower-redrawn',...(lateral?['handNear']:['handRight','handLeft'])].every(k=>d.layers.some(x=>x.id===k)))return null;
   const hairSources={north:'429fbd2edaed6ec4d1ad5aac24898967f731e2f30f522f73d2fb16931dcf3a06',
    south:'9f6887a18e8b7a60e6dd512e9174f8f5a627b66036dc785e13567340b1a70d93',
    east:'bc1e1701bfa4ebeef48a107262cf17e707a0393a0708e8072bd46b1d3b552d2f'};
   const source=hairSources[lateral?'east':direction],h=d.layers.filter(l=>l.slot==='hair'),mat=hairAnatomy?.records[source];
   if(h.length!==1||h[0].id!=='hair'||h[0].source!==source||h[0].frames||mat?.width!==512||mat?.height!==512||
      mat.direction!==(lateral?'east':direction)||!mat.skinRuns?.length||!root.MareCharacterAppearance?.eyes?.[appearance.eyeColor]?.ramp)return null;
   if(mech&&(!d.layers.some(l=>l.id==='armRight'&&l.depth===4&&l.binding?.a==='RIGHT SHOULDER'&&l.binding.b==='RIGHT ELBOW')||
      !d.layers.some(l=>l.id==='handRight'&&l.depth===6&&l.binding?.a==='RIGHT ELBOW'&&l.binding.b==='RIGHT ARM')))return null;
   if(north){if(faces.length)return null;}
   else{
    const sha=lateral?'8909af0e687972ad9153da86adb4e8374b47aaab46a1f751c344023446ba39dc':'81ce2c74c6e8e05f2745223cdea70cfecee5b0ff49e4bcbf8d6ed25d62e72449';
    const registry=root.MareReworkModularOutfitsHD,samples=lateral?registry?.sideIrisSamples('east'):registry?.southIrisSamples(),face=faces[0];
    if(faces.length!==1||face.source!==sha||face.frames?.some(h=>h!==sha)||samples?.length!==(lateral?18:45))return null;
    relicEyes={sha,samples,offset:lateral?0:64};
   }
  }
  const hairLayers=resolveHair(base,hair);
  if(!hairLayers)return null;
  if(direction==='west'&&!base.mirrorX){plan={...plan,parts:plan.parts.map(p=>({...p,mirrorSource:true,sourceBone:Object.fromEntries(Object.entries(p.sourceBone).map(([k,v])=>[k,{x:(p.source.nativeSize?.[0]||640)/4-v.x,y:v.y}])),targetRestBone:Object.fromEntries(Object.entries(p.targetRestBone).map(([k,v])=>[k,{x:128-v.x,y:v.y}]))}))};}
  const rest=base.pack.directions[direction].rest;
  for(const part of plan.parts)for(const name of [part.binding.a,part.binding.b])if(!rest[name]||Math.hypot(rest[name].x-part.targetRestBone[name].x,rest[name].y-part.targetRestBone[name].y)>.001)return null;
  return {id:`carry${item}-${base.id}${hair==='original'?'':':hair-'+hair}`,...hairLayers,...(luvas3?{luvas3SavedPalette:true}:{}),...(gauntlet2North?{gauntlet2NorthSavedPalette:true}:{}),...(southGauntlet?{gauntletsSouthSavedPalette:true}:{}),...(manopla14?{manopla14SavedPalette:true}:{}),...(gauntlet111North?{gauntlet111NorthSavedPalette:true}:{}),...(gauntlet111?{gauntlet111SouthSavedPalette:true}:{}),...(cannon118South?{cannon118SouthSavedPalette:true}:{}),...(cyborgFringe?{cyborgFringeSavedPalette:true}:{}),...(pure?{relic32SavedPalette:true}:{}),...(compass?{compass16SavedPalette:true}:{}),...((arm117||arm117South)?{arm117SavedPalette:true}:{}),...((cannon15||cannon15North||cannon15South)?{cannon15SavedPalette:true}:{}),...(mech?{mechanical119SouthSavedPalette:true}:{}),...(rl31?{relic31SavedCarry:true}:{}),...(orb122?{orb122SideSavedCarry:true}:{}),...(orb122NS?{orb122NorthSouthSavedCarry:true}:{}),...(relicEyes?{relicEyes}:{}),item:Number(item),action,direction,base,plan,colorAppearance:appearance,status:'candidate-needs-visual-calibration'};
 }
 function requiredFiles(r,{frame}={}){const refs=r?(frame===undefined?[...r.base.sourceRefs]:r.base.pack.directions[r.direction].layers.map(l=>l.frames?.[frame]||l.source).filter(Boolean)):[];if(r?.hairLayers)refs.push(...r.hairLayers.map(l=>l.source));return r?[...new Set([...refs.map(s=>basePrefix+s+'.png'),...r.plan.parts.flatMap(p=>[p.source.url,...(p.skinMaterial?[p.skinMaterial.url]:[]),...(p.joined117Sources||p.joined118Sources||p.joined15Sources||[]),...(p.joinedFringe?.urls||[])].map(url=>weaponPrefix+url))])]:[];}
 function applySkinMaterial(source,part,images,ramp,appearanceAPI){
  const mask=images.get(weaponPrefix+part.skinMaterial.url);
  if(part.skinMaterial.sourceSHA256!==part.source.sha256||!mask||mask.width!==source.width||mask.height!==source.height)throw Error('Invalid carry skin material');
  const tile=makeCanvas(source.width,source.height),ctx=tile.getContext('2d');
  ctx.drawImage(mask,0,0);
  const material=ctx.getImageData(0,0,source.width,source.height).data;
  ctx.clearRect(0,0,source.width,source.height);ctx.drawImage(source,0,0);
  const pixels=ctx.getImageData(0,0,source.width,source.height);
  const tones=new Uint8Array(material.length/4);
  for(let p=0;p<tones.length;p++){const i=p*4;if(material[i]&&pixels.data[i+3])tones[p]=skinMaterials.tone(pixels.data[i],pixels.data[i+1],pixels.data[i+2]);}
  pixels.data.set(appearanceAPI.recolor(pixels.data,tones,ramp));ctx.putImageData(pixels,0,0);
  return tile;
 }
 // Own F0 only: immutable anatomy under immutable shorts & hardware, tested
 // against the approved original crop. Repaint the anatomy contribution, not
 // the flattened pixel's apparent color. Keep the old crop's exact alpha.
 function joinedCarryImage(source,part,images,ramp,api){
  const item=part.joined15Sources?15:117,expected=item===15?(part.joined15North?[2997,730]:part.joined15South?[307,51]:[2218,1444]):part.joined117South?[907,854]:[2148,1354];
  const [skin,shorts,gear]=(part.joined15Sources||part.joined117Sources).map(f=>images.get(weaponPrefix+f));
  const dims=640;
  if([source,skin,shorts,gear].some(l=>l?.width!==dims||l?.height!==dims)||!ramp)throw Error('Missing 117 carry material');
  const c=makeCanvas(dims,dims),ctx=c.getContext('2d'),pix=im=>{ctx.clearRect(0,0,dims,dims);ctx.drawImage(im,0,0);return ctx.getImageData(0,0,dims,dims);};
  const orig=pix(source),skinData=pix(skin),shortData=pix(shorts),gearData=pix(gear);
  const make=()=>makeCanvas(dims,dims),t=make(),tc=t.getContext('2d');
  // Literal authored F0 restore path of tech15-retracted-rest-study-v3.
  const path=part.joined15South?[[255,343],[270,344],[278,356],[279,369],[272,379],[256,379],[250,365]]:null;
  const trace=(cx)=>{cx.beginPath();path.forEach(([x,y],i)=>i?cx.lineTo(x,y):cx.moveTo(x,y));cx.closePath();};
  const restored=path?make():null,body=path?make():null;
  if(restored){const cx=restored.getContext('2d');trace(cx);cx.fill();}
  const mask=restored?.getContext('2d').getImageData(0,0,dims,dims).data;
  const finish=()=>{
   tc.drawImage(shorts,0,0);
   if(body){const bc=body.getContext('2d');bc.clearRect(0,0,dims,dims);bc.drawImage(t,0,0);}
   tc.drawImage(gear,0,0);
   if(body){tc.save();trace(tc);tc.clip();tc.drawImage(body,0,0);tc.restore();}
  };
  tc.drawImage(skin,0,0);finish();
  const old=tc.getImageData(0,0,dims,dims);
  const tone=skinMaterials.mask(skinData.data,dims,'anatomy');
  skinData.data.set(api.recolor(skinData.data,tone,ramp));tc.putImageData(skinData,0,0);finish();
  const recolored=tc.getImageData(0,0,dims,dims).data;
  let owned=0,support=0;
  for(let i=0;i<orig.data.length;i+=4){
   if(!orig.data[i+3])continue;
   support++;
   if(orig.data[i+3]!==old.data[i+3])throw Error('117 carry silhouette changed');
   if([0,1,2].some(j=>Math.abs(orig.data[i+j]-old.data[i+j])>(path?0:2)))throw Error('117 carry archive no longer matches');
   if(!skinData.data[i+3]||shortData.data[i+3]===255||(gearData.data[i+3]===255&&!mask?.[i+3]))continue;
   for(let k=0;k<3;k++)orig.data[i+k]+=recolored[i+k]-old.data[i+k];
   owned++;
  }
  if(support!==expected[0]||owned!==expected[1])throw Error('Unexpected '+item+' carry material support');
  ctx.putImageData(orig,0,0);t.width=t.height=1;if(body)body.width=body.height=1;if(restored)restored.width=restored.height=1;return c;
 }
 function joinedFringeImage(source,part,images,ramp,api){
  const p118=!!part.joined118Sources;
  const fetch=f=>images.get(weaponPrefix+f);
  const [skin,shorts,gear,cut]=p118?part.joined118Sources.map(fetch):[fetch(part.joinedFringe.urls[0]),part.joinedFringe.urls[2]?fetch(part.joinedFringe.urls[2]):null,fetch(part.joinedFringe.urls[1]),null];
  const [expectedSupport,expectedAffected]=p118?[1345,202]:[part.joinedFringe.support,part.joinedFringe.count];
  const rgbTolerance=part.joinedFringe?.rgbTolerance??0,expectedClothing=part.joinedFringe?.clothing??0;
  const pad=part.joinedFringe?.centerPadding??0,assetSize=640,size=assetSize+2*pad;
  if(source?.width!==size||source?.height!==size||[skin,gear,...(p118?[shorts,cut]:part.joinedFringe.urls[2]?[shorts]:[])].some(l=>l?.width!==assetSize||l?.height!==assetSize)||!ramp)throw Error('Missing own cyborg F0 material');
  const c=makeCanvas(size,size),ctx=c.getContext('2d'),pix=im=>{ctx.clearRect(0,0,size,size);const offset=im===source?0:pad;ctx.drawImage(im,offset,offset);return ctx.getImageData(0,0,size,size);};
  const raw=pix(source),s=pix(skin),p=shorts?pix(shorts).data:null,g=pix(gear).data,m=cut?pix(cut).data:null;
  const tone=skinMaterials.mask(s.data,size,'anatomy'),tmp=makeCanvas(size,size),t=tmp.getContext('2d');
  const compose=()=>{t.putImageData(s,0,0);if(shorts)t.drawImage(shorts,pad,pad);if(cut){t.globalCompositeOperation='destination-out';t.drawImage(cut,pad,pad);t.globalCompositeOperation='source-over';}t.drawImage(gear,pad,pad);return t.getImageData(0,0,size,size).data;};
  const old=compose(),recolored=api.recolor(s.data,tone,ramp);
  let support=0,affected=0,verifiedClothing=0;const ids=[];
  for(let i=0;i<raw.data.length;i+=4){
   if(!raw.data[i+3])continue;
   support++;
   if(!p118&&[0,1,2,3].every(k=>raw.data[i+k]===g[i+k]))continue;
   if(raw.data[i+3]!==old[i+3]||[0,1,2].some(k=>Math.abs(raw.data[i+k]-old[i+k])>rgbTolerance))throw Error('Own cyborg carry no longer reconstructs its F0 crop');
   if(!p118&&expectedClothing&&p?.[i+3]&&!s.data[i+3]){verifiedClothing++;continue;}
   if(m?.[i+3]||!s.data[i+3]||p?.[i+3]||g[i+3]===255||!tone[i/4]){
    if(!p118)throw Error('Unsigned cyborg fringe');
    continue;
   }
   ids.push(i);affected++;
  }
  if(support!==expectedSupport||affected!==expectedAffected||verifiedClothing!==expectedClothing)throw Error('Unexpected cyborg F0 material support');
  for(const i of ids)for(let k=0;k<3;k++)s.data[i+k]=recolored[i+k];
  const next=compose();
  for(const i of ids){if(next[i+3]!==raw.data[i+3])throw Error('Changed cyborg F0 alpha');for(let k=0;k<3;k++)raw.data[i+k]=rgbTolerance?raw.data[i+k]+next[i+k]-old[i+k]:next[i+k];}
  ctx.putImageData(raw,0,0);tmp.width=1;return c;
 }
 function render(ctx,r,images,{frame=0,hiddenSlots=[],appearance=r?.colorAppearance||{},appearanceAPI=root.MareAppearance96}={}){
  if(!r)throw Error('Unsupported carry identity');const source=r.base.pack,original=source.directions[r.direction],d=r.hairLayers?{...original,layers:original.layers.filter(l=>l.slot!=='hair').concat(r.hairLayers)}:original,p=r.hairLayers?{...source,directions:{...source.directions,[r.direction]:d}}:source,pose=d.poses[frame];if(!pose)throw Error('No authored frame');const padding=r.plan.paddingPhysical??0;if(!Number.isInteger(padding)||padding<0)throw Error('Carry padding must be a nonnegative integer');const w=p.frame.width*4+2*padding,h=p.frame.height*4+2*padding;ctx.canvas.width=w;ctx.canvas.height=h;
  const canvas=r.base.mirrorX?makeCanvas(w,h):ctx.canvas,target=r.base.mirrorX?canvas.getContext('2d'):ctx;target.clearRect(0,0,w,h);target.imageSmoothingEnabled=false;target.save();target.translate(padding,padding);try{
  const map=new Map([...r.base.sourceRefs,...(r.hairLayers||[]).map(l=>l.source)].map(s=>[s,images.get(basePrefix+s+'.png')||images.get(s)]));const skin=appearance.skin||appearance.skinColor,hair=appearance.hairColor;
  if((skin&&skin!=='original'||hair&&hair!=='original')){if(!appearanceAPI)throw Error('Carry palette API unavailable');for(const [source,image] of map){const uses=d.layers.filter(l=>(l.frames?.[frame]||l.source)===source),isHair=uses.some(l=>l.slot==='hair'),skinKind=uses.length&&uses.every(l=>r.skinRepairLayers?.includes(l.id))?'mixed':skinMaterials?.ownership(uses),ramp=isHair?appearanceAPI.hairs[hair]?.ramp:skinKind?appearanceAPI.skins[skin]?.ramp:null;if(!image||!ramp&&!(isHair&&hairAnatomy?.records[source]))continue;const tile=makeCanvas(image.width,image.height),tc=tile.getContext('2d');tc.drawImage(image,0,0);const data=tc.getImageData(0,0,image.width,image.height);const anatomical=isHair?hairAnatomy?.recolor(source,data.data,appearance,appearanceAPI):null;data.data.set(anatomical||appearanceAPI.recolor(data.data,isHair?appearanceAPI.materialMask(data.data,'hair'):skinMaterials.mask(data.data,image.width,skinKind),ramp));tc.putImageData(data,0,0);map.set(source,tile);}}
  if(r.relicEyes){
   const {sha,samples,offset}=r.relicEyes,ramp=root.MareCharacterAppearance?.eyes?.[appearance.eyeColor]?.ramp;
   const src=images.get(basePrefix+sha+'.png')||images.get(sha),im=map.get(sha);
   if(ramp?.length!==5||src?.width!==512||src.height!==512||im?.width!==512||im.height!==512)throw Error('Missing exact Relic32 iris authority');
   const raw=makeCanvas(512,512),c=makeCanvas(512,512),rc=raw.getContext('2d'),cx=c.getContext('2d');rc.drawImage(src,0,0);cx.drawImage(im,0,0);
   const original=rc.getImageData(0,0,512,512).data,changed=cx.getImageData(0,0,512,512);
   for(const [x,y,R,G,B,A,tone] of samples){
    const i=((y-offset)*512+x-offset)*4;
    if(original[i]!==R||original[i+1]!==G||original[i+2]!==B||original[i+3]!==A||changed.data[i+3]!==A)throw Error('Relic32 unregistered iris pixel');
    const hex=parseInt(ramp[tone-1].slice(1),16);changed.data[i]=hex>>>16;changed.data[i+1]=(hex>>>8)&255;changed.data[i+2]=hex&255;
   }
   cx.putImageData(changed,0,0);map.set(sha,c);raw.width=1;
  }
  const eyes=root.MareReworkEyeStylesHD;
  const expression=!r.relic32SavedPalette&&!r.compass16SavedPalette&&!r.arm117SavedPalette&&!r.cannon15SavedPalette&&!r.cannon118SouthSavedPalette&&!r.cyborgFringeSavedPalette&&!r.gauntlet111SouthSavedPalette&&!r.gauntlet111NorthSavedPalette&&!r.orb122SideSavedCarry&&!r.orb122NorthSouthSavedCarry&&!r.manopla14SavedPalette&&!r.gauntletsSouthSavedPalette&&!r.gauntlet2NorthSavedPalette&&!r.luvas3SavedPalette&&eyes&&(eyes.supports(appearance.face)||appearance.eyeColor&&!['original','blue'].includes(appearance.eyeColor))&&eyes.maleSource(r.base);
  if(expression?.source){
   const image=map.get(expression.source),tile=makeCanvas(image.width,image.height),face=tile.getContext('2d');
   face.drawImage(image,0,0);
   eyes.reshape(face,appearance.face,expression.direction,expression.boxes);
   eyes.recolorIris(face,expression,appearance.eyeColor);
   map.set(expression.source,tile);
  }
  const layers=V.plan(p,r.direction,frame).filter(l=>!hiddenSlots.includes(l.slot));const operations=layers.map(l=>({depth:l.depth,layer:l}));
  for(const part of r.plan.parts){const hand=layers.find(l=>l.binding?.a===part.binding.a&&l.binding?.b===part.binding.b);if(!hand)continue; // Lateral source has no authored far hand: do not float a disconnected far gauntlet.
   operations.push({depth:hand.depth+(part.depthOffset??.1),part});}
  // Fixed WEST garment rasters are already facing WEST. Compensate for the
  // base canvas reflection only when drawing those registered layers.
  for(const op of operations.sort((a,b)=>a.depth-b.depth)){
   if(op.layer){const original=d.layers.find(l=>l.id===op.layer.id);if(original.slot==='body'&&r.plan.parts.some(q=>q.replaceBoundLayer&&original.binding?.a===q.binding.a&&original.binding?.b===q.binding.b))continue;const pack={...p,directions:{[r.direction]:{...d,layers:[original]}}};const cover=r.plan.parts.find(q=>q.hideHandBeyondWrist&&original.binding?.a===q.binding.a&&original.binding?.b===q.binding.b);target.save();if(cover){const a=pose[cover.binding.a],b=pose[cover.binding.b],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),ux=dx/len,uy=dy/len,nx=-uy,ny=ux,L=2000,x=b.x*4,y=b.y*4;target.beginPath();target.moveTo(x+nx*L,y+ny*L);target.lineTo(x-nx*L,y-ny*L);target.lineTo(x-nx*L-ux*L,y-ny*L-uy*L);target.lineTo(x+nx*L-ux*L,y+ny*L-uy*L);target.closePath();target.clip();}if(r.preMirroredLayers?.includes(original.id)){target.translate(p.frame.width*4,0);target.scale(-1,1);}if(r.plan.paddingPhysical!==undefined){const bodyTile=makeCanvas(p.frame.width*4,p.frame.height*4);V.render(bodyTile.getContext('2d'),pack,map,{direction:r.direction,frame,density:4,clear:false});target.drawImage(bodyTile,0,0);}else V.render(target,pack,map,{direction:r.direction,frame,density:4,clear:false});target.restore();continue;}
   const q=op.part,im=images.get(weaponPrefix+q.source.url);if(!im)throw Error('Missing isolated equipment');
   const palette=appearanceAPI?.skins[skin]?.ramp;
   const partImage=(q.joined118Sources||q.joinedFringe)?joinedFringeImage(im,q,images,palette,appearanceAPI):(q.joined117Sources||q.joined15Sources)?joinedCarryImage(im,q,images,palette,appearanceAPI):palette&&q.skinMaterial?applySkinMaterial(im,q,images,palette,appearanceAPI):im;const a=q.binding.a,b=q.binding.b;
   // Wrist anchored rigid transform: no weapon raster scaling/stretch; follow authored wrist and forearm rotation.
   const m=V.rigid(q.sourceBone[b],q.sourceBone[a],pose[b],pose[a]);target.save();const offset=q.calibrationOffsetPhysical||[0,0];target.transform(m[0],m[1],m[2],m[3],m[4]*4+offset[0],m[5]*4+offset[1]);if(q.source.sourceClip){const [x,y,cw,ch]=q.source.sourceClip;target.beginPath();target.rect(x,y,cw,ch);target.clip();}if(q.mirrorSource){target.translate(q.source.nativeSize?.[0]||640,0);target.scale(-1,1);}if(r.relic31SavedCarry&&q.relic31PivotTilt){const {x,y,radians}=q.relic31PivotTilt;target.translate(x,y);target.rotate(radians);target.translate(-x,-y);}target.drawImage(partImage,0,0);target.restore();
  }
  }finally{target.restore();}if(r.base.mirrorX){ctx.clearRect(0,0,w,h);ctx.save();ctx.translate(w,0);ctx.scale(-1,1);ctx.drawImage(canvas,0,0);ctx.restore();}
  return {width:w,height:h,density:4,pivot:{x:p.pivot.x*4+padding,y:p.pivot.y*4+padding},frames:d.clip.frames,fps:d.clip.fps,frame,status:r.status,physicalScale:1,source:r.id,calibrationRequired:true};
 }
 return {resolve,requiredFiles,render};
}
const api={create};root.MareReworkWeaponCarryHD=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
