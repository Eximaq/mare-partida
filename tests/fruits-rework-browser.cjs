'use strict';
// Real Chromium renderer/asset smoke. Combat remains covered by the existing
// rank_s_browser.cjs fixture; this does not claim end-to-end skill gameplay.
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const {chromium}=require('playwright');
const base=process.env.MARE_TEST_URL||'http://127.0.0.1:8170/dist/';
const out=path.join(process.env.MARE_QA_DIR||require('node:os').tmpdir(),'reworks');
(async()=>{
 await fs.mkdir(out,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
 const errors=[],assets=[];
 try{
  const page=await browser.newPage({viewport:{width:1366,height:768}});
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400&&/\.(?:png|webp|js)(?:\?|$)/i.test(r.url()))assets.push(r.status()+' '+r.url());});
  page.on('requestfailed',r=>{if(/\.(?:png|webp|js)(?:\?|$)/i.test(r.url()))assets.push(r.failure()?.errorText+' '+r.url());});
  await page.route('**/api/**',r=>r.fulfill({status:404,body:'{}'}));
  await page.route('**/__dev_version',r=>r.fulfill({body:'stable'}));
  await page.goto(base);
  await page.waitForFunction(()=>window.MareRankSRework&&window.MareParameciaReworks&&window.MareZoanArt&&window.__mareDiagnostics);
  await page.locator('#characterName').fill('Reworks QA');
  await page.locator('#nextToClass').click();await page.locator('#nextToAppearance').click();
  await page.locator('#createCharacter').click();await page.locator('[data-confirm-accept]').click();
  await page.waitForFunction(()=>__mareDiagnostics().lobby96.state==='ready');
  const setup=await page.evaluate(async()=>{
   const images=new Map(),load=async url=>{if(images.has(url))return images.get(url);const im=new Image();im.src=url;await im.decode();if(!im.naturalWidth)throw Error('Empty image '+url);images.set(url,im);return im;};
   let frames=0;
   for(const fruit of Object.values(MareParameciaReworks.art))for(const effect of Object.values(fruit.effects)){
    const im=await load(effect.image);for(const f of effect.frames){if(f.x<0||f.y<0||f.x+f.w>im.naturalWidth||f.y+f.h>im.naturalHeight)throw Error('Frame outside '+effect.image);frames++;}
   }
   for(const e of Object.values(MareRankS.effects))await load(e.image);
   for(const id of ['akuma_mera_mera','akuma_hie_hie','akuma_gura_gura','akuma_tori_phoenix'])if(!await MareRankS.preload(id))throw Error('Rank S preload failed '+id);
   MareSpriteCombatV2.preload('ryu');MareSpriteCombatV2.preload('phoenix');
   MareRankB.preload();MareRankC.preload();MareDoru.preload();MareJiki.preload();
   const canvas=document.createElement('canvas');canvas.id='rework-smoke';canvas.width=360;canvas.height=300;
   Object.assign(canvas.style,{position:'fixed',left:'0',top:'0',maxWidth:'100vw',height:'auto',zIndex:'999999',background:'#132630'});document.body.append(canvas);
   const c=canvas.getContext('2d',{willReadFrequently:true});
   const paint=(ctx,key,index,x,y,w,h=w,angle=0,crop=null,anchor=null)=>{
    const e=MareRankS.effects[key],f=e?.frames[index],im=images.get(e?.image);if(!f||!im)throw Error('Invalid Rank S frame '+key+':'+index);
    if(f.x+(crop?.x||0)+(crop?.w||f.w)>im.naturalWidth||f.y+(crop?.y||0)+(crop?.h||f.h)>im.naturalHeight)throw Error('Source rectangle outside '+key);
    ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.drawImage(im,f.x+(crop?.x||0),f.y+(crop?.y||0),crop?.w||f.w,crop?.h||f.h,-w*(anchor?.x??.5),-h*(anchor?.y??.5),w,h);ctx.restore();return true;
   };
   const cases=[];const add=(name,draw)=>cases.push({name,draw});
   for(const [kind,age]of [['fireFist',.1],['fireRain',.1],['pillar',1],['hieSpears',.25],['hieBird',.25],['hieFreeze',.5],['guraCrack',.3],['guraSkull',.3],['phoenixDash',.6],['phoenixTotem',1.1],['phoenixEnergy',.4]]){
    for(const [dir,direction]of [['east',[1,0]],['south',[0,1]],['west',[-1,0]],['north',[0,-1]]])add(kind+'-'+dir,()=>{
     const hero={x:180,y:220,direction:dir},target={id:1,x:200,y:200,alive:true,hp:1000};
     const job={kind,id:1,started:0,duration:7,origin:{x:180,y:200},x:180,y:200,direction,targetId:1,hit:true,next:3,shots:Array.from({length:5},(_,i)=>({hit:false,released:0,top:80,point:{x:80+i*50,y:210}}))};
     for(const layer of ['back','front'])MareRankSRework.draw(c,job,age,[target],layer,hero,paint,MareRankS.effects,MareRankS.areaTiles);
    });
   }
   for(const id of ['akuma_mera_mera','akuma_tori_phoenix'])add(id+'-aura',()=>{for(const layer of ['back','front'])MareRankS.drawAura(c,id,180,220,.3,1,layer);});
   for(const direction of ['north','south','east','west'])for(const action of ['walk','bite','tail'])add('ryu-'+action+'-'+direction,()=>MareSpriteCombatV2.draw(c,'ryu',180,220,{action,direction,time:.3,progress:.6,hitRatio:.6}));
   for(const kind of ['bite','dust','leopard','giraffe-back','giraffe-front','giraffe-sweep','bison-back','bison-front','bison-dust','wolf-trail'])add('zoan-'+kind,()=>MareZoanArt.drawRework(c,kind,180,220,.1));
   add('hana-punch',()=>MareRankB.draw(c,'punch',180,150,100,{width:128}));
   add('mato-mark',()=>MareRankC.draw(c,'mark',180,150,500,{width:128,charges:3}));
   add('doru-flight',()=>MareDoru.draw(c,{key:'1',phase:'flight',elapsed:100,x:180,y:180,dx:1,dy:0}));
   add('jiki-assembly',()=>MareJiki.draw(c,'charge',180,150,3000,{width:128,assembling:true}));
   window.__reworkSmoke={cases,draw(index){c.clearRect(0,0,360,300);c.globalAlpha=1;cases[index].draw();return c.getImageData(0,0,360,300).data.some((v,i)=>i%4===3&&v>0);}};
   return {frames,names:cases.map(x=>x.name)};
  });
  await page.waitForFunction(()=>['north','south','east','west'].every(d=>['walk','bite','tail'].every(a=>MareSpriteCombatV2.status('ryu',a,d)==='ready')));
  for(const [width,height]of [[1366,768],[393,852]]){
   await page.setViewportSize({width,height});
   await page.locator('#rework-smoke').evaluate(e=>e.style.visibility='hidden');
   await page.screenshot({path:path.join(out,'game-'+width+'.png')});
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Game must not overflow horizontally');
   await page.locator('#rework-smoke').evaluate(e=>e.style.visibility='visible');
   for(let i=0;i<setup.names.length;i++){
    await page.waitForFunction(i=>__reworkSmoke.draw(i),i,{timeout:10000});
    const box=await page.locator('#rework-smoke').boundingBox();assert(box&&box.x>=0&&box.x+box.width<=width);
    await page.locator('#rework-smoke').screenshot({path:path.join(out,setup.names[i]+'-'+width+'.png')});
   }
  }
  assert.deepEqual(errors,[],'No page errors');assert.deepEqual(assets,[],'No missing script/image requests');
  await fs.writeFile(path.join(out,'summary.json'),JSON.stringify({viewports:[1366,393],frames:setup.frames,cases:setup.names,errors,assets},null,2));
  console.log(`Real browser smoke: ${setup.names.length} renderer cases × 2 viewports; ${setup.frames} decoded Paramecia frame bounds; no page/asset errors.`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
