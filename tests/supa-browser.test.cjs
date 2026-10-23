'use strict';
// Run against a static preview or Python service. PLAYWRIGHT_MODULE may select a local installation.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const source=fs.readFileSync(path.join(__dirname,'../game.js'),'utf8');
const bridge=`  window.__supaQA={enterHunt,useFruitSkill,takeDamage,get game(){return game},get world(){return world},get session(){return session},get defs(){return itemDefs},stopAuto(){autoPlay=false;autoSkills=false;}};\n  window.__mareDiagnostics=`;

(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
  try{
    const context=await browser.newContext({viewport:{width:1440,height:900}});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.setDefaultTimeout(10000);
    // Expose private combat state only in this intercepted test response, never in published code.
    await page.route('**/game.js*',route=>route.fulfill({contentType:'application/javascript',body:source.replace('  window.__mareDiagnostics=',bridge)}));
    await page.goto(process.env.MARE_TEST_URL||'http://127.0.0.1:8130/',{waitUntil:'domcontentloaded'});
    await page.locator('#characterName').fill('Supa QA');
    await page.locator('#nextToClass').click();
    await page.locator('#createCharacter').click();
    await page.locator('#characterMenuTrigger').click();
    await page.locator('[data-character-section=akuma]').click();
    await page.locator('[data-akuma-rank=D]').click();
    await page.locator('[data-fruit-register=akuma_supa_supa]').click();
    await page.waitForFunction(()=>__mareDiagnostics().akuma.registered.includes('akuma_supa_supa'));
    await page.keyboard.press('Escape');
    await page.keyboard.press('i');
    const id=await page.evaluate(()=>__supaQA.game.inventory.find(item=>item.fruitId==='akuma_supa_supa').id);
    await page.locator('[data-item="'+id+'"]').click();
    assert.match(await page.locator('#dialogBody').innerText(),/Paramecia/);
    await page.locator('[data-equip="'+id+'"]').click();
    await page.waitForFunction(()=>__mareDiagnostics().akuma.equipped);
    assert.match(await page.locator('#skill1').getAttribute('aria-label'),/Espiral Cortante/);
    assert.match(await page.locator('#skill2').getAttribute('aria-label'),/Retaliação Metálica/);
    const cut=await page.evaluate(async()=>{
      const q=__supaQA;q.game.level=30;q.enterHunt();q.stopAuto();q.world.spawnClock=-1e9;q.game.hp=10000;q.game.energy=200;
      const p={...q.world.hero};
      const mob=(id,dx)=>({id,type:'helmeppo',alive:true,hp:1000,maxHP:1000,defense:0,level:8,area:q.game.area,x:p.x+dx,y:p.y,anchorX:p.x+dx,anchorY:p.y,bob:0,attackClock:999,speed:0,patrolClock:999});
      q.world.mobs=[mob('center',0),mob('edge',128),mob('outside',129)];
      const ok=await q.useFruitSkill(true,'1'),spent=q.session.skillEnergySpent,replay=await q.useFruitSkill(true,'1');
      return {ok,replay,spent,physical:__mareDiagnostics().stats.physical,mobs:q.world.mobs.map(m=>({id:m.id,hp:m.hp})),indices:q.defs.slice(67).map(d=>d.name)};
    });
    assert.equal(cut.ok,true);assert.equal(cut.replay,false);assert.equal(cut.spent,20);
    assert.equal(cut.mobs[0].hp,1000-Math.floor(cut.physical*1.3));
    assert.equal(cut.mobs[1].hp,cut.mobs[0].hp);assert.equal(cut.mobs[2].hp,1000);
    assert.deepEqual(cut.indices,['Katana da Maelstrom','Nodachi de Kairouseki','Nodachi de Fogo','Meito: Ame no Habakiri','Adaga de Cristal','Punhal de Netuno','Punhal Flamejante','Lâmina das Trevas','Supa Supa no Mi']);
    await page.evaluate(()=>{
      __supaQA.world.mobs=[];window.supaDraws=[];
      const original=CanvasRenderingContext2D.prototype.drawImage;
      CanvasRenderingContext2D.prototype.drawImage=function(...args){
        if(args[0]?.src?.split('?')[0].endsWith('/spiral-ward.png')){supaDraws.push({x:args[5],y:args[6],sx:args[1],sy:args[2]});if(supaDraws.length>100)supaDraws.shift();}
        return original.apply(this,args);
      };
    });
    await page.locator('#skill2').click();
    await page.waitForFunction(()=>__mareDiagnostics().akuma.shieldActive&&supaDraws.length>2);
    const protection=await page.evaluate(()=>{
      const q=__supaQA,random=Math.random;Math.random=()=>1;
      const attacker={id:'attacker',type:'helmeppo',alive:true,hp:10000,maxHP:10000,x:q.world.hero.x+10,y:q.world.hero.y};
      const stats=__mareDiagnostics().stats,hp=q.game.hp;
      q.takeDamage(100,attacker,true);
      const physical={received:hp-q.game.hp,reflected:10000-attacker.hp};
      const hp2=q.game.hp,attackerHP=attacker.hp;q.takeDamage(100,attacker,false);
      const magical={received:hp2-q.game.hp,reflected:attackerHP-attacker.hp};
      const hp3=q.game.hp;q.takeDamage(100,attacker,true,true);
      const direct=hp3-q.game.hp;
      Math.random=()=>0;const hp4=q.game.hp,attackerHP2=attacker.hp;q.takeDamage(100,attacker,true);
      const evaded={received:hp4-q.game.hp,reflected:attackerHP2-attacker.hp};
      Math.random=random;
      const first={...supaDraws.at(-1)};q.world.hero.x+=20;q.world.hero.y+=10;
      return {physical,magical,direct,evaded,first,spent:q.session.skillEnergySpent,expected:MareCharacters.incoming(stats,100,false,1.1)*.6,until:q.session.supaShieldUntil};
    });
    assert.ok(Math.abs(protection.physical.received-Math.floor(protection.expected))<1e-6,JSON.stringify(protection));
    assert.equal(protection.physical.reflected,30);assert.equal(protection.magical.reflected,0);
    assert.equal(protection.direct,100);assert.deepEqual(protection.evaded,{received:0,reflected:0});assert.equal(protection.spent,45);
    await page.waitForFunction(first=>supaDraws.at(-1).x===first.x+20&&supaDraws.at(-1).y===first.y+10,protection.first);
    await page.waitForFunction(()=>new Set(supaDraws.map(f=>f.sx+':'+f.sy)).size>=4);
    if(process.env.MARE_QA_DIR){fs.mkdirSync(process.env.MARE_QA_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.MARE_QA_DIR,'supa-shield.png')});}
    await page.waitForFunction(()=>!__mareDiagnostics().akuma.shieldActive,null,{timeout:6000});
    const expired=await page.evaluate(()=>{
      const q=__supaQA,random=Math.random;Math.random=()=>1;const attacker={id:'expired',type:'helmeppo',alive:true,hp:10000,maxHP:10000};q.takeDamage(100,attacker,true);Math.random=random;
      return {reflected:10000-attacker.hp,remaining:q.game.fruitCooldowns['akuma_supa_supa:2']-Date.now()};
    });
    assert.equal(expired.reflected,0);assert.ok(expired.remaining>10000);assert.deepEqual(errors,[]);
    console.log('Supa browser: Rank D registration, bag/equipment, both HUD icons, save indices, AoE boundary, 130% damage, costs, cooldowns, physical/magic/direct/evaded hits, following animated shield and 5s expiration passed.');
    await context.close();
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
