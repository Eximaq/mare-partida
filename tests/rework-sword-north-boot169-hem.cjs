const fs=require('fs'),p=require('path'),a=require('assert/strict');
const root=process.env.KAIZOKU_REPO||p.resolve(__dirname,'..'), dist=p.join(root,'dist'), material='tools/rework-sword0-checkpoint/sword-catalog.json';
const {make,cv}=require(p.join(root,'tests/rework-integration-support.cjs')),loader=require(p.join(root,'tools/rework-hd-test-loader.cjs')).create(root);
require(process.env.KAIZOKU_CHECKPOINT||p.join(root,'player-rework-sword0-checkpoint.js'));
const cat=require(p.join(dist,material)),loads=new Map();
const api=make({baseURL:'https://fixture.test/',fetchJSON:async f=>f===material?cat:JSON.parse(fs.readFileSync(p.join(root,f))),loadImage:f=>{
if(!loads.has(f))loads.set(f,f.startsWith('tools/rework-sword0-checkpoint/')?cv.loadImage(p.join(dist,f)):loader(f));
return loads.get(f);
}});
const cut=(a,b,i)=>a.readUInt32LE(i)===b.readUInt32LE(i);
const skin=['porcelain','ebony'];
const actor=(id,s,b)=>({classId:'sword',appearance96:global.MareCharacterAppearance.normalize({...cat.appearance96,skinColor:s}),equipment:{weapon:{def:id},coat:{def:151},legs:{def:22},...(b?{boots:{def:b}}:{})}});
const take=async(actor,o)=>{
 const r=api.selectVisual(actor,o);
 if(!r||actor.equipment.boots&&r.slotRoutes?.boots?.item!==actor.equipment.boots.def)return null;
 const d=await api.prepareConfiguration([{player:actor,options:o,source:r}],{resolve:x=>x});try{
 return Array.from({length:8},(_,f)=>{
  let cap; a(d.draw({save(){},restore(){},drawImage(c){cap=c;}},actor,{...o,progress:(f+.2)/8}));
  return {w:cap.width,h:cap.height,b:Buffer.from(cap.getContext('2d').getImageData(0,0,cap.width,cap.height).data)};
 });}finally{d.release();}
};
(async()=>{
 await api.ready;let frames=0;
 const o={direction:'north',action:'attack-sword',consumer:'world'};
 for(const w0 of [0,1,67,68,69,70]){
  const base=await Promise.all(skin.map(s=>take(actor(w0,s,0),o))), witness=await Promise.all(skin.map(s=>take(actor(w0,s,9),o)));
  for(const b of [169]){
   const now=await Promise.all(skin.map(s=>take(actor(w0,s,b),o)));
   a(now.every(Boolean),`W${w0} / B${b} no layered route`);
   const sample=api.selectVisual(actor(w0,skin[0],b),o);
   const row=cat.records.find(r=>r.direction==='north'&&r.slot==='boots'&&r.item===b);
   const shaft=sample.pack.directions.north.layers.filter(l=>l.id.startsWith('boot'+b+'-'));
   a.deepEqual(shaft,row.layers,'sole/shaft and parent placement escaped exact source');
   a.deepEqual(sample.states,api.selectVisual(actor(w0,skin[0],9),o).states);
   a.deepEqual(sample.material,api.selectVisual(actor(w0,skin[0],0),o).material);
   for(let f=0;f<8;f++){
    const {w,h,b:light}=now[0][f],dark=now[1][f].b;
    const mask=cv.createCanvas(w,h),ctx=mask.getContext('2d');
    for(const l of shaft){
     a.equal(l.binding.kind,'fixed');
     const img=await cv.loadImage(p.join(dist,'tools/rework-sword0-checkpoint/assets',l.frames[f]+'.png'));
     a.equal(img.width,640);
     ctx.drawImage(img,(w-640)/2,(h-640)/2);
    }
    const bytes=ctx.getImageData(0,0,w,h).data;
    for(let skinIndex=0;skinIndex<2;skinIndex++){
     const on=now[skinIndex][f].b,bare=base[skinIndex][f].b;let changed=0;
     for(let k=0;k<on.length;k+=4)if(!cut(on,bare,k)){
      a(bytes[k+3]>0,`W${w0} / B${b}/f${f} pixel outside own shaft/sole`);changed++;
     }
     a(changed>0);frames++;
    }
    const gains=[];
    for(let y=(h-640)/2+360;y<h;y++)for(let x=94;x<w-94;x++){
     const k=(y*w+x)*4;
     if(cut(witness[0][f].b,witness[1][f].b,k)&&!cut(light,dark,k)){
      const peak=Math.max(...[0,1,2].map(c=>Math.abs(light[k+c]-dark[k+c])));
      a(peak<=2,`W${w0}/B169/${f} strong skin difference: ${peak}`);
      a(bytes[k+3]>0&&bytes[k+3]<255,`W${w0}/B169/${f} not an alpha edge: ${x},${y}, a=${bytes[k+3]}`);
      gains.push(k/4);
     }
    }
    a(gains.length<=4,'too large a new cuff area');
    const remaining=new Set(gains);
    for(const seed of remaining){
     remaining.delete(seed);const q=[seed];
     for(let i=0;i<q.length;i++)for(const step of [-w-1,-w,-w+1,-1,1,w-1,w,w+1])if(remaining.delete(q[i]+step))q.push(q[i]+step);
     a(q.length<=3,'connected skin line, not AA');
    }
   }
  }
  const off=await take(actor(w0,skin[0],0),o);
  a(off.every((x,i)=>x.b.equals(base[0][i].b)),'removal exact');
  for(const bad of [{direction:'south',b:148},{direction:'east',b:162},{direction:'west',b:183},{direction:'north',b:176}]){
   a(!api.selectVisual(actor(w0,skin[0],bad.b),{...o,direction:bad.direction})?.checkpointSources?.length,'unguarded scope of new hem');
  }
 }
 a.equal(frames,96);
 console.log('Rendered',frames,'native frames for W0/1/67/68/69/70; P22 B169 North, two contrast palettes. Zero delta outside own boot, AA-only difference at cuff, exact removal.');
})().catch(e=>{console.error(e);process.exitCode=1});
