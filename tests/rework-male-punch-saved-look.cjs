'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const {make}=require('./rework-integration-support.cjs');
const root=path.resolve(process.env.HD_PUBLISHED_ROOT||path.join(__dirname,'..'));
const world=require(path.join(root,'paper-doll-96-lobby.js'));
const looks=require(path.join(root,'character-appearance.js'));
const weapons=require(path.join(root,'tools/paper-doll-96-v3/weapons.json'));

(async()=>{
 const api=make();await api.ready;
 const catalogue=weapons.items.filter(w=>['unarmed','tech'].includes(w.category));
 assert.equal(catalogue.length,12);
 const kit={coat:130,legs:168,boots:148,gloves:159,head:129};
 const action='attack-unarmed',directions=['south','east','west','north'];
 function actor(w,gear,hairStyle,eyeStyle,eyeColor){
  const equipment=Object.fromEntries(Object.entries({weapon:w.itemId,...gear}).map(([key,def])=>[key,{def}]));
  return looks.commit({classId:w.category==='tech'?'cyborg':'brawler',equipment},
   {gender:'masculino',skinColor:'ebony',hairColor:'blue',hairStyle,eyeStyle,eyeColor},()=>true);
 }
 function select(p,pose){
  const r=world.selectWorldHDOnly(api,weapons,p,pose);
  assert(r&&!r.visualDegraded&&!r.appearanceAdapted,'Complete requested punch receiver');
  assert.deepEqual(r.omitted||[],[]);assert.equal(r.action,action);assert.equal(r.direction,pose.direction);
  for(const [key,part] of Object.entries(p.equipment))assert.equal(r.slotRoutes?.[key]?.item??r.equipmentContract?.[key],part.def,key);
  return r;
 }
 let selections=0;
 for(const w of catalogue)for(const direction of directions)for(const hair of Object.keys(looks.choices.hairStyle))for(const face of Object.keys(looks.choices.eyeStyle)){
  select(actor(w,kit,hair,face,'green'),{action,direction,consumer:'world'});selections++;
 }
 assert.equal(selections,3360);
 const results=[];
 const uncovered={...kit};delete uncovered.head;
 for(const [id,direction,hair] of [[109,'east','original'],[110,'south','hair-cropped'],[2,'north','none'],[119,'west','hair-cropped'],[119,'south','none']]){
  const weapon=catalogue.find(w=>w.itemId===id),pose={action,direction,consumer:'world'},config=[];
  try{
   for(const [face,eye] of [['original','green'],['face-calm','green'],['face-calm','amber']]){
    const player=actor(weapon,uncovered,hair,face,eye),source=select(player,pose);
    const prepared=await api.prepareConfiguration([{player,options:pose}],{resolve:()=>({player,options:pose,source})});
    assert.deepEqual(prepared.coverage[0].omitted,[]);config.push({player,source,prepared});
   }
   const selected=config[1].source,plan=selected.independentPlan,receiver=plan.base;
   const pack=receiver.pack||receiver.southPunchHead.pack,local=pack.directions[direction];
   const eyes=global.MareReworkEyeStylesHD.maleSource({pack,direction});
   const ticks=selected.timeline||local.poses.map((_,f)=>String(f)),seen=new Set(),changes=[0,0];
   for(let t=0;t<ticks.length;t++){
    const state=ticks[t];if(seen.has(state))continue;seen.add(state);
    let width;const samples=config.map(({player,prepared})=>{
     let pixels;assert(prepared.draw({save(){},restore(){},drawImage(tile){
      width=tile.width;pixels=new Uint32Array(tile.getContext('2d').getImageData(0,0,width,width).data.buffer);
     }},player,{...pose,progress:(t+.25)/ticks.length}));return pixels;
    });
    const pos=local.poses[Number(state)]?.NECK||local.rest.NECK,pad=(width-640)/2;
    const dx=pad+Math.round((pos.x-local.rest.NECK.x)*4),dy=pad+Math.round((pos.y-local.rest.NECK.y)*4)+(plan.grip?.headOffset||0);
    for(let i=0;i<samples[0].length;i++)for(let pair=0;pair<2;pair++){
     if(samples[pair][i]===samples[pair+1][i])continue;
     const x=i%width-dx,y=Math.floor(i/width)-dy;
     assert(eyes.boxes?.some(([l,t,r,b])=>x>=l&&x<=r&&y>=t&&y<=b),
      [id,direction,hair,state,'outside registered eyes',x,y].join('/'));
     changes[pair]++;
    }
   }
   if(direction==='north')assert.deepEqual(changes,[0,0]);else assert(changes.every(n=>n>0),'Visible face shape and iris pigment must each change');
   results.push({id,direction,hair,states:seen.size,changes});
  }finally{for(const {prepared} of config)prepared.release();}
 }
 assert.equal(results.length,5);
 console.log(JSON.stringify({selections,results}));
})().catch(error=>{console.error(error);process.exitCode=1;});
