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
  if(process.argv.includes('--positions')){
   const sel=id=>p.locator('#'+id);
   const ready=dir=>p.waitForFunction(d=>document.querySelector('#status').textContent.startsWith('walk · '+d+' ·')&&document.querySelector('#clock').textContent.includes(' / '),dir);
   const wear=async(id,dir)=>{await p.locator('[data-id="'+id+'"]').click();await ready(dir);};
   const focus=async(slot)=>{await sel('slot').selectOption(slot);await sel('part').selectOption('*');};
   const xy=async()=>[Number(await sel('x').inputValue()),Number(await sel('y').inputValue())];
   const move=async(x,y)=>{for(const [id,value] of [['x',x],['y',y]]){await sel(id).fill(String(value));await sel(id).press('Tab');}};
   const frame=async()=>{await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));return pixels();};
   await sel('action').selectOption('walk');await sel('direction').selectOption('east');await ready('east');await focus('boots');
   await sel('tick').fill('5');await move(5,-2);await sel('pin-slot').check();
   for(const id of [151,7,151,0]){
    await wear(id,'east');assert.equal(await sel('slot').inputValue(),'boots');assert.equal(await sel('tick').inputValue(),'5');
    assert.deepEqual(await xy(),[5,-2]);const drawn=await frame();await sel('before').check();await waitPixels(drawn,false);await sel('before').uncheck();await waitPixels(drawn);
   }
   await sel('apply-positions').click();await wear(22,'east');
   await focus('legs');await move(-3,3);await sel('apply-positions').click();
   await focus('coat');await move(6,2);await sel('apply-positions').click();
   for(const direction of ['north','west','south','east']){
    await sel('direction').selectOption(direction);await ready(direction);
    for(const [slot,expected] of [['coat',[6,2]],['legs',[-3,3]],['boots',[5,-2]]]){
     await focus(slot);assert.deepEqual(await xy(),expected);
     const moved=await frame();await sel('outfit-position').click();await move(0,0);await waitPixels(moved,false);
     await sel('reset').click();await waitPixels(moved);assert.deepEqual(await xy(),expected);assert.equal(await sel('outfit-position').getAttribute('aria-pressed'),'false');
    }
   }
   await sel('direction').selectOption('south');await ready('south');await focus('coat');
   await move(4,-3);await sel('outfit-position').click();await move(8,-1);
   await wear(8,'south');assert.deepEqual(await xy(),[4,-3]);await wear(148,'south');assert.deepEqual(await xy(),[8,-1]);
   await sel('outfit-position').click();assert.deepEqual(await xy(),[4,-3]);
   await sel('action').selectOption('idle');await p.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('idle · south ·'));
   assert.deepEqual(await xy(),[0,0]);await move(-2,2);await p.locator('[data-id="8"]').click();
   await p.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('idle · south ·'));assert.deepEqual(await xy(),[-2,2]);
   await sel('action').selectOption('walk');await ready('south');assert.deepEqual(await xy(),[4,-3]);await wear(148,'south');
   await sel('direction').selectOption('east');await ready('east');
   await focus('coat');await wear(7,'east');assert.deepEqual(await xy(),[0,0]);await wear(151,'east');assert.deepEqual(await xy(),[6,2]);
   await focus('legs');await wear(21,'east');assert.deepEqual(await xy(),[0,0]);await wear(22,'east');assert.deepEqual(await xy(),[-3,3]);
   await focus('boots');await wear(8,'east');assert.deepEqual(await xy(),[0,0]);await wear(148,'east');assert.deepEqual(await xy(),[5,-2]);
   await sel('outfit-position').click();await move(9,-2);await focus('weapon');await sel('remove').click();await ready('east');
   await focus('boots');assert.deepEqual(await xy(),[5,-2]);await wear(0,'east');assert.deepEqual(await xy(),[9,-2]);
   const downloaded=p.waitForEvent('download');await sel('export').click();const file=await (await downloaded).path();
   const manifest=JSON.parse(await fs.readFile(file,'utf8'));assert.equal(manifest.records.filter(r=>r.range==='motion').length,3);
   const fresh=await browser.newPage();
   try{
    await fresh.goto(new URL('bancada-hd.html',url).href);await fresh.waitForFunction(()=>document.querySelector('#part').value==='*');
    await fresh.locator('#file').setInputFiles(file);
    await fresh.waitForFunction(()=>localStorage.getItem('kaizoku-hd-position-draft-v1')||document.querySelector('#status').dataset.error==='true');
    assert.equal(await fresh.locator('#status').getAttribute('data-error'),'false',await fresh.locator('#status').innerText());
    assert.deepEqual(await fresh.evaluate(()=>JSON.parse(localStorage.getItem('kaizoku-hd-position-draft-v1'))),manifest);
    const signed=manifest.records.find(r=>r.item===148&&r.range==='outfit');
    const {range,witness,...legacy}=signed;
    const old={...manifest,schema:1,records:[{...legacy,cycle:[4,1]}]};
    await fresh.locator('#file').setInputFiles({name:'rascunho-antigo.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(old))});
    await fresh.waitForFunction(()=>JSON.parse(localStorage.getItem('kaizoku-hd-position-draft-v1')).records.length===2||document.querySelector('#status').dataset.error==='true');
    assert.equal(await fresh.locator('#status').getAttribute('data-error'),'false',await fresh.locator('#status').innerText());
    await fresh.locator('#action').selectOption('walk');await fresh.locator('#direction').selectOption('east');
    await fresh.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('walk · east ·')&&document.querySelector('#x').value==='4');
    assert.equal(await fresh.locator('#y').inputValue(),'1');
   }finally{await fresh.close();}
   assert.deepEqual(errors,[]);console.log('Bota 148, peitoral 151 e calça 22 ajustados separadamente nas quatro direções. Trocas, fase mantida, exceção de arma, restauração e arquivo verificados.');return;
  }
  if(process.argv.includes('--boots')){
   const ids=await p.locator('#catalog button').evaluateAll(bs=>bs.filter(b=>b.querySelector('small')?.textContent.startsWith('Botas ·')).map(b=>+b.dataset.id));
   assert.equal(new Set(ids).size,10);let comparisons=0;
   for(const body of ['masculino','feminino']){
    await p.locator('#look-gender').selectOption(body);
    for(const direction of ['south','east','north','west']){
     await p.locator('#direction').selectOption(direction);
     for(const id of ids){
      await p.locator('[data-id="'+id+'"]').click();
      await p.waitForFunction(d=>document.querySelector('#status').textContent.startsWith('idle · '+d+' ·')&&document.querySelector('#part option[value="*"]'),direction);
      const feet=await p.locator('#part option').evaluateAll(os=>os.map(o=>o.value).filter(v=>v.startsWith('foot:')));
      assert.equal(feet.length,2,[body,direction,id].join('/'));
      await p.locator('#part').selectOption('*');
      assert.ok((await p.locator('#details').innerText()).startsWith('#'+id+' ·'));
      const original=await pixels();
      for(const foot of feet){
       await p.locator('#part').selectOption(foot);
       await p.locator('[data-move="1,0"]').click();await waitPixels(original,false);
       await p.locator('#reset').click();await waitPixels(original);comparisons++;
      }
     }
    }
   }
   assert.equal(comparisons,160);assert.deepEqual(errors,[]);
   console.log('160 edições e restaurações de pés em repouso, dez botas nos dois corpos e nas quatro direções.');return;
  }
  const initial=await waitPixels(null,false);
  const moveFoot=async(part,x)=>{await p.locator('#part').selectOption(part);await p.locator('#x').fill(String(x));await p.locator('#x').press('Tab');};
  const panelIds=await p.locator('#part option').evaluateAll(os=>os.map(o=>o.value));
  for(const side of ['left','right']){
   const group='foot:'+side,panels=panelIds.filter(id=>id.startsWith('boot148-'+side+'-'));assert(panels.length>=2);
   await moveFoot(group,5);const grouped=await waitPixels(initial,false);
   await p.locator('#reset').click();await waitPixels(initial);
   for(const panel of panels)await moveFoot(panel,5);
   // The independently moved front, rear and lining form exactly one boot.
   await waitPixels(grouped);
   for(const panel of panels){await p.locator('#part').selectOption(panel);await p.locator('#reset').click();}
   await waitPixels(initial);
  }
  await p.locator('#part').selectOption('*');
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
  await moveFoot('foot:left',6);await waitPixels(edited,false);edited=await pixels();
  await p.locator('#part').selectOption('foot:right');assert.equal(await p.locator('#x').inputValue(),'0');
  await p.locator('#part').selectOption('*');await p.locator('#slot').selectOption('coat');
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
  assert.equal(manifest.schema,3);assert.equal(manifest.records.length,7);
  assert.deepEqual(manifest.records.find(r=>r.part==='foot:left').cycle,[6,0]);
  const boots=manifest.records.find(r=>r.item===148&&r.part==='*'&&r.style),coat=manifest.records.find(r=>r.item===6&&r.direction==='east'),west=manifest.records.find(r=>r.item===6&&r.direction==='west');
  assert.deepEqual(boots.style.cycle,{angle:12,size:125,flip:true,layer:'body'});assert.equal(west.style.phases[0].angle,-8);assert.equal(coat.style.phases[0].angle,8);
  assert.equal(manifest.records.find(r=>r.item===6&&r.direction==='south'&&r.style).style.cycle.layer,'hand');
  assert.equal(boots.direction,'south');assert.deepEqual(manifest.records.find(r=>r.item===148&&r.part==='*'&&r.range==='direction').cycle,[1,0]);
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
     if(!full&&action==='walk'){
      await p.locator('#direction').selectOption('east');
      await p.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('walk · east ·'));
      await p.locator('[data-move="0,1"]').click();await p.locator('#apply-positions').click();
      await p.locator('#direction').selectOption(direction);
      await p.waitForFunction(d=>document.querySelector('#status').textContent.startsWith('walk · '+d+' ·'),direction);
     }else await p.locator('[data-move="0,1"]').click();
     assert.equal(await p.locator('#y').inputValue(),'1',role+'/'+body+'/'+action+'/'+direction);
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
