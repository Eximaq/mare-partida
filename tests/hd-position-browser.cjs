'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path');
const url=process.env.MARE_TEST_URL,dir=process.env.MARE_EVIDENCE_DIR;
if(!url||!dir)throw Error('Set MARE_TEST_URL and MARE_EVIDENCE_DIR');
(async()=>{
 await fs.mkdir(dir,{recursive:true});
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH,headless:true});
 try{
  const context=await browser.newContext({viewport:{width:1280,height:780},acceptDownloads:true});
  await context.addInitScript(()=>{
   const paint=CanvasRenderingContext2D.prototype.drawImage;
   CanvasRenderingContext2D.prototype.drawImage=function(image,...args){
    if(this.canvas.id==='figure'&&image.getContext)window.__benchImage=image;
    return paint.call(this,image,...args);
   };
   window.__fingerprint=async c=>{
    if(!c?.width||!c?.height)return null;
    const {data}=c.getContext('2d').getImageData(0,0,c.width,c.height);
    const hash=await crypto.subtle.digest('SHA-256',data);return [...new Uint8Array(hash)].join(',');
   };
  });
  const p=await context.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto(new URL('bancada-hd.html',url).href);await p.waitForFunction(()=>window.__benchImage&&document.querySelector('#part').value==='*');
  assert.equal(await p.locator('#catalog button').count(),92);
  const pixels=()=>p.evaluate(()=>__fingerprint(window.__benchImage));
  const waitPixels=async(expected,equal=true)=>{
   const until=Date.now()+60000;
   while(Date.now()<until){
    const hash=await pixels();if(hash&&(hash===expected)===equal)return hash;
    await new Promise(resolve=>setTimeout(resolve,60));
   }
   throw Error('A prévia não atingiu os pixels esperados. '+await p.locator('#status').innerText());
  };
  const initial=await waitPixels(null,false);
  await p.locator('[data-move="1,0"]').click();await waitPixels(initial,false);
  let edited=await pixels();
  await p.locator('#undo').click();await waitPixels(initial);
  await p.locator('#redo').click();await waitPixels(edited);
  await p.locator('#before').check();await waitPixels(initial);
  await p.locator('#before').uncheck();
  const number=async(id,value)=>{await p.locator('#'+id).fill(String(value));await p.locator('#'+id).press('Tab');};
  await waitPixels(edited);
  for(const [id,value] of [['angle',12],['size',125]]){
   const last=await pixels();await number(id,value);await waitPixels(last,false);
  }
  let last=await pixels();await p.locator('#flip').check();await waitPixels(last,false);
  last=await pixels();await p.locator('#layer').selectOption('body');await waitPixels(last,false);edited=await pixels();
  await p.locator('#before').check();await waitPixels(initial);await p.locator('#before').uncheck();await waitPixels(edited);
  await p.locator('#slot').selectOption('coat');
  await number('x',55);await number('y',35);await number('size',120);
  await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const inFrontOfHand=await pixels();await p.locator('#layer').selectOption('hand');
  await waitPixels(inFrontOfHand,false);edited=await pixels();
  await p.locator('#undo').click();await waitPixels(inFrontOfHand);await p.locator('#redo').click();await waitPixels(edited);
  await p.locator('#direction').selectOption('east');
  await p.waitForFunction(()=>document.querySelector('#status').textContent.includes('east')&&document.querySelector('#part').value==='*');
  await p.locator('#scope').selectOption('phase');await p.locator('[data-move="0,-1"]').click();
  await number('angle',8);await number('size',112);await p.locator('#flip').check();
  await p.locator('#mirror-west').click();
  await p.waitForFunction(()=>document.querySelector('#direction').value==='west'&&document.querySelector('#status').textContent.includes('west'));
  assert.equal(await p.locator('#angle').inputValue(),'-8');assert.equal(await p.locator('#size').inputValue(),'112');assert(await p.locator('#flip').isChecked());
  await p.locator('#mirror-east').click();
  await p.waitForFunction(()=>document.querySelector('#direction').value==='east'&&document.querySelector('#status').textContent.includes('east'));
  assert.equal(await p.locator('#angle').inputValue(),'8');
  const download=p.waitForEvent('download');await p.locator('#export').click();
  const file=await (await download).path(),manifest=JSON.parse(await fs.readFile(file,'utf8'));
  assert.equal(manifest.schema,2);assert.equal(manifest.records.length,4);
  const boots=manifest.records.find(r=>r.item===148),coat=manifest.records.find(r=>r.item===6&&r.direction==='east'),west=manifest.records.find(r=>r.item===6&&r.direction==='west');
  assert.deepEqual(boots.style.cycle,{angle:12,size:125,flip:true,layer:'body'});assert.equal(west.style.phases[0].angle,-8);assert.equal(coat.style.phases[0].angle,8);
  assert.equal(manifest.records.find(r=>r.item===6&&r.direction==='south').style.cycle.layer,'hand');
  assert.equal(boots.direction,'south');assert.deepEqual(boots.cycle,[1,0]);
  assert.equal(coat.direction,'east');assert.deepEqual(coat.cycle,[0,0]);assert.deepEqual(coat.phases,{'0':[0,-1]});
  await p.reload();await p.waitForFunction(()=>document.querySelector('#part').value==='*'&&document.querySelector('#x').value==='1');await waitPixels(edited);
  assert.equal(await p.locator('#x').inputValue(),'1');
  const persisted=await p.evaluate(()=>JSON.parse(localStorage.getItem('kaizoku-hd-position-draft-v1')));assert.deepEqual(persisted,manifest);
  await p.locator('#reset').click();await p.locator('#file').setInputFiles(file);
  await waitPixels(edited);
  assert.deepEqual(await p.evaluate(()=>JSON.parse(localStorage.getItem('kaizoku-hd-position-draft-v1'))),manifest);
  const altered=structuredClone(manifest);altered.records[0].source='0'.repeat(64);
  await p.locator('#file').setInputFiles({name:'incompativel.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(altered))});
  await p.waitForFunction(()=>document.querySelector('#status').dataset.error==='true');
  assert.equal(await pixels(),edited);
  await p.locator('#direction').selectOption('east');await p.locator('#direction').selectOption('west');
  await p.locator('#direction').selectOption('south');await p.waitForFunction(()=>document.querySelector('#status').textContent.includes('south'));await waitPixels(edited);
  await p.screenshot({path:path.join(dir,'bancada-desktop.png')});
  await p.setViewportSize({width:390,height:844});await p.screenshot({path:path.join(dir,'bancada-celular.png')});
  assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const cycles=[],directions=['south','east','north','west'];
  if(process.env.HD_MAP_CYCLES){
   await p.setViewportSize({width:1280,height:780});
   for(const item of [22,159,18])await p.locator('[data-id="'+item+'"]').click();
   const full=process.env.HD_MAP_CYCLES==='all',ids=full?[0,2,4,73,15,16,17]:[0,73];
   for(const [i,weapon] of ids.entries())for(const body of full?['masculino','feminino']:[i?'feminino':'masculino']){
    await p.locator('#look-gender').selectOption(body);await p.locator('[data-id="'+weapon+'"]').click();
    const role=await p.locator('#role').inputValue(),attack=await p.locator('#action option').evaluateAll(os=>os.find(o=>o.value.startsWith('attack-')).value);
    const poses=full?directions.flatMap(direction=>['idle','walk',attack].map(action=>[direction,action])):[i?['east',attack]:['west','walk']];
    for(const [direction,action] of poses){
     await p.locator('#direction').selectOption(direction);await p.locator('#action').selectOption(action);await p.locator('#slot').selectOption('boots');
     await p.waitForFunction(([a,d])=>document.querySelector('#status').textContent.startsWith(a+' · '+d+' ·')&&document.querySelector('#part').value==='*',[action,direction]);
     await p.locator('[data-move="0,1"]').click();assert.equal(await p.locator('#y').inputValue(),'1',role+'/'+body+'/'+action+'/'+direction);
     const hashes=await p.evaluate(async()=>{
      const timeline=document.querySelector('#tick'),result=[];
      for(let i=0;i<=+timeline.max;i++){timeline.value=i;timeline.dispatchEvent(new Event('input'));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));result.push(await __fingerprint(__benchImage));}return result;
     });
     assert(hashes.length&&hashes.every(Boolean));
     cycles.push({body,weapon,role,action,direction,hashes});
    }
   }
  }
  const approvals=cycles.length?await p.evaluate(()=>JSON.parse(localStorage.getItem('kaizoku-hd-position-draft-v1'))):manifest;
  const map=await context.newPage();map.on('pageerror',e=>errors.push(e.message));
  await map.route('**/hd-position-approved.json',r=>r.fulfill({json:approvals}));
  await map.route('**/game.js*',async route=>{
   const response=await route.fetch(),s=await response.text(),marker='  window.__mareDiagnostics=';
   assert(s.includes(marker));
   const hook=`window.__testPositionHunt=()=>{game.classId='sword';game.appearance96=MareCharacterAppearance.normalize({});game.equipment={coat:newItem(itemDefs[6],1,false),boots:newItem(itemDefs[148],1,false)};game.preferences={...game.preferences,hideHeadgear:false};enterHunt();autoPlay=false;autoSkills=false;world.hero.direction='south';};
    let probe=null;
    window.__positionPose=q=>{probe=q;window.__mapImage=null;game.classId=q.role;game.appearance96=MareCharacterAppearance.normalize({gender:q.body});
     game.equipment=Object.fromEntries(Object.entries({weapon:q.weapon,coat:6,legs:22,boots:148,gloves:159,head:18}).map(([s,id])=>[s,newItem(itemDefs[id],1,false)]));};
    window.__positionTick=t=>{probe.tick=t;window.__mapImage=null;};
    const draw=lobby96.draw.bind(lobby96);
    lobby96.draw=(ctx,p,o)=>{if(o.scene!=='hunt'||ctx.canvas.id!=='worldCanvas'||(!probe&&(o.action!=='idle'||o.direction!=='south')))return draw(ctx,p,o);
     if(probe)o={...o,action:probe.action,direction:probe.direction,progress:(probe.tick+.25)/probe.count,timing:null,weaponless:false};
     const before=ctx.drawImage;let image;ctx.drawImage=function(im,...args){image=im;return before.call(ctx,im,...args);};
     try{const ok=draw(ctx,p,o);if(ok&&image&&lobby96.worldVisual()?.coverage?.[0]?.slotRoutes?.boots?.item===148)window.__mapImage=image;return ok;}finally{ctx.drawImage=before;}
    };\n`;
   await route.fulfill({response,body:s.replace(marker,()=>hook+marker)});
  });
  await map.goto(url);await map.locator('#characterName').waitFor({state:'visible',timeout:180000});
  await map.locator('#characterName').fill('Bancada QA');await map.locator('#characterName').press('Tab');await map.locator('#nextToClass').click();
  if(!await map.locator('#nextToAppearance').isVisible())await map.locator('#nextToClass').click();
  await map.locator('#nextToAppearance').click();await map.locator('#createCharacter').click();await map.locator('[data-confirm-accept]').click();
  await map.evaluate(()=>__testPositionHunt());await map.waitForFunction(()=>window.__mapImage,null,{timeout:90000});
  assert.equal(await map.evaluate(()=>__fingerprint(__mapImage)),edited);
  await map.screenshot({path:path.join(dir,'mapa-ajustado.png')});
  for(const {hashes,...pose} of cycles){
   await map.evaluate(q=>__positionPose(q),{...pose,tick:0,count:hashes.length});
   for(let tick=0;tick<hashes.length;tick++){
    await map.evaluate(t=>__positionTick(t),tick);
    await map.waitForFunction(()=>window.__mapImage?.width>0,null,{timeout:90000});
    assert.equal(await map.evaluate(()=>__fingerprint(__mapImage)),hashes[tick],JSON.stringify({...pose,tick}));
   }
  }
  if(cycles.length)console.log(cycles.length+' ciclos comparados na cena da caçada, '+cycles.reduce((n,c)=>n+c.hashes.length,0)+' posições do relógio.');
  assert.deepEqual(errors,[]);
  console.log('92 itens no catálogo; edição, comparação, arquivo, histórico, rascunho, troca de direção, celular e igualdade RGBA na caçada.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
