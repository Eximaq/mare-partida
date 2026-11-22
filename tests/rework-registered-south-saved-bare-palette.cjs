'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),path=require('node:path');
const {make,cv}=require('./rework-integration-support.cjs');
const load=require('../tools/rework-hd-test-loader.cjs').create(path.resolve(__dirname,'..'));
test('saved South exact bare palette remains unchanged beyond the independently registered boot',async()=>{
 const api=make();await api.ready;const A=MareCharacterAppearance;
 const masks=new Map();let drawn=0;
 const capture=(p,o)=>{let result;a(api.draw({save(){},restore(){},drawImage(c){result=c;}},p,o));return new Uint32Array(result.getContext('2d').getImageData(0,0,512,512).data.buffer);};
 for(const skinColor of Object.keys(A.skins))for(const action of ['idle','walk']){
  const fields={...A.defaults,skinColor,hairColor:skinColor==='copper'?'blue':'black'};
  let p;A.commit({classId:'brawler',equipment:{boots:{def:9,potential:null},coat:null,legs:null,gloves:null,weapon:null}},fields,s=>{p=JSON.parse(JSON.stringify(s));return true;});
  const o={action,direction:'south',consumer:'world'},off={...p,equipment:{}},before=JSON.stringify(p);
  const chosen=api.selectVisual(p,o),bare=api.selectVisual(off,o);a(chosen?.registeredPaletteBody);a.equal(chosen.slotRoutes.boots.quality,'hd');a.deepEqual(chosen.omitted,[]);
  a.deepEqual(chosen.colorAppearance,bare.colorAppearance);a.equal(chosen.registeredPaletteBody.id,bare.sourceId);
  const d=chosen.pack.directions.south,b=bare.pack.directions.south,boots=d.layers.filter(l=>l.id.startsWith('boot9-'));
  a.deepEqual({...d,layers:d.layers.filter(l=>!boots.includes(l))},b);a.equal(boots.length,4);
  a.deepEqual(boots.map(l=>l.depth).sort((x,y)=>x-y),[-1,-1,99,99]); // compositor order, not input group order
  for(let f=0;f<d.clip.frames;f++){
   const pose={...o,x:256,y:400,progress:(f+.125)/d.clip.frames};
   a(await api.prepare(off,pose));a(await api.prepare(p,pose));const base=capture(off,pose),dressed=capture(p,pose);
   const k=action+':'+f;if(!masks.has(k)){
    const imgs=new Map(await Promise.all(boots.map(async l=>{const h=l.frames?.[f]||l.source;return [h,await load('tools/rework-modular-outfits-hd/assets/'+h+'.png')];})));
    const c=cv.createCanvas(512,512),ctx=c.getContext('2d'),pack={...chosen.pack,directions:{south:{...d,layers:boots}}};
    ReworkAccessoryVendor.compositor.render(ctx,pack,imgs,{direction:'south',frame:f,density:4});
    masks.set(k,new Uint32Array(ctx.getImageData(0,0,512,512).data.buffer));
   }
   const zone=masks.get(k);let n=0;for(let j=0;j<base.length;j++)if(base[j]!==dressed[j]){a(zone[j]>>>24,'outside exact boot alpha');n++;}
   a(n>100);a.deepEqual(capture(off,pose),base);drawn++;
  }a.equal(JSON.stringify(p),before);
  for(const q of [{...p,appearance96:{...p.appearance96,hairStyle:'hair-spiky'}},{...p,equipment:{...p.equipment,gloves:{def:152}}},{...p,equipment:{boots:{def:9,variant:'bad'}}}])
   a(!api.selectVisual(q,o)?.registeredPaletteBody);
 }
 a.equal(drawn,136);
});
