/* Exhaustive attachment/occlusion audit, followed by real equip and combat transactions. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),{chromium}=require('playwright');
const origin=process.argv.find(a=>/^https?:/.test(a))||'http://127.0.0.1:8157/';
const materialsOnly=process.argv.includes('--materials-only'),combatOnly=process.argv.includes('--combat-only');
const output=process.argv.find(a=>a.startsWith('--evidence='))?.slice(11);
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});try{
 const p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.text().startsWith('weapons-progress:'))console.log(m.text());});await p.goto(new URL('tools/paper-doll-96-v3/',origin).href);await p.waitForFunction(()=>window.__review96v3);
 const audit=combatOnly?null:await p.evaluate(async materialsOnly=>{
  const q=__review96v3,issues=[],counts={materials:0,rotations:0,compositions:0,mirrors:0,handPixels:0,northOpaque:0,outsideWeapon:0,edgeDirections:0};
  const read=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data,same=(a,b,i,j=i)=>[0,1,2,3].every(k=>a[i+k]===b[j+k]);
  const componentSizes=(d,w,h)=>{const seen=new Uint8Array(w*h),parts=[];for(let p=0;p<seen.length;p++)if(d[p*4+3]&&!seen[p]){const todo=[p];seen[p]=1;for(let n=0;n<todo.length;n++){const v=todo[n],x=v%w,y=Math.floor(v/w);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy,k=yy*w+xx;if(xx>=0&&yy>=0&&xx<w&&yy<h&&d[k*4+3]&&!seen[k]){seen[k]=1;todo.push(k);}}}parts.push(todo.length);}return parts;};
  for(const item of q.weaponCatalog.items){
   const im=await q.image(item.source),c=document.createElement('canvas');c.width=c.height=128;c.getContext('2d').drawImage(im,0,0);const d=read(c),seen=new Uint8Array(128*128),parts=[];
   for(let i=0;i<d.length;i+=4)if(d[i+3]!==0&&d[i+3]!==255)issues.push({kind:'material-alpha',id:item.itemId});
   if(d[(item.grip.y*128+item.grip.x)*4+3]!==255)issues.push({kind:'transparent-grip',id:item.itemId});
   for(let k=0;k<seen.length;k++)if(d[k*4+3]&&!seen[k]){const part=[k];seen[k]=1;for(let n=0;n<part.length;n++){const a=part[n],x=a%128,y=Math.floor(a/128);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy,j=yy*128+xx;if(xx>=0&&xx<128&&yy>=0&&yy<128&&d[j*4+3]&&!seen[j]){seen[j]=1;part.push(j);}}}parts.push(part.length);}
   if(parts.length!==1)issues.push({kind:'material-fragments',id:item.itemId,parts});counts.materials++;
   const renderer=MareWeapons96.create(q.weaponCatalog,q.appearanceRigs),images=new Map([[item.source,im]]);
   const orientations=new Map();for(let degrees=0;degrees<360;degrees+=15)orientations.set(degrees+':false',{angle:degrees*Math.PI/180,flip:false});
   for(const body of ['masculino','feminino'])for(const action of ['idle','walk','attack-'+item.category])for(const dir of ['south','north','east']){const selected=q.selection(body,action,dir),spec=MareMotion96.clipSpec(q.manifest,selected.clip);for(let f=0;f<selected.clip.frames;f++)for(const entry of renderer.plan(selected,f,spec,{weapon:item.id}))orientations.set(entry.angle.toFixed(8)+':'+entry.flip,entry);}
   for(const entry of orientations.values()){const rotated=document.createElement('canvas');rotated.width=rotated.height=224;renderer.draw(rotated.getContext('2d'),images,[{...entry,model:item,x:112,y:112,phase:0,depth:'front'}],'front');const parts=componentSizes(read(rotated),224,224);if(parts.length!==1)issues.push({kind:'rotation-fragments',id:item.itemId,angle:entry.angle,flip:entry.flip,parts});counts.rotations++;}


  }
  if(materialsOnly)return {counts,issues};
  for(const body of ['masculino','feminino'])for(const item of q.weaponCatalog.items)for(const action of ['idle','walk','attack-'+item.category])for(const dir of ['south','north','east']){
   const selected=q.selection(body,action,dir),spec=MareMotion96.clipSpec(q.manifest,selected.clip),atlas=q.catalog.nativeOwnership.atlases[body][action],atlasImage=await q.image(atlas.file);
   for(let frame=0;frame<selected.clip.frames;frame++){
    const ownerCanvas=document.createElement('canvas');ownerCanvas.width=ownerCanvas.height=spec.width;const index=atlas.directions.indexOf(dir)*atlas.framesPerDirection+frame;
    ownerCanvas.getContext('2d').drawImage(atlasImage,index%atlas.columns*atlas.cell,Math.floor(index/atlas.columns)*atlas.cell,atlas.cell,atlas.cell,0,0,spec.width,spec.height);
    const ownership=MareTorso96.unpack(read(ownerCanvas));
    for(const kit of [0,1]){
     const look={weapon:item.id,hair:kit?'hair-wavy':'hair-bob',face:'face-calm',skin:kit?'ebony':'original',hairColor:'brown',torso:kit?'item-7':'item-6',pants:kit?'item-22':'item-21',boots:kit?'item-9':'item-8',gloves:kit?'item-26':'original',inspectionBareHands:!kit,cloak:kit?'item-24':'item-23'};
     const armed=await q.render(body,action,dir,frame,[],look),bare=await q.render(body,action,dir,frame,[],{...look,weapon:'original'}),a=read(armed),b=read(bare),dx=armed.mareSpec.pivot.x-spec.pivot.x,dy=armed.mareSpec.pivot.y-spec.pivot.y;
     const mask=document.createElement('canvas');mask.width=armed.width;mask.height=armed.height;const mx=mask.getContext('2d');mx.translate(dx,dy);
     const renderer=MareWeapons96.create(q.weaponCatalog,q.appearanceRigs),entries=renderer.plan(selected,frame,spec,look,ownership),images=new Map([[item.source,await q.image(item.source)]]);
     renderer.draw(mx,images,entries,'back');renderer.draw(mx,images,entries,'front');renderer.drawGrips(mx,entries,'back',['#fff','#fff','#fff','#fff']);
     const gripMask=document.createElement('canvas');gripMask.width=armed.width;gripMask.height=armed.height;const gx=gripMask.getContext('2d');gx.translate(dx,dy);renderer.drawGrips(gx,entries,'front',['#fff','#fff','#fff','#fff']);const g=read(gripMask);mx.drawImage(gripMask,-dx,-dy);const w=read(mask);
     for(const entry of entries)if(entry.model.edgeSide){const sign=entry.model.edgeSide*(entry.flip?-1:1),dot=sign*(Math.cos(entry.angle)*entry.outward.x+Math.sin(entry.angle)*entry.outward.y);if(dot<-.00001)issues.push({kind:'edge-inward',body,id:item.itemId,action,dir,frame});counts.edgeDirections++;}
     for(let y=0;y<armed.height;y++)for(let x=0;x<armed.width;x++)if((x<2||y<2||x>=armed.width-2||y>=armed.height-2)&&a[(y*armed.width+x)*4+3])issues.push({kind:'clipped',body,id:item.itemId,action,dir,frame,x,y});
     for(let y=0;y<spec.height;y++)for(let x=0;x<spec.width;x++){
      const i=(y*spec.width+x)*4,j=((y+dy)*armed.width+x+dx)*4;
      if(!w[j+3]){counts.outsideWeapon++;if(!same(b,a,i,j))issues.push({kind:'body-changed-outside-weapon',body,id:item.itemId,action,dir,frame,x,y});}
      if(ownership.hands[y*spec.width+x]&&b[i+3]===255&&!g[j+3]){counts.handPixels++;if(!same(b,a,i,j))issues.push({kind:'grip-over-hand',body,id:item.itemId,action,dir,frame,x,y});}
      if(dir==='north'&&b[i+3]===255){counts.northOpaque++;if(!same(b,a,i,j))issues.push({kind:'north-weapon-over-body',body,id:item.itemId,action,dir,frame,x,y});}
     }
     if(dir==='east'){
      const west=await q.render(body,action,'west',frame,[],look),d=read(west);if(west.width!==armed.width||west.height!==armed.height)issues.push({kind:'mirror-size'});
      else for(let y=0;y<armed.height;y++)for(let x=1;x<armed.width;x++)if(!same(a,d,(y*armed.width+x)*4,(y*armed.width+armed.width-x)*4))issues.push({kind:'mirror-pixel',body,id:item.itemId,action,frame,x,y});counts.mirrors++;
     }
     counts.compositions++;if(counts.compositions%240===0)console.log('weapons-progress:'+counts.compositions+'/2880');if(issues.length>100)return {counts,issues:issues.slice(0,100)};
    }
   }
  }
  return {counts,issues};
 },materialsOnly);console.log(JSON.stringify({audit}));if(audit)assert.deepEqual(audit.issues,[]);
 if(output){await fs.mkdir(output,{recursive:true});if(audit)await fs.writeFile(path.join(output,'audit.json'),JSON.stringify(audit,null,2));}
 await p.close();if(materialsOnly)return;
 const game=await browser.newPage({viewport:{width:1366,height:768}});game.on('pageerror',e=>errors.push(e.message));
 await game.route('**/api/akuma/catalog',r=>r.fulfill({status:404,body:'{}'}));
 await game.route('**/game.js*',async route=>{const response=await route.fetch(),source=await response.text(),hook=`window.__weaponQA={get g(){return game},get r(){return lobby96},get hero(){return world.hero},pause(){autoPlay=false;autoSkills=false;keys.clear()},enterHunt,returnLobby,draw:presentWorld,equip(id){cancelBasicAttack();const def=itemDefs[id];game.classId=def.type;configureFactionVisual();const item=newItem(def,1,false);game.inventory.push(item);equipItem(item.id);return {equipped:game.equipment.weapon?.def,stats:getDerived()};},unequip(){unequip('weapon')},fight(lethal=false){cancelBasicAttack();autoPlay=false;autoSkills=false;world.spawnClock=1e9;const nav=navigator();let position;for(let y=192;y<nav.map.height-192&&!position;y+=16)for(let x=192;x<nav.map.width-192&&!position;x+=16)if(nav.clear({x,y},{x:x+20,y})&&nav.clear({x,y:y-55},{x:x+20,y:y-15}))position={x,y};if(!position)throw Error('No combat lane');Object.assign(world.hero,position);const hp=lethal?1:100000,m={id:'weapon-test-'+world.nextID++,type:'bandit',area:game.area,district:MareHunt.sectors(game.area)[0].id,level:1,alive:true,hp,maxHP:hp,defense:0,magicDefense:0,x:position.x+18,y:position.y,anchorX:position.x+18,anchorY:position.y,attack:0,attackClock:1e9,speed:0,patrolClock:1e9,aggro:300,bob:0};world.mobs=[m];world.target=m;game.hp=getDerived().maxHP;const before=game.stats.damage,kills=game.stats.kills,old=Math.random,frames=[],hits=[];Math.random=()=>.5;try{if(!heroAttack(m))throw Error('Attack rejected');let prior=before;for(let i=0;i<120;i++){tick(.01);presentWorld();const p=lobby96.snapshot().lastPose;frames.push(p?.frame);if(game.stats.damage>prior){hits.push({frame:p?.frame,action:p?.action,weapon:p?.weapon});prior=game.stats.damage;}}return {damage:game.stats.damage-before,kills:game.stats.kills-kills,frames:[...new Set(frames)],hits,last:lobby96.snapshot().lastPose};}finally{Math.random=old;cancelBasicAttack();}}};`;
 await route.fulfill({response,body:source.replace('  window.__mareDiagnostics=',hook+'\n  window.__mareDiagnostics=').replaceAll('requestAnimationFrame(frame)','window.__testFrame=frame')});});
 await game.goto(new URL('?paperDoll96=1',origin).href,{waitUntil:'networkidle'});await game.waitForFunction(()=>window.__weaponQA&&__mareDiagnostics().lobby96.state==='ready');
 await game.locator('#characterName').fill('Armas96');await game.locator('#nextToClass').click();await game.locator('#createCharacter').click();await game.evaluate(()=>__weaponQA.enterHunt());
 let fights=0,kills=0;const results=[];
 const ids=[0,1,12,13,67,68,69,70,71,72,73,74];
 for(const body of ['masculino','feminino'])for(const id of ids){
  const equipped=await game.evaluate(async({body,id})=>{const result=__weaponQA.equip(id),r=__weaponQA.r;r.setDraft('body',body);r.setDraft('kit','sample-b');r.apply(__weaponQA.g);await r.ensure(__weaponQA.g);return result;},{body,id});assert.equal(equipped.equipped,id);
  const result=await game.evaluate(()=>__weaponQA.fight());assert(result.damage>0);assert(result.hits.length>0);assert(result.hits.every(h=>h.frame===4&&h.weapon==='weapon-'+id),JSON.stringify({body,id,result}));assert(result.frames.includes(0)&&result.frames.includes(7),'show windup and recovery');results.push({body,id,damage:result.damage,hits:result.hits});fights++;console.log('weapons-combat:'+body+':'+id);
 }
 for(const id of [70,74]){await game.evaluate(async id=>{__weaponQA.equip(id);await __weaponQA.r.ensure(__weaponQA.g);},id);for(let i=0;i<10;i++){const result=await game.evaluate(()=>__weaponQA.fight(true));kills+=result.kills;}}
 assert.equal(kills,20);
 await game.evaluate(async()=>{__weaponQA.unequip();await __weaponQA.r.ensure(__weaponQA.g);});const unarmed=await game.evaluate(()=>__weaponQA.fight());assert(unarmed.hits.every(h=>h.action==='attack-unarmed'));
 await game.evaluate(()=>__weaponQA.returnLobby());assert(await game.evaluate(()=>__weaponQA.r.ensure(__weaponQA.g)));await game.evaluate(()=>__weaponQA.draw());
 if(output){await fs.writeFile(path.join(output,'combat.json'),JSON.stringify(results,null,2));await game.screenshot({path:path.join(output,'lobby-equipped.png')});}
 assert.deepEqual(errors,[]);console.log(JSON.stringify({fights,kills,unarmed:true,errors}));
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
