const fs=require('node:fs'),p=require('node:path'),assert=require('node:assert/strict'),{test}=require('node:test');
const R=process.env.KAIZOKU_REPO||__dirname,source=process.env.KAIZOKU_SELECTOR||p.join(R,'player-rework-native-hd.js');
const {make,cv}=require(p.join(R,'tests/rework-integration-support.cjs'));
const opts={action:'walk',direction:'south',consumer:'world'};
const f=(q,actor,k)=>{
 let capture;const ctx={save(){},restore(){},drawImage(canvas){capture=canvas;}};
 assert(q.draw(ctx,actor,{...opts,progress:(k+.25)/40}));
 return Buffer.from(capture.getContext('2d').getImageData(0,0,512,512).data);
};
test('P168 B9/B176 keep the certified South cuff when swapping the nine approved coats',async()=>{
 const prior=require(process.env.KAIZOKU_PRIOR||p.join(R,'player-rework-native-hd.js')),native=require(source);
 const load=require(p.join(R,'tools/rework-hd-test-loader.cjs')).create(R),memo=new Map();
 const loadImage=f=>{if(!memo.has(f))memo.set(f,load(f));const n=memo.get(f);memo.delete(f);memo.set(f,n);if(memo.size>128)memo.delete(memo.keys().next().value);return n;};
 // make supplies the actual registries; override only the loaded provider JS.
 make();
 const apiOpts={fetchJSON:async f=>JSON.parse(fs.readFileSync(p.join(R,f))),loadImage,makeCanvas:cv.createCanvas};
 const old=prior.create(apiOpts),api=native.create(apiOpts);await Promise.all([old.ready,api.ready]);
 const actor=(skin,id,gloves,coat,legs=168)=>({classId:'brawler',appearance96:global.MareCharacterAppearance.normalize({gender:'feminino',skinColor:skin,hairColor:'blonde',eyeColor:'amber'}),equipment:{legs:{def:legs},...(coat?{coat:{def:coat}}:{}),...(id?{boots:{def:id}}:{}),...(gloves?{gloves:{def:152}}:{})}});
 const starts=new Set([0,5,10,15,18,20,25,30,35,38]);
 async function capture(r,a){
  const h=await r.prepareConfiguration([{player:a,options:opts,source:r.selectVisual(a,opts)}],{resolve:x=>x});
  try{
   assert.equal(h.coverage[0].frames,40);
   const out=[];let last;
   for(let i=0;i<40;i++){const x=f(h,a,i);if(starts.has(i)){last=x;out.push(x);}else assert(x.equals(last));}
   return out;
  }finally{h.release();}
 }
 for(const coat of (process.env.KAIZOKU_COATS?.split(',').map(Number)||[6,7,130,137,144,158,165,172,179]))for(const gloves of [false,true]){
 const series={};
 for(const skin of ['porcelain','ebony']){
  const a=actor(skin,null,gloves,coat),bare=await capture(api,a);
  series[skin]={bare};
  for(const id of [9,176]){
   const look=actor(skin,id,gloves,coat),r=api.selectVisual(look,opts),exact=api.selectVisual(actor(skin,id,gloves,151),opts);
   const own=q=>q?.authoredPantsLayer?.layers.filter(l=>l.slot==='boots');
   assert.equal(own(r)?.length,4,'keeps the exact approved boot layers');
   assert.deepEqual(own(r),own(exact));
   const worn=await capture(api,look);series[skin][id]=worn;
   for(let f=0;f<worn.length;f++){
    const c=cv.createCanvas(512,512),ctx=c.getContext('2d');
    for(const piece of own(r))ctx.drawImage(await loadImage('tools/rework-modular-outfits-hd/assets/'+piece.frames[f]+'.png'),0,0);
    const mask=ctx.getImageData(0,0,512,512).data;
    let visible=0;
    for(let k=0;k<mask.length;k+=4){
     if(worn[f].readUInt32LE(k)!==bare[f].readUInt32LE(k)){
      visible++;
      assert(mask[k+3]>0,'changed non-boot pixels');
     }
    }
    assert(visible>0);
   }
   assert.equal(r.equipment.coat,coat);
   assert.equal(r.equipment.gloves,gloves?152:undefined);
   assert.deepEqual(r.colorAppearance,exact.colorAppearance);
  }
  const history=actor(skin,155,gloves,coat);
  const historical=await capture(api,history);series[skin][155]=historical;
  assert.deepEqual(historical,await capture(old,history));
 }
 for(const id of [9,176]) for(let i=0;i<10;i++){
  const light=series.porcelain,dark=series.ebony,lc=light[id][i],dc=dark[id][i],points=new Set();
  for(let y=280;y<512;y++)for(let x=100;x<400;x++){
   const k=(y*512+x)*4;
   if(lc.readUInt32LE(k)===dc.readUInt32LE(k)||light[155][i].readUInt32LE(k)!==dark[155][i].readUInt32LE(k))continue;
   assert.notEqual(light.bare[i].readUInt32LE(k),dark.bare[i].readUInt32LE(k),'new tinted nonanatomy');
   assert(Math.max(...[0,1,2].map(c=>Math.abs(lc[k+c]-dc[k+c])))<=4,'new visible skin');
   points.add(k/4);
  }
  assert(points.size<=(id===9?15:27),'larger material response than certified coat');
  for(const seed of points){
   const queue=[seed];points.delete(seed);
   for(let j=0;j<queue.length;j++)for(const d of [-513,-512,-511,-1,1,511,512,513]){
    const n=queue[j]+d;if(points.delete(n))queue.push(n);
   }
   assert(queue.length<=(id===9?3:5),'new connected band at the cuff');
  }
 }
 }
 for(const pants of [147,182])for(const id of [9,176])for(const coat of [null,130,151])
  assert(!api.selectVisual(actor('olive',id,true,coat,pants),opts)?.authoredPantsLayer?.layers?.some(l=>l.slot==='boots'));
});
