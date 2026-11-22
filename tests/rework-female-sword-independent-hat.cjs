'use strict';
const a=require('node:assert/strict'),path=require('node:path'),P=path.resolve(process.argv[2]||path.join(__dirname,'..'));
const {make,cv}=require(P+'/tests/rework-integration-support.cjs'),A=require(P+'/character-appearance'),img=require(P+'/tools/rework-hd-test-loader.cjs').create(P),api=make();
const W=require(P+'/tools/paper-doll-96-v3/weapons.json'),{selectWorldHD}=require(P+'/paper-doll-96-lobby.js');
const actor=(w,t,c,p,h)=>A.commit({classId:'sword',equipment:{weapon:{def:w},...(p?{legs:{def:p}}:{}),...(h?{head:{def:h}}:{})}},{gender:'feminino',hairStyle:'original',hairColor:c,eyeStyle:'original',eyeColor:'blue',skinColor:t},()=>true);
const pixels=canvas=>new Uint32Array(canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data.buffer);
async function render(p,o,r){
 const bundle=await api.prepareConfiguration([{player:p,options:o,source:r}],{resolve:x=>x});
 try{return r.states.map((_,f)=>{let c;a(bundle.draw({save(){},restore(){},drawImage(x){c=x}},p,{...o,progress:(f+.25)/r.states.length}));return pixels(c);});}
 finally {bundle.release();}
}
(async()=>{
 await api.ready;
 let frames=0,selectors=0;
 for(const [w,h,direction,action,N,ox,oy] of [[70,164,'east','idle',512,-7,7],[70,164,'east','walk',512,-7,7],[1,157,'north','attack-sword',640,64,57]]){
 const o={action,direction,consumer:'world'};
 for(const [tone,hair] of [['light','black'],['ebony','blue']]){
  const bare=actor(w,tone,hair,null,h),donor=api.selectVisual(bare,o),gear=donor.material.gearRecord,pass=gear.layers.find(l=>l.id===gear.headgearPolicy.gearId);
  const ri=await img('tools/rework-accessories/assets/'+pass.source+'.png');a.deepEqual([ri.width,ri.height],[512,512]);
  const hat=cv.createCanvas(N,N),hc=hat.getContext('2d');hc.drawImage(ri,ox,oy);
  const hm=hc.getImageData(0,0,N,N).data;
  const solo=await render(bare,o,donor);
  for(const p of [140,147,154,161,175,182]){
   const off=actor(w,tone,hair,p,null),on=actor(w,tone,hair,p,h),save=JSON.stringify(on);
   const x=api.selectVisual(off,o),y=api.selectVisual(on,o);
   a(y?.slotRoutes?.head?.quality==='hd','missing own head route '+[w,h,p,tone,action]);
   a.deepEqual(y.slotRoutes.legs,x.slotRoutes.legs);a.equal(y.slotRoutes.head.item,h);a.equal(y.slotRoutes.weapon.item,w);
   a.deepEqual(y.pack,x.pack);a.deepEqual(y.baseRecord,x.baseRecord);a.deepEqual(y.states,x.states);a.deepEqual(y.colorAppearance,x.colorAppearance);
   a.deepEqual({...y.material,id:x.material.id,gearRecord:x.material.gearRecord},{...x.material,gearRecord:x.material.gearRecord});
   const hidden={...on,preferences:{hideHeadgear:true}};a.equal(api.selectVisual(hidden,o).id,x.id);
   a.deepEqual(y.omitted,x.omitted);
   if(direction==='north')for(const alias of ['attack','skill'])a.equal(selectWorldHD(api,W,on,{...o,action:alias})?.id,y.id);a.equal(JSON.stringify(on),save);selectors++;
   if(p!==140&&p!==182)continue;
   const stock=await render(off,o,x),pair=await render(on,o,y);
   const blade=cv.createCanvas(N,N),bc=blade.getContext('2d');bc.imageSmoothingEnabled=false;
   for(let f=0;f<stock.length;f++){
    let delta=0,contact=0;
    bc.clearRect(0,0,N,N);
    for(const part of x.states[f].parts){bc.save();bc.transform(...part.matrix);if(part.sourceClip){bc.beginPath();bc.rect(...part.sourceClip);bc.clip();}bc.drawImage(await img(part.url),0,0);bc.restore();}
    const bm=bc.getImageData(0,0,N,N).data;
    for(let i=0;i<stock[f].length;i++){
     if(hm[i*4+3])a.equal(pair[f][i],solo[f][i],'hat band differs from signed same-weapon standalone');
     if(hm[i*4+3]&&bm[i*4+3])contact++;
     if(stock[f][i]!==pair[f][i]){a(hm[i*4+3],'outside signed hat alpha');delta++;}
    }
    a(delta>100,'hat invisible');if(direction==='east')a.equal(contact,0,'East hat touches weapon projection');
    frames++;
   }
   if(p===140){const restored=await render(hidden,o,api.selectVisual(hidden,o));a(stock.every((buf,i)=>Buffer.from(buf.buffer).equals(Buffer.from(restored[i].buffer))),'hidden must restore the exact RGBA');}
   blade.width=1;global.gc?.();
  }
  const neg=actor(w,tone,hair,140,h);
  for(const item of [{def:h,variant:'alt'},{def:h===157?164:157}]){
   const other={...neg,equipment:{...neg.equipment,head:item}};
   a(!api.selectVisual(other,o)?.id.includes(':owned-head:'));
  }
  for(const patch of [{hairStyle:'hair-bob'},{skinColor:'porcelain'}]){
   const other={...neg,appearance96:{...neg.appearance96,...patch}};
   a(!api.selectVisual(other,o)?.id.includes(':owned-head:'));
  }
  hat.width=1;global.gc?.();
 }
 console.log('PASS',w,h,action,'cumulative poses',frames,'selectors',selectors);
 }
 a.equal(frames,68);a.equal(selectors,36);
})().catch(e=>{console.error(e);process.exit(1)});
