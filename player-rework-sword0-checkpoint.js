(function(root){'use strict';
// Use archive-bound layer sources only after existing SelectVisual routes
// have reported no match. Source verification happens once at provider startup.
const claims={
 pants:new Set(['shorts']),
 boots:new Set(),
 gloves:new Set(['left-hand','right-hand','left-hand-foreground','right-hand-foreground'])
};
// The warmed points are gold/copper/red glove trim, not the original bare hand.
// Use this limited material exemption only for the exact four-direction source rows.
const extraGloveFingerprints={"145":"de6be91100239389ce4b517e72d187243b0f749741167e284e8fe054e89069aa","166":"30c5dee6760ccb8a3ab6dbae45c2e361e0f8d667f26573d4e5442e4c2f2c804e","173":"09e4059dbf57a69bda4a4aacb94e73277eddaf3f1e597c29c9c10b1df3c5ff95"};
const northGloveOnlyIds=[26,145,159,166,173];
const northGloveOnlyAuthority="32fc92593d9ee231e034c851160d07b2936e8e8995b400b229579dd928abf3eb";
const family=new Set([1,67,68,69,70]);
function ownWeaponStates(origin,direction,item,{reference,donor}={}){
 if(!family.has(item)||!reference||!donor||reference.item!==0||donor.item!==item||
    [reference,donor].some((r,i)=>r.body!=='female'||r.hdKind!=='female-equipment'||r.direction!==direction||r.action!=='attack-sword'||
      !r.id.startsWith('female'+(i?item:0)+'-attack-sword-'+direction+'-candidate')||
      r.checkpointSources||r.outfitSources||!Number.isSafeInteger(r.paddingPhysical)||r.paddingPhysical<0||r.paddingPhysical>64||r.sourceRasterPadding!==undefined))return null;
 const eq=(x,y)=>JSON.stringify(x)===JSON.stringify(y);
 const material=({id,...rest})=>rest;
 const {states:source,baseRecord:sourceBase,material:sourceMaterial}=reference;
 const {states,baseRecord,material:targetMaterial}=donor;
 if(!eq(baseRecord,sourceBase)||!eq(donor.pack,reference.pack)||reference.sourceBaseId!==origin.sourceBaseId||donor.sourceBaseId!==reference.sourceBaseId||
    !eq(donor.colorAppearance,reference.colorAppearance)||!eq(reference.colorAppearance,origin.colorAppearance)||
    !!sourceMaterial!==!!targetMaterial||sourceMaterial&&!eq(material(sourceMaterial),material(targetMaterial))||
    !Array.isArray(states)||states.length!==8||source?.length!==8||!eq(source,origin.states))return null;
 const state=({parts,...rest})=>rest;
 const part=({matrix,sha256,url,sourceNativeSize,...rest})=>rest;
 if(!states.every((s,i)=>s.parts?.length===1&&source[i].parts?.length===1&&eq(state(s),state(source[i]))&&
    eq(part(s.parts[0]),part(source[i].parts[0]))&&
    s.parts[0].url==='tools/rework-weapon-layers-hd/assets/'+s.parts[0].sha256+'.png'&&/^[a-f0-9]{64}$/.test(s.parts[0].sha256)&&
    s.parts[0].matrix?.length===6&&s.parts[0].matrix.every(Number.isFinite)))return null;
 return states;
}
const geometry=({id,material,colorAppearance,...source})=>JSON.stringify(source);
const materialIdentity=({id,skinColor,hairColor,eyeColor,registeredBlueIris,...source})=>JSON.stringify(source);
const supportedEyePalettes=new Set(['blue','brown','green','gray','amber','violet']);
function matchesSavedColors(origin,proof){
 const m=origin?.material,c=origin?.colorAppearance;
 if(!proof||!m||!c||m.sourceScale!==1||m.style!=='cropped'||m.eyeStyle!==null||m.gearRecord||
    c.gender!=='feminino'||c.hairStyle!=='hair-cropped'||c.eyeStyle!=='original'||c.skinStyle!=='natural'||
    c.skinColor!==m.skinColor||c.hairColor!==m.hairColor||c.eyeColor!==m.eyeColor||
    !Object.hasOwn(root.MareAppearance96?.skins||{},m.skinColor)||!Object.hasOwn(root.MareAppearance96?.hairs||{},m.hairColor)||
    (m.eyeColor==='blue')!==!!m.registeredBlueIris||!supportedEyePalettes.has(m.eyeColor)||!Object.hasOwn(root.MareCharacterAppearance?.eyes||{},m.eyeColor))return false;
 return geometry(origin)===proof.geometry&&materialIdentity(m)===proof.material;
}
function create(catalog,accepted,normalizedGloves,colors,gloveOnlyVerified){
 const rows=new Map(catalog.records.map(r=>[[r.direction,r.slot,r.item].join('/'),r]));
 const allowed=new Set(catalog.assetHashes);
 const applies=(origin,direction)=>accepted[direction]?.includes(JSON.stringify(origin))||matchesSavedColors(origin,colors[direction]);
 function resolve(origin,direction,visible,authority){
  const item=visible.weapon?.item;
  if(!origin||!applies(origin,direction)||item!==catalog.weapon&&!family.has(item)||visible.torso?.item!==catalog.coat)return null;
  const requested=Object.entries(visible).filter(([slot])=>Object.hasOwn(claims,slot));
  if(!requested.length&&item===catalog.weapon||Object.keys(visible).some(s=>!(Object.hasOwn(claims,s)||s==='weapon'||s==='torso')))return null;
  // Individually sourced hems/cuffs do not prove contact between both slots.
  // Independent shaft/sole pairs are gated by the tested seam. P21 has
  // an uncovered gap; B148/B162/B169/B183 are known only on the North P22 rig.
  const checkedHem=visible.pants?.item===22&&(visible.boots?.item===9||
    direction==='north'&&[148,162,169,183].includes(visible.boots?.item));
  if(visible.pants&&visible.boots&&!checkedHem)return null;
  if(origin.material?.skinColor&&visible.gloves&&
     (!normalizedGloves.has(visible.gloves.item)||
      [...claims.gloves].some(id=>origin.skinRepairLayers?.includes(id))))return null;
  const selected=requested.map(([slot,v])=>rows.get([direction,slot,v.item].join('/')));
  // Do not omit an unknown requested piece or substitute an old one.
  if(selected.some(r=>!r))return null;
  const stable=origin.pack.directions[direction],states=item===catalog.weapon?origin.states:ownWeaponStates(origin,direction,item,authority),checked=catalog.states[direction];
  // Keep exactly the weapon already on the character, including on unequip.
  // Archive rotation trials are deliberately not promoted with the outfit slots.
  const contact=rows=>rows.map(({parts,...state})=>({...state,parts:parts.map(({matrix,...part})=>part)}));
  if(states?.length!==8||checked?.length!==8||stable?.clip?.frames!==8||
     JSON.stringify(contact(origin.states))!==JSON.stringify(contact(checked)))return null;
  const layers=stable.layers.filter(l=>!selected.some(r=>claims[r.slot].has(l.id))).concat(selected.flatMap(r=>r.layers));
  if(layers.length!==new Set(layers.map(l=>l.id)).size)return null;
  const refs=[...new Set(selected.flatMap(r=>r.layers.flatMap(l=>l.frames||[l.source])))];
  if(refs.some(r=>!allowed.has(r)))return null;
  const pack={...origin.pack,directions:{...origin.pack.directions,[direction]:{...stable,layers}}};
  const source=origin.id,slotRoutes=Object.fromEntries(Object.entries(visible).map(([slot,v])=>[v.key,{item:v.item,quality:'hd',source:slot==='weapon'&&item!==catalog.weapon?authority.donor.id:source}]));
  return {...origin,item,...(item===catalog.weapon?{}:{paddingPhysical:authority.donor.paddingPhysical}),pack,states,id:source+':portable-sword'+item+':'+JSON.stringify(slotRoutes),slotRoutes,layeredSlots:true,omitted:[],
   baseRecord:{...origin.baseRecord,pack,sourceRefs:[...new Set([...origin.baseRecord.sourceRefs,...refs])]},
   checkpointSources:refs};
 }
 // Verified sword poses may omit the coat without substituting the lower pose.
 function resolveBootOnly(origin,bare,direction,visible,reference){
  const item=visible.weapon?.item,boot=visible.boots?.item;
  const north=direction==='north',side=['east','west'].includes(direction);
  if(!(boot===9&&(side?item===0:['north','south'].includes(direction)&&[0,1,67,68,70].includes(item))||boot===148&&(north&&[0,1,67,68,69,70].includes(item)||direction==='south'&&[0,1,67,68,70].includes(item)||side&&item===0)||boot===134&&direction==='south'&&item===0||boot===183&&(north&&[0,1,67,68,69,70].includes(item)||direction==='south'&&[0,1,67,70].includes(item)))||
     Object.keys(visible).length!==2||!origin||!bare||bare.item!==item||bare.body!=='female'||
     bare.action!=='attack-sword'||bare.direction!==direction||bare.outfitSourceId||bare.checkpointSources)return null;
  const expected=item===0?bare:reference;
  if(!expected||expected.item!==0)return null;
  const authority=item===0?undefined:{reference:expected,donor:bare};
  const checked=resolve(origin,direction,{...visible,torso:{item:151,key:'coat'}},authority);
  if(!checked)return null;
  const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b),x=bare.pack.directions[direction],y=origin.pack.directions[direction];
  const shared=({id,item,states,sourcePixelPolicy,paddingPhysical,...r})=>r;
  if(item!==0&&(!eq(checked.states,bare.states)||!eq(shared(bare),shared(expected))||
     checked.paddingPhysical!==bare.paddingPhysical))return null;
  const joints=(a,b)=>Object.entries(a).every(([k,v])=>eq(v,b[k]))&&Object.keys(b).every(k=>Object.hasOwn(a,k)||(side?/^cloth1[AB]$/:north?/^cloth[23][AB]$/:/^cloth[36][AB]$/).test(k));
  const expectedSide={
   'coat151-far-derived-sleeve':10,'coat151-near-derived-sleeve':30,'coat151-native-fabric-side-lining':20,
   'coat151-upper-core':20,'coat151-lower-core':20,'coat151-lower-hem':20,'coat151-rear-openings-lower':-1,
   'original-neck-coverage-only-core':20,'original-neck-coverage-only-upper':31
  };
  const coats=y.layers.filter(l=>side?Object.hasOwn(expectedSide,l.id):l.id.startsWith(north?'coat151-whole-':'coat151-'));
  const owned=[...new Set(coats.flatMap(l=>l.frames||[l.source]))];
  if(!eq(owned,origin.outfitSources)||!eq(owned,Object.keys(origin.sourceRasterPadding||{})))return null;
  const nonCoat=y.layers.filter(l=>!coats.includes(l));
  const pieces=checked.pack.directions[direction].layers.filter(l=>!y.layers.includes(l));
  const shape=({id,baseRecord,pack,outfitSourceId,outfitSources,sourceRasterPadding,...r})=>r;
  if(!eq(shape(expected),shape(origin))||!['frame','pivot','density'].every(k=>eq(bare.pack[k],origin.pack[k]))||
     !eq(x.clip,y.clip)||!joints(x.rest,y.rest)||x.poses.length!==y.poses.length||
     x.poses.some((pose,i)=>!joints(pose,y.poses[i]))||!eq(x.layers,nonCoat)||coats.length!==(side?9:north?4:7)||
     coats.some(l=>side?l.depth!==expectedSide[l.id]:l.depth!==100&&(north||l.depth!==-1))||pieces.length!==(side?2:4)||
     !(side?['rear','front']:['left-rear','left-front','right-rear','right-front']).every(id=>pieces.some(l=>l.id==='boot'+boot+'-'+id&&
       l.depth===(id.endsWith('rear')?-1:side?3.01:north?4.1:45)&&l.binding?.kind==='fixed'&&l.frames?.length===8))||
     !eq(bare.baseRecord.pack,bare.pack))return null;
  const pack={...bare.pack,directions:{...bare.pack.directions,[direction]:{...x,layers:[...x.layers,...pieces]}}};
  const refs=checked.checkpointSources;
  return {...bare,id:bare.id+':checkpoint-b'+boot+'-'+direction+'-no-coat',pack,
   baseRecord:{...bare.baseRecord,pack,sourceRefs:[...new Set([...bare.baseRecord.sourceRefs,...refs])]},
   checkpointSources:refs,slotRoutes:{[visible.weapon.key]:{item,quality:'hd',source:bare.id},
    [visible.boots.key]:{item:boot,quality:'hd',source:checked.id}},layeredSlots:true,omitted:[]};
 }
 function resolveNorthGloveOnly(origin,bare,direction,visible,reference){
  const item=visible.weapon?.item,g=visible.gloves?.item;
  if(!gloveOnlyVerified||direction!=='north'||![0,1,67,68,69,70].includes(item)||!northGloveOnlyIds.includes(g)||
     Object.keys(visible).length!==2||!origin||!bare||bare.item!==item||bare.body!=='female'||
     bare.action!=='attack-sword'||bare.direction!==direction||bare.outfitSourceId||bare.checkpointSources)return null;
  const expected=item===0?bare:reference;
  if(!expected||expected.item!==0)return null;
  const checked=resolve(origin,direction,{...visible,torso:{item:151,key:'coat'}},
   item===0?undefined:{reference:expected,donor:bare});
  if(!checked||item!==0&&checked.paddingPhysical!==bare.paddingPhysical)return null;
  const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b),x=bare.pack.directions.north,y=origin.pack.directions.north;
  const nonCoat=y.layers.filter(l=>!l.id.startsWith('coat151-whole-')),coats=y.layers.filter(l=>!nonCoat.includes(l));
  const owned=[...new Set(coats.flatMap(l=>l.frames||[l.source]))];
  const shape=({id,baseRecord,pack,outfitSourceId,outfitSources,sourceRasterPadding,...r})=>r;
  const joints=(a,b)=>Object.entries(a).every(([k,v])=>eq(v,b[k]))&&Object.keys(b).every(k=>Object.hasOwn(a,k)||/^cloth[23][AB]$/.test(k));
  if(coats.length!==4||coats.some(l=>l.depth!==100)||!eq(owned,origin.outfitSources)||
     !eq(owned,Object.keys(origin.sourceRasterPadding||{}))||!eq(shape(expected),shape(origin))||
     !['frame','pivot','density'].every(k=>eq(bare.pack[k],origin.pack[k]))||!eq(x.clip,y.clip)||!joints(x.rest,y.rest)||
     !eq(x.layers,nonCoat)||x.poses.length!==8||x.poses.some((pose,i)=>!joints(pose,y.poses[i]))||
     !eq(bare.baseRecord.pack,bare.pack)||!eq(checked.states,bare.states))return null;
  const layers=rows.get(['north','gloves',g].join('/'))?.layers;
  if(layers?.length!==2||!['left-hand','right-hand'].every((id,i)=>{
   const l=layers[i],b=x.layers.find(q=>q.id===id);
   return l.id===id&&b?.binding?.kind==='fixed'&&l.binding?.kind==='fixed'&&l.depth===b.depth&&l.frames.length===8;
  }))return null;
  const refs=[...new Set(layers.flatMap(l=>l.frames))];
  if(!eq(refs,checked.checkpointSources))return null;
  const pack={...bare.pack,directions:{...bare.pack.directions,north:{...x,layers:x.layers.map(l=>layers.find(q=>q.id===l.id)||l)}}};
  return {...bare,id:bare.id+':checkpoint-g'+g+'-north-no-coat',pack,
   baseRecord:{...bare.baseRecord,pack,sourceRefs:[...new Set([...bare.baseRecord.sourceRefs,...refs])]},
   checkpointSources:refs,slotRoutes:{[visible.weapon.key]:{item,quality:'hd',source:bare.id},
    [visible.gloves.key]:{item:g,quality:'hd',source:checked.id}},layeredSlots:true,omitted:[]};
 }
 function resolveNorthGlovePants182(gloved,panted,direction,visible){
  const item=visible.weapon?.item,g=visible.gloves?.item,p=visible.pants?.item;
  if(direction!=='north'||![0,1,67,68,69,70].includes(item)||!northGloveOnlyIds.includes(g)||p!==182||Object.keys(visible).length!==3||
     !gloved||!panted||gloved.item!==item||panted.item!==item||gloved.body!=='female'||panted.body!=='female'||
     gloved.action!=='attack-sword'||panted.action!==gloved.action||gloved.direction!==direction||panted.direction!==direction||
     gloved.slotRoutes?.[visible.gloves.key]?.item!==g||gloved.outfitSources||panted.checkpointSources||
     panted.pantsSourceId!=='female-pants182-sword-attack-sword-north')return null;
  const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const shape=({id,pack,baseRecord,outfitSources,pantsSourceId,checkpointSources,slotRoutes,layeredSlots,omitted,...r})=>r;
  if(!eq(shape(gloved),shape(panted)))return null;
  const a=gloved.pack.directions.north,b=panted.pack.directions.north;
  const {layers:x,...poseX}=a,{layers:y,...poseY}=b,hands=new Set(['left-hand','right-hand']);
  const cloth=y.find(l=>l.id==='pants182-independent-sword');
  if(!eq(poseX,poseY)||!['frame','density','pivot'].every(k=>eq(gloved.pack[k],panted.pack[k]))||
     !cloth||cloth.slot!=='pants'||cloth.binding?.kind!=='fixed'||cloth.frames?.length!==8||
     x.find(l=>l.id==='shorts')?.depth!==cloth.depth||
     ![...hands].every(id=>x.find(l=>l.id===id)?.depth===y.find(l=>l.id===id)?.depth&&
       eq(x.find(l=>l.id===id)?.binding,y.find(l=>l.id===id)?.binding))||
     !eq(x.filter(l=>!hands.has(l.id)&&l.slot!=='pants'),y.filter(l=>!hands.has(l.id)&&l.slot!=='pants'))||
     !eq([...new Set(y.filter(l=>l.slot==='pants').flatMap(l=>l.frames||[l.source]))],[...new Set(cloth.frames)])||
     !eq([...new Set(panted.outfitSources)].sort(),[...new Set(cloth.frames)].sort()))return null;
  const pack={...panted.pack,directions:{...panted.pack.directions,north:{...b,layers:y.map(l=>hands.has(l.id)?x.find(g=>g.id===l.id):l)}}};
  return {...panted,pack,id:gloved.id+':pants182',checkpointSources:gloved.checkpointSources,
   baseRecord:{...panted.baseRecord,pack,sourceRefs:[...new Set([...panted.baseRecord.sourceRefs,...gloved.checkpointSources])]},
   slotRoutes:{...gloved.slotRoutes,[visible.pants.key]:{item:p,quality:'hd',source:panted.id}},layeredSlots:true,omitted:[]};
 }
 return {resolve,resolveBootOnly,resolveNorthGloveOnly,resolveNorthGlovePants182,hasAsset:hash=>allowed.has(hash)};
}
async function verify(catalog,trusted,{subtle=root.crypto?.subtle,saved=[]}={}){
 if(!subtle||!trusted||catalog.weapon!==0||catalog.coat!==151||catalog.records?.length!==120||catalog.assetHashes?.length!==1503)return null;
 const accepted={},colors={};
 // The normalized saved profile may change only the proven material, not
 // the geometry, contact timing, frame sources, or equipment.
 for(const dir of ['north','south','east','west']){
  if(!trusted[dir])return null;
  const source=JSON.stringify(trusted[dir]),bytes=await subtle.digest('SHA-256',new TextEncoder().encode(source));
  const digest=Array.from(new Uint8Array(bytes),v=>v.toString(16).padStart(2,'0')).join('');
  if(digest!==catalog.guards[dir])return null;
  accepted[dir]=[source];
  const trustedShape=geometry(trusted[dir]);
  for(const skinProfile of saved){
   const current=skinProfile?.[dir],skin=current?.material?.skinColor;
   if(!skin||!Object.hasOwn(root.MareCharacterAppearance?.skins||{},skin)||current.colorAppearance?.skinColor!==skin||
      current.material.sourceScale!==1||current.material.hairColor!==trusted[dir].material?.hairColor||
      current.material.eyeColor!==trusted[dir].material?.eyeColor||current.material.style!==trusted[dir].material?.style||
      geometry(current)!==trustedShape)continue;
   accepted[dir].push(JSON.stringify(current));
   if(current.colorAppearance?.hairStyle==='hair-cropped'&&current.colorAppearance?.eyeStyle==='original'&&current.material.eyeStyle===null&&
      current.material.style==='cropped'&&current.colorAppearance.hairColor===current.material.hairColor&&
      current.colorAppearance.eyeColor===current.material.eyeColor&&!current.material.gearRecord){
    const proof={geometry:trustedShape,material:materialIdentity(current.material)};
    // The standard skin variants all share this explicit head-layer authority.
    if(colors[dir]&&colors[dir].material!==proof.material){colors[dir]=null;break;}
    colors[dir]=proof;
   }
  }
 }
 const normalizedGloves=new Set([26,159]);
 for(const [key,expected] of Object.entries(extraGloveFingerprints)){
  const item=Number(key),rows=['north','south','east','west'].map(direction=>catalog.records.filter(r=>r.direction===direction&&r.slot==='gloves'&&r.item===item));
  if(rows.some(set=>set.length!==1||set[0].layers.length!==2||
      set[0].layers.some(l=>l.slot!=='top'||l.binding?.kind!=='fixed'||l.frames?.length!==8)))continue;
  const payload=JSON.stringify(rows.map(([r])=>[r.direction,r.layers]));
  const bytes=await subtle.digest('SHA-256',new TextEncoder().encode(payload));
  const actual=Array.from(new Uint8Array(bytes),v=>v.toString(16).padStart(2,'0')).join('');
  if(actual===expected)normalizedGloves.add(item);
 }
 const materialRows=northGloveOnlyIds.map(id=>catalog.records.filter(r=>r.direction==='north'&&r.slot==='gloves'&&r.item===id));
 const gloveDigest=await subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(materialRows.map((r,i)=>[northGloveOnlyIds[i],r[0]?.layers]))));
 const gloveOnlyVerified=materialRows.every(r=>r.length===1)&&Array.from(new Uint8Array(gloveDigest),v=>v.toString(16).padStart(2,'0')).join('')===northGloveOnlyAuthority;
 return create(catalog,accepted,normalizedGloves,colors,gloveOnlyVerified);
}
const api={verify};root.MareSword0Checkpoint=api;if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
