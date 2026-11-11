'use strict';
// Run against the demo with Playwright and MARE_TEST_URL, as with attack_speed_browser.cjs.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const source=fs.readFileSync(path.join(__dirname,'../game.js'),'utf8')
  .replace('function tick(dt){','function tick(dt){if(window.__orangeAudioQA?.paused)return;')
  .replace('  window.__mareDiagnostics=',`  window.__orangeAudioQA={
    enterHunt,heroAttack,useSkill,useFruitSkill,navigator,returnLobby,
    get game(){return game},get world(){return world},get session(){return session},
    equipSupa(){const fruitId='akuma_supa_supa';game.equipment.akuma_no_mi={id:'supa-qa',def:itemDefs.findIndex(d=>d.fruitId===fruitId),fruitId,plus:0,level:1};},
    stop(){autoPlay=false;autoSkills=false;world.spawnClock=1e9;world.mobs=[];world.target=null;},
    advance(dt){this.paused=false;try{tick(dt)}finally{this.paused=true}},
    move(key,frames){if(key)keys.add(key);try{for(let i=0;i<frames;i++)this.advance(.02);}finally{keys.clear()}},
    attackStep(dt){world.time+=dt;stepBasicAttack(dt);classCombatController()?.step(dt,{inCombat:true,direction:world.hero.direction});stepCombatVfx(dt);}
  };\n  window.__mareDiagnostics=`);

(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
  try{
    const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.addInitScript(()=>{
      window.orangeAudio={calls:[],played:[],failures:[]};
      const original=HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play=function(...args){
        const promise=original.apply(this,args),name=new URL(this.src,location.href).pathname.split('/').at(-1);
        if(this.src.includes('/assets/audio/orange-town/')){
          const entry={name,at:performance.now()};
          orangeAudio.calls.push(entry);
          promise.then(()=>orangeAudio.played.push({...entry,duration:this.duration}),e=>orangeAudio.failures.push({name,message:e.message}));
        }
        return promise;
      };
    });
    await page.route('**/game.js*',route=>route.fulfill({contentType:'application/javascript',body:source}));
    await page.goto(process.env.MARE_TEST_URL||'http://127.0.0.1:8138/',{waitUntil:'domcontentloaded'});
    await page.locator('#characterName').fill('Nauta Audio');
    for(const selector of ['#nextToClass','#nextToAppearance','#createCharacter','[data-confirm-accept]'])await page.locator(selector).click();
    await page.evaluate(()=>{
      const q=__orangeAudioQA;q.game.level=30;q.game.area='orange';q.enterHunt();q.stop();q.paused=true;
    });
    await page.waitForFunction(()=>MarePixelMapRenderer.stats().orange.loaded);
    assert.equal(await page.evaluate(()=>__mareDiagnostics().map.id),'orange');

    const cues=async(action,expected)=>{
      const start=await page.evaluate(()=>orangeAudio.calls.length);
      await page.evaluate(action);
      const calls=await page.evaluate(i=>orangeAudio.calls.slice(i).map(e=>e.name),start);
      assert.deepEqual(calls,expected);
      if(expected.length)await page.waitForFunction(n=>orangeAudio.played.length>=n,start+expected.length);
    };
    for(const [material,surface] of [['m','madeira'],['e','cimento'],['c','areia'],['g','grama']]){
      const result=await page.evaluate(({material,surface})=>{
        const q=__orangeAudioQA,{source}=MarePixelWorldMaps.orange,nav=q.navigator(),before=orangeAudio.calls.length;
        let p;
        for(let row=0;row<source.rows&&!p;row++)for(let col=0;col<source.columns&&!p;col++){
          if(source.terrain[row][col]!==material)continue;
          const x=col*64+32,y=row*64+32;
          if(nav.clear({x:x-16,y},{x:x+25,y}))p={x,y};
        }
        if(!p)throw Error('No walkable test tile for '+material);
        Object.assign(q.world.hero,{x:p.x-16,y:p.y,walking:0});
        q.move('d',Math.ceil(40/(.02*__mareDiagnostics().stats.moveSpeed)));
        return {moved:q.world.hero.x>p.x,expected:surface,cues:orangeAudio.calls.slice(before).map(e=>e.name),count:orangeAudio.calls.length};
      },{material,surface});
      assert.ok(result.moved,JSON.stringify(result));
      assert.ok(result.cues.length>0&&result.cues.every(name=>name.startsWith('passo-'+surface)),JSON.stringify(result));
      await page.waitForFunction(n=>orangeAudio.played.length>=n,result.count);
    }
    const crossing=await page.evaluate(()=>{
      const q=__orangeAudioQA,start={x:1940,y:672},count=orangeAudio.calls.length;
      if(!q.navigator().clear(start,{x:start.x+117,y:start.y}))throw Error('Terrain boundary route blocked');
      Object.assign(q.world.hero,{...start,walking:0});
      q.move('d',Math.ceil(111/(.02*__mareDiagnostics().stats.moveSpeed)));
      return {cues:orangeAudio.calls.slice(count).map(e=>e.name),count:orangeAudio.calls.length};
    });
    assert.match(crossing.cues[0],/^passo-areia-/);
    assert.match(crossing.cues.at(-1),/^passo-grama-/);
    await page.waitForFunction(n=>orangeAudio.played.length>=n,crossing.count);
    await cues(()=>__orangeAudioQA.move(null,20),[]);

    await page.evaluate(()=>{
      const q=__orangeAudioQA,p=MarePixelWorldMaps.orange.map.spawn;
      Object.assign(q.world.hero,p);
      q.game.classId='sword';q.world.hero.combat=null;
      const m={id:'sfx-target',type:'cesar',district:'cais',alive:true,hp:1e5,maxHP:1e5,defense:0,
        level:11,area:'orange',x:p.x+32,y:p.y,anchorX:p.x+32,anchorY:p.y,attack:0,attackClock:1e6,bob:0,speed:0};
      q.world.mobs=[m];q.world.target=m;
      window.orangeAttack=hit=>{
        const q=__orangeAudioQA,m=q.world.target,hp=m.hp,rng=Math.random;Math.random=()=>hit?0:1;
        try{if(!q.heroAttack(m))throw Error('Attack not accepted');q.attackStep(2);}
        finally{Math.random=rng;}
        if((m.hp<hp)!==hit)throw Error('Attack result does not match test case');
      };
    });
    await cues(()=>orangeAttack(false),['espada-corte.ogg']);
    await cues(()=>orangeAttack(true),['espada-corte.ogg','espada-acerto.ogg']);
    await cues(()=>{
      const q=__orangeAudioQA;q.game.classId='strategist';q.world.hero.combat=null;q.game.energy=500;
      if(!q.useSkill(0,true))throw Error('Chama Concentrada not accepted');q.attackStep(2);
    },['magia-fogo.ogg']);
    await cues(async()=>{
      const q=__orangeAudioQA;q.equipSupa();q.game.energy=500;
      for(const key of ['1','2']){
        const cast=q.useFruitSkill(true,key);
        for(let i=0;i<55;i++){q.advance(.02);await Promise.resolve();}
        if(!await cast)throw Error('Supa Supa cast '+key+' not accepted');
      }
      if(await q.useFruitSkill(true,'1'))throw Error('Repeated cast ignored cooldown');
    },['supa-espiral-cortante.ogg','supa-retaliacao-metalica.ogg']);
    await cues(()=>{
      MareAudio.setMuted(true);const q=__orangeAudioQA;q.game.classId='sword';q.world.hero.combat=null;orangeAttack(true);
    },['espada-corte.ogg','espada-acerto.ogg']);
    await cues(()=>{
      MareAudio.setEffectsMuted(true);MareAudio.setMuted(false);orangeAttack(true);
    },[]);
    await cues(()=>{const q=__orangeAudioQA;q.returnLobby();q.move('d',15);},[]);
    const audio=await page.evaluate(()=>orangeAudio);
    assert.deepEqual(audio.failures,[]);
    assert.ok(audio.played.every(clip=>clip.duration>0&&Number.isFinite(clip.duration)));
    assert.deepEqual(errors,[]);
    console.log('Orange Town browser: actual decoded playback for four floors, sword miss/hit, fire, both Supa skills, cooldown, mute and lobby isolation (390 px).');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
