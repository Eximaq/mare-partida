'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {chromium}=require('playwright');
const {choices}=require('../character-appearance.js');
const {classes}=require('../character-catalog.js').create({characters:require('../character-system.js')});
const out=process.env.MARE_EVIDENCE_DIR;
const catalogOnly=process.env.MARE_CATALOG_EQUIPMENT==='1';
const powers=process.env.MARE_CATALOG_POWERS==='1';
const start=Number(process.env.MARE_CATALOG_START||0);
const end=Number(process.env.MARE_CATALOG_END||(powers?1:catalogOnly?7:14));
const expectStarterHD=process.env.MARE_EXPECT_STARTER_HD==='1';
const checkStarterAttacks=process.env.MARE_CHECK_STARTER_ATTACKS==='1';
const checkCreationColor=process.env.MARE_CHECK_CREATION_COLOR==='1';
const cosmeticsField=process.env.MARE_COSMETICS_FIELD;
const cosmeticStart=Number(process.env.MARE_COSMETICS_START||0);
const cosmeticLimit=Number(process.env.MARE_COSMETICS_LIMIT||Infinity);
const itemMovement=process.env.MARE_CHECK_ITEM_MOVEMENT==='1';
const keepStarterCoat=process.env.MARE_KEEP_STARTER_COAT==='1';
const strictAssets=process.env.MARE_STRICT_VISUAL_ASSETS==='1';
const onlyGender=process.env.MARE_CATALOG_GENDER;
const onlyItems=new Set((process.env.MARE_CATALOG_ITEMS||'').split(',').filter(Boolean).map(Number));
const directions=[['d','east'],['a','west'],['w','north'],['s','south']];
const {healerWeaponIndex}=require('../item-catalog.js').create({forge:require('../forge-system.js'),prison:require('../prison-system.js'),haki:require('../haki-system.js'),akuma:require('../akuma-system.js'),hakiProgression:require('../haki-progression.js')});
const starter={sword:0,brawler:2,gunner:4,rogue:12,cyborg:14,strategist:16,healer:healerWeaponIndex};
const appearance=(gender,i)=>Object.fromEntries(Object.entries(choices).map(([key,options])=>[key,key==='gender'?gender:Object.keys(options)[i%Object.keys(options).length]]));

(async()=>{
 await fs.mkdir(out,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
 const evidence=[];
 try{
  for(const gender of Object.keys(choices.gender).filter(gender=>!onlyGender||gender===onlyGender)){
   for(let i=start;i<end;i++){
    const classId=Object.keys(classes)[i%Object.keys(classes).length],expected=appearance(gender,i);
    if(checkCreationColor)Object.assign(expected,{hairStyle:'hair-bob',hairColor:'pink'});
    if(cosmeticsField)Object.assign(expected,{hairStyle:'hair-bob',hairColor:'silver',eyeStyle:'original',eyeColor:'blue',skinColor:'light'});
    if(itemMovement)Object.assign(expected,{hairStyle:'hair-bob',hairColor:'pink',eyeStyle:'face-almond',eyeColor:'green',skinColor:'dark'});
    const context=await browser.newContext({viewport:{width:1440,height:960}});
    const page=await context.newPage(),errors=[];
    const result={id:gender+'/'+i,classId,expected,directions:{},errors,assetErrors:[]};
    evidence.push(result);
    page.on('pageerror',error=>errors.push(error.message));
    if(strictAssets)page.on('response',response=>{
     if(response.status()>=400&&/\/(?:rework-|paper-doll-96-v3\/)/.test(response.url()))result.assetErrors.push({status:response.status(),url:response.url()});
    });
    page.on('console',async message=>{
     if(message.type()!=='error'||!message.text().includes('[current-player-sprite]'))return;
     result.assetErrors.push(await message.args()[1]?.jsonValue().catch(()=>message.text()));
    });
    try{
     await page.route('**/__dev_version',route=>route.fulfill({body:'stable'}));
     await page.route('**/api/akuma/catalog',route=>route.fulfill({status:404,body:'{}'}));
     await page.route('**/game.js*',async route=>{
      const response=await route.fetch(),source=await response.text(),marker='  window.__mareDiagnostics=';
      assert(source.includes(marker));
      const probe=`
       const observed=lobby96.draw.bind(lobby96),frames=new Map(),pixels=document.createElement('canvas');
       pixels.width=pixels.height=160;
       const raster=pixels.getContext('2d',{willReadFrequently:true});
       lobby96.draw=function(ctx,player,o){
        if(!o.worldView||ctx.canvas.id!=='worldCanvas')return observed(ctx,player,o);
        let image;
        const drawImage=ctx.drawImage;
        ctx.drawImage=function(source,...args){image={source,args};return drawImage.call(this,source,...args);};
        let drawn;
        try{drawn=observed(ctx,player,o);}finally{ctx.drawImage=drawImage;}
        if(!drawn||!image)return drawn;
        const snap=lobby96.snapshot(),pose=snap.lastPose||snap.nativeHD.last;
        const direction=MarePaperDoll96Lobby.directionOf(o.direction),action=o.action;
        const publishedKey=snap.worldVisual?.publishedKey;
        const key=publishedKey+'/'+action+'/'+direction+'/'+pose.frame;
        if(!frames.has(key)){
         raster.clearRect(0,0,160,160);
         const {source,args}=image;
         const rect=args.length===8?args.slice(0,4):[0,0,source.width,source.height];
         raster.drawImage(source,...rect,0,0,160,160);
         let opaque=0,hash=2166136261;
         const data=raster.getImageData(0,0,160,160).data;
         for(let k=0;k<data.length;k++){hash=Math.imul(hash^data[k],16777619);if(k%4===3&&data[k])opaque++;}
         frames.set(key,{publishedKey,action,direction,frame:pose.frame,source:pose.source,weaponIds:pose.weaponIds,opaque,hash:hash>>>0,look:player.appearance96});
        }
        return drawn;
       };
       window.__appearanceCatalogQA={
        read:()=>({visual:lobby96.worldVisual(),frames:[...frames.values()],weapon:game?.equipment?.weapon?.def,fruit:game?.equipment?.akuma_no_mi?.fruitId,form:!!game?.zoanTransformed,displayedForm:!!lobby96.worldPlayer()?.zoanTransformed}),
        seedItems(){
         const eligible=itemDefs.map((def,id)=>({def,id})).filter(({def,id})=>MareForge.isGear({def:id},itemDefs)&&['coat','head','legs','boots','gloves','weapon','cloak'].includes(def.slot)&&(def.slot==='weapon'?def.type===game.classId:game.classId==='sword'||${itemMovement}));
         const items=eligible.map(({def,id})=>({def:id,slot:def.slot,item:newItem(def,1,false)}));
         game.inventory.push(...items.map(x=>x.item));
         return items.map(({def,slot,item})=>({def,slot,id:item.id}));
        },
        seedPowers(){
         return itemDefs.map((def,id)=>({def,id})).filter(({def})=>def.type==='akuma_no_mi').map(({def,id})=>{const item=newItem(def,1,false);game.inventory.push(item);return {id:item.id,def:id,fruitId:def.fruitId,zoan:MareAkuma.isZoan(MareAkuma.byId(def.fruitId))};});
        },
        clear(){frames.clear();},
        async encounter(direction){
         cancelBasicAttack();enterHunt();autoPlay=false;autoSkills=false;keys.clear();
         const deadline=performance.now()+90000;
         while(mapArtState()!=='ready'){
          if(performance.now()>deadline)throw Error('Combat map did not become ready');
          await new Promise(resolve=>setTimeout(resolve,50));
         }
         this.lane(direction);
         world.spawnClock=1e9;
         const [dx,dy]={south:[0,60],north:[0,-60],east:[60,0],west:[-60,0]}[direction];
         const x=world.hero.x+dx,y=world.hero.y+dy;
         world.mobs=[{...monsterTypes.cesar,id:'appearance-qa',type:'cesar',area:game.area,district:MareHunt.sectors(game.area)[0].id,level:1,alive:true,hp:100000,maxHP:100000,defense:0,magicDefense:0,x,y,anchorX:x,anchorY:y,attack:0,attackClock:1e9,speed:0,patrolClock:1e9,aggro:0,bob:0}];
         world.target=null;
         return camera.worldToScreen(x,y);
        },
        lane(direction){
         const nav=navigator(),vector={south:[0,1],north:[0,-1],east:[1,0],west:[-1,0]}[direction];
         for(let y=128;y<nav.map.height-128;y+=16)for(let x=128;x<nav.map.width-128;x+=16){
          if(!nav.clear({x,y},{x:x+vector[0]*130,y:y+vector[1]*130}))continue;
          Object.assign(world.hero,{x,y});camera.update(world.hero,activeMap(),0,true);return;
         }
         throw Error('No clear lane');
        }
       };
      `;
      await route.fulfill({response,body:source.replace(marker,probe+marker)});
     });
     await page.goto(process.env.MARE_TEST_URL,{waitUntil:'domcontentloaded',timeout:60000});
     await page.locator('#characterName').fill('Visual QA');
     await page.locator('#factionStep [data-faction=pirate]').click();
     await page.locator('#nextToClass').click();
     await page.locator('#classStep [data-class='+classId+']').click();
     await page.locator('#nextToAppearance').click();
     for(const [field,value] of Object.entries(expected))await page.locator('[data-appearance='+field+']').first().selectOption(value);
     if(checkCreationColor){
      const color=page.locator('#startOverlay [data-appearance=hairColor]');
      const preview=()=>page.locator('#creationLookCanvas').evaluate(canvas=>{
       const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
       let pink=0,silver=0;
       for(let i=0;i<data.length;i+=4){
        if(data[i+3]<250)continue;
        if(data[i]>120&&data[i]-data[i+1]>35&&data[i+2]-data[i+1]>15)pink++;
        if(data[i]>110&&data[i+1]-data[i]>5&&data[i+2]-data[i]>15)silver++;
       }
       return {pink,silver};
      });
      const ready=()=>page.waitForFunction(()=>document.querySelector('#creationLookState').textContent.startsWith('Prévia atualizada'));
      await color.selectOption('silver');
      await ready();
      const silver=await preview();
      await color.selectOption('pink');
      await ready();
      const pink=await preview();
      result.previewHair={silver,pink};
      assert(silver.silver>pink.silver&&pink.pink>silver.pink,JSON.stringify(result.previewHair));
     }
     await page.locator('#createCharacter').click();
     await page.locator('[data-confirm-accept]').click();
     await page.waitForFunction(()=>['ready','failed'].includes(window.__appearanceCatalogQA?.read().visual?.state),null,{timeout:60000});
     const read=()=>page.evaluate(()=>__appearanceCatalogQA.read());
     const initial=await read();
     result.visual=initial.visual;
     result.weapon=initial.weapon;
     if(classId in starter)assert.equal(initial.weapon,starter[classId]);
     assert.equal(initial.visual.state,'ready',initial.visual.error);
     const verifyStarterHD=expectStarterHD&&gender==='masculino'&&classId==='sword'&&expected.hairStyle==='original';
     if(checkCreationColor&&gender==='feminino'&&classId==='sword'){
      const walk=initial.visual.coverage.filter(p=>p.action==='walk');
      assert.equal(walk.length,4);
      for(const pose of walk)assert.equal(pose.frames,40);
     }
     if(verifyStarterHD){
      const poses=initial.visual.coverage.filter(p=>['idle','walk'].includes(p.action));
      assert.equal(poses.length,8);
      for(const pose of poses)assert.match(pose.source,/^carry0-.*-coat6-native$/);
     }
     for(const [key,direction] of directions){
      await page.evaluate(d=>__appearanceCatalogQA.lane(d),direction);
      await page.keyboard.down(key);
      try{
       await page.waitForFunction(d=>__appearanceCatalogQA.read().frames.filter(f=>f.action==='walk'&&f.direction===d).length>=2,direction,{timeout:6000});
      }finally{await page.keyboard.up(key);}
      await page.waitForFunction(d=>__appearanceCatalogQA.read().frames.some(f=>f.action==='idle'&&f.direction===d),direction,{timeout:6000});
      const data=(await read()).frames.filter(f=>f.direction===direction);
      for(const frame of data){
       assert(frame.opaque>0,'empty rendered raster');
       if(verifyStarterHD)assert.match(frame.source,/^carry0-.*-coat6-native$/);
       if(checkCreationColor&&classId==='sword')assert.match(frame.source,gender==='masculino'?/^carry0-.*hair-bob-coat6-native/:/^female0-.*coat6-native.*bob.*hair-palette:pink/);
       for(const [field,value] of Object.entries(expected))assert.equal(frame.look[field],value);
       if(frame.weaponIds)assert(frame.weaponIds.includes(initial.weapon),'starter weapon absent from drawn frame');
      }
      result.directions[direction]=data;
     }
     if(checkStarterAttacks){
      result.attacks={};
      for(const [,direction] of directions){
       await page.evaluate(()=>__appearanceCatalogQA.clear());
       const target=await page.evaluate(d=>__appearanceCatalogQA.encounter(d),direction);
       const canvas=page.locator('#worldCanvas'),box=await canvas.boundingBox();
       const size=await canvas.evaluate(c=>({width:c.width,height:c.height}));
       await canvas.click({position:{x:target.x*box.width/size.width,y:target.y*box.height/size.height}});
       await page.waitForFunction(d=>__appearanceCatalogQA.read().frames.filter(f=>f.action.startsWith('attack')&&f.direction===d).length>=3,direction,{timeout:10000});
       const frames=(await read()).frames.filter(f=>f.action.startsWith('attack')&&f.direction===direction);
       assert(frames.every(frame=>frame.opaque>0&&(!frame.weaponIds||frame.weaponIds.includes(initial.weapon))));
       if(checkCreationColor&&gender==='masculino'&&classId==='sword'&&['east','west','north'].includes(direction))
        for(const frame of frames)assert.match(frame.source,/^sword0-.*-(?:native-attachment|historical-attack)-coat6-adapted-bob/);
       result.attacks[direction]=frames;
      }
     }
     assert.deepEqual(errors,[]);
     if(strictAssets)assert.deepEqual(result.assetErrors,[]);
     result.status='EXERCITADO'; // Emitted pixels and identities, not an independent visual comparison.
     if(cosmeticsField){
      result.cosmetics=[];
      const outFile=path.join(out,'cosmetics.json');
      for(const option of Object.keys(choices[cosmeticsField]).slice(cosmeticStart,cosmeticStart+cosmeticLimit)){
       const entry={field:cosmeticsField,option,directions:{}};
       result.cosmetics.push(entry);
       await fs.writeFile(outFile,JSON.stringify(evidence,null,2));
       await page.locator('#mainMenu [data-panel=character]').click();
       await page.locator('#characterQuickMenu [data-character-section=status]').click();
       await page.locator('#dialogBody [data-character-section=appearance]').click();
       await page.locator('#profileAppearance [data-appearance='+cosmeticsField+']').selectOption(option);
       await page.locator('[data-appearance-apply]').click();
       await page.keyboard.press('Escape');
       await page.waitForFunction(({field,option})=>{const q=__appearanceCatalogQA.read();return q.visual?.state==='ready'&&q.frames.some(f=>f.publishedKey===q.visual.publishedKey&&f.look[field]===option);},{field:cosmeticsField,option},{timeout:30000});
       for(const [key,direction] of directions){
        await page.evaluate(d=>{__appearanceCatalogQA.clear();__appearanceCatalogQA.lane(d);},direction);
        await page.keyboard.down(key);
        try{await page.waitForFunction(d=>__appearanceCatalogQA.read().frames.filter(f=>f.direction===d&&f.action==='walk').length>=3,direction,{timeout:8000});}
        finally{await page.keyboard.up(key);}
        await page.waitForFunction(d=>__appearanceCatalogQA.read().frames.some(f=>f.direction===d&&f.action==='idle'),direction,{timeout:8000});
        const frames=(await read()).frames.filter(f=>f.direction===direction);
        assert(frames.every(f=>f.opaque>0&&f.look[cosmeticsField]===option));
        entry.directions[direction]=frames;
       }
       await fs.writeFile(outFile,JSON.stringify(evidence,null,2));
      }
      const distinct=Object.fromEntries(directions.map(([,d])=>[d,new Set(result.cosmetics.map(e=>e.directions[d].find(f=>f.action==='idle')?.hash)).size]));
      result.distinctIdleRasters=distinct;
      const visibleDirections=cosmeticsField.startsWith('eye')?['south','east','west']:['south','north','east','west'];
      for(const d of visibleDirections)assert.equal(distinct[d],result.cosmetics.length,'Distinct '+cosmeticsField+' pixels in '+d);
      if(strictAssets)assert.deepEqual(result.assetErrors,[]);
     }
     if(catalogOnly){
      result.items=[];
      if(itemMovement&&!keepStarterCoat){
       await page.locator('#mainMenu [data-panel=inventory]').click();
       await page.locator('[data-inv-slot=coat]').click();
       await page.locator('[data-unequip=coat]').click();
       await page.locator('[data-close-panel]').click();
      }
      for(const item of (await page.evaluate(()=>__appearanceCatalogQA.seedItems())).filter(item=>!onlyItems.size||onlyItems.has(item.def))){
       const record={def:item.def,slot:item.slot};
       result.items.push(record);
       try{
        await page.locator('#mainMenu [data-panel=inventory]').click();
        const target=page.locator('[data-item="'+item.id+'"]');
        if(!await target.count()){
         const next=page.getByRole('button',{name:'Próxima página'});
         const seen=new Set();
         while(!await target.count()&&await next.isEnabled()){
          const index=await next.getAttribute('data-inv-page');
          if(seen.has(index))break;
          seen.add(index);await next.click();
         }
        }
        await target.press('Enter',{timeout:8000});
        await page.locator('[data-equip="'+item.id+'"]').press('Enter',{timeout:8000});
        await page.locator('[data-close-panel]').click();
        await page.evaluate(()=>__appearanceCatalogQA.clear());
        await page.waitForFunction(()=>{
         const {visual,frames}=__appearanceCatalogQA.read();
         return visual?.state==='failed'||(visual?.state==='ready'&&frames.some(frame=>frame.publishedKey===visual.publishedKey));
        },null,{timeout:30000});
        const state=await read();
        assert.equal(state.visual.state,'ready',state.visual.error);
        const selected=JSON.parse(JSON.parse(state.visual.publishedKey)[1])[4];
        assert(selected.some(([slot,def])=>slot===item.slot&&def===item.def));
        record.frames=state.frames.filter(frame=>frame.publishedKey===state.visual.publishedKey);
        if(item.slot==='weapon'&&record.frames.some(f=>f.weaponIds))assert(record.frames.some(f=>f.weaponIds?.includes(item.def)));
        if(itemMovement){
         record.directions={};
         for(const [key,direction] of directions){
          await page.evaluate(d=>{__appearanceCatalogQA.clear();__appearanceCatalogQA.lane(d);},direction);
          await page.keyboard.down(key);
          try{
           await page.waitForFunction(d=>__appearanceCatalogQA.read().frames.filter(f=>f.action==='walk'&&f.direction===d).length>=3,direction,{timeout:8000});
          }finally{await page.keyboard.up(key);}
          await page.waitForFunction(d=>__appearanceCatalogQA.read().frames.some(f=>f.action==='idle'&&f.direction===d),direction,{timeout:8000});
          const frames=(await read()).frames.filter(f=>f.direction===direction);
          assert(frames.every(frame=>frame.opaque>0&&frame.publishedKey===state.visual.publishedKey));
          record.directions[direction]=frames;
         }
         if(strictAssets)assert.deepEqual(result.assetErrors,[]);
         record.nativeDirections=Object.entries(record.directions).filter(([,frames])=>frames.every(frame=>!frame.source.startsWith('native96'))).map(([direction])=>direction);
         if(item.slot==='head'&&keepStarterCoat)for(const frames of Object.values(record.directions))for(const frame of frames)assert.match(frame.source,new RegExp('(?:head:|bob:)'+item.def+'(?:[:]|$)'));
         if(item.def===21&&gender==='masculino')for(const frames of Object.values(record.directions))for(const frame of frames)assert.match(frame.source,/pants21-native/);
         if(item.def===168&&gender==='feminino')for(const frames of Object.values(record.directions))for(const frame of frames){
          assert.match(frame.source,/pants168-native.*hair-palette:pink.*eye-palette:green/);
          if(keepStarterCoat)assert.match(frame.source,/coat6-native-pants168-native/);
         }
        }
        record.status='EXERCITADO';
       }catch(error){
        record.status='FALHOU';record.error=error.message;
        await page.keyboard.press('Escape');
       }
       await fs.writeFile(path.join(out,'equipment.json'),JSON.stringify(evidence,null,2));
      }
     }
     if(powers){
      result.powers=[];
      const fruits=(await page.evaluate(()=>__appearanceCatalogQA.seedPowers())).filter(item=>item.zoan);
      for(const item of fruits){
       const record={fruitId:item.fruitId,def:item.def};
       result.powers.push(record);
       try{
        await page.locator('#mainMenu [data-panel=inventory]').click();
        await page.locator('[data-item="'+item.id+'"]').press('Enter',{timeout:6000});
        await page.locator('[data-equip="'+item.id+'"]').press('Enter',{timeout:6000});
        await page.locator('[data-close-panel]').click();
        const ready=async()=>{
         await page.waitForFunction(()=>['ready','failed'].includes(__appearanceCatalogQA.read().visual?.state),null,{timeout:35000});
         const state=await read();
         assert.equal(state.visual.state,'ready',state.visual.error);
         assert.equal(state.displayedForm,state.form);
         return state;
        };
        await page.waitForFunction(id=>__appearanceCatalogQA.read().fruit===id,item.fruitId,{timeout:6000});
        const equipped=await ready();
        if(!equipped.form){
         await page.keyboard.press('t');
         await page.waitForFunction(()=>__appearanceCatalogQA.read().form,null,{timeout:6000});
         await ready();
        }
        await page.keyboard.press('t');
        await page.waitForFunction(()=>!__appearanceCatalogQA.read().form,null,{timeout:6000});
        const restored=await ready();
        await page.waitForFunction(()=>{const {visual,frames}=__appearanceCatalogQA.read();return frames.some(f=>f.publishedKey===visual.publishedKey&&f.opaque>0&&f.weaponIds?.includes(0));},null,{timeout:6000});
        record.restored=restored.visual.publishedKey;
        record.formReadiness='published';
        record.status='EXERCITADO';
       }catch(error){record.status='FALHOU';record.error=error.message;await page.keyboard.press('Escape');}
       await fs.writeFile(path.join(out,'powers.json'),JSON.stringify(evidence,null,2));
      }
     }
     if(i===0)await page.locator('#worldCanvas').screenshot({path:path.join(out,gender+'.png')});
    }catch(error){
     result.status='FALHOU';result.error=error.message;
     result.last=await page.evaluate(()=>window.__appearanceCatalogQA?.read()).catch(()=>null);
    }finally{
     await fs.writeFile(path.join(out,powers?'powers.json':catalogOnly?'equipment.json':cosmeticsField?'cosmetics.json':'creation.json'),JSON.stringify(evidence,null,2));
     await context.close();
     console.log(result.id+' '+classId+' '+result.status+' '+(result.error||''));
    }
   }
  }
 }finally{await browser.close();}
 if(evidence.some(r=>r.status==='FALHOU'||r.items?.some(item=>item.status==='FALHOU')||r.powers?.some(item=>item.status==='FALHOU')))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
