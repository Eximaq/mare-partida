'use strict';
const a=require('node:assert/strict'),p=require('node:path'),{make,cv}=require('./rework-integration-support.cjs'),A=require('../character-appearance.js'),api=make();
const root=p.dirname(__dirname), load=require('../tools/rework-hd-test-loader.cjs').create(root), idx=require('../tools/rework-weapon-layers-hd/index.json'), prefix='tools/rework-weapon-layers-hd/';
const item=+process.argv[2],direction=process.argv[3],o={direction,action:'attack-unarmed',consumer:'world'};
const save=(skinColor='light',look={},equipment={weapon:{def:item}},classId='brawler')=>JSON.parse(JSON.stringify(A.commit({id:'gauntlet-authorized',classId,equipment},{gender:'masculino',skinStyle:'natural',skinColor,hairStyle:'original',hairColor:'black',eyeStyle:'original',eyeColor:'blue',...look},()=>true)));
const px=ctx=>Buffer.from(ctx.getImageData(0,0,640,640).data);
const copy=im=>{const c=cv.createCanvas(640,640), x=c.getContext('2d');x.drawImage(im,0,0);return px(x);};
(async()=>{
 await api.ready;const j=api.selectVisual(save(),o);
 a(j?.ownGauntletsSideFrames,JSON.stringify({item,direction,r:j?.id,appearance:A.read(save())}));
 const native=global.MareReworkWeaponNativeHD.create(idx,{makeCanvas:cv.createCanvas});const d=j.basePack.pack.directions[direction];
 a.deepEqual(d.clip,{frames:8,fps:12,loop:false,contactFrame:4});a.deepEqual(j.pivot,[80,128]);a(d.layers.some(l=>l.slot==='pants'&&l.id==='shorts'));a(d.layers.some(l=>l.id==='face'));a(d.layers.some(l=>l.id==='hair'));
 for(const [q,opt] of [[save('light',{},undefined,'fighter'),o],[save('light',{hairColor:'pink'}),o],[save('light',{eyeColor:'green'}),o],[save('light',{}, {weapon:{def:item},coat:{def:151}}),o],[save('light',{}, {weapon:{def:item,variant:'other'}}),o],[save(),{...o,consumer:'portrait'}],[save(),{...o,direction:'south'}],[save(),{...o,weaponless:true}]])a(!api.selectVisual(q,opt)?.ownGauntletsSideFrames);
 const images=new Map(await Promise.all(native.requiredFiles(j).map(async k=>[k,await load(k)])));
 const neutral={...j.colorAppearance,skin:'original',skinColor:'original',hairColor:'original'}, r={...j,colorAppearance:neutral};
 const proof=[];
 for(let f=0;f<8;f++){
   const x=cv.createCanvas(640,640).getContext('2d');native.render(x,r,images,{frame:f,appearance:neutral});
   const row=j.ownGauntletsSideFrames[f],expected=copy(images.get(prefix+row.ref)),g=copy(images.get(prefix+row.gear));
   a(px(x).equals(expected),'approved neutral RGBA '+f);
   const maskCtx=cv.createCanvas(640,640).getContext('2d'), bp=r.basePack.pack, index=new Map(d.layers.map(l=>{const k=l.frames?.[f]||l.source;return [k,images.get(prefix+r.basePack.images[k])]}));
   const maskLayers=which=>({...bp,directions:{[direction]:{...d,layers:d.layers.filter(which)}}});
   const domains={};
   for(const s of ['pants','hair','face']){
    maskCtx.clearRect(0,0,640,640);global.ReworkAccessoryVendor.compositor.render(maskCtx,maskLayers(l=>l.slot===s),index,{direction,frame:f,density:4});domains[s]=px(maskCtx);
   }
   proof.push({expected,g,domains});
 }
 let n=0;const baseline=[];
 for(const tone of process.env.ONE_TONE?['light']:['light',...Object.keys(A.skins).filter(x=>x!=='light')]){
   const u=save(tone),before=JSON.stringify(u),s=api.selectVisual(u,o),h=await api.prepareConfiguration([{player:u,source:s,options:o}],{resolve:x=>x});
   try{for(let f=0;f<8;f++){
    let c;const option={...o,progress:(f+.25)/8};a(h.draw({save(){},restore(){},drawImage(v){c=v;}},u,option));
    const actual=px(c.getContext('2d')), {expected,g,domains}=proof[f];a(c.width===640&&c.height===640);if(tone==='light')baseline[f]=actual;let toneDelta=0,delta=0,metal=0,cloth=0,hair=0,iris=0;
    for(let k=0;k<actual.length;k+=4){
     a.equal(actual[k+3],expected[k+3],'visible alpha changed');
     const rgb=actual.readUInt32LE(k), base=expected.readUInt32LE(k);
     if(g[k+3]===255){a.equal(rgb,g.readUInt32LE(k),'opaque gear altered');metal++;}
     if(!g[k+3]&&domains.pants[k+3]===255&&base===domains.pants.readUInt32LE(k)){a.equal(rgb,base,'exposed opaque shorts altered');cloth++;}
     if(!g[k+3]&&domains.hair[k+3]===255&&base===domains.hair.readUInt32LE(k)){a.equal(rgb,baseline[f].readUInt32LE(k),'skin change altered exposed opaque hair');hair++;}
     if(!g[k+3]&&domains.face[k+3]===255&&base===domains.face.readUInt32LE(k)&&expected[k+2]>expected[k]&&expected[k+2]>expected[k+1]){a.equal(rgb,base,'exposed opaque iris altered');iris++;}
     delta+=+(rgb!==base);toneDelta+=+(rgb!==baseline[f].readUInt32LE(k));
    }
    a(metal>=50&&cloth>1000&&hair>1000&&iris>=1&&delta>3000&&(tone==='light'||toneDelta>1000),JSON.stringify({tone,f,metal,cloth,hair,iris,delta}));n++;
   }}finally{h.release();}a.equal(JSON.stringify(u),before);
 }
 console.log('PASS W'+item,direction,n,'actual saved Canvas; neutral 8/8 equality, contact 4, pivot [320,512], opaque gear/shorts/hair/iris untouched');
})().catch(e=>{console.error(e);process.exitCode=1;});
