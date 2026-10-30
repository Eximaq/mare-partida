/* Exhaustive attachment/occlusion audit, followed by real equip and combat transactions. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),{chromium}=require('playwright');
const origin=process.argv.find(a=>/^https?:/.test(a))||'http://127.0.0.1:8157/';
const materialsOnly=process.argv.includes('--materials-only'),combatOnly=process.argv.includes('--combat-only'),otherClasses=process.argv.includes('--other-classes');
const output=process.argv.find(a=>a.startsWith('--evidence='))?.slice(11);
const defaultPlayer=process.argv.includes('--default-player');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{
 const p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.text().startsWith('weapons-progress:'))console.log(m.text());});await p.goto(new URL('tools/paper-doll-96-v3/',origin).href);await p.waitForFunction(()=>window.__review96v3);
 const audit=combatOnly?null:await p.evaluate(async({materialsOnly,otherClasses})=>{
  const q=__review96v3,items=q.weaponCatalog.items.filter(w=>!!w.attachment===otherClasses),issues=[],counts={materials:0,rotations:0,compositions:0,mirrors:0,handPixels:0,northOpaque:0,outsideWeapon:0,edgeDirections:0};
  const read=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data,same=(a,b,i,j=i)=>[0,1,2,3].every(k=>a[i+k]===b[j+k]);
  const componentSizes=(d,w,h)=>{const seen=new Uint8Array(w*h),parts=[];for(let p=0;p<seen.length;p++)if(d[p*4+3]&&!seen[p]){const todo=[p];seen[p]=1;for(let n=0;n<todo.length;n++){const v=todo[n],x=v%w,y=Math.floor(v/w);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy,k=yy*w+xx;if(xx>=0&&yy>=0&&xx<w&&yy<h&&d[k*4+3]&&!seen[k]){seen[k]=1;todo.push(k);}}}parts.push(todo.length);}return parts;};
  for(const item of items){
   const models=[item,...Object.entries(item.views||{}).map(([view,m])=>({...item,...m,view}))],images=new Map(await Promise.all(models.map(async m=>[m.source,await q.image(m.source)])));
   for(const model of models){const c=document.createElement('canvas');c.width=c.height=128;c.getContext('2d').drawImage(images.get(model.source),0,0);const d=read(c),parts=componentSizes(d,128,128);
    for(let i=0;i<d.length;i+=4)if(d[i+3]!==0&&d[i+3]!==255)issues.push({kind:'material-alpha',id:item.itemId,view:model.view});
    for(const point of [model.grip,model.tip])if(d[(point.y*128+point.x)*4+3]!==255)issues.push({kind:'transparent-socket',id:item.itemId,view:model.view});
    if(parts.length!==1)issues.push({kind:'material-fragments',id:item.itemId,view:model.view,parts});counts.materials++;
   }
   const renderer=MareWeapons96.create(q.weaponCatalog,q.appearanceRigs),orientations=new Map();
   for(const model of models)for(let degrees=0;degrees<360;degrees+=15)orientations.set(model.source+':'+degrees+':false',{model,angle:degrees*Math.PI/180,flip:false});
   for(const body of ['masculino','feminino'])for(const action of ['idle','walk',item.attackAction||'attack-'+item.category])for(const dir of ['south','north','east']){const selected=q.selection(body,action,dir),spec=MareMotion96.clipSpec(q.manifest,selected.clip);for(let f=0;f<selected.clip.frames;f++)for(const entry of renderer.plan(selected,f,spec,{weapon:item.id}))orientations.set(entry.model.source+':'+entry.angle.toFixed(8)+':'+entry.flip,entry);}
   for(const entry of orientations.values()){const rotated=document.createElement('canvas');rotated.width=rotated.height=224;const e={...entry,x:112,y:112,phase:0,depth:'front'},cx=rotated.getContext('2d');if(['gauntlet','wrist-cannon'].includes(e.model.attachment?.kind))renderer.drawWorn(cx,images,[e],{width:224,height:224});else renderer.draw(cx,images,[e],'front');const parts=componentSizes(read(rotated),224,224);if(parts.length!==1)issues.push({kind:'rotation-fragments',id:item.itemId,view:entry.model.view,angle:entry.angle,flip:entry.flip,parts});counts.rotations++;}
  }
  if(materialsOnly)return {counts,issues};
  for(const body of ['masculino','feminino'])for(const item of items)for(const action of ['idle','walk',(item.attackAction||'attack-'+item.category)])for(const dir of ['south','north','east']){
   const selected=q.selection(body,action,dir),spec=MareMotion96.clipSpec(q.manifest,selected.clip),atlas=q.catalog.nativeOwnership.atlases[body][action],atlasImage=await q.image(atlas.file);
   for(let frame=0;frame<selected.clip.frames;frame++){
    const ownerCanvas=document.createElement('canvas');ownerCanvas.width=ownerCanvas.height=spec.width;const index=atlas.directions.indexOf(dir)*atlas.framesPerDirection+frame;
    ownerCanvas.getContext('2d').drawImage(atlasImage,index%atlas.columns*atlas.cell,Math.floor(index/atlas.columns)*atlas.cell,atlas.cell,atlas.cell,0,0,spec.width,spec.height);
    const ownership=MareTorso96.unpack(read(ownerCanvas));
    const limbCanvas=document.createElement('canvas');limbCanvas.width=spec.width;limbCanvas.height=spec.height;
    for(const slot of ['underArms','foreground'])if(selected.layers[slot])limbCanvas.getContext('2d').drawImage(await q.image(selected.layers[slot]),frame*spec.width,0,spec.width,spec.height,0,0,spec.width,spec.height);
    const nativeLimb=read(limbCanvas);
    for(const kit of [0,1]){
     const look={weapon:item.id,hair:kit?'hair-wavy':'hair-bob',face:'face-calm',skin:kit?'ebony':otherClasses?'light':'original',hairColor:'brown',torso:kit?'item-7':'item-6',pants:kit?'item-22':'item-21',boots:kit?'item-9':'item-8',gloves:kit?'item-26':'original',inspectionBareHands:!kit,cloak:kit?'item-24':'item-23'};
     const armed=await q.render(body,action,dir,frame,[],look),bare=await q.render(body,action,dir,frame,[],{...look,weapon:'original'}),a=read(armed),b=read(bare),dx=armed.mareSpec.pivot.x-spec.pivot.x,dy=armed.mareSpec.pivot.y-spec.pivot.y;
     const mask=document.createElement('canvas');mask.width=armed.width;mask.height=armed.height;const mx=mask.getContext('2d');mx.translate(dx,dy);
     const renderer=MareWeapons96.create(q.weaponCatalog,q.appearanceRigs),entries=renderer.plan(selected,frame,spec,look,ownership),images=new Map(await Promise.all([...new Set(entries.map(e=>e.model.source))].map(async file=>[file,await q.image(file)])));
     const visibleHands=ownership.hands.slice(),ramp=MareAppearance96.skins[look.skin]?.ramp,limb=ramp?MareAppearance96.recolor(nativeLimb,MareAppearance96.materialMask(nativeLimb,'skin'),ramp):nativeLimb;
     if(['gauntlet','wrist-cannon'].includes(item.attachment?.kind))for(const entry of entries.filter(e=>e.depth==='back'))for(let y=Math.max(0,entry.y-8);y<Math.min(spec.height,entry.y+9);y++)for(let x=Math.max(0,entry.x-8);x<Math.min(spec.width,entry.x+9);x++){const i=(y*spec.width+x)*4;if(limb[i+3]&&same(limb,b,i))visibleHands[y*spec.width+x]=1;}
     renderer.draw(mx,images,entries,'back');renderer.draw(mx,images,entries,'front');renderer.drawWorn(mx,images,entries,spec);renderer.drawGrips(mx,entries,'back',['#fff','#fff','#fff','#fff']);
     const gripMask=document.createElement('canvas');gripMask.width=armed.width;gripMask.height=armed.height;const gx=gripMask.getContext('2d');gx.translate(dx,dy);renderer.drawGrips(gx,entries,'front',['#fff','#fff','#fff','#fff']);renderer.drawWorn(gx,images,entries,spec);const g=read(gripMask);mx.drawImage(gripMask,-dx,-dy);const w=read(mask);
     for(const entry of entries)if(entry.model.edgeSide){const sign=entry.model.edgeSide*(entry.flip?-1:1),dot=sign*(Math.cos(entry.angle)*entry.outward.x+Math.sin(entry.angle)*entry.outward.y);if(dot<-.00001)issues.push({kind:'edge-inward',body,id:item.itemId,action,dir,frame});counts.edgeDirections++;}
     for(let y=0;y<armed.height;y++)for(let x=0;x<armed.width;x++)if((x<2||y<2||x>=armed.width-2||y>=armed.height-2)&&a[(y*armed.width+x)*4+3])issues.push({kind:'clipped',body,id:item.itemId,action,dir,frame,x,y});
     for(let y=0;y<spec.height;y++)for(let x=0;x<spec.width;x++){
      const i=(y*spec.width+x)*4,j=((y+dy)*armed.width+x+dx)*4;
      if(!w[j+3]){counts.outsideWeapon++;if(!same(b,a,i,j))issues.push({kind:'body-changed-outside-weapon',body,id:item.itemId,action,dir,frame,x,y});}
      if(otherClasses&&!kit&&['gauntlet','wrist-cannon'].includes(item.attachment?.kind)&&visibleHands[y*spec.width+x]&&g[j+3]&&b[i+3]===255){const ramps=MareAppearance96.skins.light.ramp.map(hex=>hex.slice(1).match(/../g).map(v=>parseInt(v,16)));if(ramps.some(c=>c.every((v,k)=>v===b[i+k]))&&!same(b,g,i,j)){counts.armourSkinWitnesses=(counts.armourSkinWitnesses||0)+1;if(same(b,a,i,j))issues.push({kind:'armour-not-covering-visible-palm',body,id:item.itemId,action,dir,frame,x,y});}}
      if(ownership.hands[y*spec.width+x]&&b[i+3]===255&&!g[j+3]){counts.handPixels++;if(!same(b,a,i,j))issues.push({kind:'grip-over-hand',body,id:item.itemId,action,dir,frame,x,y});}
      if(item.attachment?.kind==='staff'){const neck=q.appearanceRigs.clips[body][action][dir].poses[frame].find(j=>j.label==='NECK'),px=(spec.width-128)/2;if(Math.abs(x-(neck.x*128+px))<=8&&y>=neck.y*128+px-22&&y<=neck.y*128+px-5&&b[i+3]===255&&!same(b,a,i,j))issues.push({kind:'staff-over-face',body,action,dir,frame,x,y});}
      if(dir==='north'&&b[i+3]===255&&!(['gauntlet','wrist-cannon'].includes(item.attachment?.kind)&&visibleHands[y*spec.width+x])){counts.northOpaque++;if(!same(b,a,i,j))issues.push({kind:'north-weapon-over-body',body,id:item.itemId,action,dir,frame,x,y});}
     }
     if(dir==='east'){
      const west=await q.render(body,action,'west',frame,[],look),d=read(west);if(west.width!==armed.width||west.height!==armed.height)issues.push({kind:'mirror-size'});
      else for(let y=0;y<armed.height;y++)for(let x=1;x<armed.width;x++)if(!same(a,d,(y*armed.width+x)*4,(y*armed.width+armed.width-x)*4))issues.push({kind:'mirror-pixel',body,id:item.itemId,action,frame,x,y});counts.mirrors++;
     }
     counts.compositions++;if(counts.compositions%240===0)console.log('weapons-progress:'+counts.compositions+'/'+(items.length*240));if(issues.length>100)return {counts,issues:issues.slice(0,100)};
    }
   }
  }
  if(otherClasses){
   const selected=q.selection('masculino','attack-focus','south'),spec=MareMotion96.clipSpec(q.manifest,selected.clip),badCatalog=structuredClone(q.weaponCatalog);badCatalog.items.find(w=>w.itemId===31).attachment.kind='focus';
   const badWardrobe=MareWardrobe96.create(q.catalog,q.appearanceRigs,q.image,{weapons:badCatalog}),look={weapon:'weapon-31',skin:'light',hair:'hair-bob',face:'face-calm',torso:'item-6',gloves:'original',inspectionBareHands:true},files=[...new Set([...Object.values(selected.layers),...badWardrobe.requiredFiles(selected,look)])],images=new Map(await Promise.all(files.map(async file=>[file,await q.image(file)])));
   const bad=document.createElement('canvas'),bare=document.createElement('canvas');bad.width=bare.width=spec.width;bad.height=bare.height=spec.height;badWardrobe.draw(bad.getContext('2d'),images,selected,4,spec,[],look);badWardrobe.draw(bare.getContext('2d'),images,selected,4,spec,[],{...look,weapon:'original'});
   const a=read(bad),b=read(bare),neck=q.appearanceRigs.clips.masculino['attack-focus'].south.poses[4].find(j=>j.label==='NECK'),pad=(spec.width-128)/2;let witnesses=0;for(let y=0;y<spec.height;y++)for(let x=0;x<spec.width;x++){const i=(y*spec.width+x)*4;if(Math.abs(x-neck.x*128-pad)<=8&&y>=neck.y*128+pad-22&&y<=neck.y*128+pad-5&&b[i+3]===255&&!same(a,b,i))witnesses++;}
   counts.headNegativeWitnesses=witnesses;if(!witnesses)issues.push({kind:'head-clearance-detector-blind'});
  }
  return {counts,issues};
 },{materialsOnly,otherClasses});console.log(JSON.stringify({audit}));if(audit)assert.deepEqual(audit.issues,[]);
 if(output){await fs.mkdir(output,{recursive:true});if(audit)await fs.writeFile(path.join(output,'audit.json'),JSON.stringify(audit,null,2));}
 await p.close();if(materialsOnly)return;
 const game=await browser.newPage({viewport:{width:1366,height:768}});game.on('pageerror',e=>errors.push(e.message));
 await game.route('**/api/akuma/catalog',r=>r.fulfill({status:404,body:'{}'}));
 await game.route('**/game.js*',async route=>{const response=await route.fetch(),source=await response.text(),hook=`window.__weaponQA={get g(){return game},get r(){return lobby96},get hero(){return world.hero},pause(){autoPlay=false;autoSkills=false;keys.clear()},startNatural(){enterHunt();window.__naturalSeen=new Set();return {kills:game.stats.kills,xp:game.stats.xpEarned,deaths:session.heroKOs||0};},naturalStep(){const started=performance.now();for(let i=0;i<200;i++){tick(.05);for(const m of world.mobs)if(m.alive)window.__naturalSeen.add(m.id);if(i%5===0)presentWorld();}return {kills:game.stats.kills,xp:game.stats.xpEarned,deaths:session.heroKOs||0,hp:game.hp,level:game.level,spawns:window.__naturalSeen.size,wallMs:performance.now()-started,cache:lobby96.snapshot(),heap:performance.memory?.usedJSHeapSize||null};},enterHunt,returnLobby,draw:presentWorld,equip(id){cancelBasicAttack();const def=itemDefs[id];game.classId=def.type;configureFactionVisual();const item=newItem(def,1,false);game.inventory.push(item);equipItem(item.id);return {equipped:game.equipment.weapon?.def,stats:getDerived()};},unequip(){unequip('weapon')},fight(lethal=false){cancelBasicAttack();autoPlay=false;autoSkills=false;world.spawnClock=1e9;const nav=navigator(),ranged=!!MareCombatVfx.data.flightEnds[MareCombatVfx.data.classHits[game.classId]],distance=ranged?Math.max(24,Math.min(120,getDerived().range-8)):18;let position;for(let y=192;y<nav.map.height-192&&!position;y+=16)for(let x=192;x<nav.map.width-192&&!position;x+=16)if(nav.clear({x,y},{x:x+distance,y})&&nav.clear({x,y:y-55},{x:x+distance,y:y-15}))position={x,y};if(!position)throw Error('No combat lane');Object.assign(world.hero,position);const hp=lethal?1:100000,m={id:'weapon-test-'+world.nextID++,type:'bandit',area:game.area,district:MareHunt.sectors(game.area)[0].id,level:1,alive:true,hp,maxHP:hp,defense:0,magicDefense:0,x:position.x+distance,y:position.y,anchorX:position.x+distance,anchorY:position.y,attack:0,attackClock:1e9,speed:0,patrolClock:1e9,aggro:300,bob:0};world.mobs=[m];world.target=m;game.hp=getDerived().maxHP;const before=game.stats.damage,kills=game.stats.kills,old=Math.random,frames=[],hits=[],releases=[],seenShots=new Set();Math.random=()=>.5;try{if(!heroAttack(m))throw Error('Attack rejected '+JSON.stringify({classId:game.classId,weapon:game.equipment.weapon?.def,range:getDerived().range,distance,respawn:session.respawn,controller:classCombatController()?.snapshot(),basic:basicAttackPose()}));let prior=before;for(let i=0;i<120;i++){tick(.01);presentWorld();const p=lobby96.snapshot().lastPose;frames.push(p?.frame);for(const shot of session.combatProjectiles||[])if(!seenShots.has(shot)){seenShots.add(shot);releases.push({frame:p?.frame,weapon:p?.weapon,origin:{...shot.origin},expected:lobby96.projectileOrigin(game,world.hero,classCombatController()?.snapshot()||basicAttackPose()||{})});}if(game.stats.damage>prior){hits.push({frame:p?.frame,action:p?.action,weapon:p?.weapon});prior=game.stats.damage;}}return {damage:game.stats.damage-before,kills:game.stats.kills-kills,frames:[...new Set(frames)],hits,releases,ranged,last:lobby96.snapshot().lastPose};}finally{Math.random=old;cancelBasicAttack();}}};`;
 await route.fulfill({response,body:source.replace('  window.__mareDiagnostics=',hook+'\n  window.__mareDiagnostics=').replaceAll('requestAnimationFrame(frame)','window.__testFrame=frame')});});
 await game.goto(new URL(defaultPlayer?'':'?paperDoll96=1',origin).href,{waitUntil:'networkidle'});await game.waitForFunction(()=>window.__weaponQA&&__mareDiagnostics().lobby96.state==='ready');
 await game.locator('#characterName').fill('Armas96');await game.locator('#nextToClass').click();await game.locator('#createCharacter').click();await game.evaluate(()=>__weaponQA.enterHunt());
 let fights=0,kills=0;const results=[];
 const ids=otherClasses?[2,3,4,5,14,15,16,17,31,32]:[0,1,12,13,67,68,69,70,71,72,73,74];
 for(const body of ['masculino','feminino'])for(const id of ids){
  const equipped=await game.evaluate(async({body,id})=>{const result=__weaponQA.equip(id),r=__weaponQA.r;r.setDraft('body',body);r.setDraft('kit','sample-b');r.apply(__weaponQA.g);if(!await r.ensure(__weaponQA.g))throw Error('Equipment composition failed: '+JSON.stringify(r.snapshot()));return result;},{body,id});assert.equal(equipped.equipped,id);
  const result=await game.evaluate(()=>__weaponQA.fight());assert(result.damage>0);assert(result.hits.length>0);assert(result.hits.every(h=>(result.ranged||h.frame===4)&&h.weapon==='weapon-'+id),JSON.stringify({body,id,result}));if(result.ranged){assert(result.releases.length>0,'projectile or beam emitted');for(const release of result.releases){assert.equal(release.frame,4,'release pose');if(otherClasses){assert(release.expected,'native96 emitter');assert(Math.abs(release.origin.x-release.expected.x)<.001&&Math.abs(release.origin.y-release.expected.y)<.001,'emission matches composed weapon');}}}assert(result.frames.includes(0)&&result.frames.includes(7),'show windup and recovery');results.push({body,id,damage:result.damage,hits:result.hits,releases:result.releases});fights++;console.log('weapons-combat:'+body+':'+id);
 }
 for(const id of otherClasses?[4,15]:[70,74]){await game.evaluate(async id=>{__weaponQA.equip(id);await __weaponQA.r.ensure(__weaponQA.g);},id);for(let i=0;i<10;i++){const result=await game.evaluate(()=>__weaponQA.fight(true));kills+=result.kills;}}
 assert.equal(kills,20);
 await game.evaluate(async()=>{__weaponQA.unequip();await __weaponQA.r.ensure(__weaponQA.g);});const unarmed=await game.evaluate(()=>__weaponQA.fight());assert(unarmed.hits.every(h=>h.action==='attack-unarmed'));
 const natural=[];if(otherClasses){
  // Respawn uses wall dates; advance those with the accelerated simulation.
  let naturalTime=Date.now();await game.clock.setFixedTime(naturalTime);
  for(const id of [2,4,14,16,31]){
   await game.evaluate(async id=>{__weaponQA.equip(id);await __weaponQA.r.ensure(__weaponQA.g);},id);const before=await game.evaluate(()=>__weaponQA.startNatural());let result,steps=0;
   do{naturalTime+=10000;await game.clock.setFixedTime(naturalTime);result=await game.evaluate(()=>__weaponQA.naturalStep());steps++;}while(result.kills-before.kills<20&&steps<60&&result.deaths===before.deaths);
   assert(result.kills-before.kills>=20,JSON.stringify({id,before,result,steps}));assert.equal(result.deaths,before.deaths,'twenty consecutive native-spawn kills');assert(result.xp>before.xp);assert(result.hp>0);assert(result.spawns>=20);assert(result.cache.images<=48&&result.cache.bundles<=2&&result.cache.peakLoads<=6);
   natural.push({id,kills:result.kills-before.kills,xp:result.xp-before.xp,level:result.level,spawns:result.spawns,simulatedSeconds:steps*10,wallMsPerBatch:result.wallMs,heap:result.heap});console.log('weapons-natural:'+id+':'+(result.kills-before.kills));
  }
  if(output){await fs.writeFile(path.join(output,'natural-hunt.json'),JSON.stringify(natural,null,2));await game.screenshot({path:path.join(output,'hunt-1366.png')});}
 }
 await game.evaluate(()=>__weaponQA.returnLobby());assert(await game.evaluate(()=>__weaponQA.r.ensure(__weaponQA.g)));await game.evaluate(()=>__weaponQA.draw());
 if(output){await fs.writeFile(path.join(output,'combat.json'),JSON.stringify(results,null,2));await game.screenshot({path:path.join(output,'lobby-equipped.png')});}
 assert.deepEqual(errors,[]);console.log(JSON.stringify({fights,kills,naturalKills:natural.reduce((n,r)=>n+r.kills,0),unarmed:true,errors}));
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
