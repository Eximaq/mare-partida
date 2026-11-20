'use strict';
const assert=require('node:assert/strict'), fs=require('node:fs'),p=require('node:path');
const {cv,make}=require('./rework-integration-support.cjs'),api=make(),R=p.dirname(__dirname),A=require('../character-appearance.js'),V=global.ReworkAccessoryVendor.compositor,W=global.MareReworkWeaponCarryHD.create(null,null,{makeCanvas:cv.createCanvas});
const load=require('../tools/rework-hd-test-loader.cjs').create(R), testItem=Number(process.argv[2]);
const C=()=>cv.createCanvas(512,512);
const buf=c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data;
const save=(tone='light',extras={},app={})=>JSON.parse(JSON.stringify(A.commit({id:'fixture',classId:'brawler',equipment:{weapon:{def:testItem}},...extras},{skinColor:tone,...app},()=>true)));
const original=u=>({...u,appearance96:{...u.appearance96,skinColor:'original',hairColor:'original',eyeColor:'original'}});
const geom=(r)=>[r.plan?.parts.map(x=>[x.binding,x.sourceBone,x.targetRestBone,x.source.sha256]),r.base?.id,r.base?.pack?.pivot];
const phase=(x,p)=>x?.base?.pack.directions[p];
async function main(){
 await api.ready;
 const dirs=testItem===3?['east','west','north']:['east','west']; const rows=[];
 for(const direction of dirs)for(const action of ['idle','walk']){
  const opts={direction,action,consumer:'world'}, valid=save(), stock=original(valid);
  const r=api.selectVisual(valid,opts),legacy=api.selectVisual(stock,opts);assert(r?.gauntlet23PreviewCarry,'expected exact approved draft preview candidate');
  const d=phase(r,direction), n=d.clip.frames;assert.equal(n,action==='idle'?1:16);assert.equal(d.clip.fps,n);assert.deepEqual(r.base.pack,legacy.base.pack);assert.deepEqual(r.base.pack.pivot,{x:64,y:112});
  assert.equal(r.plan.parts.length,direction==='north'?2:1);assert.equal(!!r.base.mirrorX,direction==='west');assert.equal(r.relicEyes?.samples.length,direction==='north'?undefined:18);
  for(const [actor,opt] of [[save('light',{classId:'cyborg'}),{}],[save('light',{equipment:{weapon:{def:testItem},gloves:{def:26}}}),{}],[save('light',{equipment:{weapon:{def:testItem},chest:{def:151}}}),{}],[save('light',{equipment:{weapon:{def:testItem},boots:{def:9}}}),{}],[save('light',{equipment:{weapon:{def:testItem},pants:{def:133}}}),{}],[save('light',{equipment:{weapon:{def:testItem,appearanceVariant:'other'}}}),{}],[save('light',{}, {hairColor:'brown'}),{}],[save('light',{}, {eyeColor:'amber'}),{}],[stock,{}],[valid,{weaponless:true}],[valid,{consumer:'portrait'}],[valid,{action:'attack-unarmed'}],[valid,{direction:'south'}]])
   assert(!api.selectVisual(actor,{...opts,...opt})?.gauntlet23PreviewCarry);
  const images=new Map(await Promise.all(W.requiredFiles(r).map(async s=>[s,await load(s)])));
  const route=p=> 'tools/rework-weapon-layers-hd/'+p.source.url;
  const mapimg=(a,f)=>{
   const c=C(),g=c.getContext('2d'),ps=d.poses[f],m=V.rigid(a.sourceBone[a.binding.b],a.sourceBone[a.binding.a],ps[a.binding.b],ps[a.binding.a]);
   if(r.base.mirrorX){g.translate(512,0);g.scale(-1,1);}
   g.imageSmoothingEnabled=false;g.transform(...m.slice(0,4),m[4]*4+(a.calibrationOffsetPhysical?.[0]??0),m[5]*4+(a.calibrationOffsetPhysical?.[1]??0));g.drawImage(images.get(route(a)),0,0);
   return buf(c);
  };
  const draw=(v,f,opt={})=>{const c=C(); const meta=W.render(c.getContext('2d'),v,images,{frame:f,...opt});assert.deepEqual(meta.pivot,{x:256,y:448});return buf(c);};
  const signs=[];
  for(let f=0;f<n;f++){
   const gear=r.plan.parts.map(a=>mapimg(a,f));
   for(const [i,a] of r.plan.parts.entries()){
    const hand=d.layers.find(l=>l.binding?.a===a.binding.a&&l.binding?.b===a.binding.b);assert(hand);
    const can=C(),g=can.getContext('2d');if(r.base.mirrorX){g.translate(512,0);g.scale(-1,1);}
    V.render(g,{...r.base.pack,directions:{[direction]:{...d,layers:[hand]}}},new Map([[hand.source,images.get('tools/rework-base-hd/assets/'+hand.source+'.png')]]),{direction,frame:f,density:4});
    const hd=buf(can),contacts=hd.filter((v,b)=>b%4===3&&v&&gear[i][b]).length;assert(contacts>300);
   }
   const nullTone=legacy.colorAppearance;
   const NN=draw({...r,relicEyes:undefined},f,{appearance:nullTone});
   if(process.env.PREVIEW_ROOT){
    const pathname=direction==='north'? action+'-neutral-'+f+'.png':[testItem,direction,action,f,'candidate','neutral'].join('-')+'.png';
    const old=C();old.getContext('2d').drawImage(await cv.loadImage(p.join(direction==='north'&&process.env.NORTH_CORRECTED_ROOT?process.env.NORTH_CORRECTED_ROOT:process.env.PREVIEW_ROOT,pathname)),0,0);
    const oldp=buf(old);let delta=0,maxPrem=0;
    for(let i=0;i<NN.length;i+=4){assert.equal(NN[i+3],oldp[i+3],'preview silhouette drift');for(let k=0;k<3;k++){if(NN[i+k]!==oldp[i+k])delta++;maxPrem=Math.max(maxPrem,Math.abs(Math.round(NN[i+k]*NN[i+3]/255)-Math.round(oldp[i+k]*oldp[i+3]/255)));}}
    assert(maxPrem===0,'premultiplied channels changed relative to delivered clip: '+maxPrem+' / '+delta);
   }
   const opaque=NN, bare={...r,plan:{...r.plan,parts:[]}}; let prev;
   for(const tone of Object.keys(A.skins)){
    const actor=save(tone),rr=api.selectVisual(actor,opts);assert(rr?.gauntlet23PreviewCarry);assert.deepEqual(geom(rr),geom(r));
    const actual=draw(rr,f), body=draw({...bare,colorAppearance:rr.colorAppearance},f);
    let changed=0,pixelOpaque=0;
    for(let i=0;i<NN.length;i+=4){
     if(gear.every(x=>x[i+3]===0))for(let k=0;k<4;k++)assert.equal(actual[i+k],body[i+k],'non-gear pixel changed by equipment');
     if(gear.some(x=>x[i+3]===255)){for(let k=0;k<4;k++)assert.equal(actual[i+k],opaque[i+k],'opaque gear changed with skin');pixelOpaque++;}
     assert.equal(actual[i+3],NN[i+3]);if(prev&&[0,1,2].some(k=>prev[i+k]!==actual[i+k]))changed++;
    }
    assert(pixelOpaque>70);if(prev)assert(changed>900);prev=actual;
   }
  }
  const prepared=await api.prepareConfiguration([{player:valid,source:r,options:opts}],{resolve:v=>v});let out;
  assert(prepared.draw({save(){},restore(){},drawImage(c){out=c;}},valid,{...opts,progress:.1}));assert(out);prepared.release();
  console.log(testItem,direction,action,n*Object.keys(A.skins).length,'tone/frame tests + direct world prepared');
 }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
