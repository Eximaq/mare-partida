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
    const context=await browser.newContext({viewport:{width:1440,height:960}});
    const page=await context.newPage(),errors=[];
    const result={id:gender+'/'+i,classId,expected,directions:{},errors,assetErrors:[]};
    evidence.push(result);
    page.on('pageerror',error=>errors.push(error.message));
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
         const eligible=itemDefs.map((def,id)=>({def,id})).filter(({def,id})=>MareForge.isGear({def:id},itemDefs)&&['coat','head','legs','boots','gloves','weapon','cloak'].includes(def.slot)&&(def.slot==='weapon'?def.type===game.classId:game.classId==='sword'));
         const items=eligible.map(({def,id})=>({def:id,slot:def.slot,item:newItem(def,1,false)}));
         game.inventory.push(...items.map(x=>x.item));
         return items.map(({def,slot,item})=>({def,slot,id:item.id}));
        },
        seedPowers(){
         return itemDefs.map((def,id)=>({def,id})).filter(({def})=>def.type==='akuma_no_mi').map(({def,id})=>{const item=newItem(def,1,false);game.inventory.push(item);return {id:item.id,def:id,fruitId:def.fruitId,zoan:MareAkuma.isZoan(MareAkuma.byId(def.fruitId))};});
        },
        clear(){frames.clear();},
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
       for(const [field,value] of Object.entries(expected))assert.equal(frame.look[field],value);
       if(frame.weaponIds)assert(frame.weaponIds.includes(initial.weapon),'starter weapon absent from drawn frame');
      }
      result.directions[direction]=data;
     }
     assert.deepEqual(errors,[]);
     result.status='EXERCITADO'; // Emitted pixels and identities, not an independent visual comparison.
     if(catalogOnly){
      result.items=[];
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
     await fs.writeFile(path.join(out,powers?'powers.json':catalogOnly?'equipment.json':'creation.json'),JSON.stringify(evidence,null,2));
     await context.close();
     console.log(result.id+' '+classId+' '+result.status+' '+(result.error||''));
    }
   }
  }
 }finally{await browser.close();}
 if(evidence.some(r=>r.status==='FALHOU'||r.items?.some(item=>item.status==='FALHOU')||r.powers?.some(item=>item.status==='FALHOU')))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
