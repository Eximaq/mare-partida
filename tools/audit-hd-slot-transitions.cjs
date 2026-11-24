'use strict';
// Read-only selector census: does not decode images, draw, or execute the game.
const path=require('node:path');
const assert=require('node:assert/strict');
const source=path.resolve(process.argv[2]||path.join(__dirname,'..'));
const {make}=require(path.join(source,'tests/rework-integration-support.cjs'));
const directions=['south','north','east','west'];
const profiles={
 default:{},
 copperBlue:{skinColor:'copper',hairStyle:'hair-spiky',hairColor:'blue',eyeColor:'blue'},
 ebonyViolet:{skinColor:'ebony',hairStyle:'hair-wavy',hairColor:'violet',eyeColor:'green'}
};
const gear={
 peitoral:[['coat',6],['coat',151]],calca:[['legs',22],['legs',133],['legs',168],['legs',182]],
 luva:[['gloves',25],['gloves',26]],bota:[['boots',9]],capacete:[['head',129]],capa:[['cloak',23]],
 titulo:[['title',3]]
};
const base={
 sword:[0,'attack-sword'],gunner:[4,'attack-firearm'],rogue:[12,'attack-daggers'],cyborg:[14,'attack-unarmed'],
 brawler:[2,'attack-unarmed'],healer:[31,'attack-focus'],strategist:[16,'attack-focus']
};
const slots=['head','necklace','coat','legs','boots','weapon','cloak','gloves','ring','belt','charm','akuma_no_mi'];
const isVisible=s=>['coat','legs','gloves','boots','head','weapon','cloak'].includes(s);
const tally=()=>({pairs:0,bothHD:0,lostHD:0,newHD:0,neitherHD:0,unchangedHDRecord:0,slotClaimsMissing:0,explicitBaseSlotLoss:0,explicitOwnSlotCoverage:0,unknownSlotCoverage:0});
const routes=r=>Object.entries(r?.slotRoutes||{});
function record(t,prev,next,slot){
 t.pairs++;
 t[prev?next?'bothHD':'lostHD':next?'newHD':'neitherHD']++;
 if(prev&&next&&prev.id===next.id)t.unchangedHDRecord++;
 const missing=new Set(next?.omitted||[]);
 for(const [key,value] of routes(next))if(['missing','unsupported','legacy'].includes(value.quality))missing.add(key);
 if(next&&missing.size)t.slotClaimsMissing++;
 if(prev&&next&&routes(prev).some(([key,value])=>key!==slot&&value.quality==='hd'&&missing.has(key)))t.explicitBaseSlotLoss++;
 if(next&&isVisible(slot)){
  if(next?.slotRoutes?.[slot]?.quality==='hd')t.explicitOwnSlotCoverage++;
  else if(next?.slotRoutes?.[slot]?.quality==null&&!missing.has(slot))t.unknownSlotCoverage++;
 }
}
(async()=>{
 const provider=make();await provider.ready;assert.equal(provider.snapshot().state,'ready');
 const total=tally(),bySlot={},byScope={},examples=[];
 const routeCache=new Map();
 for(const gender of ['masculino','feminino'])for(const [profile,look] of Object.entries(profiles))for(const [classId,[weapon,attack]] of Object.entries(base)){
  const appearance96=MareCharacterAppearance.normalize({gender,...look});
  function route(equipped,action,direction,title){
   const key=JSON.stringify([gender,profile,classId,equipped,action,direction,title]);
   if(!routeCache.has(key)){const equipment=Object.fromEntries(slots.map(s=>[s,null]));
    for(const [slot,id] of Object.entries(equipped))equipment[slot]={def:id};
    const visual=provider.selectVisual({classId,factionId:'pirate',hierarchyFaction:'pirate',hierarchyTier:title??1,equipment,appearance96},{action,direction,consumer:'world'});
    routeCache.set(key,visual||null);}
   return routeCache.get(key);
  }
  const templates=[['bare',{}],['weapon',{weapon}],['coat6',{coat:6}],['weapon+coat6',{weapon,coat:6}],['weapon+coat6+legs22',{weapon,coat:6,legs:22}]];
  const swaps=[...Object.values(gear).flat(),['weapon',weapon],['weapon',null]];
  for(const [template,kit] of templates)for(const [which,id] of swaps){
   if(which==='weapon'&&(kit.weapon??null)===id||which!=='title'&&kit[which]===id)continue;
   const changed={...kit};if(which!=='title'){if(id===null)delete changed[which];else changed[which]=id;}
   for(const direction of directions)for(const mode of ['idle','walk','attack']){
    // Use the gameplay-specific pose on each side of equip/unequip, never ask
    // the unarmed actor for a sword pose or silently map it to generic attack.
    const actionFor=k=>mode==='attack'?(Object.hasOwn(k,'weapon')?attack:'attack-unarmed'):mode;
    const prev=route(kit,actionFor(kit),direction),next=route(changed,actionFor(changed),direction,which==='title'?id:undefined);
    for(const t of [total,bySlot[which]??=tally(),byScope[[gender,profile,mode].join('/') ]??=tally()])record(t,prev,next,which);
    if(which==='title')assert.equal(next?.id,prev?.id,'title metadata cannot change chosen rig');
    if(prev&&!next&&examples.length<12&&classId==='sword'&&profile==='copperBlue'&&gender==='masculino'&&mode==='idle'&&direction==='south')examples.push({template,slot:which,id,old:prev.id});
   }
  }
 }
 if(process.argv[3])require('node:fs').writeFileSync(process.argv[3],JSON.stringify([...routeCache].map(([k,r])=>[k,r&&{id:r.id,omitted:r.omitted||[],routes:r.slotRoutes}])));
 const compact=t=>[t.pairs,t.bothHD,t.lostHD,t.newHD,t.neitherHD,t.unchangedHDRecord,t.slotClaimsMissing,t.explicitBaseSlotLoss,t.explicitOwnSlotCoverage,t.unknownSlotCoverage];
 console.log(JSON.stringify({source,meaning:'An HD selection is not proof of drawing, assets, exact slot preservation, or visual acceptance; native96 is the current whole-actor route when selector is null.',axes:{genders:2,profiles:Object.keys(profiles),directions,classes:Object.keys(base)},columns:Object.keys(total),total:compact(total),bySlot:Object.fromEntries(Object.entries(bySlot).map(([k,v])=>[k,compact(v)])),byScope:Object.fromEntries(Object.entries(byScope).map(([k,v])=>[k,compact(v)])),uniqueRequests:routeCache.size,examples},null,process.argv.includes('--pretty')?2:0));
})().catch(e=>{console.error(e);process.exitCode=1});
