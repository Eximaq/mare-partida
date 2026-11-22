'use strict';
const path=require('node:path'),assert=require('node:assert/strict'),R=process.env.STAGE||path.resolve(__dirname,'..'),r=f=>require(path.join(R,f));
const {make,cv}=r('tests/rework-integration-support.cjs'),A=r('character-appearance'),load=r('tools/rework-hd-test-loader.cjs').create(R),index=r('tools/rework-modular-outfits-hd/index.json');
const {items}=r('item-catalog').create({forge:r('forge-system'),prison:r('prison-system'),haki:r('haki-system'),akuma:r('akuma-system'),hakiProgression:r('haki-progression')});
const p='tools/rework-modular-outfits-hd/assets/',opts={consumer:'world',direction:'east',action:'walk'};
const boots=[9,162],parse=x=>x==='none'?null:Number(x);
const looks={light:{skinColor:'light'},ebony:{skinColor:'ebony',hairStyle:'hair-cropped',hairColor:'blue'}};
const C=(w=512)=>cv.createCanvas(w,w),pixels=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
const actor=(w,b,t,preserveStock=false)=>A.commit({classId:w==null?'brawler':items[w].type,equipment:{weapon:w==null?null:{def:w},boots:b==null?null:{def:b}}},{gender:'feminino',...looks[t],...(w==null&&!preserveStock?{hairStyle:'hair-cropped',hairColor:'blue'}:{})},()=>true);
async function prove(){
 const api=make();await api.ready;
 let tested=0;
 const w=parse(process.env.ARM||'none'),skin=process.env.SKIN||'light';
 for(const boot of boots.filter(x=>!process.env.BOOT||+process.env.BOOT===x)){
  const off=actor(w,null,skin),on=actor(w,boot,skin),base=api.selectVisual(off,opts),source=api.selectVisual(on,opts);
  assert(source?.profileLayers?.boots,'missing exact East profile boots '+[w,boot,skin]);
  assert.deepEqual(base.profileLayers.body,source.profileLayers.body);
  assert.deepEqual(source.pack,base.pack);assert.equal(source.slotRoutes.boots.item,boot);
  assert.equal(source.slotRoutes.weapon?.item,w??undefined);assert.deepEqual(source.omitted,[]);
  const d=source.profileLayers.spec.directions.east,layers=source.profileLayers.boots,
   donor=index.records.find(x=>x.id===`frozen-v47-female-151-boot${boot}-east-walk`);
  assert.deepEqual(layers,donor.pack.directions.east.layers.filter(l=>l.id.startsWith('boot'+boot+'-')));
  const saved=JSON.stringify(on),ticks=[...new Set(d.clock)].map(k=>d.clock.indexOf(k));
  async function collect(a,q){
   const b=await api.prepareConfiguration([{player:a,options:opts,source:q}],{resolve:x=>x});
   assert.equal(b.coverage[0].frames,40);
   const m=new Map();
   try{for(const t of ticks){
    let c;assert(b.draw({save(){},restore(){},drawImage(i){c=i;}},a,{...opts,progress:(t+.125)/40}));m.set(t,pixels(c));
   }}finally{b.release();global.gc?.();}
   return m;
  }
  const nakedSource={...base,id:base.id+':bare-animation-proof',profileLayers:{...base.profileLayers,body:{...base.profileLayers.body,item:null,paddingPhysical:0,states:base.profileLayers.body.states.map(st=>({...st,parts:[]}))}}};
  const before=await collect(off,base),after=await collect(on,source),naked=w==null?before:await collect(off,nakedSource);
  const original=api.selectVisual(actor(null,null,'light',true),opts);
  assert(original?.id.includes('female-coat67-east-own-bare'));
  assert(!api.selectVisual(actor(null,boot,'light',true),opts)?.profileLayers?.boots,'do not replace the original 5-tick bare clock');
  const pad=source.profileLayers.body.paddingPhysical||0,W=512+2*pad;
  const mem=new Map(),image=f=>{if(!mem.has(f))mem.set(f,load(f));return mem.get(f);};
  let overlap=0,physical=0;
  for(const tick of ticks){
   const phase=d.clock[tick],raw=C(),a=raw.getContext('2d'),f=C(),fg=f.getContext('2d'),signed=C(),sg=signed.getContext('2d'),bootMask=C(),bm=bootMask.getContext('2d');
   a.drawImage(await image(p+donor.pack.directions.east.layers.find(x=>x.id==='visible-clothed-composite').frames[tick]+'.png'),0,0);
   for(const l of d.poses[phase].layers)sg.drawImage(await image(l.source),0,0);
   fg.drawImage(await image(d.poses[phase].bareForeground),0,0);
   const original=await Promise.all(layers.map(l=>image(p+l.frames[tick]+'.png')));
   const pngs=original.map(img=>{
    const c=C(),ctx=c.getContext('2d');ctx.drawImage(img,0,0);
    const raw=pixels(c);for(let j=3;j<300*2048;j+=4)assert(raw[j]<=1,'only isolated alpha=1 is outside foot');
    ctx.clearRect(0,0,512,300);return c;
   });
   for(const im of pngs)bm.drawImage(im,0,0);
   const alpha=pixels(bootMask),A0=pixels(raw),B0=pixels(signed),foreground=pixels(f);
   for(let k=0;k<alpha.length;k+=4)if(alpha[k+3]){
    assert(k/2048>=300,'no detached or upper-body pixels in owned boots');
    assert.equal(foreground[k+3],0,'shoe must not cover the authored wrist/arm restore');
    assert.equal(A0.readUInt32LE(k),B0.readUInt32LE(k),'profile boot receptor must equal signed composed ankle pixel');
   }
   const pre=before.get(tick),post=after.get(tick),blank=naked.get(tick),board=C(W),bc=board.getContext('2d'),under=C(),uc=under.getContext('2d');
   const b=uc.createImageData(512,512);b.data.set(blank);uc.putImageData(b,0,0);
   for(const [i,l] of layers.entries())if(l.depth<0)bc.drawImage(pngs[i],pad,pad);
   bc.drawImage(under,pad,pad);
   for(const [i,l] of layers.entries())if(l.depth>0)bc.drawImage(pngs[i],pad,pad);
   const expected=pixels(board);
   let changed=0;
   for(let y=0;y<W;y++)for(let x=0;x<W;x++){
    const n=(y*W+x)*4,q=((y-pad)*512+x-pad)*4;
    const owns=x>=pad&&x<pad+512&&y>=pad&&y<pad+512&&alpha[q+3];
    const same=pre.readUInt32LE(n)===post.readUInt32LE(n);
    if(!owns){assert(same,'outside the signed boots');continue;}
    if(!same)changed++;
    if(pre.readUInt32LE(n)===blank.readUInt32LE(q)){
      for(let c=0;c<4;c++)assert(Math.abs(post[n+c]-expected[n+c])<=1,'rear/body/front ankle order');
      physical++;
    }else {assert(same,'weapon-owned raster must be unchanged');overlap++;}
   }
   assert(changed>100);
   for(const c of [raw,f,signed,bootMask,board,under,...pngs])c.width=1;
   tested++;
  }
  assert(physical>1000);
  assert.equal(JSON.stringify(on),saved);assert.deepEqual(api.selectVisual(off,opts),base);
  for(const direction of ['west'])assert(!api.selectVisual(on,{...opts,direction})?.profileLayers?.boots);
  assert(!api.selectVisual(on,{...opts,action:'idle'})?.profileLayers?.boots);
  assert(!api.selectVisual({...on,equipment:{...on.equipment,legs:{def:21}}},opts)?.profileLayers?.boots);
  assert(!api.selectVisual({...on,equipment:{...on.equipment,boots:{def:boot,variant:'unapproved'}}},opts)?.profileLayers?.boots);
  console.log('PASS',w,boot,skin,tested,'overlapping gear pixels',overlap);
 }
}
if(process.env.BOOT||process.env.ARM)prove().catch(e=>{console.error(e);process.exitCode=1;});
else for(const SKIN of ['light','ebony'])for(const [ARM,BOOT] of (process.env.ALL_EAST_BOOT_WEAPONS?['0','5','17','none'].flatMap(w=>['9','162'].map(b=>[w,b])):[['0','9'],['5','162']])){
 const c=require('node:child_process').spawnSync(process.execPath,[...process.execArgv,__filename],{env:{...process.env,SKIN,ARM,BOOT},stdio:'inherit'});
 assert.equal(c.status,0,c.error?.message||[ARM,BOOT,SKIN]);
}
