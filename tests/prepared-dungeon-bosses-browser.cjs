'use strict';
// Uses real static-client assets without enabling any encounter or cast.
const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
   const page=await browser.newPage({viewport}),requests=[],bad=[];
   const relevant=/\/(?:sprites-combat-v2\/dungeon-(?:hancock|magellan|ace|aokiji|akainu)\/|vfx\/prepared-dungeon-bosses\/)/;
   page.on('request',r=>{if(relevant.test(r.url()))requests.push(r.url());});
   page.on('response',r=>{if(relevant.test(r.url())&&r.status()>=400)bad.push(r.url());});
   await page.goto(process.env.MARE_TEST_URL,{waitUntil:'load'});
   await page.waitForFunction(()=>window.MarePreparedDungeonBosses&&window.MarePreparedDungeonBossArtData&&window.MarePreparedDungeonBossFx&&window.MareSpriteCombatV2);
   assert.equal(requests.length,0);
   const output=await page.evaluate(async()=>{
    const A=MarePreparedDungeonBossArtData,R=MareSpriteCombatV2,F=MarePreparedDungeonBossFx,C=MarePreparedDungeonBosses;
    const ready=await Promise.all([...Object.keys(A.actors).map(id=>R.prepare(id)),
     ...Object.entries(A.effects).flatMap(([id,kinds])=>Object.keys(kinds).map(kind=>F.prepare(id,kind)))]);
    if(!ready.every(Boolean))throw Error('Decode failed');
    const canvas=document.createElement('canvas');canvas.width=480;canvas.height=380;
    const ctx=canvas.getContext('2d');
    const paint=fn=>{
     ctx.clearRect(0,0,480,380);if(!fn())throw Error('Missing render');
     const buf=ctx.getImageData(0,0,480,380).data;
     let top=380,foot=-1,count=0,checksum=0;
     for(let i=3;i<buf.length;i+=4)if(buf[i]>=60){
      let y=Math.floor((i-3)/4/480);top=Math.min(top,y);foot=Math.max(foot,y);count++;checksum=(checksum+((i*17)^(buf[i-3]<<13)^(buf[i-2]<<5)^buf[i-1]))|0;
     }
     return {height:foot-top+1,foot,count,checksum};
    };
    const result={};
    for(const [id,profile] of Object.entries(C.catalog)){
     const key=profile.monster,draw=(action,direction)=>paint(()=>R.draw(ctx,key,240,300,{action,direction,progress:action==='idle'?0:.5,height:R.monsterHeight(key)}));
     const idle=paint(()=>MareNewIslandArt.monster(ctx,{type:key,x:240,y:297,hp:100,alive:true,emberFacing:'south'},0));
     const hits={};
     for(const d of Object.keys(A.actors[key].clips.attack)){
      const basic=draw('attack',d),special=draw('special',d);hits[d]=[basic.count,special.count,basic.checksum!==special.checksum];
     }
     const effects=Object.fromEntries(Object.keys(A.effects[id]).map(kind=>[kind,paint(()=>F.draw(ctx,id,kind,240,190,{frame:2,scale:.8})).count]));
     result[id]={idle,hits,effects,level:C.combatProfile(id).level,xp:C.combatProfile(id).xp};
    }
    return result;
   });
   assert.equal(new Set(requests).size,108);assert.deepEqual(bad,[]);
   assert.deepEqual(Object.values(output).map(x=>[x.level,x.xp]),[[130,0],[140,0],[150,0],[160,0],[170,0]]);
   for(const x of Object.values(output)){
    assert(x.idle.count>1000&&Math.abs(x.idle.foot-300)<=4);
    for(const [basic,special,distinct] of Object.values(x.hits))assert(basic>1000&&special>1000&&distinct);
    assert(Object.values(x.effects).every(n=>n>50));
   }
   console.log(JSON.stringify({viewport,resources:new Set(requests).size,output}));
   await page.close();
  }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
