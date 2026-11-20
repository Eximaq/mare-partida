'use strict';
const a=require('node:assert/strict'),p=require('node:path'),root=p.resolve(__dirname,'..');
const {make,cv}=require('./rework-integration-support.cjs');
const originalLoader=require('../tools/rework-hd-test-loader.cjs').create(root);
const prefix='tools/rework-firearm113-coat/',memo=new Map();
const load=f=>{if(f.startsWith(prefix)&&f.endsWith('/ed0f91b02f8e6681e0c69b76e9d3b9b968b341b3ef3d1f10bd53da0ed7a8727c.png'))return originalLoader('tools/rework-base-hd/assets/'+p.basename(f));if(!memo.has(f))memo.set(f,f.startsWith(prefix)?cv.loadImage(p.join(root,'dist',f)):originalLoader(f));return memo.get(f);};
const api=make({loadImage:load}),options={action:'attack-firearm',direction:'north',consumer:'world'};
const player=(look,glove,weapon=114,coat=false)=>({classId:'gunner',appearance96:look,equipment:{
 weapon:{def:weapon},...(coat?{coat:{def:151}}:{}),...(glove?{gloves:{def:glove}}:{})}});
const stage=(player,source)=>api.prepareConfiguration([{player,options,source}],{resolve:q=>q});
const rgba=c=>Buffer.from(c.getContext('2d').getImageData(0,0,640,640).data);
const take=(s,p,i)=>{let c;a(s.draw({save(){},restore(){},drawImage(x){c=x;}},p,{...options,progress:(i+.25)/8}));return rgba(c);};
(async()=>{
 await api.ready;
 const orig={gender:'feminino',skinColor:'original',hairStyle:'original',hairColor:'original',eyeColor:'original',eyeStyle:'original'};
 const norm=(x={})=>global.MareCharacterAppearance.normalize({gender:'feminino',...x});
 const render=[];const clippedPixels=new Map();
 const fs=require("node:fs");let opaqueMaterialChecks=0;
 const item=26;
 a([26,131,138,145,152,159,166,173,180].includes(item));
 for(const look of [orig,norm({skinColor:'olive',hairStyle:'hair-cropped',hairColor:'auburn',eyeColor:'green'}),norm({skinColor:'ebony',hairStyle:'hair-cropped',hairColor:'blonde',eyeColor:'amber'})]){
  const bare=player(look),worn=player(look,item),save=JSON.stringify(worn);
  const z=api.selectVisual(bare,options),w=api.selectVisual(worn,options);
  a(w?.id.includes('-glove'+item+'-native'));
  a.deepEqual(w.material,z.material);a.deepEqual(w.states,z.states);a.deepEqual(w.colorAppearance,z.colorAppearance);
  const d=z.pack.directions.north,e=w.pack.directions.north;
  a.deepEqual(d.clip,e.clip);a.deepEqual(d.poses,e.poses);
  const hands=d.layers.filter(l=>['left-hand','right-hand'].includes(l.id));
  const gloves=e.layers.filter(l=>l.id.startsWith('candidate-glove'+item+'-'));
  a.equal(gloves.length,2);
  a.deepEqual(d.layers.filter(l=>!hands.includes(l)),e.layers.filter(l=>!gloves.includes(l)));
  a.deepEqual(gloves.map(g=>g.depth),hands.map(h=>h.depth));
  const q0=await stage(bare,z),q1=await stage(worn,w);
  const tile=cv.createCanvas(640,640),ctx=tile.getContext('2d');
  try{
   for(let i=0;i<8;i++){
    const x=take(q0,bare,i),y=take(q1,worn,i);ctx.clearRect(0,0,640,640);
    for(const l of hands)ctx.drawImage(await load('tools/rework-base-hd/assets/'+l.frames[i]+'.png'),0,0);
    for(const l of gloves)ctx.drawImage(await load(prefix+'assets/'+l.frames[i]+'.png'),0,0);
    const mask=rgba(tile);
    if(look.skinColor==='ebony'&&(i===0||i===7)&&process.env.REVIEW){
     for(const [name,rgba] of [['bare',x],['glove',y]]){
      const c=cv.createCanvas(640,640),cx=c.getContext('2d'),data=cx.createImageData(640,640);
      data.data.set(rgba);cx.putImageData(data,0,0);
      fs.writeFileSync(p.join(__dirname,name+'-'+i+'.png'),c.toBuffer('image/png'));c.width=c.height=0;
     }
    }
    ctx.clearRect(0,0,640,640);
    for(const l of gloves)ctx.drawImage(await load(prefix+'assets/'+l.frames[i]+'.png'),0,0);
    const authored=rgba(tile);
    let owned=0;
    for(let j=0;j<authored.length;j+=4)if(authored[j+3]===255){
     
     owned++;
    }
    
    opaqueMaterialChecks+=owned;
    for(const part of z.states[i].parts){
     const gear=await load(part.url);
     ctx.clearRect(0,0,640,640);ctx.save();ctx.imageSmoothingEnabled=false;ctx.transform(...part.matrix);ctx.drawImage(gear,0,0);ctx.restore();
     const footprint=rgba(tile);
     ctx.clearRect(0,0,640,640);
     for(const h of hands)ctx.drawImage(await load('tools/rework-base-hd/assets/'+h.frames[i]+'.png'),0,0);
     const own=rgba(tile);
     let hits=0,outer=0;
     for(let j=0;j<footprint.length;j+=4)if(footprint[j+3]>0&&x.readUInt32LE(j)!==y.readUInt32LE(j)){hits++;if(!own[j+3])outer++;}
     a.equal(outer,0,'native pistol changed outside original hand support');
     const key=i+'/'+part.side, previous=clippedPixels.get(key), evidence=[];
     let changedWithSkin=0;
     for(let j=0;j<footprint.length;j+=4)if(footprint[j+3]>0&&!own[j+3]&&authored[j+3]>0){
      const value=y.readUInt32LE(j);
      a.equal(value,x.readUInt32LE(j),'clipped pixel did not restore original pistol-side composite');
      if(previous&&previous.get(j)!==value)changedWithSkin++;
      evidence.push([j,value]);
     }
     a.equal(changedWithSkin,0,'clipped lip must reveal weapon/background, not skin');
     a.equal(evidence.length,{'0/right':3,'0/left':27,'7/right':1,'7/left':30}[key]);
     clippedPixels.set(key,new Map(evidence));
     console.log('precise contact protection',key,'clipped pixels',evidence.length,'skin-profile differences',changedWithSkin);
     console.log('contact',i,'changed inside original hand / pistol alpha',hits);
    }
    let changed=0;
    for(let j=0;j<y.length;j+=4)if(x.readUInt32LE(j)!==y.readUInt32LE(j)){a(mask[j+3],'non-hand or glove changed');changed++;}
    if(i===0||i===7)a(changed>300);else a.equal(changed,0);
    a.deepEqual(take(q0,bare,i),x,'restoring the glove slot must leave existing look and coat exact');
    render.push([i,changed]);
   }
  }finally{q0.release();q1.release();}
  a.equal(JSON.stringify(worn),save);
 }
 for(const [w,g,c,d] of [[114,26,true,'north'],[114,159,false,'north'],[114,26,false,'south'],[114,26,false,'east'],[114,26,false,'west'],[115,26,false,'north']])
  a(!api.selectVisual(player(norm(),g,w,c),{...options,direction:d})?.id.includes('-glove'+g+'-native'));
 for(const variant of ['test-unregistered']) {
 const p=player(norm(),item);p.equipment.gloves.variant=variant;
 a(!api.selectVisual(p,options)?.id.includes('-glove'+item+'-native'));
 }
 a.equal(render.length,24);console.log({rendered:render.length});
})().catch(e=>{console.error(e);process.exitCode=1});
