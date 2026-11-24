'use strict';
const a=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),R=path.resolve(process.argv[2]||path.join(__dirname,'..'));
const {make,cv}=require(R+'/tests/rework-integration-support.cjs'),A=require(R+'/character-appearance'),api=make();
const {selectWorldHD}=require(R+'/paper-doll-96-lobby.js'),weaponCatalog=require(R+'/tools/paper-doll-96-v3/weapons.json');
const hash=require('node:crypto').createHash;
const load=require(R+'/tools/rework-hd-test-loader.cjs').create(R), W=640;
const pix=c=>Buffer.from(c.getContext('2d').getImageData(0,0,W,W).data),canvas=()=>cv.createCanvas(W,W);
function actor(item,skinColor,pants,extra={}){return JSON.parse(JSON.stringify(A.commit({classId:'strategist',equipment:{weapon:{def:item},...(pants?{legs:{def:pants}}:{}),...extra}},{gender:'masculino',skinStyle:'natural',skinColor,hairStyle:'original',hairColor:'black',eyeStyle:'original',eyeColor:'blue'},()=>true)))}
(async()=>{await api.ready;let n=0;
 const o={consumer:'world',direction:'south',action:'attack-focus'},mask=canvas(),m=mask.getContext('2d'),g=canvas(),gx=g.getContext('2d');
 const cloth=await load('tools/rework-modular-outfits-hd/assets/8a93e44b2f1bc0abd95b342f31808776e5aa53db4c7d15a2c5975d8f2a20d0f5.png');m.drawImage(cloth,0,0);const layer=pix(mask);
 const m2=canvas(),m2c=m2.getContext('2d');const sheet=cv.createCanvas(1280,420),sc=sheet.getContext('2d');sc.fillStyle='#252b3b';sc.fillRect(0,0,1280,420);
 for(const [j,item] of [122].entries())for(const tone of Object.keys(A.skins)){
  const bare=actor(item,tone),wear=actor(item,tone,133),a0=api.selectVisual(bare,o),r=api.selectVisual(wear,o);
  a(r?.orbFocusSouthP133,`missing W${item} / ${tone} / P133`);a.deepEqual(r.states,a0.states);a.deepEqual(r.timeline,a0.timeline);a.deepEqual(r.pivot,a0.pivot);a.equal(r.fps,a0.fps);a.equal(r.contactTick,a0.contactTick);
  const aliases=['attack','skill'].map(action=>({...o,action}));
  const aliasSources=aliases.map(options=>selectWorldHD(api,weaponCatalog,wear,options));
  for(const source of aliasSources)a.deepEqual(source,r,'World alias should use exact signed Focus source');
  const reference=[];
  a.equal(r.slotRoutes.legs.quality,'hd');a.equal(r.slotRoutes.weapon.quality,'hd');a.deepEqual(r.omitted,[]);
  for(const bad of [actor(item,tone,133,{boots:{def:9}}),actor(item,tone,133,{gloves:{def:25}}),actor(item,tone,21)])a(!api.selectVisual(bad,o)?.orbFocusSouthP133);
  const bc=await api.prepareConfiguration([{player:bare,options:o}]),wc=await api.prepareConfiguration([{player:wear,options:o}]);
  const draw=(bundle,player,f,options=o)=>{let im;a(bundle.draw({save(){},restore(){},drawImage(v){im=v;}},player,{...options,progress:(f+.125)/8}));a.equal(im.width,W);return im};
  for(let f=0;f<8;f++){
   const b0=draw(bc,bare,f),w0=draw(wc,wear,f),b=pix(b0),v=pix(w0),E=canvas(),x=E.getContext('2d'),im=x.createImageData(W,W);im.data.set(b);x.putImageData(im,0,0);x.drawImage(cloth,0,0);
   const expected=pix(E),hand=r.states[f].layers[0];
   gx.clearRect(0,0,W,W);gx.drawImage(await load('tools/rework-weapon-layers-hd/'+hand.url),0,0);const gear=pix(g);m2c.clearRect(0,0,W,W);m2c.drawImage(await load('tools/rework-weapon-layers-hd/'+hand.mask.url),0,0);const contact=pix(m2);let c=0;
   for(let k=0;k<v.length;k+=4)if(layer[k+3]){
    if(v.readUInt32LE(k)!==b.readUInt32LE(k))c++;
    const need=contact[k]?gear[k+3]?b:layer:expected;
    for(let i=0;i<4;i++)a(Math.abs(v[k+i]-need[k+i])<=1,`misregistered overlay ${item}/${tone}/${f}/${k/4%W}/${k/4/W|0}`);
   }else a.equal(v.readUInt32LE(k),b.readUInt32LE(k),'changed outside P133 authored raster');
   a(c>1000);a.deepEqual(pix(draw(bc,{...wear,equipment:{weapon:wear.equipment.weapon}},f)),b);a.deepEqual(pix(draw(wc,wear,f)),v);
   reference.push(hash('sha256').update(v).digest('hex'));
   if(tone==='ebony'){sc.imageSmoothingEnabled=false;sc.drawImage(b0,215,315,230,240,160*f,j*420,160,200);sc.drawImage(w0,215,315,230,240,160*f,j*420+202,160,200);}E.width=1;n++;
  }
  bc.release();wc.release();global.gc?.();
  if(['light','ebony'].includes(tone))for(const [i,options] of aliases.entries()){
   const bundle=await api.prepareConfiguration([{player:wear,options,source:aliasSources[i]}],{resolve:x=>x});
   try{for(let f=0;f<8;f++)a.equal(hash('sha256').update(pix(draw(bundle,wear,f,options))).digest('hex'),reference[f]);}
   finally{bundle.release();global.gc?.();}
  }
  console.log(item,tone,n);
 }
 if(process.env.ORB_SHEET)fs.writeFileSync(process.env.ORB_SHEET,sheet.toBuffer('image/png'));
 a.equal(n,64);console.log('PASS 64 actual World frames, W122 South/P133 all eight tones, same weapon and poses, exact alpha scope, remove restores');
})().catch(e=>{console.error(e);process.exit(1)})
