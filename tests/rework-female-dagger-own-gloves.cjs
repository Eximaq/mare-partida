const fs=require('node:fs'),path=require('node:path'),R=path.resolve(process.env.PROOF_STAGE||path.join(__dirname,'..')),{make,cv}=require(R+'/tests/rework-integration-support.cjs'),A=require(R+'/character-appearance');
const fileLoad=require(R+'/tools/rework-hd-test-loader.cjs').create(R),prefix='tools/rework-female-dagger-p22/assets/';
const api=make(),load=fileLoad;
const skin=require(R+'/player-rework-skin-hd.js'), local=f=>require(R+'/'+f);
const baseRegistry=MareReworkBaseHD.create(local('tools/rework-base-hd/index.json'));
const hair=MareFemaleNamedHairHD.create(local('tools/rework-accessories/head-layer-index.json'),local('tools/rework-accessories/female-original-face-ownership.json'),{baseRegistry,makeCanvas:cv.createCanvas});
const reg=MareReworkFemaleEquipmentHD.create({schema:'female-native-equipment-registration-v1',records:local('tools/rework-weapon-layers-hd/index.json').femaleRegistrations},{makeCanvas:cv.createCanvas,appearanceRegistry:hair});
const bytes=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
const handIds=new Set(['left-hand','right-hand']);
const draw=async (source,frame)=>{
 const imgs=new Map(await Promise.all(reg.requiredFiles(source,{frame}).map(async f=>[f,await load(f)]))),
  c=cv.createCanvas(1,1);let weapon=null;const ops=[];const size=source.pack.frame.width*4+source.paddingPhysical*2,
  s=cv.createCanvas(size,size),sk=s.getContext('2d'), u=cv.createCanvas(size,size),uc=u.getContext('2d');
 reg.render(c.getContext('2d'),source,imgs,{frame,captureOps:({op,canvas})=>{
  ops.push({id:op.layer?.id,pixels:bytes(canvas)});
  const anatomical=op.layer&&!handIds.has(op.layer.id)&&skin.ownership([op.layer])==='anatomy';
  sk.globalCompositeOperation=anatomical?'source-over':'destination-out';sk.drawImage(canvas,0,0);
  if(op.part){if(!weapon)weapon=cv.createCanvas(size,size);const w=weapon.getContext('2d');w.globalCompositeOperation='source-over';w.drawImage(canvas,0,0);}
  else if(weapon){const w=weapon.getContext('2d');w.globalCompositeOperation='destination-out';w.drawImage(canvas,0,0);}
  if(op.layer&&handIds.has(op.layer.id))uc.drawImage(canvas,0,0);
  canvas.width=canvas.height=1;
 }});
 if(!weapon)weapon=cv.createCanvas(size,size);
 const result={w:bytes(weapon),s:bytes(s),c:bytes(c),u:bytes(u),ops};
 c.width=s.width=u.width=weapon.width=1;return result;
};
const assert=require('node:assert/strict');
const select=(p,o)=>require(R+'/paper-doll-96-lobby.js').selectWorldHD(api,local('tools/paper-doll-96-v3/weapons.json'),p,o);
const dims=['north','south','east','west'], ws=[12,13,71,72,73,74], gl=[25,26,131,138,145,152,159,166,173,180];
const fits=d=>d==='east'||d==='west';
const opts={action:'attack-daggers',consumer:'world'};
const prefix64='tools/rework-female-dagger-p22/assets/';
async function worldRGBA(bundle,p,o,f){
 let c;assert(bundle.draw({save(){},restore(){},drawImage(q){c=q;}},p,{...o,progress:(f+.25)/8}));return bytes(c);
}
const prepared=(p,o)=>api.prepareConfiguration([{player:p,options:o}],{resolve:q=>({...q,source:select(q.player,q.options)})});
function alphaSame(a,b){
 for(let i=3;i<a.length;i+=4)assert.equal(a[i],b[i],'mount changed alpha');
}
// Independent center reflection; the actual renderer uses drawOwnLayerAt.
const reflect=(i,mirror)=>mirror?(Math.floor(i/2560)*2560+2556-(i%2560)):i;
const over=(old,color,alpha)=>Math.round((color*alpha+old*(255-alpha))/255);
function correctSourceOver(before,after,own,mirror){
 const left='left-hand',right='right-hand';let changed=0,edge=0,maximum=0;
 for(let i=0;i<before.c.length;i+=4){
  const j=reflect(i,mirror),l=own[0][j+3],r=own[1][j+3];
  assert.equal(before.c[i+3],after.c[i+3],'actor silhouette changed');
  const actualDiff=before.c.readUInt32LE(i)!==after.c.readUInt32LE(i);
  if(!l&&!r||before.w[i+3]===255)assert(!actualDiff,'changed outside glove ownership or at opaque blade');
  if(!l&&!r)continue;
  // At the first targeted hand the source is opaque. Everything above it
  // is the exact saved witness operation, then an authored glove pixel
  // immediately after its own hand. Compare independent integer RGBA.
  const corrected=[0,0,0];let start=false;
  for(const {id,pixels} of before.ops){
   const g=id===left?0:id===right?1:-1,a=pixels[i+3],ga=g<0?0:own[g][j+3];
   if(ga){assert.equal(a,255);start=true;}
   if(!start)continue;
   for(let n=0;n<3;n++){
    corrected[n]=over(corrected[n],pixels[i+n],a);
    if(ga)corrected[n]=over(corrected[n],own[g][j+n],ga);
   }
  }
  for(let n=0;n<3;n++)maximum=Math.max(maximum,Math.abs(corrected[n]-after.c[i+n]));
  if(actualDiff){changed++;if(before.w[i+3])edge++;}
 }
 assert(maximum<=1,'independent source-over component rounding exceeds 1: '+maximum);
 assert(changed>100,'glove not visible');
 return edge;
}
(async()=>{
 await api.ready;let selectors=0,testedFrames=0,archives=0,worldFrames=0,semitransparentEdges=0;
 const z=cv.createCanvas(640,640),zc=z.getContext('2d'),seen=new Set();
 const plane=im=>{zc.clearRect(0,0,640,640);zc.drawImage(im,0,0);return bytes(z);};
 for(const direction of dims)for(const [wi,w] of ws.entries())for(const skinColor of Object.keys(A.skins)){
  const o={...opts,direction};
  const p=A.commit({classId:'rogue',equipment:{weapon:{def:w},gloves:null,boots:null,legs:null,coat:null,head:null}},
    {gender:'feminino',skinColor,...(skinColor==='ebony'?{hairStyle:'hair-bob',hairColor:'blue',eyeColor:'green'}:{})},()=>true);
  const base=select(p,o);assert(base?.femaleDaggerSavedTones);
  for(const g of gl){
   const on={...p,equipment:{...p.equipment,gloves:{def:g}}}, saved=JSON.stringify(on),rec=select(on,o);
   if(!fits(direction)){assert.notEqual(rec?.slotRoutes?.gloves?.item,g);continue;}
   assert.equal(rec?.slotRoutes?.gloves?.item,g,JSON.stringify([direction,w,skinColor,g,rec?.id]));
   assert.equal(rec.slotRoutes.gloves.quality,'hd');assert.equal(rec.slotRoutes.weapon.item,w);
   assert.deepEqual(rec.omitted,[]);assert.deepEqual(rec.states,base.states);assert.deepEqual(rec.pack,base.pack);
   assert.deepEqual(rec.material,base.material);assert.deepEqual(rec.colorAppearance,base.colorAppearance);
   assert.deepEqual(rec.ownLayerSources.gloves,JSON.stringify(['gloves',g,'female',o.action,direction]));
   assert.equal(rec.daggerOwnHands.sourceDirection,'east');const mirror=direction==='west';
   assert.equal(rec.daggerOwnHands.mirrorX,mirror);
   assert.equal(JSON.stringify(on),saved);assert.equal(select(p,o).id,base.id);
   for(const action of ['attack','skill'])assert.equal(select(on,{...o,action})?.slotRoutes?.gloves?.item,g);
   assert.equal(select({...on,equipment:{...on.equipment,gloves:{def:g,variant:'unverified'}}},o)?.slotRoutes?.gloves,undefined);
   selectors+=3;
   const hands=base.pack.directions[direction].layers.filter(l=>l.id.endsWith('-hand'));
   const add=rec.daggerOwnHands.source, key=direction+'/'+g;
   if(!seen.has(key)){
    seen.add(key);
    for(const [i,l] of add.entries())for(let tick=0;tick<8;tick++){
     const laid=plane(await load(prefix64+l.frames[tick]+'.png')),hand=plane(await load('tools/rework-base-hd/assets/'+hands[i].frames[tick]+'.png'));
     let n=0;for(let j=0;j<laid.length;j+=4)if(laid[reflect(j,mirror)+3]){assert.equal(hand[j+3],255,'glove leaves its own opaque hand');n++;}
     assert(n>0);archives++;
    }
   }
   if(!['light','ebony'].includes(skinColor)||g!==gl[wi])continue;
   for(let f=0;f<8;f++){
    const a=await draw(base,f),b=await draw(rec,f),images=[];
    assert(a.w.equals(b.w),'isolated visible dagger RGBA changed');
    alphaSame(a.u,b.u);alphaSame(a.s,b.s);
    for(const l of add)images.push(plane(await load(prefix64+l.frames[f]+'.png')));
    semitransparentEdges+=correctSourceOver(a,b,images,mirror);testedFrames++;
    if([12,72,74].includes(w)&&f%2===1){
     const [old,next]=await Promise.all([prepared(p,o),prepared(on,o)]);
     try{
      const x=await worldRGBA(old,p,o,f),y=await worldRGBA(next,on,o,f);
      assert(x.equals(a.c));assert(y.equals(b.c));worldFrames++;
     }finally{old.release();next.release();}
    }
    global.gc?.();
   }
  }
 }
 assert.deepEqual([selectors,archives,testedFrames,worldFrames],[2880,320,192,48]);
 assert(semitransparentEdges>0,'test must actually exercise later weapon edges');
 console.log('PASS',selectors,'World selections,',archives,'own hand alpha phases,',testedFrames,'source-over frames,',worldFrames,'World draw frames,',semitransparentEdges,'naturally blended visible-edge pixels');
})().catch(e=>{console.error(e);process.exitCode=1});
