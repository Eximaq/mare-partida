'use strict';
// Pixel regression: final equipment must not be repainted by hands or gloves.
const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH});try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto((process.argv[2]||'http://127.0.0.1:8175/')+'tools/paper-doll-96-v3/');await page.waitForFunction(()=>window.__review96v3);
 const result=await page.evaluate(async()=>{
  const q=__review96v3,W=MareWeapons96.create(q.weaponCatalog,q.appearanceRigs);let composites=0,weaponPixels=0,materials=0;
  for(const model of q.weaponCatalog.items){
   for(const m of [model,...Object.values(model.views||{})]){const image=await q.image(m.source),c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');x.drawImage(image,0,0);const d=x.getImageData(0,0,128,128).data;for(const p of [m.grip,m.tip])if(d[(p.y*128+p.x)*4+3]!==255)throw Error('Transparent socket '+model.itemId+' '+m.source);for(let i=3;i<d.length;i+=4)if(d[i]!==0&&d[i]!==255)throw Error('Alpha fringe '+m.source);materials++;}
   for(const body of ['masculino','feminino'])for(const gloves of ['original','item-25','item-26']){
    const attack=model.attackAction||'attack-'+model.category,cases=[['idle','south',0],['walk','south',4],[attack,'south',4]];
    if(attack==='attack-focus')for(let f=0;f<8;f++)cases.push([attack,'east',f]);
    for(const [action,direction,frame] of cases){
     const selected=q.selection(body,action,direction),spec=MareMotion96.clipSpec(q.manifest,selected.clip),look={weapon:model.id,torso:'item-6',pants:'item-21',boots:'item-8',skin:'light',gloves,inspectionBareHands:gloves==='original'},images=new Map(await Promise.all(Object.values(selected.layers).map(async f=>[f,await q.image(f)])));
     for(const [key,value]of await q.wardrobe.prepare(selected,look))images.set(key,value);
     const atlas=q.catalog.nativeOwnership.atlases[body][action],mask=document.createElement('canvas');mask.width=spec.width;mask.height=spec.height;const mx=mask.getContext('2d'),n=atlas.directions.indexOf(direction)*atlas.framesPerDirection+frame;mx.drawImage(images.get(atlas.file),n%atlas.columns*atlas.cell,Math.floor(n/atlas.columns)*atlas.cell,atlas.cell,atlas.cell,0,0,spec.width,spec.height);const owner=MareTorso96.unpack(mx.getImageData(0,0,mask.width,mask.height).data);
     const equipped=document.createElement('canvas'),weapon=document.createElement('canvas');equipped.width=weapon.width=spec.width*3;equipped.height=weapon.height=spec.height*3;const a=equipped.getContext('2d'),b=weapon.getContext('2d');for(const ctx of [a,b]){ctx.imageSmoothingEnabled=false;ctx.scale(3,3);}
     q.wardrobe.draw(a,images,selected,frame,spec,[],look);const plan=W.plan(selected,frame,spec,look,owner);if(!plan.every(e=>e.frontOfHand))throw Error('Incorrect hand priority');W.draw(b,images,plan,'back');W.draw(b,images,plan,'front');W.drawWorn(b,images,plan,spec);
     const bodyOnly=document.createElement('canvas');bodyOnly.width=spec.width*3;bodyOnly.height=spec.height*3;const base=bodyOnly.getContext('2d');base.scale(3,3);q.wardrobe.draw(base,images,selected,frame,spec,[],{...look,weapon:'original'});const bare=base.getImageData(0,0,bodyOnly.width,bodyOnly.height).data;
     const actual=a.getImageData(0,0,equipped.width,equipped.height).data,expected=b.getImageData(0,0,weapon.width,weapon.height).data;
     for(let i=0;i<expected.length;i+=4)if(expected[i+3]===255){const x=Math.floor(i/4%weapon.width/3),y=Math.floor(Math.floor(i/4/weapon.width)/3);if(plan.every(e=>e.depth==='back')&&bare[i+3]){const pose=q.appearanceRigs.clips[body][action][direction].poses[frame],pad=(spec.width-128)/2,at=side=>pose.find(j=>j.label===side+' ARM'),side=plan[0].side,a=at(side),o=at(side==='LEFT'?'RIGHT':'LEFT'),visible=owner.hands[y*spec.width+x]&&Math.hypot(x-a.x*128-pad,y-a.y*128-pad)<=Math.hypot(x-o.x*128-pad,y-o.y*128-pad);if(!visible)continue;}if(![0,1,2,3].every(k=>actual[i+k]===expected[i+k]))throw Error('Weapon repainted '+JSON.stringify({id:model.itemId,body,gloves,action,direction,frame,pixel:i/4,x,y,expected:Array.from(expected.slice(i,i+4)),actual:Array.from(actual.slice(i,i+4))}));weaponPixels++;}composites++;
    }
   }
  }
  return{composites,weaponPixels,materials};
 });assert.deepEqual(errors,[]);assert(result.composites>1000);console.log(JSON.stringify(result));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
