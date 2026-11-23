'use strict';
const p=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=p.resolve(process.env.PROOF_STAGE||p.join(__dirname,'..')), {make,cv}=require(root+'/tests/rework-integration-support.cjs');
global.MareNativeSkinHD=require(root+'/player-rework-skin-hd.js');
const load=require(root+'/tools/rework-hd-test-loader.cjs').create(root);
const family=[8,134,141,148,162,169,176,183], available=Object.keys(global.MareAppearance96.skins);
const tones=process.env.SKIN?[process.env.SKIN]:available,actions=process.env.ACTION?[process.env.ACTION]:['idle','walk'];
const state=(tone,boot)=>({classId:'fighter',appearance96:{gender:'masculino',hairStyle:'original',hairColor:'blue',skinColor:tone,eyeColor:'blue',eyeStyle:'original'},equipment:{coat:{def:151},legs:{def:133},gloves:{def:152},...(boot?{boots:{def:boot}}:{})}});
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const pixels=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
const draw=(bundle,pl,o,f,n)=>{let out;assert(bundle.draw({save(){},restore(){},drawImage(c){out=c;}},pl,{...o,progress:(f+.25)/n}));return [pixels(out),out.width,out.height];};
const prepare=(player,source,options)=>api.prepareConfiguration([{player,source,options}],{resolve:q=>q});
let api;
(async()=>{
 if(!process.env.SKIN){
  const cp=require('node:child_process');let total=0;
  for(const tone of tones){
   const child=cp.spawnSync(process.execPath,[...process.execArgv,__filename],{env:{...process.env,SKIN:tone},encoding:'utf8'});
   process.stdout.write(child.stdout||'');process.stderr.write(child.stderr||'');
   assert.equal(child.status,0,'isolated tone failed: '+tone);
   total+=Number(child.stdout.match(/count: (\d+)/)?.[1]);
  }
  assert.equal(total,8*tones.length*actions.reduce((n,x)=>n+(x==='walk'?16:1),0));
  console.log('PASS saved boots '+total+' real World poses; exact removal and no outside-alpha change.');
  return;
 }
 api=make();await api.ready;assert.equal(available.length,8);assert(tones.every(t=>available.includes(t)));let count=0; const held=[];
 for(const action of actions){
  const o={action,direction:'north',consumer:'world'}, bases=new Map();
  for(const tone of tones){
   const pl=state(tone),r=api.selectVisual(pl,o);assert(r?.colorAppearance.skin===tone);
   const bundle=await prepare(pl,r,o);assert(bundle);const d=r.pack.directions.north;
   bases.set(tone,{r,d,bundle,pl,hashes:Array.from({length:d.clip.frames},(_,f)=>hash(draw(bundle,pl,o,f,d.clip.frames)[0]))});
  }
  for(const boot of family){
   const palette=[]; let accepted=true;
   try{
    for(const tone of tones){
     const {r:base,d,bundle:off,pl:bare,hashes}=bases.get(tone),pl=state(tone,boot),r=api.selectVisual(pl,o);
     assert.equal(r?.slotRoutes?.boots?.item,boot);assert.deepEqual(r.colorAppearance,base.colorAppearance);
     const q=r.pack.directions.north,remove=l=>!new RegExp('^(?:equip-)?boot'+boot+'-').test(l.id);
     const parts=q.layers.filter(l=>!remove(l));assert(parts.length>=4);
     assert.deepEqual(q.layers.filter(remove),d.layers);assert.deepEqual(q.clip,d.clip);assert.deepEqual(q.poses,d.poses);assert.deepEqual(r.pack.pivot,base.pack.pivot);
     for(const slot of ['coat','legs','gloves'])assert.deepEqual(r.slotRoutes[slot],base.slotRoutes[slot]);
     assert(parts.every(l=>l.binding.kind==='fixed'));
     const on=await prepare(pl,r,o);assert(on);const {frames:n}=q.clip, saved=JSON.stringify(pl);
     const c=cv.createCanvas(640,640),ctx=c.getContext('2d');
     try{for(let f=0;f<n;f++){
      const [after,w,h]=draw(on,pl,o,f,n),[before]=draw(off,bare,o,f,n);assert.equal(hash(before),hashes[f]);
      if(c.width!==w||c.height!==h){c.width=w;c.height=h;}ctx.clearRect(0,0,w,h);
      for(const l of parts){const asset=l.frames?.[f]||l.source;assert(!r.paletteSourceMasks[asset]);const img=await load('tools/rework-modular-outfits-hd/assets/'+(l.frames?.[f]||l.source)+'.png');assert.equal(img.width,w);assert.equal(img.height,h);ctx.drawImage(img,0,0);}
      const m=pixels(c),L=new Uint32Array(before.buffer,before.byteOffset,before.length/4),R=new Uint32Array(after.buffer,after.byteOffset,after.length/4);let diff=0;for(let k=0;k<L.length;k++){
       if(L[k]===R[k])continue;const i=k*4;
       assert(m[i+3]>0,'outside authored boot alpha at '+[boot,action,tone,f,i]);assert(after[i+3]>=before[i+3]);diff++;
       if(m[i+3]===255&&before[i+3]===0)assert.equal(after[i+3],255);
      }
      assert(diff>500);palette.push({f,tone,after:hash(after)});
      assert.equal(hash(draw(off,bare,o,f,n)[0]),hashes[f]);assert.equal(JSON.stringify(pl),saved);
     }}finally{on.release();c.width=c.height=1;}
     global.gc?.();
    }
   }catch(e){accepted=false;held.push([action,boot,e.message]);console.log('HOLD',action,boot,e.message);if(!process.env.AUDIT)throw e;}
   if(accepted){count+=palette.length;console.log('PASS',action,boot,palette.length);}
  }
  for(const x of bases.values())x.bundle.release();
 }
 console.log({tones,count,held});if(!process.env.AUDIT)assert.equal(count,8*tones.length*actions.reduce((n,x)=>n+(x==='walk'?16:1),0));
})().catch(e=>{console.error(e);process.exitCode=1;});
