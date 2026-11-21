'use strict';
// Run after the Pages build. This census measures HD source selection, never a visual approval.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib');
const root=path.resolve(__dirname,'..');
const {make}=require('../tests/rework-integration-support.cjs');
require('../player-rework-sword0-checkpoint.js');
const byName=name=>require(path.join(root,name+'.js'));
const data=byName('item-catalog').create({forge:byName('forge-system'),prison:byName('prison-system'),haki:byName('haki-system'),akuma:byName('akuma-system'),hakiProgression:byName('haki-progression')}).items;
const read=file=>{const f=path.join(root,file);return JSON.parse(fs.existsSync(f)?fs.readFileSync(f):zlib.gunzipSync(fs.readFileSync(f+'.gz')));};
const checkpoint='tools/rework-sword0-checkpoint/sword-catalog.json';
const api=make({fetchJSON:async f=>read(f===checkpoint?'dist/'+f:f)});
const mapping={sword:'attack-sword',brawler:'attack-unarmed',gunner:'attack-firearm',rogue:'attack-daggers',cyborg:'attack-tech',strategist:'attack-focus',healer:'attack-focus'};
const slots=['weapon','coat','legs','boots','gloves','head'];
const selected=data.map((item,id)=>({id,item})).filter(({item})=>slots.includes(item.slot));
const separateSlots=['cloak','visual_completo','akuma_no_mi','necklace','ring','belt','charm'];
const separate=Object.fromEntries(separateSlots.map(slot=>[slot,data.map((item,id)=>({id,item})).filter(x=>x.item.slot===slot&&(slot==='akuma_no_mi'?x.item.type==='akuma_no_mi':true)).map(x=>x.id)]));
const directions=['north','south','east','west'];
const groups={};
const pick=(id,slot,gender,profile)=>{
 const appearance96=profile==='original'
  ?{gender,hairStyle:'original',hairColor:'original',skinColor:'original',eyeStyle:'original',eyeColor:'original'}
  :global.MareCharacterAppearance.normalize({gender,...(profile==='female-sword-reference'?{hairStyle:'hair-cropped',hairColor:'blonde',eyeColor:'amber'}:{})});
 const gear=profile==='female-sword-reference'?{coat:{def:151}}:{};
 return {appearance96,equipment:{...gear,[slot]:{def:id}}};
};
(async()=>{
 await api.ready;if(api.snapshot().state!=='ready')throw Error('Native registry did not load');
 const rows=[];
 for(const {id,item} of selected){
  const attack=item.slot==='weapon'?mapping[item.type]:'attack-unarmed';
  if(!attack)throw Error('Unsupported weapon class in the census: '+item.type);
  for(const gender of ['feminino','masculino']){
   const profiles=gender==='feminino'&&item.slot==='weapon'?['original','saved','female-sword-reference']:['original','saved'];
   for(const profile of profiles){
    const p={...pick(id,item.slot,gender,profile),classId:item.slot==='weapon'?item.type:'brawler'};
    const result={};
    for(const action of ['idle','walk',attack])for(const direction of directions){
     const r=api.selectVisual(p,{action,direction,consumer:'world'});
     result[action+'/'+direction]=r&&!(r.omitted||[]).length?r.id:null;
    }
    const coverage=Object.values(result).filter(Boolean).length;
    rows.push({id,name:item.name,slot:item.slot,gender,profile,coverage,queries:12,result});
    const key=[gender,profile,item.slot].join('/');
    const g=groups[key]??={items:0,complete:0,partial:0,none:0,routes:0,queries:0};
    g.items++;g.routes+=coverage;g.queries+=12;
    g[coverage===12?'complete':coverage?'partial':'none']++;
   }
  }
 }
 const summary={scope:'Current HD selector, intended attack by item class, isolated slots; extra C151 profile only for female weapons. Normal modular fallback and authored pixel fit are outside this measurement.',profiles:['original','saved','female-sword-reference'],activeItems:selected.length,specialOrNonLayerSlots:separate,queries:rows.length*12,groups};
 if(process.argv[2])fs.writeFileSync(path.resolve(process.argv[2]),JSON.stringify({...summary,rows},null,2)+'\n');
 console.log(JSON.stringify(summary,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
