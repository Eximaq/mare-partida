'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),{chromium}=require('playwright');
const origin=process.argv.find(s=>/^https?:/.test(s))||'http://127.0.0.1:8159/dist/';
const out=process.argv.find(s=>s.startsWith('--evidence='))?.slice(11),gameOnly=process.argv.includes('--game-only'),materialsOnly=process.argv.includes('--materials-only');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{
 const errors=[];if(out)await fs.mkdir(out,{recursive:true});
 if(!gameOnly){const p=await browser.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.text().startsWith('headgear-progress:'))console.log(m.text());});
  await p.goto(new URL('tools/paper-doll-96-v3/',origin).href);await p.waitForFunction(()=>window.__review96v3);
  const audit=await p.evaluate(async()=>{const q=__review96v3,issues=[],counts={poses:0,helmetHairIndependence:0,hiddenMatchesUnequipped:0,bandanaHairWitnesses:0},read=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
   const same=(a,b)=>a.width===b.width&&a.height===b.height&&read(a).every((v,i)=>v===readCached(b)[i]);let lastCanvas,lastPixels;function readCached(c){if(lastCanvas!==c){lastCanvas=c;lastPixels=read(c);}return lastPixels;}
   for(const body of ['masculino','feminino'])for(const action of Object.keys(q.manifest.bodies[body].clips))for(const dir of ['south','north','east','west']){
    const clip=q.manifest.bodies[body].clips[action][dir];if(!clip)continue;
    for(let frame=0;frame<clip.frames;frame++){
     const look={hair:'hair-spiky',face:'face-calm',hairColor:'brown',skin:frame%2?'ebony':'light',head:'item-19',torso:'item-6',pants:'item-21',boots:'item-8',gloves:'item-25',cloak:frame%2?'item-24':'item-23'};
     const render=l=>q.render(body,action,dir,frame,[],l),visible=await render(look),other=await render({...look,hair:'hair-long',hairColor:'pink'}),hidden=await render({...look,hideHeadgear:true}),bare=await render({...look,head:'original'});
     if(!same(visible,other))issues.push({kind:'hair-through-helmet',body,action,dir,frame});else counts.helmetHairIndependence++;
     if(!same(hidden,bare))issues.push({kind:'hidden-not-restored',body,action,dir,frame});else counts.hiddenMatchesUnequipped++;
     const bandana=await render({...look,head:'item-18'}),bandanaBald=await render({...look,head:'item-18',hair:'none'});if(!same(bandana,bandanaBald))counts.bandanaHairWitnesses++;
     counts.poses++;if(counts.poses%80===0)console.log('headgear-progress:'+counts.poses);if(issues.length>10)return {counts,issues};
    }
   }
   return {counts,issues};
  });assert.deepEqual(audit.issues,[]);assert(audit.counts.poses>=416);assert(audit.counts.bandanaHairWitnesses>0);console.log(JSON.stringify({audit}));
  if(out){await fs.writeFile(path.join(out,'audit.json'),JSON.stringify(audit,null,2));const captures=await p.evaluate(async()=>{const q=__review96v3,rows=[];for(const body of ['masculino','feminino'])for(const dir of ['south','north','east','west'])for(const state of ['bare','visible','hidden','bandana']){const look={hair:'hair-wavy',face:'face-calm',skin:'light',hairColor:'brown',head:state==='bandana'?'item-18':state==='bare'?'original':'item-19',hideHeadgear:state==='hidden',torso:'item-6',pants:'item-21',boots:'item-8',cloak:'item-23'};const c=await q.render(body,'walk',dir,3,[],look);rows.push({name:[body,dir,state].join('-'),data:c.toDataURL()});}return rows;});for(const c of captures)await fs.writeFile(path.join(out,c.name+'.png'),Buffer.from(c.data.split(',')[1],'base64'));}
  await p.close();
 }
 if(!materialsOnly){const game=await browser.newPage({viewport:{width:1366,height:900}}),scriptRequests=[];game.on('pageerror',e=>errors.push(e.message));game.on('request',r=>{if(r.url().includes('/paper-doll-96-v3/wardrobe.js'))scriptRequests.push(r.url());});
  await game.route('**/api/akuma/catalog',r=>r.fulfill({status:404,body:'{}'}));await game.route('**/__dev_version',r=>r.fulfill({body:'stable'}));
  await game.route('**/game.js*',async route=>{const response=await route.fetch(),source=await response.text(),hook=`window.__headQA={get g(){return game},get r(){return lobby96},stats:getDerived,open(){openPanel('inventory')},close:closePanel,save:saveGame,draw:presentWorld,portrait:renderPortrait,enterHunt,returnLobby,pause(){autoPlay=false;autoSkills=false;keys.clear()},async equip(id){const item=newItem(itemDefs[id],1,false);game.inventory.push(item);equipItem(item.id);if(!await lobby96.ensure(game))throw Error('Native composition failed: '+lobby96.snapshot().message);return game.equipment.head?.def},async remove(){unequip('head');await lobby96.ensure(game)},state(){return {head:game.equipment.head,inventory:game.inventory,stats:getDerived(),hidden:MareHeadgear.hidden(game),portrait:$('portrait').toDataURL(),preview:$('inventorySprite')?.toDataURL(),save:localStorage.getItem(STORAGE_KEY)}}};`;
   await route.fulfill({response,body:source.replace('  window.__mareDiagnostics=',hook+'\n  window.__mareDiagnostics=').replaceAll('requestAnimationFrame(frame)','window.__testFrame=frame')});});
  await game.goto(origin,{waitUntil:'networkidle'});await game.waitForFunction(()=>window.__headQA&&__mareDiagnostics().lobby96.state==='ready');
  const oldRevision=require('../tools/paper-doll-96-v3/manifest.json').visualRevision+'-'+require('../tools/paper-doll-96-v3/weapons.json').revision;
  assert(scriptRequests.length&&scriptRequests.every(u=>new URL(u).searchParams.get('revision')!==oldRevision),'updated compositor must invalidate the previous dynamic script cache');
  await game.locator('#characterName').fill('Capacetes96');await game.locator('#nextToClass').click();await game.locator('#nextToAppearance').click();await game.locator('#createCharacter').click();await game.locator('[data-confirm-accept]').click();await game.waitForFunction(()=>__headQA.g);await game.evaluate(async()=>{__headQA.pause();await __headQA.r.ensure(__headQA.g);});
  assert.equal(await game.evaluate(()=>__headQA.r.snapshot().enabled),true,'native96 enabled without query');
  const results=[];
  for(const body of ['masculino','feminino'])for(const id of [18,19]){
   await game.evaluate(async({body,id})=>{const q=__headQA;q.g.appearance96={...MareCharacterAppearance.read(q.g),gender:body};q.r.setDraft('body',body);q.r.setDraft('kit','equipped');q.r.apply(q.g);await q.equip(id);q.open();q.portrait();},{body,id});
   const before=await game.evaluate(()=>__headQA.state());assert.equal(before.head.def,id);
   const toggle=()=>game.locator('[data-headgear-visibility]').click();await toggle();
   const hidden=await game.evaluate(()=>__headQA.state());assert.equal(hidden.hidden,true);assert.deepEqual(hidden.head,before.head);assert.deepEqual(hidden.inventory,before.inventory);assert.deepEqual(hidden.stats,before.stats);assert(hidden.portrait!==before.portrait,'head visibility must change the portrait');assert.equal(JSON.parse(hidden.save).preferences.hideHeadgear,true);
   assert.equal(await game.locator('[data-headgear-visibility]').getAttribute('aria-label'),'Mostrar capacete');
   await game.evaluate(()=>{__headQA.close();__headQA.open();});assert.equal(await game.locator('[data-headgear-visibility]').getAttribute('aria-pressed'),'false');
   for(let i=0;i<10;i++)await toggle();assert.equal(await game.evaluate(()=>__headQA.state().hidden),true);
   await toggle();const restored=await game.evaluate(()=>__headQA.state());assert.equal(restored.hidden,false);assert(restored.portrait===before.portrait,'restoring headgear restores the same portrait');assert.deepEqual(restored.stats,before.stats);
   if(out)await game.screenshot({path:path.join(out,'inventory-'+body+'-'+id+'.png')});
   await game.evaluate(()=>{__headQA.close();__headQA.enterHunt();__headQA.pause();__headQA.draw();});assert.equal(await game.evaluate(()=>__mareDiagnostics().lobby96.lastPose.body),body);await game.evaluate(()=>__headQA.returnLobby());results.push({body,id,immutable:true,rapidToggles:10});
  }
  await game.evaluate(()=>__headQA.open());await game.locator('[data-headgear-visibility]').click();await game.reload({waitUntil:'networkidle'});await game.waitForFunction(()=>window.__headQA&&__headQA.g&&__mareDiagnostics().lobby96.state==='ready');assert.equal(await game.evaluate(()=>__headQA.state().hidden),true);
  await game.evaluate(async()=>{await __headQA.r.ensure(__headQA.g);__headQA.open();});assert.equal(await game.locator('[data-headgear-visibility]').getAttribute('aria-label'),'Mostrar capacete');
  await game.evaluate(()=>{window.__originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw Error('simulated storage full')};});await game.locator('[data-headgear-visibility]').click();assert.equal(await game.evaluate(()=>__headQA.state().hidden),true);await game.evaluate(()=>{Storage.prototype.setItem=window.__originalSetItem;});
  await game.evaluate(async()=>{await __headQA.remove();__headQA.open();});assert(await game.locator('[data-headgear-visibility]').isDisabled());
  await game.evaluate(async()=>{await __headQA.equip(19);__headQA.open();});
  for(const [width,height]of [[393,852],[1366,900]]){
   await game.setViewportSize({width,height});const button=game.locator('.op-avatar-stage [data-headgear-visibility]');await button.scrollIntoViewIfNeeded();const box=await button.boundingBox(),stage=await game.locator('.op-avatar-stage').boundingBox();assert(box&&stage&&box.width>=32&&box.height>=32&&box.x>=0&&box.x+box.width<=width);assert(Math.abs(stage.x+stage.width-box.x-box.width-8)<=2,'right corner');assert(Math.abs(stage.y+stage.height-box.y-box.height-8)<=2,'bottom corner');assert(await game.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.equal(await button.locator('svg').count(),1);const icon=await button.locator('svg').boundingBox();assert(icon&&icon.width>=20&&icon.height>=20,'eye icon must not shrink under shared button styles');if(out)await game.screenshot({path:path.join(out,'eye-'+width+'.png')});
  }
  const keyButton=game.locator('[data-headgear-visibility]');const keyBefore=await game.evaluate(()=>__headQA.state().hidden);await keyButton.focus();await game.keyboard.press('Enter');assert.equal(await game.evaluate(()=>__headQA.state().hidden),!keyBefore);await game.keyboard.press('Space');assert.equal(await game.evaluate(()=>__headQA.state().hidden),keyBefore);
  const normalSave=await game.evaluate(()=>localStorage.getItem('mare-partida-save-v1'));
  await game.goto(new URL('?dev=1',origin).href,{waitUntil:'networkidle'});await game.waitForFunction(()=>window.__mareDiagnostics&&__mareDiagnostics().lobby96.state==='ready');assert.equal(await game.evaluate(()=>__mareDiagnostics().lobby96.enabled),true);assert.equal(await game.evaluate(()=>localStorage.getItem('mare-partida-save-v1')),normalSave);
  await game.route('**/tools/paper-doll-96-v3/player-pack.json',r=>r.fulfill({status:503,body:'{}'}));await game.goto(origin,{waitUntil:'networkidle'});await game.waitForFunction(()=>window.__headQA&&__mareDiagnostics().lobby96.state==='failed');await game.evaluate(()=>{__headQA.portrait();window.__testFrame(performance.now())});assert.equal(await game.evaluate(()=>__mareDiagnostics().paperDollReview.state),'retired');assert.equal(await game.evaluate(()=>__mareDiagnostics().paperDollReview.draws),0);assert(await game.locator('#playerVisualStatus').isVisible());
  await game.unroute('**/tools/paper-doll-96-v3/player-pack.json');await game.route('**/tools/paper-doll-96-v3/player-pack.json',r=>r.fulfill({status:200,body:'null'}));await game.goto(origin,{waitUntil:'networkidle'});await game.waitForFunction(()=>window.__headQA&&__mareDiagnostics().lobby96.state!=='loading');assert.equal(await game.evaluate(()=>__mareDiagnostics().lobby96.state),'failed','null release must not bypass production approval');
  assert.deepEqual(errors,[]);console.log(JSON.stringify({inventory:results,reload:true,storageRollback:true,emptySlot:true,errors}));if(out)await fs.writeFile(path.join(out,'game.json'),JSON.stringify({results,reload:true,storageRollback:true,errors},null,2));await game.close();
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
