'use strict';
const path=require('node:path'),fs=require('node:fs'),crypto=require('node:crypto');
const R=path.resolve(process.argv[2]||path.join(__dirname,'..')), mode=process.argv[3]||'count';
const n=s=>require(path.join(R,s+'.js')), J=s=>JSON.parse(fs.readFileSync(path.join(R,s)));
const {items,inventorySlotsLeft,inventorySlotsRight}=n('item-catalog').create({forge:n('forge-system'),prison:n('prison-system'),haki:n('haki-system'),akuma:n('akuma-system'),hakiProgression:n('haki-progression')});
const skin=Object.keys(n('character-appearance').skins), bodies=['masculino','feminino'], dirs=['north','south','east','west'];
const family={sword:'attack-sword',brawler:'attack-unarmed',gunner:'attack-firearm',rogue:'attack-daggers',cyborg:'attack-tech',strategist:'attack-focus',healer:'attack-focus'};
const slots=['head','coat','legs','boots','gloves'], canon={torso:'coat',pants:'legs'}, act=['idle','walk','attack','skill'];
const row=(i,v)=>({def:i,name:v.name,slot:v.slot,type:v.type??null});
const all=items.map((v,i)=>row(i,v)), group=s=>all.filter(x=>x.slot===s);
const ws=group('weapon'), classes=[...new Set(ws.map(w=>w.type))].sort();
const wContexts=ws.map(w=>[w.type,w.def]).concat(classes.map(c=>[c,null]));
const wardrobes=slots.reduce((acc,s)=>acc*BigInt(group(s).length+1),1n);
const visibleSlots=[...slots,'weapon'];const otherSlots=[...new Set([...inventorySlotsLeft,...inventorySlotsRight,'visual_completo'])].filter(s=>!visibleSlots.includes(s));
const W=J('tools/rework-weapon-layers-hd/index.json'), O=J('tools/rework-modular-outfits-hd/index.json'),H=J('tools/rework-accessories/head-layer-index.json'),C=J('tools/rework-weapon-layers-hd/carry-binding-plan.json'), ownHead=J('tools/rework-accessories/female-original-face-ownership.json');
const manifests=[
 ['weapon-atomic',W.records],['weapon-ordered',W.orderedAttackProfiles],['female-native',W.femaleRegistrations],
 ['outfit',O.records],['carry',C.records],['head',[...H.records,...(ownHead.historicalGear||[])]]
];
const by=Object.fromEntries(visibleSlots.map(s=>[s,Object.fromEntries(group(s).map(({def})=>[def,{}]))])), declared=new Map();
function flatten(v,out=new Set()){
 if(typeof v==='string'&&/^[a-f0-9]{64}$/.test(v))out.add(v);
 else if(Array.isArray(v))for(const e of v)flatten(e,out);
 else if(v&&typeof v==='object')for(const e of Object.values(v))flatten(e,out);
 return [...out].sort();
}
function addKit(e){
 const set={};for(const [key,v] of Object.entries(e||{})){const s=canon[key]||key,i=v?.def??v;
  if(i==null)continue;
  if(!visibleSlots.includes(s)||items[i]?.slot!==s)return;
  set[s]=i;
 }
 const normalized=Object.fromEntries(visibleSlots.filter(s=>Object.hasOwn(set,s)).map(s=>[s,set[s]]));
 declared.set(JSON.stringify(normalized),normalized);
}
for(const [kind,recs]of manifests)for(const r of recs||[]){
 const eq={...r.equipment};if(/weapon|female-native|carry/.test(kind)&&Number.isInteger(r.item))eq.weapon=r.item;
 if(kind==='head'&&r.item!=null)eq.head=r.item;
 for(const [k,v]of Object.entries(eq)){
  const s=canon[k]||k,i=v?.def??v;
  if(!Object.hasOwn(by[s]||{},i))continue;
  const b=by[s][i],key=[kind,r.body||r.targetBody||'?',r.action||r.targetAction||'?',r.direction||r.targetDirection||'?'].join('/');
  const digest=crypto.createHash('sha256').update(JSON.stringify(flatten(r))).digest('hex').slice(0,12);
  (b[key]??=new Set()).add(digest);
 }
 addKit(eq);
}
for(const v of all)if(visibleSlots.includes(v.slot))addKit({[v.slot]:v.def});
addKit({}); addKit({coat:6,legs:22});
const groups={};
for(const s of visibleSlots){
 const m=new Map();
 for(const [id,v]of Object.entries(by[s])){
  const desc=Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,s])=>[k,[...s].sort()]));
  const key=JSON.stringify(desc);
  if(!m.has(key))m.set(key,{ids:[],registrationKeys:Object.keys(desc),sourceFingerprint:crypto.createHash('sha256').update(key).digest('hex').slice(0,16)});
  m.get(key).ids.push(+id);
 }
 groups[s]=[...m.values()];
}
const equiv={scope:'Informational byte-SHA fingerprints of indexed registrations only. Matching class does not prove independent composition, equip compatibility or runtime equivalence; no IDs are deduplicated for the exhaustive runner.',bySlot:groups};
const basicContexts=wContexts.length, actionsPerContext=act.length+1, posed=wardrobes*BigInt(basicContexts*bodies.length*dirs.length*skin.length*actionsPerContext);
const shaFile=f=>crypto.createHash('sha256').update(fs.readFileSync(path.join(R,f))).digest('hex');
const releaseMarker=Object.fromEntries(['item-catalog.js','player-rework-native-hd.js','paper-doll-96-lobby.js','player-rework-default-hd.js','tools/rework-weapon-layers-hd/index.json','tools/rework-modular-outfits-hd/index.json'].map(x=>[x,shaFile(x)]));
const summary={releaseMarker,catalogEntries:items.length,bodySlotCounts:Object.fromEntries(slots.map(s=>[s,group(s).length])),bodyVisualSlots:visibleSlots,notInBodyLayerProduct:otherSlots.map(s=>({slot:s,n:group(s).length})),wardrobes:String(wardrobes),weaponFamilies:Object.fromEntries(classes.map(c=>[c,ws.filter(w=>w.type===c).length])),weaponClassContexts:basicContexts,equipmentClassProduct:String(wardrobes*BigInt(basicContexts)),perSingleActionPoseProduct:String(wardrobes*BigInt(basicContexts*bodies.length*dirs.length*skin.length)),declaredKits:declared.size,bodyChoices:bodies,directions:dirs,skinChoices:skin,actionsPerContext:['idle','walk','attack','skill','canonical class action'],scopeNote:'Excludes alternate hair/style/colors, account visual-complete override, Zoan alternate body, real non-rendered stats and additional weaponless/fruit actions from the lower-bound product. No numerical assumption of coverage.',posedLowerBound:String(posed),fallback:[
 'game.js drawPaperDoll -> paper-doll-96-lobby.js local requestWorldVisual -> selectWorldHDOnly (independent native pose or exact authored route) -> native prepareConfiguration',
 'inventory: game.drawInventoryAvatar -> lobby.drawFittedAvatar -> typed South HD surface or fitted native route; unresolved slots remain diagnostic',
 'character-creation specifically requires native HD for its draft; ordinary editor (explicit appearance) skips adapting defaultHD but retains its separate fallback', 
 'defaultHD.draw may report omission or appear to handle an uncovered row; neither makes it a complete HD result',
 'Visual Completo and Zoan bodies use separate override gates, not the base body product'
]};
if(mode==='count'){console.log(JSON.stringify({summary,equiv},null,2));process.exit(0);}
if(mode==='inventory'){
 const pools=['rework-base-hd','rework-modular-outfits-hd','rework-weapon-layers-hd']
  .map(folder=>[folder,J('tools/'+folder+'/archives/archive-index.json').sources]);
 for(const folder of ['rework-female-dagger-p22','rework-female-profile-rig','rework-female-north-rig']){
  const index=J('tools/'+folder+'/index.json');
  if(index.archiveIndex)pools.push([folder,index.archiveIndex.sources]);
 }
 const locate=hash=>pools.flatMap(([folder,sources])=>{
  const r=sources[hash];
  if(!r)return [];
  const file='tools/'+folder+'/archives/'+r.archive;
  return [{file,member:r.path,available:fs.existsSync(path.join(R,file))}];
 }).concat(['rework-accessories','rework-female-north-rig'].flatMap(folder=>{
  const file='tools/'+folder+'/assets/'+hash+'.png';
  return fs.existsSync(path.join(R,file))?[{file,available:true}]:[];
 }));
 const sourcesByKind={
  'weapon-atomic':'tools/rework-weapon-layers-hd/index.json#records',
  'weapon-ordered':'tools/rework-weapon-layers-hd/index.json#orderedAttackProfiles',
  'female-native':'tools/rework-weapon-layers-hd/index.json#femaleRegistrations',
  'outfit':'tools/rework-modular-outfits-hd/index.json.gz#records',
  'carry':'tools/rework-weapon-layers-hd/carry-binding-plan.json#records',
  'head':'tools/rework-accessories/head-layer-index.json'
 };
 const slotsFor=(kind,r)=>{
  const eq={...r.equipment};
  if(/weapon|female-native|carry/.test(kind)&&Number.isSafeInteger(r.item))eq.weapon=r.item;
  if(kind==='head'&&Number.isSafeInteger(r.item))eq.head=r.item;
  return Object.entries(eq).flatMap(([key,v])=>{
   const slot=canon[key]||key,id=v?.def??v;
   return all[id]?.slot===slot?[[key,all[id]]]:[];
  });
 };
 const independent=J('tools/rework-female-dagger-p22/index.json');
 const daggerRows=['boots','gloves'].flatMap(slot=>Object.entries(
  slot==='boots'?independent.signedBootLayers:independent.signedGloveLayers).flatMap(([direction,items])=>
   Object.entries(items).map(([item,layers])=>({id:['female-dagger',slot,item,direction].join('/'),
    body:'female',action:'attack-daggers',direction,equipment:{[slot]:Number(item)},
    equipmentLayerGroups:{[slot]:layers.map(l=>l.id)},pack:{directions:{[direction]:{layers,clip:{frames:layers[0].frames.length}}}}}))));
 sourcesByKind['dagger-own']='tools/rework-female-dagger-p22/index.json';
 const rows=[];
 for(const [kind,records] of [...manifests,['dagger-own',daggerRows]])for(const r of records||[]){
  const direction=r.direction??r.targetDirection??null,body=r.body??r.targetBody??null;
  const action=r.action??r.targetAction??(kind==='carry'?'walk':kind==='weapon-atomic'?family[all[r.item]?.type]:null);
  const d=r.pack?.directions?.[direction];
  for(const [key,item] of slotsFor(kind,r)){
   const owned=r.equipmentLayerGroups?.[key],parts=owned?(d?.layers||[]).filter(l=>owned.includes(l.id)).map(l=>
    ({id:l.id,depth:l.depth,binding:l.binding,frames:l.frames??[l.source]})):null;
   const hashes=parts?flatten(parts):flatten(r.sourceRefs??r.parts??r.states??r.layers??[]);
   rows.push({item,body,action,direction,phases:d?.clip?.frames??r.timeline?.length??r.states?.length??null,
    sourceIndex:sourcesByKind[kind],record:r.id??r.targetWalkRecord??r.package??r.snapshot??null,
    origin:r.sourcePackage??r.sourcePortableFile??r.sourceArchiveSHA256??r.provenance??r.package??null,
    approvalEvidence:r.approvalEvidence??r.approval??null,
    density:r.pack?.density??r.density??null,clock:d?.clip??(r.fps?{fps:r.fps}:null),
    sourceStatus:r.status??r.approval??r.sourceStatus??null,productionEnabled:r.productionEnabled??null,
    ownership:parts?'explicit-layer-group':'record-only',parts,
    sources:hashes});
  }
 }
 const ids=new Set(rows.map(r=>r.item.def));
 const locations=Object.fromEntries([...new Set(rows.flatMap(r=>r.sources))].sort().map(hash=>[hash,locate(hash)]));
 console.log(JSON.stringify({summary,inventoryUnit:'One catalog item occurrence in a source record. Frame arrays and paths are available where the index declares ownership. Use the slot and pixel audits for mounted and rendered coverage.',
  items:all.map(r=>({...r,visualFamily:visibleSlots.includes(r.slot),indexed:ids.has(r.def)})),rows,locations}));
 process.exit(0);
}
const {make,cv}=require(path.join(R,'tests/rework-integration-support.cjs')),APP=n('character-appearance');
const published=process.env.HD_PUBLISHED_ROOT&&path.resolve(process.env.HD_PUBLISHED_ROOT),swordPrefix='tools/rework-sword0-checkpoint/';
if(published)require(path.join(R,'player-rework-sword0-checkpoint.js'));
const preset=process.env.LOOK==='spiky'?{hairStyle:'hair-spiky'}:{};
const map96=J('tools/paper-doll-96-v3/weapons.json');
const authored=(type,id)=>{
 if(id==null)return 'attack-unarmed';
 const own=[...new Set([...(W.femaleRegistrations||[]),...(W.orderedAttackProfiles||[])].filter(r=>r.item===id&&r.action?.startsWith('attack-')).map(r=>r.action))];
 return own.length===1?own[0]:family[type];
};
const actionOptions=(type,id)=>[...new Set([...act,authored(type,id),...(process.env.COMPAT_ACTIONS==='1'&&id!=null?[map96.items.find(w=>w.itemId===id)?.attackAction||('attack-'+map96.classes[type])]:[]),...(process.env.SKILL_ALIASES==='1'?['skill-1','skill-2','combo','cast','heal','reload','dodge']:[])])];
const slotProof=(r,q)=>{
 const known={...Object.fromEntries(Object.entries({...r.equipment,...r.equipmentContract}).map(([k,v])=>[canon[k]||k,v?.def??v]))};
 if(r.item!=null)known.weapon=r.item;
 for(const [key,v]of Object.entries(r.slotRoutes||{}))if(v.quality==='hd')known[canon[key]||key]=v.item;
 const head=r.headRecord?.item??r.gearOnlyRecord?.sourceRecord?.item??r.material?.gearRecord?.item??r.femaleNamedHairRecord?.gearRecord?.item;
 if(head!=null)known.head=head;
 return Object.entries(q).every(([s,i])=>known[s]===i);
};
const emptyMap=process.env.NULL_SLOTS==='1'?Object.fromEntries([...inventorySlotsLeft,...inventorySlotsRight,'visual_completo'].map(s=>[s,null])):{};
const idEq=q=>({...emptyMap,...Object.fromEntries(visibleSlots.filter(s=>Object.hasOwn(q,s)).map(s=>[s,Object.freeze({def:q[s]})]))});
const int=(k,v)=>process.env[k]==null?v:Number(process.env[k]);
const workers=int('SHARDS',1),shard=int('SHARD',0),limit=int('LIMIT',Infinity);
// Focused preflight for a local layer patch; no filters by default. Sharding
// keeps the same catalog ordinal as the full run.
const filter=process.env.AUDIT_FILTER?JSON.parse(process.env.AUDIT_FILTER):{};
if(!filter||Array.isArray(filter)||typeof filter!=='object')throw Error('AUDIT_FILTER must be an object');
const allowed={
 family:classes,body:bodies,dir:dirs,slot:slots,
 weapon:[null,...ws.map(w=>w.def)],action:[...new Set([...act,...Object.values(family)])]
};
for(const [k,vs] of Object.entries(filter)){
 if(!Object.hasOwn(allowed,k)||!Array.isArray(vs)||!vs.length||vs.some(v=>!allowed[k].includes(v)))
  throw Error('Invalid AUDIT_FILTER value for '+k);
 filter[k]=[...new Set(vs)].sort();
}
const matches=(k,v)=>!filter[k]||filter[k].includes(v);

if(!Number.isSafeInteger(workers)||workers<1||!Number.isSafeInteger(shard)||shard<0||shard>=workers)throw Error('SHARDS / SHARD invalid');
function* wardrobeKits(i=0,q={}){
 if(i===slots.length){yield q;return;}
 yield* wardrobeKits(i+1,q);
 const s=slots[i];for(const x of group(s))yield* wardrobeKits(i+1,{...q,[s]:x.def});
}
function* kits(){
 if(mode==='all'){for(const [role,id] of wContexts)for(const q of wardrobeKits())yield [role,id==null?q:{...q,weapon:id}];return;}
 if(mode==='declared'){for(const q of declared.values())if(q.weapon==null)for(const c of classes)yield [c,q];else yield [items[q.weapon].type,q];return;}
 if(mode==='bare'){for(const [role,id] of wContexts)yield [role,id==null?{}:{weapon:id}];return;}
 if(mode==='clothing-pairs'){for(const role of classes)for(let i=0;i<slots.length;i++)for(let j=i+1;j<slots.length;j++)for(const x of group(slots[i]))for(const y of group(slots[j]))yield [role,{[x.slot]:x.def,[y.slot]:y.def}];return;}
 if(mode==='weapon-pairs'){for(const [role,id] of wContexts){const q=id==null?{}:{weapon:id};yield [role,q];for(const s of slots)for(const {def} of group(s))yield [role,{...q,[s]:def}];}return;}
 throw Error('Use count, bare, declared, clothing-pairs, weapon-pairs, or all');
}
(async()=>{
 const fileLoad=require(path.join(R,'tools/rework-hd-test-loader.cjs')).create(R);
 const read=(rel)=>{const file=path.join(rel.startsWith(swordPrefix)?published:R,rel);return JSON.parse(fs.existsSync(file)?fs.readFileSync(file):require('node:zlib').gunzipSync(fs.readFileSync(file+'.gz')));};
 const api=make(published?{fetchJSON:async f=>read(f),loadImage:f=>f.startsWith(swordPrefix)?cv.loadImage(path.join(published,f)):fileLoad(f)}:{});
 await api.ready;if(api.snapshot().state!=='ready')throw Error(api.snapshot().error);
 if(published&&!await api.warmSwordCheckpoint())throw Error('Signed sword registrations were not verified.');
 const aggregation={},examples={},bySlot={},gaps=new Map(),sha=crypto.createHash('sha256');let enumKits=0,queriedKits=0,rows=0,signedOmissionKeptHD=0;
 // Record exact declarations for comparison; different routes with identical
 // coverage totals must not conceal a dropped slot. This is not Canvas proof.
 const vector=mode==='weapon-pairs'?[]:null, queries=vector&&crypto.createHash('sha256');
 const state={compatibilityNeeded:0,hdPartialDeclared:1,hdFoundSlotsUnattested:2,hdSlotsDeclaredAll:3};
 queries?.update(JSON.stringify({explicitNull:process.env.NULL_SLOTS==='1',signedCheckpoint:!!published})+'\n');
 const world=n('paper-doll-96-lobby'),weaponCatalog=J('tools/paper-doll-96-v3/weapons.json');
 const selected=(p,o)=>world.selectWorldHD(api,weaponCatalog,p,o);
 for(const [role,q]of kits()){
  const k=enumKits++;if(k%workers!==shard||!matches('family',role)||!matches('weapon',q.weapon??null)||
    filter.slot&&!filter.slot.some(slot=>Object.hasOwn(q,slot)))continue;
  if(queriedKits++>=limit){queriedKits--;break;}
  for(const gender of bodies.filter(b=>matches('body',b)))for(const tone of (process.env.TONES==='light'?['light']:skin)){
   const p=APP.commit({classId:role,equipment:idEq(q)},{gender,skinColor:tone,...preset},()=>true);
   for(const direction of dirs.filter(d=>matches('dir',d)))for(const action of actionOptions(role,q.weapon).filter(a=>matches('action',a))){
    const r=selected(p,{action,direction,consumer:'world'});
    // Preserve the original missing-art measure and exact vectors. A
    // signed omission changes runtime fallback, not the availability of art.
    const retained=r?.slotFallback==='signed-pose-omit'&&r.omitted?.length;
    if(retained)signedOmissionKeptHD++;
    const mark=!r||retained?'compatibilityNeeded':r.omitted?.length||r.unsupported?.length||r.appearanceAdapted?'hdPartialDeclared':slotProof(r,q)?'hdSlotsDeclaredAll':'hdFoundSlotsUnattested';
    const key=[gender,role,action,direction,mark].join('/');aggregation[key]=(aggregation[key]||0)+1;
    if(mark!=='hdSlotsDeclaredAll'&&!examples[key])examples[key]={equipment:q,tone,source:r?.id,omitted:r?.omitted};
    for(const slot of slots){
     if(!Object.hasOwn(q,slot))continue;
     const bucket=bySlot[slot]??={};
     const group=[gender,action,mark].join('/');
     bucket[group]=(bucket[group]||0)+1;
     if(mark==='compatibilityNeeded'){
      const gap=[gender,role,action,direction,slot,q[slot]].join('/');
      const g=gaps.get(gap)??{count:0,weapons:new Set()};
      g.count++;g.weapons.add(q.weapon??null);gaps.set(gap,g);
     }
    }

    if(vector){
     const i=rows>>2,shift=2*(rows&3);
     vector[i]=(vector[i]||0)|(state[mark]<<shift);
     queries.update(JSON.stringify([k,role,q,p.appearance96,direction,action])+'\n');
    }
    sha.update(JSON.stringify([k,gender,tone,action,direction,retained?null:r?.id??null,mark])+'\n');rows++;
   }
  }
 }
 const totals={};for(const [k,v]of Object.entries(aggregation)){const label=k.split('/').at(-1);totals[label]=(totals[label]||0)+v;}
 const coverageVector=vector?{schema:'world-slot-states-2bit-v1',queriesSHA256:queries.digest('hex'),data:Buffer.from(vector).toString('base64')}:undefined;
 console.log(JSON.stringify({mode,shard,workers,filter,coverageVector,enumeratedKits:enumKits,queriedKits,rows,counts:totals,runtime:{signedOmissionKeptHD},posesSHA256:sha.digest('hex'),grouped:aggregation,bySlot,gapGroups:[...gaps.entries()].sort(([x,a],[y,b])=>b.count-a.count||x.localeCompare(y)).map(([signature,g])=>({signature,count:g.count,weapons:[...g.weapons]})),examples,authority:'Production World selector including generic-attack routing; an HD route or declared slots is not pixel/Canvas or material proof.'},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
