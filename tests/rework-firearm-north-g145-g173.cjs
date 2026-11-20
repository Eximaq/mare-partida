'use strict';
const a=require('node:assert/strict'),p=require('node:path'),root=p.resolve(__dirname,'..');
const {make,cv}=require(p.join(root,'tests/rework-integration-support.cjs'));
const originalLoader=require(p.join(root,'tools/rework-hd-test-loader.cjs')).create(root);
const prefix='tools/rework-firearm113-coat/',memo=new Map();
const load=f=>{if(!memo.has(f))memo.set(f,f.startsWith(prefix)?cv.loadImage(p.join(root,'dist',f)):originalLoader(f));return memo.get(f);};
const api=make({loadImage:load}),options={action:'attack-firearm',direction:'north',consumer:'world'};
const player=(look,glove,weapon=113,coat=true)=>({classId:'gunner',appearance96:look,equipment:{
 weapon:{def:weapon},...(coat?{coat:{def:151}}:{}),...(glove?{gloves:{def:glove}}:{})}});
const stage=(player,source)=>api.prepareConfiguration([{player,options,source}],{resolve:q=>q});
const rgba=c=>Buffer.from(c.getContext('2d').getImageData(0,0,640,640).data);
const take=(s,p,i)=>{let c;a(s.draw({save(){},restore(){},drawImage(x){c=x;}},p,{...options,progress:(i+.25)/8}));return rgba(c);};
(async()=>{
 await api.ready;
 const orig={gender:'feminino',skinColor:'original',hairStyle:'original',hairColor:'original',eyeColor:'original',eyeStyle:'original'};
 const norm=(x={})=>global.MareCharacterAppearance.normalize({gender:'feminino',...x});
 const render=[];
 const items=process.env.GLOVE?[Number(process.env.GLOVE)]:[145,173];
 for(const item of items){
 a([145,173].includes(item));
 for(const look of [orig,norm(),norm({skinColor:'ebony',hairStyle:'hair-cropped',hairColor:'blonde',eyeColor:'amber'})]){
  const bare=player(look),worn=player(look,item),save=JSON.stringify(worn);
  const z=api.selectVisual(bare,options),w=api.selectVisual(worn,options);
  a(w?.id.includes('-glove'+item+'-native'));
  a.deepEqual(w.material,z.material);a.deepEqual(w.states,z.states);a.deepEqual(w.colorAppearance,z.colorAppearance);
  const d=z.pack.directions.north,e=w.pack.directions.north;
  a.deepEqual(d.clip,e.clip);a.deepEqual(d.poses,e.poses);
  const hands=d.layers.filter(l=>['left-hand','right-hand'].includes(l.id));
  const gloves=e.layers.filter(l=>l.id.startsWith('candidate-glove'+item+'-'));
  a.equal(gloves.length,2);
  a.deepEqual([...d.layers.filter(l=>!hands.includes(l)),...gloves],e.layers);
  const q0=await stage(bare,z),q1=await stage(worn,w);
  const tile=cv.createCanvas(640,640),ctx=tile.getContext('2d');
  try{
   for(let i=0;i<8;i++){
    const x=take(q0,bare,i),y=take(q1,worn,i);ctx.clearRect(0,0,640,640);
    for(const l of hands)ctx.drawImage(await load('tools/rework-base-hd/assets/'+l.frames[i]+'.png'),0,0);
    for(const l of gloves)ctx.drawImage(await load(prefix+'assets/'+l.frames[i]+'.png'),0,0);
    const mask=rgba(tile);
    const part=z.states[i].parts[0];
    if(part){
     const gear=await load(part.url);
     ctx.clearRect(0,0,640,640);ctx.save();ctx.imageSmoothingEnabled=false;ctx.transform(...part.matrix);ctx.drawImage(gear,0,0);ctx.restore();
     const footprint=rgba(tile);
     ctx.clearRect(0,0,640,640);
     for(const h of hands)ctx.drawImage(await load('tools/rework-base-hd/assets/'+h.frames[i]+'.png'),0,0);
     const own=rgba(tile);
     let hits=0,outer=0;
     for(let j=0;j<footprint.length;j+=4)if(footprint[j+3]>0&&x.readUInt32LE(j)!==y.readUInt32LE(j)){hits++;if(!own[j+3])outer++;}
     a.equal(outer,0,'native rifle recolored outside original hand support');
     console.log('contact',i,'changed inside original hand / rifle alpha',hits);
    }
    let changed=0;
    for(let j=0;j<y.length;j+=4)if(x.readUInt32LE(j)!==y.readUInt32LE(j)){a(mask[j+3],'non-hand or glove changed');changed++;}
    if(i===0||i===7)a(changed>900);else a.equal(changed,0);
    a.deepEqual(take(q0,bare,i),x,'restoring the glove slot must leave existing look and coat exact');
    render.push([i,changed]);
   }
  }finally{q0.release();q1.release();}
  a.equal(JSON.stringify(worn),save);
 }
 for(const [weapon,glove,coat,direction] of [[113,item,false,'north'],[114,item,true,'north'],[113,25,true,'north'],[113,item,true,'south'],[113,item,true,'east'],[113,item,true,'west']]){
  a(!api.selectVisual(player(norm(),glove,weapon,coat),{...options,direction})?.id.includes('-glove'+item+'-native'));
 }
 const variant=player(norm(),item);
 variant.equipment.gloves.variant='test-unregistered';
 a(!api.selectVisual(variant,options)?.id.includes('-glove'+item+'-native'));
 }
 a.equal(render.length,24*items.length);console.log({rendered:render.length,exactMiddleSix:true,weaponPreserved:true,saveUnchanged:true});
})().catch(e=>{console.error(e);process.exitCode=1});
