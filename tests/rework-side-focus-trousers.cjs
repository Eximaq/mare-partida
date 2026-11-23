'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=process.env.HD_PUBLISHED_ROOT;assert(root,'Set HD_PUBLISHED_ROOT to the exported game');
const {make,cv}=require('./rework-integration-support.cjs');
const {weapons,gear}=require('../tools/audit-hd-wardrobe-product.cjs');
const mod=file=>require(path.join(root,file)),world=mod('paper-doll-96-lobby.js'),look=mod('character-appearance.js');
const catalog=mod('tools/paper-doll-96-v3/weapons.json'),atlas=mod('tools/rework-combat-wardrobe/index.json').sideFocusTrousers;
const load=require('../tools/rework-hd-test-loader.cjs').create(root);
const weaponArt=mod('player-rework-weapon-native-hd.js').create(mod('tools/rework-weapon-layers-hd/index.json'),{makeCanvas:cv.createCanvas});
const canvas=()=>cv.createCanvas(640,640),pixels=c=>new Uint32Array(c.getContext('2d').getImageData(0,0,640,640).data.buffer);
const weaponsInTest=[31,123,124,125,126,127],subset=process.argv[2]?[Number(process.argv[2])]:weaponsInTest;
assert(subset.every(id=>weaponsInTest.includes(id)));
const bank='tools/rework-weapon-layers-hd/';
function nativeKey(l){return new URL(l.url,'https://art.invalid/'+bank).pathname.slice(1);}
function independentCut(im){
 const c=canvas(),x=c.getContext('2d');x.drawImage(im,0,0);
 const data=x.getImageData(0,0,640,640),rgba=new Uint32Array(data.data.buffer);
 const todo=[365*640+320],cut=new Uint8Array(rgba.length);let n=0;
 while(todo.length){const p=todo.pop();if(!(rgba[p]>>>24))continue;
  cut[p]=1;rgba[p]=0;n++;todo.push(p-1,p+1,p-640,p+640);
 }
 assert(n>4600&&n<4900);x.putImageData(data,0,0);return {canvas:c,cut};
}
async function reference(r,f,fit,plate,files){
 const st=r.states[f],row=fit.phases[f],s=row.donor,t=row.receiver,scale=(t[1]-t[0])/(s[1]-s[0]),rise=(t[4]-t[2])/(s[4]-s[2]);
 const shear=(t[3]-scale*s[3]-(t[0]-scale*s[0]))/(s[4]-335);
 const cloth=canvas(),cx=cloth.getContext('2d');cx.imageSmoothingEnabled=false;
 cx.setTransform(scale,0,shear,rise,t[0]-scale*s[0]-335*shear,t[2]-rise*s[2]);
 cx.drawImage(await load('tools/rework-modular-outfits-hd/assets/'+plate.cloth[f]+'.png'),0,0);
 const stock=st.layers.find(l=>l.id==='shorts'),stockPath=nativeKey(stock),own=independentCut(files.get(stockPath));
 const map=new Map(files),url='assets/'+plate.cloth[f]+'.png';map.set(bank+url,cloth);
 if(plate.replace)map.set(stockPath,own.canvas);
 const extra={operation:'source-over',component:'equipment',id:'reference-cloth',url,depth:3.5};
 const states=r.states.map((state,i)=>i===f?{...state,layers:[...state.layers,extra]}:state);
 const out=canvas();weaponArt.render(out.getContext('2d'),{...r,states},map,{frame:f,appearance:r.colorAppearance});
 const result={expected:pixels(out),fitted:pixels(cloth),cut:own.cut};cloth.width=1;out.width=1;own.canvas.width=1;return result;
}
(async()=>{
 const api=make();await api.ready;
 const rows=[];
 for(const id of subset){
  const player=look.commit({classId:weapons.find(w=>w.id===id).role,equipment:{weapon:{def:id}}},
   {gender:'masculino',skinColor:id%2?'ebony':'light',hairColor:'blue',eyeColor:'green'},()=>true);
  const saved=JSON.stringify(player);
  for(const direction of ['east','west']){
   const o={consumer:'world',action:'attack-focus',direction};
   async function pose(eq){
    const p={...player,equipment:Object.fromEntries(Object.entries(eq).map(([k,n])=>[k,{def:n}]))};
    const r=world.selectWorldHDOnly(api,catalog,p,o);
    const b=await api.prepareConfiguration([{player:p,options:o}],{resolve:()=>({player:p,options:o,source:r})});
    assert.deepEqual(b.coverage[0].omitted,[]);for(const [k,n] of Object.entries(eq))assert.equal(b.coverage[0].slotRoutes[k].item,n);
    return {r,draw(f){let c;assert(b.draw({save(){},restore(){},drawImage(v){c=v;}},p,{...o,progress:(f+.2)/8}));return pixels(c);},release:()=>b.release()};
   }
   const fixed={weapon:id,head:19,boots:169,coat:151,gloves:152};
   const bare=await pose({weapon:id}),geared=await pose(fixed),r=bare.r.independentPlan?.base||bare.r;
   const files=new Map(),fit=atlas[direction];for(const url of weaponArt.requiredFiles(r))files.set(url,await load(url));
   const before=Array.from({length:8},(_,f)=>bare.draw(f)),other=Array.from({length:8},(_,f)=>geared.draw(f));
   for(const item of gear[1]){
    const on=await pose({weapon:id,legs:item}),kit=await pose({...fixed,legs:item});
    assert.deepEqual(on.r.slotRoutes.legs,kit.r.slotRoutes.legs);
    for(const k of Object.keys(fixed))assert.deepEqual(geared.r.slotRoutes[k],kit.r.slotRoutes[k]);
    const reverse=await pose(Object.fromEntries(Object.entries({...fixed,legs:item}).reverse()));
    assert.deepEqual(reverse.r.slotRoutes,kit.r.slotRoutes);reverse.release();
    for(let f=0;f<8;f++){
     const {expected,fitted,cut}=await reference(r,f,fit,fit.items[item],files);
     const a=on.draw(f),b=kit.draw(f);let changed=0,visible=0;
     for(let i=0;i<a.length;i++){
      if(a[i]!==expected[i])assert.fail([id,direction,item,f,i%640,Math.floor(i/640),'body/garment reference',a[i],expected[i]].join('/'));
      if(b[i]!==other[f][i]||a[i]!==before[f][i])assert((fitted[i]>>>24)||fit.items[item].replace&&cut[i],'Unrelated pixel '+[id,direction,item,f,i]);
      if(a[i]!==before[f][i])changed++;if(b[i]!==other[f][i]&&(fitted[i]>>>24))visible++;
     }
     assert(changed>500&&visible>100,'Hidden trousers '+[id,direction,item,f,changed,visible]);
     rows.push({weapon:id,direction,item,frame:f,cloth:fit.items[item].cloth[f],changed,visible});
    }
    on.release();kit.release();
   }
   bare.release();geared.release();global.gc?.();console.log(id,direction,'80 individual and 80 mixed frames');
  }
  assert.equal(JSON.stringify(player),saved);
 }
 assert.equal(rows.length,subset.length*160);
 if(process.env.HD_TROUSER_RESULTS)fs.writeFileSync(process.env.HD_TROUSER_RESULTS,JSON.stringify(rows));
})().catch(e=>{console.error(e);process.exitCode=1;});
