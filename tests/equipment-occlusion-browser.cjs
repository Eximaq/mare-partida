'use strict';
const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH});try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto((process.argv[2]||'http://127.0.0.1:8175/')+'tools/paper-doll-96-v3/');await page.waitForFunction(()=>window.__review96v3);
 const result=await page.evaluate(async()=>{
  const q=__review96v3,W=MareWeapons96.create(q.weaponCatalog,q.appearanceRigs);let outfits=0,bootPixels=0,glovePixels=0,hiddenHair=0,restoredHair=0,seraphimFrames=0,sleeveExpandedPixels=0;
  const read=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data,same=(a,b,i)=>[0,1,2,3].every(k=>a[i+k]===b[i+k]);
  for(const body of ['masculino','feminino'])for(const direction of ['south','north','east'])for(const action of ['idle','walk','attack-sword','attack-unarmed','attack-firearm','attack-daggers','attack-tech','attack-focus']){
   const selected=q.selection(body,action,direction),spec=MareMotion96.clipSpec(q.manifest,selected.clip),frame=action==='idle'?0:4,images=new Map(await Promise.all(Object.values(selected.layers).map(async f=>[f,await q.image(f)])));
   const render=async look=>{for(const [key,value]of await q.wardrobe.prepare(selected,look))images.set(key,value);const c=document.createElement('canvas');c.width=spec.width;c.height=spec.height;q.wardrobe.draw(c.getContext('2d'),images,selected,frame,spec,[],look);return read(c);};
   const base={weapon:'original',hair:'hair-spiky',hairColor:'purple',face:'face-calm',skin:'dark',head:'none',torso:'none',pants:'none',boots:'none',gloves:'none',cloak:'none'};
   for(const [torso,pants,boots,gloves,cloak,head]of [['item-6','item-21','item-8','item-25','item-23','item-18'],['item-7','item-22','item-9','item-26','item-24','item-19']]){
    const look={...base,torso,pants,boots,gloves,cloak,head},full=await render(look),withoutBoots=await render({...look,boots:'none'}),bootBase=await render({...base,boots}),bare=await render(base),gloveBase=await render({...base,gloves}),withoutGloves=await render({...look,gloves:'none'}),otherHair=await render({...look,hair:'hair-long',hairColor:'blue'});
    for(let i=0;i<full.length;i+=4){if(!same(bootBase,bare,i)&&bootBase[i+3]&&same(withoutBoots,bare,i)){assertPixel(full,bootBase,i,'boots over pants');bootPixels++;}if(!same(gloveBase,bare,i)&&gloveBase[i+3]&&!headAt(i)&&same(withoutGloves,bare,i)){assertPixel(full,gloveBase,i,'gloves over sleeve');glovePixels++;}}
    if(!full.every((v,i)=>v===otherHair[i]))throw Error('Visible helmet leaked hairstyle '+[body,direction,action,head]);hiddenHair++;
    const hidden=await render({...look,hideHeadgear:true}),removed=await render({...look,head:'none'});if(!hidden.every((v,i)=>v===removed[i]))throw Error('Headgear toggle did not restore hair');restoredHair++;outfits++;
    function headAt(i){const y=Math.floor(i/4/spec.width),neck=q.appearanceRigs.clips[body][action][direction].poses[frame].find(j=>j.label==='NECK');return y<neck.y*128+(spec.width-128)/2+3;}
    function assertPixel(a,b,i,kind){if(!same(a,b,i))throw Error(kind+' '+JSON.stringify({body,direction,action,torso,frame,pixel:i/4}));}
   }
  }
  const skin=new Set(MareAppearance96.skins.light.ramp.slice(1).map(c=>c.toLowerCase()));
  for(const body of ['masculino','feminino'])for(const action of ['idle','walk','attack-tech'])for(const direction of ['south','north','east']){
   const selected=q.selection(body,action,direction),spec=MareMotion96.clipSpec(q.manifest,selected.clip),look={weapon:'weapon-120',torso:'item-6',pants:'item-21',boots:'item-8',gloves:'item-26',skin:'light',head:'none',hair:'hair-swept',cloak:'none'},images=new Map(await Promise.all(Object.values(selected.layers).map(async f=>[f,await q.image(f)])));for(const [k,v]of await q.wardrobe.prepare(selected,look))images.set(k,v);
   for(let f=0;f<selected.clip.frames;f++){
    const c=document.createElement('canvas');c.width=spec.width*3;c.height=spec.height*3;const cx=c.getContext('2d');cx.scale(3,3);q.wardrobe.draw(cx,images,selected,f,spec,[],look);const p=read(c),pose=W.armPose(selected,f,look)||q.appearanceRigs.clips[body][action][direction].poses[f],j=Object.fromEntries(pose.map(v=>[v.label,{x:v.x*128+(spec.width-128)/2,y:v.y*128+(spec.width-128)/2}])),entry=W.plan(selected,f,spec,look)[0],side=entry.side,other=side==='LEFT'?'RIGHT':'LEFT',distance=(x,y,s)=>Math.min(MareMotion96.distanceToSegment({x,y},j[s+' SHOULDER'],j[s+' ELBOW']),MareMotion96.distanceToSegment({x,y},j[s+' ELBOW'],j[s+' ARM']));
    for(let y=Math.ceil(j.NECK.y+4);y<spec.height;y++)for(let x=0;x<spec.width;x++){if(distance(x,y,side)>3.4||distance(x,y,other)<=distance(x,y,side))continue;const i=((y*3+1)*c.width+x*3+1)*4,colour='#'+[0,1,2].map(k=>p[i+k].toString(16).padStart(2,'0')).join('');if(p[i+3]&&skin.has(colour))throw Error('Serafim exposed arm skin '+[body,action,direction,f,x,y]);}seraphimFrames++;
   }
  }
  const armour=q.weaponCatalog.items.find(w=>w.itemId===120).armour,padding=armour.sleevePadding,crossScale=armour.crossScale;
  for(const body of ['masculino','feminino'])for(const direction of ['south','north']){
   const selected=q.selection(body,'idle',direction),spec=MareMotion96.clipSpec(q.manifest,selected.clip),look={weapon:'weapon-120',torso:'item-6',pants:'item-21',boots:'item-8',gloves:'none',skin:'light',head:'none',hair:'hair-swept',cloak:'none'},images=new Map(await Promise.all(Object.values(selected.layers).map(async f=>[f,await q.image(f)])));for(const [k,v]of await q.wardrobe.prepare(selected,look))images.set(k,v);
   const render=()=>{const c=document.createElement('canvas');c.width=spec.width*3;c.height=spec.height*3;c.getContext('2d').scale(3,3);q.wardrobe.draw(c.getContext('2d'),images,selected,2,spec,[],look);return read(c);};
   let narrow;try{armour.sleevePadding=0;armour.crossScale=5.5;narrow=render();}finally{armour.sleevePadding=padding;armour.crossScale=crossScale;}
   const full=render();let expanded=0;for(let i=3;i<full.length;i+=4)if(full[i]&&!narrow[i])expanded++;if(!expanded)throw Error('Serafim sleeve did not expand '+body+'/'+direction);sleeveExpandedPixels+=expanded;
  }
  return{outfits,bootPixels,glovePixels,hiddenHair,restoredHair,seraphimFrames,sleeveExpandedPixels};
 });assert.deepEqual(errors,[]);assert(result.bootPixels>0&&result.glovePixels>0);assert.equal(result.outfits,96);assert.equal(result.seraphimFrames,120);console.log(JSON.stringify(result));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
