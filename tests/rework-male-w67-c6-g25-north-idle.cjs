'use strict';
const a=require('node:assert/strict'),{make}=require('./rework-integration-support.cjs'),api=make(),glove=l=>l.id.startsWith('glove25-');
const select=(p,o)=>api.selectVisual(p,o),prep=(p,r,o)=>api.prepareConfiguration([{player:p,source:r,options:o}],{resolve:x=>x});
const sub=(r,keep)=>{
 const d=r.pack.directions.north,pack={...r.pack,directions:{north:{...d,layers:d.layers.filter(keep)}}};
 return {...r,id:r.id+':proof:'+String(keep),pack,plan:{...r.plan,parts:[]},base:{...r.base,pack}};
};
const draw=(q,p,o,f,n)=>{let c;a(q.draw({save(){},restore(){},drawImage(x){c=x;}},p,{...o,progress:(f+.25)/n}));return new Uint32Array(c.getContext('2d').getImageData(0,0,c.width,c.height).data.buffer);};
(async()=>{await api.ready;let draws=0;const witness=new Map();
 for(const skinColor of ['light','ebony'])for(const action of ['idle']){
 const o={action,direction:'north',consumer:'world'},appearance96={version:1,gender:'masculino',hairStyle:'original',hairColor:'blue',eyeStyle:'original',eyeColor:'blue',skinStyle:'natural',skinColor};
 const off={classId:'sword',appearance96,equipment:{weapon:{def:67},coat:{def:6}}},on={...off,equipment:{...off.equipment,gloves:{def:25}}},state=JSON.stringify(on);
 const b=select(off,o),r=select(on,o);a(r?.id.includes(':own-g25-north'));a.deepEqual(r.omitted,[]);a.deepEqual(Object.keys(r.slotRoutes),['weapon','coat','gloves']);a.equal(r.colorAppearance.hairColor,'blue');a.equal(r.colorAppearance.skin,skinColor);
 const d=b.pack.directions.north,e=r.pack.directions.north,g=e.layers.filter(glove);
 a.deepEqual({...e,layers:e.layers.filter(l=>!glove(l))},d);a.deepEqual(r.plan,b.plan);a.deepEqual(r.pack.pivot,b.pack.pivot);a.deepEqual(g.map(l=>l.depth),[99.5,99.5]);a.equal(b.plan.paddingPhysical,256);
 a(!select(on,{...o,action:'walk'})?.id.includes('own-g25'));
 for(const direction of ['south','east','west'])a(!select(on,{...o,direction})?.id.includes('own-g25'));
 a(!select({...on,equipment:{...on.equipment,boots:{def:9}}},o)?.id.includes('own-g25'));
 a(!select({...on,equipment:{...on.equipment,gloves:{def:26}}},o)?.id.includes('own-g25'));
 a(!select(on,{...o,consumer:'character-creation'})?.id.includes('own-g25'));
 const qs=[];for(const [p,source] of [[off,b],[on,r],[on,sub(r,glove)],[off,sub(b,()=>true)],[on,sub(r,()=>true)]])qs.push(await prep(p,source,o));
 try{for(let f=0;f<d.clip.frames;f++){
  const [x,y,mask,b0,r0]=qs.map((q,i)=>draw(q,i===0||i===3?off:on,o,f,d.clip.frames));
  const k=action+f,h=require('node:crypto').createHash('sha256').update(new Uint8Array(mask.buffer)).digest('hex');
  if(witness.has(k))a.equal(witness.get(k),h,'glove RGBA varies with skin tone');else witness.set(k,h);
  let changed=0,weapon=0;
  for(let i=0;i<x.length;i++){
   if(x[i]!==y[i]){a(mask[i]>>>24,'changed outside G25 material');changed++;}
   a((y[i]>>>24)>=(x[i]>>>24),'native silhouette unexpectedly cut');
   if(x[i]!==b0[i]){a.equal(x[i],y[i],'W67 changed when glove worn');weapon++;}
   if(y[i]!==r0[i])a.notEqual(x[i],b0[i],'W67 moved');
  }
  a(changed>1300&&weapon>2000);a.deepEqual(draw(qs[0],off,o,f,d.clip.frames),x);draws++;
 }}finally{qs.forEach(q=>q.release());}
 a.equal(JSON.stringify(on),state);global.gc?.();
 console.log(skinColor,action,d.clip.frames);
 }
 console.log('PASS actual World C6/W67+G25 North idle, '+draws+' saved poses, blue hair');
})().catch(e=>{console.error(e);process.exitCode=1;});
