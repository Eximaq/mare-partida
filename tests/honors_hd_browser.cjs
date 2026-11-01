'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{
 const page=await browser.newPage({viewport:{width:1448,height:1086}}),errors=[];
 page.on('pageerror',e=>{errors.push(e.message);console.error('Browser error:',e.stack)});
 const source=fs.readFileSync(path.join(__dirname,'../game.js'),'utf8');
 const hook="  window.__honorsQA={get game(){return game},set game(v){game=v},open:openPanel,close:closePanel,update:updateUI,save:saveGame,sync:syncHierarchy,stats:getDerived,promote:promoteHierarchy};window.__mareDiagnostics=";
 await page.route('**/game.js*',r=>r.fulfill({contentType:'application/javascript',body:source.replace('  window.__mareDiagnostics=',hook)}));
 await page.goto(process.env.MARE_TEST_URL);await page.waitForFunction(()=>window.__honorsQA);
 await page.locator('#characterName').fill('Papacapim');await page.locator('#nextToClass').click();await page.locator('#nextToAppearance').click();await page.locator('#createCharacter').click();await page.locator('[data-confirm-accept]').click();await page.waitForFunction(()=>__honorsQA.game);
 await page.evaluate(()=>{const q=__honorsQA,g=q.game;g.level=43;g.stats.kills=2040;g.stats.goldEarned=100000;g.impelDown.cleared=8;q.update();});await page.evaluate(()=>__honorsQA.sync());
 const open=async s=>page.evaluate(s=>__honorsQA.open('character',s),s);
 await open('achievements');await page.evaluate(()=>document.fonts.ready);
 const global=await page.locator('[data-achievement-total]').textContent(),points=await page.locator('[data-achievement-points]').textContent();
 assert.equal(points,'0 PT');
 for(const cat of await page.locator('[data-achievement-category]').evaluateAll(es=>es.map(e=>e.dataset.achievementCategory))){await page.locator('[data-achievement-category="'+cat+'"]').click();assert.equal(await page.locator('[data-achievement-total]').textContent(),global);}
 await page.locator('[data-achievement-category=all]').click();
 await page.locator('[data-achievement-claim="kills-0"]').evaluate(b=>{b.dispatchEvent(new MouseEvent('click',{bubbles:true}));b.dispatchEvent(new MouseEvent('click',{bubbles:true}));});
 assert.equal(await page.locator('[data-achievement-points]').textContent(),'1 PT');
 assert.equal(await page.locator('[data-achievement-claim="kills-0"]').count(),0);
 assert.equal(await page.locator('[data-achievement-id="kills-0"] .achievement-state').textContent(),'Resgatado');
 assert.equal(await page.evaluate(()=>__honorsQA.game.achievements.claimed.filter(id=>id==='kills-0').length),1);
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('mare-partida-save-v1')));
 assert(saved.achievements.claimed.includes('kills-0'));
 // A failed storage write cannot mark the next reward claimed.
 await page.evaluate(()=>{window.__originalStorageSet=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='mare-partida-save-v1')throw new DOMException('QA storage full','QuotaExceededError');return __originalStorageSet.call(this,k,v)};});
 await page.locator('[data-achievement-claim="kills-1"]').click();
 assert(!(await page.evaluate(()=>__honorsQA.game.achievements.claimed)).includes('kills-1'));
 await page.evaluate(()=>Storage.prototype.setItem=__originalStorageSet);
 assert(await page.locator('[data-achievement-claim="kills-1"]').isEnabled());
 // Promotion uses the real service and a guarded confirmation.
 await page.route('**/api/hierarchy/sync',async r=>{await new Promise(res=>setTimeout(res,450));await r.continue();});
 await open('hierarchy');assert(await page.locator('[data-hierarchy-promote]').isDisabled(),'promotion waits for authoritative tier validation');await page.waitForFunction(()=>document.querySelector('.hierarchy-rank-row'));await page.unroute('**/api/hierarchy/sync');
 assert(await page.locator('[data-hierarchy-promote]').isEnabled());
 await page.locator('[data-hierarchy-promote]').click();await page.locator('[data-confirm-accept]').click();
 await page.waitForFunction(()=>__honorsQA.game.hierarchyTier===2);
 assert.equal(await page.locator('#hudHierarchyTitle').textContent(),'Pirata Promissor');
 assert(await page.locator('[data-hierarchy-promote]').isDisabled());
 const permanent=await page.evaluate(()=>JSON.stringify({faction:__honorsQA.game.factionId,tier:__honorsQA.game.hierarchyTier,attributes:__honorsQA.game.attributes,equipment:__honorsQA.game.equipment,look:__honorsQA.game.characterAppearance}));
 const factions=['pirate','marine','revolutionary','government'];
 for(const f of factions){await page.locator('[data-hierarchy-faction="'+f+'"]').click();await page.waitForFunction(()=>!document.querySelector('.hierarchy-board-status')?.textContent.includes('Consultando'));
  assert.equal(await page.locator('.hierarchy-rank-row').count(),f==='pirate'?1:0);
  for(let tier=1;tier<=8;tier++){await page.locator('[data-hierarchy-tier-select]').selectOption(String(tier));assert.equal(await page.locator('.hierarchy-title-pair [data-rank-art]').first().getAttribute('data-rank-art'),f+':'+tier);assert(await page.locator('.hierarchy-title-plate').evaluateAll(es=>es.every(e=>[...e.children].every(c=>{const a=c.getBoundingClientRect(),b=e.getBoundingClientRect();return a.top>=b.top-1&&a.bottom<=b.bottom+1&&a.right<=b.right+1}))),f+' title art fits '+tier);}
  assert.equal(await page.evaluate(()=>JSON.stringify({faction:__honorsQA.game.factionId,tier:__honorsQA.game.hierarchyTier,attributes:__honorsQA.game.attributes,equipment:__honorsQA.game.equipment,look:__honorsQA.game.characterAppearance})),permanent);
 }
 // A delayed pirate response cannot overwrite the selected marine board.
 let delayed=false;
 await page.route('**/api/hierarchy/ranking*',async r=>{if(r.request().url().endsWith('faction=pirate')){delayed=true;await new Promise(res=>setTimeout(res,600));}await r.continue().catch(()=>{});});
 await page.locator('[data-hierarchy-faction=pirate]').click();await page.locator('[data-hierarchy-faction=marine]').click();await page.waitForTimeout(850);
 assert(delayed);assert((await page.locator('.hierarchy-board h2').textContent()).includes('Marinha'));assert.equal(await page.locator('.hierarchy-rank-row').count(),0);
 await page.unroute('**/api/hierarchy/ranking*');
 await page.locator('[data-hierarchy-faction=pirate]').click();await page.waitForFunction(()=>document.querySelector('.hierarchy-rank-row'));
 await page.locator('[data-hierarchy-scope=all]').click();await page.waitForFunction(()=>document.querySelector('.hierarchy-board h2').textContent.includes('Todos')&&document.querySelector('.hierarchy-rank-row'));
 assert.equal(await page.locator('.hierarchy-rank-row').count(),1);
 await page.waitForFunction(()=>document.querySelectorAll('#toastContainer .toast').length===0);
 // Capture the actual game in the reference dimensions, using this isolated player only.
 await page.locator('[data-hierarchy-scope=faction]').click();
 await page.waitForTimeout(300);
 for(const f of factions){await page.locator('[data-hierarchy-faction="'+f+'"]').click();await page.waitForFunction(()=>!document.querySelector('.hierarchy-board-status')?.textContent.includes('Consultando'));await page.screenshot({path:process.env.MARE_QA_DIR+'/hierarchy-'+f+'.png'});}
 await open('achievements');await page.waitForTimeout(200);await page.screenshot({path:process.env.MARE_QA_DIR+'/achievements.png'});
 const matrix=[[1920,1080],[1366,768],[1280,720],[1024,768],[393,852],[360,800],[320,568],[844,390]];
 for(const [width,height]of matrix){await page.setViewportSize({width,height});
  for(const s of ['achievements','hierarchy']){await open(s);if(s==='hierarchy'){await page.locator('[data-hierarchy-faction=government]').click();await page.locator('[data-hierarchy-tier-select]').selectOption('7');}await page.waitForTimeout(150);
   const layout=await page.evaluate(()=>{const b=document.querySelector('#dialogBody'),p=document.querySelector('.dialog'),r=document.querySelector('#closePanel').getBoundingClientRect();const rect=e=>e.getBoundingClientRect();
    const clips=[...b.querySelectorAll('.achievement-entry')].filter(e=>[...e.children].some(c=>rect(c).bottom>rect(e).bottom+1||rect(c).right>rect(e).right+1)).map(e=>e.dataset.achievementId);
    return {overflow:b.scrollWidth>b.clientWidth+2,close:r.right>innerWidth||r.bottom>innerHeight,broken:[...document.querySelectorAll('img')].filter(i=>i.complete&&!i.naturalWidth).map(i=>i.src),clips};});
   assert(!layout.overflow,s+' overflow at '+width);assert(!layout.close);assert.deepEqual(layout.broken,[]);assert.deepEqual(layout.clips,[],s+' card clips at '+width);
   await page.screenshot({path:process.env.MARE_QA_DIR+'/'+s+'-'+width+'.png'});
  }
 }
 await page.setViewportSize({width:1448,height:1086});await open('hierarchy');await page.waitForTimeout(200);
 // Populate only the temporary service with explicit QA records to verify a full board.
 const post=async data=>page.request.post(new URL('/api/hierarchy/sync',process.env.MARE_TEST_URL).href,{data});
 for(let i=0;i<12;i++){assert((await post({player_id:'qa-pirate-'+i,name:'QA Pirata '+i,faction:'pirate',level:999,power:1000000000,class_id:'sword'})).ok());for(const expected_tier of [1,2])assert((await page.request.post(new URL('/api/hierarchy/promote',process.env.MARE_TEST_URL).href,{data:{player_id:'qa-pirate-'+i,expected_tier}})).ok());assert((await post({player_id:'qa-marine-'+i,name:'QA NomeExtremamenteLongoDosMares '+i,faction:'marine',level:99,power:1000000000,class_id:'healer'})).ok());}
 await page.locator('[data-hierarchy-faction=marine]').click();await page.waitForFunction(()=>document.querySelectorAll('.hierarchy-rank-row').length===10);
 assert((await page.locator('.hierarchy-ranking').textContent()).includes('QA NomeExtremamente'));
 assert(!(await page.locator('.hierarchy-ranking').textContent()).includes('QA Pirata'));
 await page.locator('[data-hierarchy-faction=pirate]').click();await page.waitForFunction(()=>document.querySelectorAll('.hierarchy-rank-row').length===10);
 assert(!(await page.locator('.hierarchy-ranking').textContent()).includes('Papacapim'),'current player is not pinned above higher ranks');
 for(const width of [1280,393]){await page.setViewportSize({width,height:852});await page.locator('[data-hierarchy-faction=marine]').click();await page.waitForFunction(()=>document.querySelectorAll('.hierarchy-rank-row').length===10);
 const overflow=await page.evaluate(()=>[...document.querySelectorAll('.hierarchy-rank-row')].some(r=>r.scrollWidth>r.clientWidth+2));assert(!overflow,'large ranking names and power fit '+width);await page.screenshot({path:process.env.MARE_QA_DIR+'/ranking-qa-full-'+width+'.png'});}
 await page.setViewportSize({width:1448,height:1086});
 await page.route('**/api/hierarchy/ranking*',r=>r.fulfill({status:503,contentType:'application/json',body:'{"error":"QA unavailable"}'}));
 await page.locator('[data-hierarchy-faction=government]').click();await page.waitForFunction(()=>document.querySelector('.hierarchy-board-status')?.textContent.includes('indisponível'));
 assert.equal(await page.locator('.hierarchy-rank-row').count(),0);
 await page.screenshot({path:process.env.MARE_QA_DIR+'/ranking-unavailable.png'});
 await page.unroute('**/api/hierarchy/ranking*');
 // Locked high tiers stay locked. This only alters the temporary test character.
 await page.evaluate(()=>{__honorsQA.game.level=200;__honorsQA.update();});await page.evaluate(()=>__honorsQA.sync());const playerId=await page.evaluate(()=>__honorsQA.game.hierarchyPlayerId);for(const expected_tier of [2,3,4])assert((await page.request.post(new URL('/api/hierarchy/promote',process.env.MARE_TEST_URL).href,{data:{player_id:playerId,expected_tier}})).ok());await page.evaluate(()=>__honorsQA.sync());assert.equal(await page.evaluate(()=>__honorsQA.game.hierarchyTier),5);
 await open('hierarchy');assert(await page.locator('[data-hierarchy-promote]').isDisabled());assert((await page.locator('.hierarchy-locked').textContent()).includes('itens especiais'));
 await page.evaluate(()=>__honorsQA.save());
 await page.reload();await page.waitForFunction(()=>window.__honorsQA&&__honorsQA.game);
 await open('achievements');assert.equal(await page.locator('[data-achievement-points]').textContent(),'1 PT');
 assert.equal(await page.locator('[data-achievement-claim="kills-0"]').count(),0);
 await page.keyboard.press('Escape');assert(await page.locator('#panelOverlay').evaluate(e=>e.classList.contains('hidden')));
 assert.deepEqual(errors,[]);
 console.log('Honors HD: categories, summary, single claim, failed save, live API promotion, 32 ranks, four faction queries, delayed response, global ranking, offline state, persistence and eight viewports passed.');
 }finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
