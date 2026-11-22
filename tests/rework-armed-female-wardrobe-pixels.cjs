'use strict';
// Run against the published build. Each selected slot is compared with
// the same equipped actor and clock after removing just that slot.
const assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const {gear,slots,complete}=require('../tools/audit-hd-wardrobe-product.cjs');
const path=require('node:path'),root=process.env.HD_PUBLISHED_ROOT||path.join(__dirname,'..');
const world=require(path.join(root,'paper-doll-96-lobby.js')),look=require(path.join(root,'character-appearance.js'));
const weapons=require(path.join(root,'tools/paper-doll-96-v3/weapons.json'));
global.MareSword0Checkpoint=require(path.join(root,'player-rework-sword0-checkpoint.js'));
const {make}=require('./rework-integration-support.cjs');
const {weapons:catalog}=require('../tools/audit-hd-wardrobe-product.cjs');
const poses={maleReplacement:['cyborg','walk'],malePlates:['cyborg','attack-unarmed'],maleCarryLayers:['brawler','walk'],maleGrip:['brawler','attack-unarmed'],dagger:['rogue','attack-daggers'],maleCuff:['brawler','walk'],bareRest:['sword','idle'],bareGait:['sword','walk'],bareMale:['sword','walk'],barePunch:['brawler','attack-unarmed'],rifle:['gunner','attack-firearm'],maleDaggers:['rogue','walk'],maleGait:['sword','walk'],gait:['sword','walk'],sword:['sword','attack-sword'],punch:['brawler','attack-unarmed'],tech:['cyborg','attack-unarmed'],focus:['healer','attack-focus']};
const directions=['north','south','east','west'];
async function main(){
 assert(process.env.HD_PUBLISHED_ROOT,'Set HD_PUBLISHED_ROOT to the exported site');
 const api=make();await api.ready;assert(await api.warmSwordCheckpoint());
 const paint=async(p,o,r)=>{
  const bundle=await api.prepareConfiguration([{player:p,options:o}],{resolve:()=>({player:p,options:o,source:r})});
  try{
   const coverage=bundle.coverage[0],frames=coverage.frames;
   assert.equal(frames,o.action==='idle'?1:o.action==='walk'?(p.appearance96.gender==='masculino'?16:40):8);
   assert.deepEqual(coverage.omitted||[],[]);
   const result=[];
   for(let i=0;i<frames;i++){
    let image;assert(bundle.draw({save(){},restore(){},drawImage(c){image=c;}},p,{...o,progress:(i+.25)/frames}));
    const pixels=image.getContext('2d').getImageData(0,0,image.width,image.height).data;
    result.push(createHash('sha256').update(pixels).digest('hex'));
   }
   return result;
  }finally{bundle.release();}
 };
 const rows=[],failures=[];
 const selectedPoses=Object.entries(poses).filter(([name])=>!process.env.WARDROBE_FAMILY||name===process.env.WARDROBE_FAMILY);
 assert(selectedPoses.length>0);
 const testedDirections=name=>directions.filter(d=>(name!=='maleGrip'||d==='north')&&(name!=='malePlates'||d!=='south')&&(name!=='maleReplacement'||d==='south')&&(!process.env.WARDROBE_DIRECTION||process.env.WARDROBE_DIRECTION===d));
 for(const [name,[role,attack]] of selectedPoses)for(const direction of testedDirections(name)){
  for(const action of ['sword','maleGait','maleDaggers','maleCuff','maleCarryLayers','maleReplacement','bareMale'].includes(name)?['idle',attack]:[attack]){
   for(let variant=0;variant<10;variant++){
    const choices=name==='maleReplacement'?catalog.filter(w=>w.id===119):name==='maleCarryLayers'?catalog.filter(w=>[15,17,109,111,112,117,118,119,120].includes(w.id)):
     name==='malePlates'?catalog.filter(w=>(direction==='north'?[118,119,120]:[14,120]).includes(w.id)):name==='maleGrip'?catalog.filter(w=>[14,15,109,111,112].includes(w.id)):name==='maleCuff'?catalog.filter(w=>w.id===2):name==='maleGait'?catalog.filter(w=>w.id===1):catalog.filter(w=>w.role===role||name==='focus'&&w.role==='strategist');
    const choice=choices[(variant+directions.indexOf(direction)*3)%choices.length];
    const def=['bareRest','bareGait','bareMale','barePunch'].includes(name)?null:choice.id,classId=choice.role,selected=slots.map((slot,i)=>[slot,gear[i][(variant+i*3)%10]]);
    const actor=pieces=>look.commit({classId,equipment:Object.fromEntries([...(def===null?[]:[['weapon',{def}]]),
     ...pieces.map(([slot,item])=>[slot,{def:item}])])},{gender:['malePlates','maleGrip','maleGait','maleDaggers','maleCuff','maleCarryLayers','maleReplacement','bareMale','barePunch'].includes(name)?'masculino':'feminino',skinColor:'ebony',hairColor:'blue',eyeColor:'green',
     hairStyle:['bareRest','bareGait'].includes(name)&&variant%2?'hair-cropped':'original',eyeStyle:'original'},()=>true);
    const o={consumer:'world',action,direction},get=p=>world.selectWorldHDOnly(api,weapons,p,o);
    const p=actor(selected),saved=JSON.stringify(p),full=get(p);assert(complete(full,selected,def,o),JSON.stringify({direction,def,selected,action}));
    assert.equal(get(actor([...selected].reverse())).id,full.id);
    const on=await paint(p,o,full);
    for(const [slot,item] of selected){
     const subset=selected.filter(([key])=>key!==slot),q=actor(subset),control=get(q);
     assert(complete(control,subset,def,o));
     for(const [key] of [...subset,...(def===null?[]:[['weapon',def]])])assert.deepEqual(full.slotRoutes[key],control.slotRoutes[key]);
     const off=await paint(q,o,control),changed=on.map((hash,i)=>hash!==off[i]);
     const row={classId,action,direction,weapon:def,slot,item,source:full.slotRoutes[slot].source,changed};
     rows.push(row);
     if(!changed.some(Boolean))failures.push(row);
     assert.equal(get(p).id,full.id);
    }
    assert.equal(JSON.stringify(p),saved);
    if(global.gc)global.gc();
   }
  }
 }
 assert(rows.length>0,'No wardrobe pixel cases matched');
 assert.equal(rows.length,selectedPoses.reduce((n,[name])=>n+testedDirections(name).length*50*(['sword','maleGait','maleDaggers','maleCuff','maleCarryLayers','maleReplacement','bareMale'].includes(name)?2:1),0));
 if(process.env.WARDROBE_EVIDENCE)require('node:fs').writeFileSync(process.env.WARDROBE_EVIDENCE,JSON.stringify(rows));
 console.log(JSON.stringify({checks:rows.length,phases:rows.reduce((n,x)=>n+x.changed.length,0),invisible:failures}));
 assert.equal(failures.length,0,'A real equipment group made no visible contribution throughout its cycle');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
