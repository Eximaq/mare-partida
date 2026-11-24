'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),P=require('node:path');
const {make,cv}=require(process.env.KAIZOKU_REPO?process.env.KAIZOKU_REPO+'/tests/rework-integration-support.cjs':'./rework-integration-support.cjs');
const load=require((process.env.KAIZOKU_REPO||P.resolve(__dirname,'..'))+'/tools/rework-hd-test-loader.cjs').create(process.env.KAIZOKU_REPO||P.resolve(__dirname,'..'));
test('saved independent South World passes reuse their exact slot authority and bare palette',async()=>{
 const api=process.env.CANDIDATE_DIR?require(process.env.CANDIDATE_DIR+'/player-rework-native-hd.js').create({fetchJSON:async f=>JSON.parse(require('fs').readFileSync(process.env.KAIZOKU_REPO+'/'+f)),loadImage:load,makeCanvas:cv.createCanvas}):make();await api.ready;const A=MareCharacterAppearance,loaded=new Map(),checked=new Set();
 const render=async(p,o)=>{let c;a(await api.prepare(p,o),JSON.stringify(api.snapshot()));a(api.draw({save(){},restore(){},drawImage(x){c=x;}},p,o));return new Uint32Array(c.getContext('2d').getImageData(0,0,512,512).data.buffer);};
 const matte=async(r,filter,f)=>{
  const p=r.pack,d=p.directions.south,layers=d.layers.filter(filter),png=l=>l.frames?.[f]||l.source;
  const atlases=new Map(await Promise.all(layers.map(async l=>{const h=png(l);if(!loaded.has(h))loaded.set(h,load('tools/rework-modular-outfits-hd/assets/'+h+'.png'));return [h,await loaded.get(h)];})));
  const c=cv.createCanvas(512,512),x=c.getContext('2d');
  ReworkAccessoryVendor.compositor.render(x,{...p,directions:{south:{...d,layers}}},atlases,{direction:'south',frame:f,density:4});
  return new Uint32Array(x.getImageData(0,0,512,512).data.buffer);
 };
 const compare=(a0,a1,mask,key)=>{let n=0,off=0;for(let j=0;j<a0.length;j++)if(a0[j]!==a1[j]){if(!(mask[j]>>>24))off++;n++;}
  a(off===0&&n>0,key+' '+JSON.stringify({off,n}));};
 for(const skinColor of [process.env.SKIN||'ebony'])for(const action of [process.env.ACTION||'walk'])for(const def of (process.env.GLOVES||'131,138,145,152,159,166,173,180').split(',').map(Number)){
  const fields={...A.defaults,hairStyle:action==='idle'?'original':'hair-cropped',skinColor,hairColor:skinColor==='copper'?'blue':'black'};
  let p;A.commit({classId:'brawler',equipment:{boots:{def:9},gloves:{def},coat:null,legs:null,weapon:null}},fields,s=>{p=JSON.parse(JSON.stringify(s));return true;});
  const o={action,direction:'south',consumer:'world',x:256,y:400},before=JSON.stringify(p),without=slot=>({...p,equipment:Object.fromEntries(Object.entries(p.equipment).filter(([k])=>k!==slot))});
  const c=api.selectVisual(p,o),t=api.selectVisual(without('gloves'),o),d=c?.pack.directions.south;
  a(c?.registeredPaletteBody&&t?.registeredPaletteBody);a.deepEqual(c.omitted,[]);
  for(const k of ['boots','gloves'])a.equal(c.slotRoutes[k].quality,'hd');
  const stable=t.pack.directions.south.layers,preserved=d.layers.filter(l=>stable.some(x=>x.id===l.id)),owns=l=>!stable.some(x=>x.id===l.id);
  const sort=x=>x.slice().sort((i,j)=>i.id.localeCompare(j.id));a.deepEqual(sort(preserved),sort(stable));
  for(let f=0;f<d.clip.frames;f++){
   const frame={...o,progress:(f+.125)/d.clip.frames},add=await render(p,frame),remove=await render(without('gloves'),frame),m=await matte(c,owns,f);
   compare(remove,add,m,[def,skinColor,action,f].join('/'));a.deepEqual(remove,await render(without('gloves'),frame));
   const neutral=await render(without('boots'),frame),accessory=await matte(c,l=>l.id.startsWith('boot9-'),f);
   compare(neutral,add,accessory,['same prior glove',def,skinColor,action,f].join('/'));
   checked.add([def,skinColor,action,f].join('/'));
  }
  a.equal(JSON.stringify(p),before);
 }
 a.equal(checked.size,(process.env.GLOVES||'131,138,145,152,159,166,173,180').split(',').length*((process.env.ACTION||'walk')==='walk'?16:1));
});
