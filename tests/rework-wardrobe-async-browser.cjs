'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');

module.exports=async function wardrobeLoadRace({page,url,out,put}){
 const old=130,next=137,fixed={weapon:123,legs:168,boots:148,gloves:159,head:19};
 const response=await page.request.get(new URL('tools/rework-combat-wardrobe/index.json',url).href);
 assert(response.ok());const bank=(await response.json()).northStaffWardrobe;
 const source=id=>bank.items[fixed.weapon].frames[0].coats[id].front[0],oldPath=source(old)+'.png',newPath=source(next)+'.png';
 assert.match(oldPath,/^[a-f\d]{64}\.png$/);assert.notEqual(oldPath,newPath);
 const matches=(req,name)=>new URL(req.url()).pathname.endsWith('/tools/rework-combat-wardrobe/assets/'+name);
 let release,arrived,complete,hitsA=0,hitsB=0,finished=false;
 const gate=new Promise(r=>{release=r;}),intercepted=new Promise(r=>{arrived=r;}),delivered=new Promise(r=>{complete=r;});
 const requests=req=>{if(matches(req,oldPath))hitsA++;if(matches(req,newPath))hitsB++;};
 const finishedRequest=req=>{if(matches(req,oldPath)){finished=true;complete();}};
 page.on('request',requests);page.on('requestfinished',finishedRequest);
 const routePattern='**/tools/rework-combat-wardrobe/assets/'+oldPath+'*';
 const hold=async route=>{const asset=await route.fetch();assert.equal(asset.status(),200);arrived();await gate;await route.fulfill({response:asset});};
 await page.route(routePattern,hold);
 const read=()=>page.evaluate(()=>__hdSlotQA.raceRead());
 const wait=async(fn,args,timeout=20000)=>{const h=await page.waitForFunction(fn,args,{timeout,polling:'raf'});return h.jsonValue();};
 try{
  await page.evaluate(({ids})=>__hdSlotQA.seedWardrobe('strategist',ids,{gender:'masculino',skinColor:'ebony',hairStyle:'original',hairColor:'blue',eyeColor:'green'}),{ids:[...Object.values(fixed),old,next]});
  for(const id of [...Object.values(fixed),old])await put(id);
  await page.evaluate(()=>__hdSlotQA.target('north'));await page.evaluate(()=>__hdSlotQA.raceStart());
  const savedLook=(await page.evaluate(()=>__hdSlotQA.read())).appearance;
  const cold=await page.evaluate(names=>performance.getEntriesByType('resource').filter(e=>names.some(k=>new URL(e.name).pathname.endsWith('/'+k))).length,[oldPath,newPath]);
  assert.equal(cold,0,'Attack panel must start cold');assert.equal(hitsA,0);assert.equal(hitsB,0);
  await page.locator('#autoToggle').click();
  const timeoutToken=Symbol();let watch;
  try{assert.notEqual(await Promise.race([intercepted,new Promise(r=>{watch=setTimeout(()=>r(timeoutToken),30000);})]),timeoutToken,'Cold attack texture was not requested');}
  finally{clearTimeout(watch);}
  assert(!finished);const incoming=await read();
  await wait(prev=>__hdSlotQA.raceRead().damage>prev,incoming.damage);
  // Record displacement from ordinary key input while this exact HTTP
  // response is still withheld. Stop auto-hunt to isolate that input.
  await page.locator('#autoToggle').click();const at=await read();
  await page.keyboard.down('w');
  try{await wait(p=>Math.hypot(__hdSlotQA.raceRead().x-p.x,__hdSlotQA.raceRead().y-p.y)>2,at);}
  finally{await page.keyboard.up('w');}
  const moved=await read();
  await page.evaluate(()=>__hdSlotQA.target('north'));await page.locator('#autoToggle').click();
  // Click through the real inventory on an active attack frame. Entering
  // and leaving the menu between animation frames keeps this deterministic.
  const swap=await wait(({old,next,fixed})=>{
   const state=__hdSlotQA.raceRead();if(!state.active)return false;
   const item=__hdSlotQA.read().available.find(r=>r.def===next);if(!item)throw Error('Replacement is missing');
   const tap=s=>{const b=document.querySelector(s);if(!b)throw Error('Missing inventory control '+s);b.click();};
   tap('#mainMenu [data-panel="inventory"]');tap('[data-item="'+item.id+'"]');tap('[data-equip="'+item.id+'"]');
   if(document.querySelector('[data-confirm-accept]')?.offsetParent)tap('[data-confirm-accept]');
   tap('[data-close-panel]');__hdSlotQA.raceExpect(next,fixed);const after=__hdSlotQA.raceRead();
   return {before:state.actor,after:after.actor,activeBefore:state.active,activeAfter:after.active};
  },{old,next,fixed});
  assert.deepEqual(swap,{before:old,after:next,activeBefore:true,activeAfter:true});
  const ready=await wait(id=>{const m=__hdSlotQA.raceRead();return m.actor===id&&m.draws>0&&m.current?m:false;},next);
  assert(!finished,'Old request was released before the new outfit drew');assert.equal(hitsB,1,'Replacement should decode once');
  const newSource=ready.current,checkpoint=ready.drawnAttacks;
  release();
  try{assert.notEqual(await Promise.race([delivered,new Promise(r=>{watch=setTimeout(()=>r(timeoutToken),20000);})]),timeoutToken,'Original network response failed to finish');}
  finally{clearTimeout(watch);}
  const warm=await wait(({count,next})=>{const q=__hdSlotQA.raceRead();return q.actor===next&&q.drawnAttacks>=count+2?q:false;},{count:checkpoint,next});
  assert.equal(warm.current,newSource);assert.equal(warm.stale,0);assert.equal(warm.legacy,0);assert.equal(warm.lostSlots,0);assert.equal(warm.blocked,0);
  assert.equal(hitsA,1);assert.equal(hitsB,1);assert(warm.damage>incoming.damage);
  const appearance=(await page.evaluate(()=>__hdSlotQA.read())).appearance;assert.deepEqual(appearance,savedLook);
  const result={weapon:fixed.weapon,action:'attack-focus',direction:'north',old,next,sourceOld:oldPath,sourceNew:newPath,
   coldRequests:hitsA,newRequests:hitsB,lateResponseCompleted:finished,swappedInAttack:swap.activeAfter,damageWhilePending:moved.damage-incoming.damage,
   movementWhilePending:Math.hypot(moved.x-at.x,moved.y-at.y),newOutfitDrawnBeforeRelease:true,warmAttacks:warm.drawnAttacks-checkpoint,
   staleDraws:warm.stale,lostSlots:warm.lostSlots,legacyDraws:warm.legacy,blockingScreens:warm.blocked,appearance};
  await fs.writeFile(path.join(out,'cache-combate.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 }finally{
  release();page.off('request',requests);page.off('requestfinished',finishedRequest);await page.unroute(routePattern,hold);
 }
};
