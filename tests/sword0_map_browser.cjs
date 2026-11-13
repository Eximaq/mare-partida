'use strict';
// Published-index regression: no image/index interception.
// Fixture supplies an unequipped item; equip and movement are real UI actions.
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),{chromium}=require('playwright');
const url=process.env.MARE_TEST_URL,out=process.env.MARE_EVIDENCE_DIR;
(async()=>{await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH}),context=await browser.newContext({viewport:{width:1600,height:1000},recordVideo:{dir:path.join(out,'video'),size:{width:1280,height:800}}}),page=await context.newPage(),errors=[],evidence=[];
page.on('pageerror',e=>errors.push(e.message));
await page.route('**/game.js*',async route=>{const response=await route.fetch(),source=await response.text();assert(source.includes('  window.__mareDiagnostics='));await route.fulfill({response,body:source.replace('  window.__mareDiagnostics=',"window.__sword0Frames=[];const __sword0Draw=lobby96.draw.bind(lobby96);lobby96.draw=function(ctx,p,o){const ok=__sword0Draw(ctx,p,o);if(o.consumer==='world'&&ctx.canvas.id==='worldCanvas'){const snap=lobby96.snapshot(),r=snap.nativeHD?.last;window.__sword0World=snap.renderer==='native-hd'?r:snap.defaultHD?.last;if(r?.state==='rendered'&&r.consumer==='world'&&!window.__sword0Frames.some(x=>x.frame===r.frame&&x.source===r.source))window.__sword0Frames.push({source:r.source,frame:r.frame,action:r.action,direction:r.direction,state:r.state});}return ok;};window.__sword0QA={seed(gender){game.appearance96={version:1,skinStyle:'natural',gender,hairStyle:'original',hairColor:'original',eyeStyle:'original',eyeColor:'original',skinColor:'original'};game.equipment={};game.inventory=[0].map(id=>newItem(itemDefs[id],1,false));game.classId='sword';autoPlay=false;autoSkills=false;keys.clear();saveGame();renderPanel();updateUI();},read(){return JSON.parse(JSON.stringify({frames:window.__sword0Frames,hero:{x:world.hero.x,y:world.hero.y},world:window.__sword0World,appearance:game.appearance96,equipment:game.equipment,inventory:game.inventory,render:lobby96.snapshot(),damage:game.stats.damage,pose:basicAttackPose(),target:world.target?{hp:world.target.hp,x:world.target.x,y:world.target.y}:null}));},async encounter(direction){const vector={south:[0,65],north:[0,-65],east:[65,0],west:[-65,0]}[direction];window.__sword0Frames=[];cancelBasicAttack();enterHunt();autoPlay=false;autoSkills=false;keys.clear();const deadline=performance.now()+90000;while(mapArtState()!=='ready'){if(performance.now()>deadline)throw Error('Map did not become ready');await new Promise(r=>setTimeout(r,50));}world.spawnClock=1e9;const nav=navigator();let at;for(let y=Math.max(192,activeMap().spawn.y-64);y<nav.map.height-192&&!at;y+=16)for(let x=Math.max(192,activeMap().spawn.x-64);x<nav.map.width-192&&!at;x+=16)if(nav.clear({x,y},{x:x+vector[0],y:y+vector[1]})&&nav.clear({x,y},{x:x-vector[0],y:y-vector[1]})&&combatLine({x,y},{x:x+vector[0],y:y+vector[1]}))at={x,y};if(!at)throw Error('No SOUTH combat lane');Object.assign(world.hero,at);const m={...monsterTypes.cesar,id:'pants22-qa',type:'cesar',area:game.area,district:MareHunt.sectors(game.area)[0].id,level:1,alive:true,hp:100000,maxHP:100000,defense:0,magicDefense:0,x:at.x+vector[0],y:at.y+vector[1],anchorX:at.x+vector[0],anchorY:at.y+vector[1],attack:0,attackClock:1e9,speed:0,patrolClock:1e9,aggro:0,bob:0};world.mobs=[m];world.target=null;game.hp=getDerived().maxHP;camera.update(world.hero,activeMap(),0,true);return {target:camera.worldToScreen(m.x,m.y),retreat:camera.worldToScreen(at.x-vector[0],at.y-vector[1])};},get ready(){return mapArtState()==='ready'}};"+'  window.__mareDiagnostics=')});});
async function read(){return page.evaluate(()=>__sword0QA.read());}
try{
await page.goto(url,{waitUntil:'networkidle',timeout:120000});await page.locator('#characterName').fill('Sword QA');await page.locator('#nextToClass').click();await page.locator('#nextToAppearance').click();await page.locator('#createCharacter').click();await page.locator('[data-confirm-accept]').click();
async function clickMap(point){const size=await page.locator('#worldCanvas').evaluate(c=>({width:c.width,height:c.height})),box=await page.locator('#worldCanvas').boundingBox();await page.locator('#worldCanvas').click({position:{x:point.x*box.width/size.width,y:point.y*box.height/size.height}});}

for (const gender of ['masculino','feminino']) {
 await page.evaluate(g => __sword0QA.seed(g), gender);
 await page.locator('#mainMenu [data-panel="inventory"]').click();
 const id = (await read()).inventory.find(i => i.def === 0).id;
 await page.locator('[data-item="'+id+'"]').click();
 await page.locator('[data-equip="'+id+'"]').click();
 await page.locator('[data-close-panel]').click();
 assert.equal((await read()).equipment.weapon.def, 0);
 for (const [key,direction] of [['s','south'],['w','north'],['d','east'],['a','west']]) {
  const waitForPose = action => page.waitForFunction(({gender, direction, action}) => {
   const pose = __sword0QA.read().world;
   if (!pose || pose.state !== 'rendered' || pose.direction !== direction) return false;
   if (gender === 'feminino') return pose.source?.startsWith('female0-'+action+'-'+direction+'-');
   if (action === 'attack-sword') return pose.source?.startsWith('sword0-'+direction+'-');
   return pose.action === action && pose.source?.startsWith('carry0-');
  }, {gender,direction,action},{timeout:30000});
  await page.keyboard.down(key);
  try { await waitForPose('walk'); evidence.push({gender,direction,action:'walk',world:(await read()).world}); }
  finally { await page.keyboard.up(key); }
  await waitForPose('idle');
  evidence.push({gender,direction,action:'idle',world:(await read()).world});
  await page.screenshot({path:path.join(out,gender+'-'+direction+'.png')});
  const points = await page.evaluate(d => __sword0QA.encounter(d),direction);
  await clickMap(points.target);
  await waitForPose('attack-sword');
  evidence.push({gender,direction,action:'attack-sword',world:(await read()).world});
  await clickMap(points.retreat);
  await page.waitForTimeout(800);
 }
 await page.locator('#mainMenu [data-panel="inventory"]').click();
 await page.locator('[data-inv-slot="weapon"]').click();
 await page.locator('[data-unequip="weapon"]').click();
 await page.locator('[data-close-panel]').click();
 assert.equal((await read()).equipment.weapon ?? null, null);
}
assert.deepEqual(errors,[]);
await fs.writeFile(path.join(out,'runtime.json'),JSON.stringify({evidence,errors},null,2));
console.log('PASS sword0, both bodies, all directions, idle/walk/attack and inventory');
}catch(e){await fs.writeFile(path.join(out,'failure.json'),JSON.stringify({error:e.message,state:await read().catch(()=>null),evidence,errors},null,2));await page.screenshot({path:path.join(out,'failure.png')});throw e;}finally{await context.close();await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
