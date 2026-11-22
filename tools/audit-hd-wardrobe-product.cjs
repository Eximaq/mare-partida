'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.join(__dirname,'..');
const mod=name=>require(path.join(root,name+'.js'));
const slots=['coat','legs','boots','gloves','head'];
const expected=[[6,7,130,137,144,151,158,165,172,179],[21,22,133,140,147,154,161,168,175,182],
 [8,9,134,141,148,155,162,169,176,183],[25,26,131,138,145,152,159,166,173,180],[18,19,129,136,143,150,157,164,171,178]];
const {trusted}=require('./audit-hd-slot-independence.cjs');
const catalog=mod('item-catalog').create({forge:mod('forge-system'),prison:mod('prison-system'),haki:mod('haki-system'),
 akuma:mod('akuma-system'),hakiProgression:mod('haki-progression')}).items;
const gear=slots.map(slot=>catalog.flatMap((item,id)=>item.slot===slot?[id]:[]));
assert.deepEqual(gear,expected);
const weapons=catalog.flatMap((item,id)=>item.slot==='weapon'?[{id,role:item.type}]:[]);
assert.equal(weapons.length,42);
const directions=['north','south','east','west'],bodies=['masculino','feminino'];
const allRoles=[...new Set(weapons.map(w=>w.role))];
const weaponCatalog=require('../tools/paper-doll-96-v3/weapons.json');
const world=mod('paper-doll-96-lobby'),appearance=mod('character-appearance');
const published=process.env.HD_PUBLISHED_ROOT;
function readIndex(file){
 const p=path.join(published,file);
 return JSON.parse(fs.existsSync(p)?fs.readFileSync(p):require('node:zlib').gunzipSync(fs.readFileSync(p+'.gz')));
}
function fingerprint(){
 const h=crypto.createHash('sha256');
 const inputs=[__filename,path.join(__dirname,'audit-hd-slot-independence.cjs'),...fs.readdirSync(published)
  .filter(n=>/^(player-rework-|paper-doll-96-lobby|character-appearance|item-catalog).*\.js$/.test(n)).sort().map(n=>path.join(published,n))];
 for(const dir of ['rework-modular-outfits-hd','rework-base-hd','rework-weapon-layers-hd','rework-sword0-checkpoint','rework-combat-wardrobe','rework-female-dagger-wardrobe']){
  const base=path.join(published,'tools',dir);
  inputs.push(...fs.readdirSync(base).filter(n=>/\.json(?:\.gz)?$/.test(n)).sort().map(n=>path.join(base,n)));
 }
 for(const file of inputs)h.update(fs.readFileSync(file));
 return h.digest('hex');
}
function ownRoute(record,slot){return record?.slotRoutes?.[slot]??record?.slotRoutes?.[{coat:'torso',legs:'pants'}[slot]];}
function complete(record,entries,weapon,options){
 if(!record||record.appearanceAdapted||record.visualDegraded||record.omitted?.length||record.unsupported?.length||
   record.direction!==options.direction||(record.resolvedAction??record.action)!==options.action)return false;
 if(weapon!=null&&!trusted(record,'weapon',weapon))return false;
 return entries.every(([slot,id])=>trusted(record,slot,id));
}
function* product(){
 for(const coat of gear[0])for(const legs of gear[1])for(const boots of gear[2])
  for(const gloves of gear[3])for(const head of gear[4])yield [coat,legs,boots,gloves,head];
}
function inspect(api,weapon,body,action,direction,mode){
 const {role,id}=weapon,o={consumer:'world',action,direction};
 const base=id==null?{}:{weapon:{def:id}};
 const player=appearance.commit({classId:role,equipment:base},
  {gender:body,skinColor:'ebony',eyeColor:'green',hairColor:'blue',hairStyle:'original',eyeStyle:'original'},()=>true);
 const select=entries=>world.selectWorldHDOnly(api,weaponCatalog,{...player,equipment:{...base,
  ...Object.fromEntries(entries.map(([slot,def])=>[slot,{def}]))}},o);
 const solo={},pairs=[],full={tested:0,selected:0,perItem:{}},baseRecord=select([]);
 for(const [s,slot] of slots.entries())for(const item of gear[s]){
  const one=[[slot,item]],r=select(one),route=ownRoute(r,slot);
  solo[item]={slot,selected:complete(r,one,id,o),source:route?.source??null,
   reason:r?.slotResolution?.[slot]?.reason??(route?'':'missing-route'),pose:r?.resolvedAction??r?.action??null};
  full.perItem[item]={tested:0,selected:0};
 }
 for(let x=0;x<slots.length;x++)for(let y=x+1;y<slots.length;y++){
  const failures=[];
  for(const a of gear[x])for(const b of gear[y]){
   const entries=[[slots[x],a],[slots[y],b]],r=select(entries);
   if(!complete(r,entries,id,o))failures.push([a,b]);
  }
  pairs.push({slots:[slots[x],slots[y]],tested:100,failed:failures});
 }
 // Deterministic mixed cases cover each item at every slot. Exhaustive mode
 // streams the entire product through the normal game selector for this pose.
 function check(ids){
  const entries=ids.map((item,i)=>[slots[i],item]),ok=complete(select(entries),entries,id,o);
  full.tested++;if(ok)full.selected++;
  for(const item of ids){const row=full.perItem[item];row.tested++;if(ok)row.selected++;}
 }
 if(mode==='direct'){for(const ids of product())check(ids);}
 else for(let i=0;i<100;i++)check(gear.map((items,j)=>items[(i%10+[0,1,3,7,9][j]*Math.floor(i/10))%10]));
 assert.equal(Object.keys(solo).length,50);assert.equal(pairs.reduce((s,p)=>s+p.tested,0),1000);
 assert.equal(full.tested,mode==='direct'?100000:100);
 return {weapon:id,role,body,action,direction,mode,empty:{source:baseRecord?.id,selected:complete(baseRecord,[],id,o)},
  solo,pairs,full};
}
async function main(){
 const output=process.argv[2],mode=process.env.PRODUCT_MODE||'sample';
 assert(output&&published,'Supply output directory and HD_PUBLISHED_ROOT pointing to the exported game');
 assert(['sample','direct'].includes(mode));
 const include=process.env.PRODUCT_FILTER?JSON.parse(process.env.PRODUCT_FILTER):{};
 const weaponIndex=readIndex('tools/rework-weapon-layers-hd/index.json'),attackFor=({role,id})=>{
  const family={sword:'attack-sword',rogue:'attack-daggers',gunner:'attack-firearm',healer:'attack-focus',
   strategist:'attack-focus',cyborg:'attack-tech',brawler:'attack-unarmed'};
  const actions=new Set([...(weaponIndex.femaleRegistrations||[]),...(weaponIndex.orderedAttackProfiles||[])]
   .filter(r=>r.item===id&&r.action?.startsWith('attack-')).map(r=>r.action));
  return id==null?'attack-unarmed':actions.size===1?[...actions][0]:family[role];
 };
 const armedAndBare=[...weapons,...allRoles.map(role=>({id:null,role}))];
 const allowed={weapon:armedAndBare.map(w=>w.id),role:allRoles,body:bodies,direction:directions,action:
  [...new Set(['idle','walk',...armedAndBare.map(attackFor)])]};
 for(const [k,values] of Object.entries(include))assert(k in allowed&&Array.isArray(values)&&values.length&&values.every(v=>allowed[k].includes(v)),'Invalid filter '+k);
 const match=(k,v)=>!include[k]||include[k].includes(v);
 const tag=fingerprint(),folder=path.join(output,tag,mode);fs.mkdirSync(folder,{recursive:true});
 mod('player-rework-sword0-checkpoint');
 const api=require('../tests/rework-integration-support.cjs').make();
 await api.ready;assert(await api.warmSwordCheckpoint());
 let expectedCount=0,processed=0,failed=0;
 for(const w of armedAndBare.filter(w=>match('weapon',w.id)&&match('role',w.role)))
  for(const body of bodies.filter(x=>match('body',x)))for(const direction of directions.filter(x=>match('direction',x)))
   for(const action of ['idle','walk',attackFor(w)].filter(x=>match('action',x))){
    expectedCount++;
    const file=path.join(folder,[w.id??'bare',w.role,body,direction,action].join('_')+'.json');
    let row;
    if(fs.existsSync(file))row=JSON.parse(fs.readFileSync(file));else{
     row=inspect(api,w,body,action,direction,mode);
     const tmp=file+'.'+process.pid+'.tmp';fs.writeFileSync(tmp,JSON.stringify(row));fs.renameSync(tmp,file);
    }
    assert(row.mode===mode&&row.body===body&&row.direction===direction&&row.action===action&&row.weapon===w.id);
    if(Object.values(row.solo).some(x=>!x.selected)||row.pairs.some(x=>x.failed.length)||row.full.selected!==row.full.tested)failed++;
    processed++;
   }
 assert(expectedCount>0&&processed===expectedCount,'No contexts matched');
 if(!Object.keys(include).length)assert.equal(processed,(42+allRoles.length)*2*4*3);
 console.log(JSON.stringify({tag,mode,processed,contextsWithGaps:failed,folder}));
 if(failed)process.exitCode=1;
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={gear,slots,product,complete,weapons};
