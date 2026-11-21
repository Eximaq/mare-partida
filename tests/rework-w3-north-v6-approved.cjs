'use strict';
const a=require('node:assert/strict'),p=require('node:path'),{make,cv}=require('./rework-integration-support.cjs'),A=require('../character-appearance.js'),api=make();
const root=p.dirname(__dirname),load=require('../tools/rework-hd-test-loader.cjs').create(root),idx=require('../tools/rework-weapon-layers-hd/index.json'),prefix='tools/rework-weapon-layers-hd/';
const stock=idx.records.find(r=>r.id==='gauntlet3-north-native-original-source');
const save=(tone='light',cl='brawler',equipment={weapon:{def:3}},extra={})=>JSON.parse(JSON.stringify(A.commit({id:'w3-preview-approved',classId:cl,equipment},{skinColor:tone,...extra},()=>true)));
const px=(im,size=640,off=0)=>{const c=cv.createCanvas(size,size),x=c.getContext('2d');x.drawImage(im,off,off);return Buffer.from(x.getImageData(0,0,size,size).data);};
const beforeColors=[[2,242,356,0,0,1,255],[5,256,339,0,0,1,255],[5,256,342,5,3,6,255]];
(async()=>{
 await api.ready;const o={direction:'north',action:'attack-unarmed',consumer:'world'},j=api.selectVisual(save(),o);
 a(j?.w3NorthOwnAttack,'exact authorized W3 NORTH correction is selected by real save');
 a.deepEqual(j.states,stock.states);a.deepEqual(j.timeline,stock.timeline);a.deepEqual(j.pivot,[96,144]);a.equal(j.fps,12);a.deepEqual(j.nativeCanvas,[768,768]);
 const u=save(),orig={...u,appearance96:{...u.appearance96,skinColor:'original',hairColor:'original',eyeColor:'original'}};
 for(const [q,k] of [[orig,o],[save('light','cyborg'),o],[save('light','brawler',{weapon:{def:3,variant:'other'}}),o],
 [save('light','brawler',{weapon:{def:3},chest:{def:151}}),o],[save('light','brawler',undefined,{hairColor:'brown'}),o],
 [save('light','brawler',{weapon:{def:2}}),o],[u,{...o,direction:'south'}],[u,{...o,direction:'east'}],[u,{...o,action:'walk'}],[u,{...o,weaponless:true}],[u,{...o,consumer:'portrait'}]])a(!api.selectVisual(q,k)?.w3NorthOwnAttack);
 const legacy=api.selectVisual(orig,o);a.deepEqual(legacy?.states,stock.states);
 const bank=j.basePack.pack.directions.north,layer=bank.layers.find(x=>x.id==='shorts-phase'),refs=[];
 const render=(h,u,f)=>{let c;a(h.draw({save(){},restore(){},drawImage(x){c=x;}},u,{...o,progress:(f+.2)/8}));a.equal(c.width,768);a.equal(c.height,768);return c;};
 const get=(u,s)=>api.prepareConfiguration([{player:u,source:s,options:o}],{resolve:x=>x});
 const legacyH=await get(orig,legacy);
 try{for(let f=0;f<8;f++){
  const s=j.w3NorthOwnAttack[f], [old,e,cut,cloth]=await Promise.all([stock.states[f].approved.url,s.gear,s.cut,j.basePack.images[layer.frames[f]]].map(url=>load(prefix+url)));
  a(px(render(legacyH,orig,f),768).equals(px(old,768)),'literal no-regression original frame');
  const gear=px(e),mask=px(cut),shorts=px(cloth),extent=Buffer.alloc(640*640);
  const kept=beforeColors.filter(x=>x[0]===f).map(([,x,y,...rgba])=>{const k=(x+y*640)*4;a.deepEqual([...shorts.subarray(k,k+4)],rgba);a.equal(mask[k+3],0);a.equal(gear[k+3],0);return [k,rgba];});
  a.deepEqual(s.preservedShorts,beforeColors.filter(x=>x[0]===f).map(([,x,y,...rgba])=>[x,y,rgba]));
  let n=0,opaque=0;
  for(let k=0;k<mask.length;k+=4){if(mask[k+3]){a.equal(mask[k+3],255);n++;}if(gear[k+3]===255){extent[k/4]=1;opaque++;}}
  a(n===s.cutPixels&&opaque>50);refs.push({gear,mask,shorts,extent,kept});
 }}finally{legacyH.release();}
 let count=0;const light=[];
 for(const tone of Object.keys(A.skins)){
  const u=save(tone),s=api.selectVisual(u,o),record=JSON.stringify(u),h=await get(u,s);
  try{for(let f=0;f<8;f++){
   const C=render(h,u,f),b=px(C,640,-64),{gear,shorts,extent,kept}=refs[f];let clothes=0,ink=0,alpha=0,delta=0;
   for(const [k,color] of kept)a.deepEqual([...b.subarray(k,k+4)],color);
   if(tone==='light')light[f]=b;
   for(let k=0;k<b.length;k+=4){
    if(extent[k/4]){a.equal(b.readUInt32LE(k),gear.readUInt32LE(k),'opaque gauntlet stays untouched');ink++;}
    if(!gear[k+3]&&shorts[k+3]===255&&shorts.readUInt32LE(k)===b.readUInt32LE(k))clothes++;
    if(tone==='ebony'){a.equal(b[k+3],light[f][k+3]);if(b.readUInt32LE(k)!==light[f].readUInt32LE(k))delta++;}
    alpha+=+(b[k+3]!==0);
   }
   a(alpha>10000&&clothes>1000&&ink>50);if(tone==='ebony')a(delta>1000);
   if(process.env.W3_APPROVED_PREVIEW){
    const q=px(await cv.loadImage(p.join(process.env.W3_APPROVED_PREVIEW,f+'-'+tone+'.png')));
    let d=0,max=0;for(let k=0;k<b.length;k+=4)if(b.readUInt32LE(k)!==q.readUInt32LE(k)){d++;a.equal(b[k+3],q[k+3]);for(let c=0;c<3;c++)max=Math.max(max,Math.abs(Math.round(b[k+c]*b[k+3]/255)-Math.round(q[k+c]*q[k+3]/255)));}
    a(d===0&&max===0,'reviewed appearance: premultiplied visible RGB max equals Canvas rounding');console.log('approved preview',f,tone,'different RGBA points',d,'max premultiplied',max);
   }
   count++;
  }}finally{h.release();}a.equal(JSON.stringify(u),record);global.gc?.();
 }
 a.equal(count,64);console.log('W3 north v6 PASS64 preserved 3 signed shorts pixels, 8@12 pivot384/576, untouched opaque gear');
})().catch(e=>{console.error(e);process.exitCode=1});
