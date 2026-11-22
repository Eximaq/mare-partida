'use strict';
const a=require('node:assert/strict'),fs=require('node:fs'),p=require('node:path'),R=p.resolve(process.env.KAIZOKU_REPO||p.join(__dirname,'..')),C=process.env.CANDIDATE_DIR;
const {make,cv}=require(R+'/tests/rework-integration-support.cjs'),A=require(R+'/character-appearance'),V=global.ReworkAccessoryVendor.compositor;
const stock=make(),std=require(R+'/tools/rework-hd-test-loader.cjs').create(R);
const load=async u=>{if(C){const f=p.join(C,'local-assets',p.basename(u));if(fs.existsSync(f))return cv.loadImage(f);}return std(u);};
const save=(tone,extras={},app={})=>JSON.parse(JSON.stringify(A.commit({id:'manopla14-carry',classId:'cyborg',equipment:{weapon:{def:14}},...extras},{skinColor:tone,hairColor:'blue',...app},()=>true)));
const get=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
const cv512=()=>cv.createCanvas(512,512);
const preview=(api,q,o)=>{let z;a(api.draw({save(){},restore(){},drawImage(c){z=c}},q,o));return get(z);};
(async()=>{await stock.ready;let api=stock;
 if(C){api=require(C+'/player-rework-native-hd.js').create({fetchJSON:async f=>JSON.parse(fs.readFileSync(p.resolve(R,f))),loadImage:load,makeCanvas:cv.createCanvas});await api.ready;}
 const tones=Object.keys(A.skins);a.equal(tones.length,8);
 for(const dir of (process.env.DIR?[process.env.DIR]:['north','east','west','south']))for(const action of (process.env.ACTION?[process.env.ACTION]:['idle','walk'])){
  const o={direction:dir,action,consumer:'world'},who=save('light'),r=api.selectVisual(who,o);
  a(r?.manopla14SavedPalette);if(C)a(!stock.selectVisual(who,o)?.manopla14SavedPalette);
  const stockBlack=stock.selectVisual(save('light',{}, {hairColor:'black'}),o);a(stockBlack?.manopla14SavedPalette);a.deepEqual(r.plan,stockBlack.plan);a.deepEqual(r.pack,stockBlack.pack);
  const q=r.plan.parts[0],d=r.pack.directions[dir],n=d.clip.frames,lateral=['east','west'].includes(dir);
  a.equal(n,action==='idle'?1:16);a.equal(d.clip.fps,action==='idle'?1:16);a.deepEqual(r.pack.pivot,{x:64,y:112});
  a.equal(r.relicEyes?.samples.length||0,dir==='north'?0:lateral?18:45);
  a(q.hideHandBeyondWrist&&!q.replaceBoundLayer);a.equal(q.depthOffset,.1);
  const vanilla={...r,id:r.id+':baseline',plan:{...r.plan,parts:[{...q,joinedFringe:null}]}};
  const opts=[{...o,action:'attack-unarmed'},{...o,consumer:'portrait'},{...o,weaponless:true}];
  const people=[save('light',{classId:'brawler'}),save('light',{equipment:{weapon:{def:14,variant:'other'}}}),save('light',{equipment:{weapon:{def:14},coat:{def:151}}}),save('light',{equipment:{weapon:{def:14},gloves:{def:26}}}),save('light',{equipment:{weapon:{def:14},head:{def:157}}}),save('light',{}, {hairStyle:'none'})];
  for(const [hairColor,eyeColor] of [['blue','green'],['brown','blue']]){
   const colored=api.selectVisual(save('light',{}, {hairColor,eyeColor}),o);
   a(colored?.manopla14SavedPalette);a.deepEqual(colored.savedHeadMaterial.colors,[hairColor,eyeColor]);
   a.deepEqual(colored.plan,r.plan);a.deepEqual(colored.pack,r.pack);a.notEqual(colored.id,r.id);
  }
  for(const [g,options] of [...people.map(g=>[g,o]),...opts.map(x=>[who,x])]){a(!api.selectVisual(g,options)?.manopla14SavedPalette);if(C)a.deepEqual(api.selectVisual(g,options),stock.selectVisual(g,options));}
  const pref='tools/rework-weapon-layers-hd/',gear=await load(pref+q.source.url),s=gear.width,cc=cv.createCanvas(s,s),cx=cc.getContext('2d');
  const px=im=>{cx.clearRect(0,0,s,s);cx.drawImage(im,0,0);return cx.getImageData(0,0,s,s);};
  const raw=px(gear),mask=cx.createImageData(s,s);
  let support=0,mixed=0,cloth=0;const rank=global.MareNativeSkinHD,AP=global.MareAppearance96;
  let skin,shorts,hardware;
  if(q.joinedFringe){[skin,hardware,shorts]=await Promise.all(q.joinedFringe.urls.map(x=>load(pref+x)));
   const anatomy=px(skin),p=px(shorts).data,g=px(hardware).data;
   for(let i=0;i<raw.data.length;i+=4)if(raw.data[i+3]){
    support++;if([0,1,2,3].every(j=>raw.data[i+j]===g[i+j]))continue;
    if(p[i+3]&&!anatomy.data[i+3]){cloth++;continue;}
    a(anatomy.data[i+3]&&!p[i+3]&&g[i+3]<255);mask.data[i+3]=255;mixed++;
   }
   a.equal(mixed,lateral?46:944);a.equal(cloth,lateral?36:1);
  }else support=Array.from(raw.data).filter((v,i)=>i%4===3&&v).length;
  a.equal(support,dir==='north'?829:lateral?1273:1034);
  cx.putImageData(mask,0,0);
  const renderLayer=(l,im,f)=>{const c=cv512(),k=c.getContext('2d');V.render(k,{...r.pack,directions:{[dir]:{...d,layers:[l]}}},new Map([[l.frames?.[f]||l.source,im]]),{direction:dir,frame:f,density:4});return orient(c);};
  const orient=c=>{if(!r.base.mirrorX)return get(c);const tile=cv512(),k=tile.getContext('2d');k.translate(512,0);k.scale(-1,1);k.drawImage(c,0,0);return get(tile);};
  const gearPlane=(im,f)=>{const z=cv512(),k=z.getContext('2d'),pp=d.poses[f],m=V.rigid(q.sourceBone[q.binding.b],q.sourceBone[q.binding.a],pp[q.binding.b],pp[q.binding.a]);
    k.imageSmoothingEnabled=false;k.transform(...m.slice(0,4),m[4]*4,m[5]*4);k.drawImage(im,0,0);return orient(z);};
  const hand=d.layers.find(x=>x.id===(lateral?'handNear':'handRight'));
  const handIm=await load('tools/rework-base-hd/assets/'+hand.source+'.png');
  const face=d.layers.find(x=>x.slot==='face'),iris=cv512(),ii=iris.getContext('2d'),ip=ii.createImageData(512,512);
  for(const [x,y,R,G,B,alpha,rk] of r.relicEyes?.samples||[]){const delta=r.relicEyes.offset,h=parseInt(A.eyes.blue.ramp[rk-1].slice(1),16);ip.data.set([h>>>16,(h>>>8)&255,h&255,255],((y-delta)*512+x-delta)*4);}
  ii.putImageData(ip,0,0);
  const hair=d.layers.find(x=>x.slot==='hair'),hairIm=await load('tools/rework-base-hd/assets/'+hair.source+'.png');
  const domains=Array.from({length:n},(_,f)=>[gearPlane(cc,f),gearPlane(gear,f),renderLayer(hand,handIm,f),face?renderLayer(face,iris,f):null,renderLayer(hair,hairIm,f)]);
  for(const tone of (process.env.SKIN?[process.env.SKIN]:tones)){
   const actor=save(tone),bare=save(tone,{equipment:{}}),base=api.selectVisual(bare,o),slot=api.selectVisual(actor,o);
   a(slot?.manopla14SavedPalette);a.deepEqual(slot.plan,r.plan);a.deepEqual(base.pack,r.pack);
   const variant={...vanilla,colorAppearance:slot.colorAppearance};
   const black=save(tone,{}, {hairColor:'black'}),blackSlot=stock.selectVisual(black,o);
   a.deepEqual(blackSlot.plan,slot.plan);a.deepEqual(blackSlot.pack,slot.pack);
   const rows=[[slot,actor],[variant,actor],[base,bare],[blackSlot,black]];
   const cfg=await Promise.all(rows.map(([source,player])=>api.prepareConfiguration([{source,player,options:o}],{resolve:x=>x})));
   let deltaMin=Infinity,deltaMax=0;
   try{
    for(let f=0;f<n;f++){
     const opt={...o,progress:(f+.23)/n},[own,shape,h,eyes,hairPlane]=domains[f];
     const [current,control,off,blackPixels]=rows.map(([,p],i)=>preview(cfg[i],p,opt));
     let changed=0,irisN=0,hairChanges=0;
     for(let i=0;i<current.length;i+=4){
      a.equal(current[i+3],control[i+3]);
      a.equal(current[i+3],blackPixels[i+3]);
      if(current.readUInt32LE(i)!==blackPixels.readUInt32LE(i)){a(hairPlane[i+3],dir+': only approved hair can differ from the black-hair exact hold');hairChanges++;}
      if(current.readUInt32LE(i)!==control.readUInt32LE(i)){a(own[i+3],dir+': immutable hardware/shorts changed at '+i/4);changed++;}
      if(eyes?.[i+3]){a.equal(current.readUInt32LE(i),eyes.readUInt32LE(i));irisN++;}
      else if(!h[i+3]&&!shape[i+3])a.equal(current.readUInt32LE(i),off.readUInt32LE(i),'non-contact body changed');
     }
     a(hairChanges>=50,'blue hair must actually display');a(dir==='north'?changed===0:changed>4);a.equal(irisN,dir==='north'?0:lateral?18:45);
     deltaMin=Math.min(deltaMin,changed);deltaMax=Math.max(deltaMax,changed);
    }
   }finally{cfg.forEach(x=>x.release());}
   console.log(dir,action,tone,n,'owned RGBA changes min/max',deltaMin,deltaMax);global.gc?.();
  }
 }
})().catch(e=>{console.error(e);process.exitCode=1});
