'use strict';
const a=require('node:assert/strict'),p=require('node:path'),R=p.resolve(process.env.KAIZOKU_REPO||p.join(__dirname,'..')),{make}=require(R+'/tests/rework-integration-support.cjs'),A=require(R+'/character-appearance');
const old=make();if(process.env.STAGE)global.MareReworkWeaponNativeHD=require(p.resolve(process.env.STAGE,'player-rework-weapon-native-hd.js'));const api=make();
const M=global.MareReworkModularOutfitsHD,opts=d=>({direction:d,action:'attack-unarmed',consumer:'world'});
const actor=(skinColor,more={},gear={},view={})=>JSON.parse(JSON.stringify(A.commit({id:'true-save',classId:'cyborg',equipment:{weapon:{def:118},...gear},...more},{skinColor,...view},()=>true)));
async function run(){
 await Promise.all([old.ready,api.ready]);let count=0;
 for(const d of ['east','west']){
  const o=opts(d),ls=actor('light'),s=api.select(ls,o),light=await api.prepareConfiguration([{player:ls,source:s,options:o}],{resolve:x=>x});a.deepEqual(s,old.select(ls,o));
  const draw=(driver,q,n)=>{let c; a(driver.draw({save(){},restore(){},drawImage(t){c=t;}},q,{...o,progress:(n+.1)/20}));return c.getContext('2d').getImageData(0,0,640,640).data;};
  const eyes=M.sideIrisSamples(d);
  for(const tone of Object.keys(A.skins)){
   const player=actor(tone),before=JSON.stringify(player),r=api.select(player,o);
   a(r?.ownedArm118SideAttack);a.equal(Boolean(r.arm118SidePalette),tone!=='light');a.deepEqual(r.states,s.states);a.deepEqual(r.timeline,s.timeline);a.equal(r.fps,12);
   const h=await api.prepareConfiguration([{player,source:r,options:o}],{resolve:x=>x});
   for(let j=0;j<20;j++){
    const x=draw(light,ls,j),y=draw(h,player,j);let n=0;
    for(let i=0;i<x.length;i+=4){a.equal(x[i+3],y[i+3]);if(x[i]!==y[i]||x[i+1]!==y[i+1]||x[i+2]!==y[i+2])n++;}
    for(const [xx,yy] of eyes){const i=((yy+66)*640+xx+64)*4;a.deepEqual([...x.slice(i,i+4)],[...y.slice(i,i+4)]);}
    if(tone==='light')a.equal(n,0);else a(n>5000);
    count++;
   }
   a.equal(JSON.stringify(player),before);h.release();global.gc?.();console.log(d,tone,'20 ticks');
  }
  for(const q of [actor('ebony',{classId:'brawler'}),actor('ebony',{}, {coat:{def:151}}),actor('ebony',{}, {weapon:{def:118,variant:'other'}}),actor('ebony',{}, {},{hairColor:'silver'}),actor('ebony',{}, {},{eyeColor:'green'})])a.deepEqual(api.select(q,o),old.select(q,o));
  for(const z of [{...o,consumer:'portrait'},{...o,action:'walk'},{...o,direction:'north'},{...o,direction:'south'}])a.deepEqual(api.select(actor('ebony'),z),old.select(actor('ebony'),z));
  light.release();
 }
 a.equal(count,320);console.log('PASS persisted W118 V2',count);
}
run().catch(e=>{console.error(e);process.exitCode=1});
