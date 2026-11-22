'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),path=require('node:path');
const {cv}=require('./rework-integration-support.cjs');
const bases=require('../tools/rework-base-hd/index.json').records,index=require('../tools/rework-modular-outfits-hd/index.json');
const F=MareReworkModularOutfitsHD.composeRegisteredLayerGroups;
const load=require('../tools/rework-hd-test-loader.cjs').create(path.resolve(__dirname,'..'));
const registry=MareReworkModularOutfitsHD.create(index,{allowCandidates:true});
const source=action=>bases.find(p=>p.body==='male'&&p.hairStyle==='original'&&p.direction==='south'&&p.action===action);
const groups=(direction,action)=>index.records.filter(p=>p.body==='male'&&p.equipmentLayerGroups&&p.direction===direction&&p.action===action);
const d=r=>r.pack.directions[r.direction],fit=(r,layers)=>({...r,pack:{...r.pack,directions:{...r.pack.directions,[r.direction]:{...d(r),layers}}}});
test('independent signed slot donors compose without a predefined sibling and fail closed on missing or mismatched source',()=>{
 const base=source('idle'),donors=groups('south','idle'),s=donors.find(x=>x.equipment.boots===9);
 const subset=(item,name,ids,map=x=>x)=>{
  const layers=d(s).layers.filter(l=>ids.includes(l.id)).map(map);
  return {...fit(s,[...d(base).layers,...layers]),id:'synthetic:'+name+item,equipment:{[name]:item},equipmentLayerGroups:{[name]:layers.map(l=>l.id)}};
 };
 const gloves=subset(152,'gloves',s.equipmentLayerGroups.gloves);
 const coat=subset(380,'torso',s.equipmentLayerGroups.torso);
 const alt=subset(381,'torso',s.equipmentLayerGroups.torso,l=>({...l,id:'alt:'+l.id}));
 // Existing South -1 tie belongs to coat rear/boots rear in a jointly authored pack.
 // Synthetic independent modern slot puts both boot passes on untied depths.
 const boots=subset(9,'boots',s.equipmentLayerGroups.boots,l=>({...l,depth:l.depth+.01}));
 const req={torso:380,gloves:152,boots:9};
 const one=F({base,donors:[coat,alt,boots,gloves],equipment:req}),two=F({base,donors:[coat,alt,boots,gloves],equipment:{...req,torso:381}});
 a(one&&two);a.deepEqual(one.omitted,[]);a.deepEqual(two.slotRoutes.boots,one.slotRoutes.boots);a.deepEqual(two.slotRoutes.gloves,one.slotRoutes.gloves);
 a.deepEqual(d(one).layers.filter(l=>!coat.equipmentLayerGroups.torso.includes(l.id)),d(two).layers.filter(l=>!alt.equipmentLayerGroups.torso.includes(l.id)));
 let diagnostic={};a.equal(F({base,donors:[coat,boots,gloves],equipment:{...req,torso:404},diagnostic}),null);
 a.equal(diagnostic.torso.reason,'missing-exact-owned-layer');a.equal(diagnostic.boots.quality,'hd');
 const broken=structuredClone(coat);d(broken).poses[0].NECK.x++;diagnostic={};
 a.equal(F({base,donors:[broken,boots,gloves],equipment:req,diagnostic}),null);a.equal(diagnostic.torso.reason,'missing-exact-owned-layer');
 const foreign=structuredClone(coat);foreign.sourceRefs=[];
 a.equal(F({base,donors:[foreign,boots,gloves],equipment:req}),null);
});
test('real South full outfit matches published draw and each removal changes only the selected owned matte',async()=>{
 const imgs=new Map(),image=f=>{if(!imgs.has(f))imgs.set(f,load(f));return imgs.get(f);};let frames=0;
 const draw=async(r,f)=>{
  const files=registry.requiredFiles(r,{frame:f}),loaded=new Map(await Promise.all(files.map(async p=>[p,await image(p)])));
  const c=cv.createCanvas(512,512);registry.render(c.getContext('2d'),r,loaded,{frame:f,makeCanvas:cv.createCanvas});
  return new Uint32Array(c.getContext('2d').getImageData(0,0,512,512).data.buffer);
 };
 for(const action of ['idle','walk']){
  const base=source(action),donors=groups('south',action);
  for(const boots of [9,148]){
   const original=donors.find(x=>x.equipment.boots===boots),equipment=original.equipment;
   const full=F({base,donors,equipment});a(full);
   const cuts=Object.keys(equipment).map(slot=>[slot,F({base,donors,equipment:Object.fromEntries(Object.entries(equipment).filter(([k])=>k!==slot))})]);a(cuts.every(([,r])=>r));
   for(let f=0;f<d(full).clip.frames;f++){
    const all=await draw(full,f);a.deepEqual(all,await draw(original,f));
    for(const [slot,removed] of cuts){
     const ids=original.equipmentLayerGroups[slot],matte=fit(full,d(full).layers.filter(l=>ids.includes(l.id)));
     const stable=ls=>ls.filter(l=>!ids.includes(l.id)).sort((l,m)=>l.id.localeCompare(m.id));
     a.deepEqual(stable(d(removed).layers),stable(d(full).layers));
     const [changed,alpha]=await Promise.all([draw(removed,f),draw(matte,f)]);let seen=0;
     for(let i=0;i<all.length;i++)if(changed[i]!==all[i]){a(alpha[i]>>>24,slot+' leaked outside own alpha');seen++;}
     a(seen>0,slot+' has no actual contribution');
    }
    frames++;
   }
  }
 }
 a.equal(frames,34);
 for(const dir of ['north','east','west']){
  const base=bases.find(p=>p.body==='male'&&p.hairStyle==='original'&&p.direction===dir&&p.action==='idle');
  a.equal(F({base,donors:groups(dir,'idle'),equipment:{boots:9}}),null);
 }
});
test('normal World selector uses complete independent routes only for the verified literal South pose',async()=>{
 const {make}=require('./rework-integration-support.cjs'),api=make();await api.ready;
 const appearance96={gender:'masculino',hairStyle:'original',skinColor:'original',hairColor:'original',eyeStyle:'original',eyeColor:'original'};
 const p={classId:'brawler',appearance96,equipment:{coat:{def:151},boots:{def:9},gloves:{def:152},legs:null,weapon:null}};
 const o={consumer:'world',direction:'south',action:'walk',x:256,y:405,progress:0},s=api.selectVisual(p,o);
 a(s?.id.includes(':registered-slots:'));a.deepEqual(s.omitted,[]);a.equal(s.slotRoutes.coat.quality,'hd');
 const q={...p,equipment:{...p.equipment,boots:{def:148}}},r=api.selectVisual(q,o);a(r?.id.includes(':registered-slots:'));
 const withoutBoot=record=>d(record).layers.filter(l=>!l.id.startsWith('boot')).sort((x,y)=>x.id.localeCompare(y.id));
 a.deepEqual(withoutBoot(s),withoutBoot(r));a.deepEqual(s.slotRoutes.coat,r.slotRoutes.coat);a.deepEqual(s.slotRoutes.gloves,r.slotRoutes.gloves);
 for(const item of [p,q]){a(await api.prepare(item,o));const c=cv.createCanvas(512,512),ctx=c.getContext('2d');a(api.draw(ctx,item,o));a(ctx.getImageData(0,0,512,512).data.some((v,i)=>i%4===3&&v));}
 for(const unsafe of [{...p,appearance96:MareCharacterAppearance.defaults},{...p,equipment:{...p.equipment,boots:{def:380}}},{...p,equipment:{...p.equipment,boots:{def:9,variant:'unknown'}}}])
  a(!api.selectVisual(unsafe,o)?.id.includes(':registered-slots:'));
 a(!api.selectVisual(p,{...o,direction:'north'})?.id.includes(':registered-slots:'));
});

test('a donor with only its own equipment mounts onto a registered anchor',()=>{
 const anchor=groups('south','idle').find(x=>x.equipment.boots===9);
 const owns=anchor.equipmentLayerGroups;
 const other=new Set(Object.entries(owns).filter(([slot])=>slot!=='boots').flatMap(([,ids])=>ids));
 const donor={...fit(anchor,d(anchor).layers.filter(l=>!other.has(l.id))),id:'isolated-boots-witness',
  equipment:{boots:9},equipmentLayerGroups:{boots:owns.boots}};
 const slots=Object.fromEntries(Object.entries(owns).map(([slot,anchorLayers])=>[slot,{anchorLayers,
  uncoveredBaseVerified:true,records:slot==='boots'?{9:{record:donor,layers:owns.boots}}:{}}]));
 const result=MareReworkModularOutfitsHD.composeSlots({anchor,equipment:{boots:9},fixed:{},slots});
 a.equal(result.slotRoutes.boots.quality,'hd');
 a.equal(result.slotRoutes.boots.source,donor.id);
 a.deepEqual(result.omitted,[]);
 a.deepEqual(d(result).layers.map(l=>l.id).sort(),d(donor).layers.map(l=>l.id).sort());
});
