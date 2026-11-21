'use strict';
const a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),M=require('node:module');
const R=path.dirname(__dirname),at=n=>path.join(R,n),file=at('player-rework-native-hd.js');
const A=require('../character-appearance'),{cv,make}=require('./rework-integration-support.cjs'),pal=global.MareAppearance96,vendor=global.ReworkAccessoryVendor.compositor;
const own=require('../tools/rework-accessories/female-original-face-ownership.json').directions,registry=require('../tools/rework-modular-outfits-hd/index.json'),loader=require('../tools/rework-hd-test-loader.cjs').create(R);
const sig={east:'3c8fcb083ab48610c42b34b6bdb0dcdc324331509b908c0dd7cbb724b5b37141',west:'5f757e230cf80547097912d391f7acb3f2ce3e98ece852f3f43969f657c1c963'};
const opts={fetchJSON:async f=>{const p=at(f);return JSON.parse(fs.existsSync(p)?fs.readFileSync(p):require('node:zlib').gunzipSync(fs.readFileSync(p+'.gz')))},loadImage:loader,makeCanvas:cv.createCanvas};
function off(){const s=fs.readFileSync(file,'utf8'),guard="eyeColor:'blue',registeredBlueIris:blueSource,faceProtectedExact:false",p=global.MareReworkNativeHD,m=new M(file,module);a.equal(s.split(guard).length,2);m.filename=file;m.paths=M._nodeModulePaths(R);try{m._compile(s.replace(guard,"eyeColor:null,registeredBlueIris:null,faceProtectedExact:false"),file);}finally{global.MareReworkNativeHD=p;}return m.exports.create(opts);}
const C=(w=512,h=w)=>cv.createCanvas(w,h),px=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data),coats=[null,6,7];
const save=(skinColor,hairColor,eyeColor,coat,mods={},extra={})=>JSON.parse(JSON.stringify(A.commit({id:'scope-coat67-blue',classId:'brawler',equipment:{...(coat?{coat:{def:coat}}:{}),...extra}},{gender:'feminino',skinStyle:'natural',hairStyle:'original',hairColor,eyeStyle:'original',eyeColor,skinColor,...mods},()=>true)));
const owns=r=>!!r?.femaleNamedHairRecord?.registeredBlueIris;
const project=(plane,head,plan,dir,f)=>{const c=C();vendor.render(c.getContext('2d'),plan,new Map([[head.source,plane]]),{direction:dir,frame:f,density:4});const p=px(c);c.width=1;return p;};
const plane=(rgba,cond)=>{const c=C(),cx=c.getContext('2d'),i=cx.createImageData(640,640);for(let j=0;j<rgba.length;j+=4)if(cond(j))i.data.set(rgba.subarray(j,j+4),j);cx.putImageData(i,-64,-64);return c;};
async function draw(api,p,o,f){const q={...o,time:(f+.25)/40};let c,args;a(await api.prepare(p,q),api.failureFor(p,q));a(api.draw({save(){},restore(){},drawImage(im,...rest){c=im;args=rest;}},p,q),api.failureFor(p,q));a.equal(api.snapshot().last.frame,f);return {px:px(c),args};}
(async()=>{
 const api=make();await api.ready;let saves=0;
 for(const d of ['east','west']){
  const o={action:'walk',direction:d,consumer:'world',x:320,y:640};
  for(const skin of Object.keys(A.skins))for(const hair of Object.keys(A.hairs))for(const c of coats){const p=save(skin,hair,'blue',c),before=JSON.stringify(p),r=api.selectVisual(p,o),m=r?.femaleNamedHairRecord;a.equal(m?.registeredBlueIris,sig[d]);a.equal(m.eyeColor,'blue');a.equal(m.skinColor,skin);a.equal(m.hairColor,hair);a(m.profileNeckRestore&&!m.profileNeckBridge);a.deepEqual(r.pack.directions[d].clip,{frames:40,fps:40,loop:true});a.equal(JSON.stringify(p),before);saves++;}
  const p=save('light','black','blue',null);
  for(const q of [{...p,zoanTransformed:true},{...p,equipment:{head:{def:157}},preferences:{hideHeadgear:true}},{...p,equipment:{coat:{def:6,variant:'alt'}}},save('light','black','blue',6,{hairStyle:'hair-bob'}),save('light','black','blue',null,{eyeStyle:'face-focused'}),save('light','black','blue',6,{}, {legs:{def:168}}),save('light','black','blue',6,{}, {weapon:{def:0}})])a(!owns(api.selectVisual(q,o)));
  for(const mod of [{action:'idle'},{consumer:'portrait'},{direction:'north'},{direction:'south'}])a(!owns(api.selectVisual(p,{...o,...mod})));
 }
 a.equal(saves,480);
 let rendered=0;
 for(const d of process.env.SIDE?[process.env.SIDE]:['east','west'])for(const tone of process.env.SKIN?[process.env.SKIN]:['light','ebony']){
  const o={action:'walk',direction:d,consumer:'world',x:320,y:640},hair=tone==='light'?'black':'silver',next=make(),old=off();await Promise.all([next.ready,old.ready]);
  const r=registry.records.find(r=>r.id==='female-torso6-'+d+'-frozen-walk-native'),dir=r.pack.directions[d],head=dir.layers.find(l=>l.id==='base:head-rigid'),plan={...r.pack,directions:{[d]:{...dir,layers:[head]}}};
  a.equal(own[d].attackLayers.filter(l=>l.id==='iris'&&l.slot==='face'&&l.source===sig[d]).length,1);a.equal(own[d].walkHead,head.source);
  const origC=C(640);origC.getContext('2d').drawImage(await loader('tools/rework-base-hd/assets/'+sig[d]+'.png'),0,0);const orig=px(origC),mask=pal.materialMask(orig,'iris');origC.width=1;
  let ink=0,pig=0;for(let i=0;i<mask.length;i++){const p=i*4;if(mask[i]&&!(orig[p]>orig[p+1]+10&&orig[p+1]>orig[p+2]))mask[i]=0;if(mask[i]){a.equal(orig[p+3],255);pig++;}else if(orig[p+3])ink++;}a.equal(ink,44);a.equal(pig,66);
  const origPlane=plane(orig,p=>orig[p+3]>0),tinted=plane(Buffer.from(pal.recolor(orig,mask,A.eyes.blue.ramp)),p=>!!mask[p>>>2]);
  const p=save(tone,hair,'blue',null),before=JSON.stringify(p);
  for(let f=0;f<40;f++){
   const P=project(tinted,head,plan,d,f),O=project(origPlane,head,plan,d,f),views=[];
   for(const c of coats){if(c)p.equipment.coat={def:c};else delete p.equipment.coat;const x=await draw(next,p,o,f),y=await draw(old,p,o,f);a.deepEqual(x.args,y.args);views.push(x.px);let n=0,k=0;
    for(let j=0;j<P.length;j+=4){const v=x.px.readUInt32LE(j),b=y.px.readUInt32LE(j);a.equal(x.px[j+3],y.px[j+3]);if(P[j+3]===255){a.equal(v,P.readUInt32LE(j));a.notEqual(v,b);n++;}else{a.equal(v,b);if(O[j+3]===255)k++;}}
    a.equal(n,66);a.equal(k,44);rendered++;
   }
   for(const v of views.slice(1))for(let j=0;j<P.length;j+=4)if(P[j+3])a.equal(v.readUInt32LE(j),views[0].readUInt32LE(j));
   delete p.equipment.coat;a.deepEqual((await draw(next,p,o,f)).px,views[0]);a.equal(JSON.stringify(p),before);
  }
  origPlane.width=tinted.width=1;global.gc?.();console.log('PASS',d,tone,'40×3 Blue frames');
 }
 if(!process.env.SIDE&&!process.env.SKIN)a.equal(rendered,480);console.log('PASS 480 saves and',rendered,'paired Blue frames (66 delta, 44 preserved)');
})().catch(e=>{console.error(e);process.exitCode=1});
