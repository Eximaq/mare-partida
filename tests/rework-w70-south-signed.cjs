'use strict';
const a=require('node:assert/strict'),p=require('node:path'),{make,cv}=require('./rework-integration-support.cjs'),A=require('../character-appearance.js'),api=make();
const root=p.dirname(__dirname), load=require('../tools/rework-hd-test-loader.cjs').create(root), idx=require('../tools/rework-weapon-layers-hd/index.json'), prefix='tools/rework-weapon-layers-hd/';
const o={direction:'south',action:'attack-sword',consumer:'world'}, item=70;
const save=(skinColor='light',look={},equipment={weapon:{def:item}},classId='sword')=>JSON.parse(JSON.stringify(A.commit({id:'w70-south',classId,equipment},{gender:'masculino',skinStyle:'natural',skinColor,hairStyle:'original',hairColor:'black',eyeStyle:'original',eyeColor:'blue',...look},()=>true)));
const px=ctx=>Buffer.from(ctx.getImageData(0,0,640,640).data),one=()=>cv.createCanvas(640,640).getContext('2d');
const copy=im=>{const x=one();x.drawImage(im,0,0);return px(x);};
(async()=>{
 await api.ready;const j=api.selectVisual(save(),o);
 a(j?.ownW70South,JSON.stringify({r:j?.id,appearance:A.read(save())}));
 const native=global.MareReworkWeaponNativeHD.create(idx,{makeCanvas:cv.createCanvas});
 a.deepEqual(j.pivot,[80,128]);a.equal(j.fps,24);a.deepEqual(j.timeline,[0,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8]);
 for(const [q,opt] of [[save('light',{},undefined,'brawler'),o],[save('light',{hairColor:'pink'}),o],[save('light',{eyeColor:'green'}),o],[save('light',{}, {weapon:{def:item},coat:{def:151}}),o],[save('light',{}, {weapon:{def:item,variant:'other'}}),o],[save(),{...o,consumer:'portrait'}],[save(),{...o,direction:'east'}],[save(),{...o,weaponless:true}]])a(!api.selectVisual(q,opt)?.ownW70South);
 const images=new Map(await Promise.all(native.requiredFiles(j).map(async k=>[k,await load(k)])));
 const neutral={...j.colorAppearance,skin:'original',skinColor:'original',hairColor:'original'}, r={...j,colorAppearance:neutral};
 const base=require('../tools/rework-base-hd/index.json').records.find(x=>x.id==='v7-sword-drawn8-south').pack, li=base.directions.south.layers;
 const proofs=[];
 const hairH=li.find(l=>l.id==='hair').source; const hairOwned=global.MareHairAnatomyHD.masks(hairH,copy(images.get('tools/rework-base-hd/assets/'+hairH+'.png')),global.MareAppearance96).skin;
 for(let f=0;f<9;f++){
  const x=one();native.render(x,r,images,{frame:f,appearance:neutral});
  const s=j.states[f],expected=copy(images.get(prefix+s.approved.url)),[body,gear,fore]=s.layers.map(l=>copy(images.get(prefix+l.url)));a(px(x).equals(expected),'approved reference '+f);
  const k=[0,0,1,2,3,4,5,6,7][f], img=(id)=>{const v=li.find(x=>x.id===id);return copy(images.get('tools/rework-base-hd/assets/'+(v.frames?.[k]||v.source)+'.png'));};
  proofs.push({body,gear,fore,expected,cloth:img('shorts-phase'),face:img('face'),hair:img('hair')});
 }
 let n=0;const baseline=[];
 for(const tone of process.env.ONE_TONE?['light']:['light',...Object.keys(A.skins).filter(x=>x!=='light')]){
  const u=save(tone),before=JSON.stringify(u),s=api.selectVisual(u,o),h=await api.prepareConfiguration([{player:u,source:s,options:o}],{resolve:x=>x});
  try{for(let tick=0;tick<16;tick++){
   let c;const f=j.timeline[tick];a(h.draw({save(){},restore(){},drawImage(v){c=v;}},u,{...o,progress:(tick+.25)/16}));
   const q=px(c.getContext('2d')), {gear,fore,expected,body,cloth,face,hair}=proofs[f];a(c.width===640&&c.height===640);
   if(tone==='light')baseline[f]=q;
   let equalGear=0,shorts=0,iris=0,hairN=0,delta=0,vivid=0;
   for(let k=0;k<q.length;k+=4){
    a.equal(q[k+3],expected[k+3]);const rgba=q.readUInt32LE(k),orig=expected.readUInt32LE(k);
    if(gear[k+3]===255&&!fore[k+3]){a.equal(rgba,gear.readUInt32LE(k),'visible opaque weapon');equalGear++;}
    if(!gear[k+3]&&!fore[k+3]&&cloth[k+3]===255&&cloth.readUInt32LE(k)===orig){a.equal(rgba,orig,'shorts');shorts++;}
    if(!gear[k+3]&&!fore[k+3]&&!hairOwned[k/4]&&hair[k+3]===255&&hair.readUInt32LE(k)===orig){a.equal(rgba,baseline[f].readUInt32LE(k),`selected hair stable between skins ${tone} ${f} ${k/4%640},${Math.floor(k/4/640)}`);hairN++;}
    if(!gear[k+3]&&!fore[k+3]&&face[k+3]===255&&face.readUInt32LE(k)===orig&&face[k+2]>face[k]&&face[k+2]>face[k+1]){a.equal(rgba,orig,'blue iris');iris++;}
    delta+=+(rgba!==orig); vivid+=+(rgba!==baseline[f].readUInt32LE(k));
   }
   if(f===6)for(const at of [210897,221792])a.equal(q.readUInt32LE(at*4),expected.readUInt32LE(at*4),'exact signed foreground shorts remain unchanged');
   a(equalGear>50&&shorts>1000&&iris>=1&&hairN>1000&&delta>3000&&(tone==='light'||vivid>1000),JSON.stringify({tone,f,tick,equalGear,shorts,iris,hairN,delta,vivid}));
   n++;
  }}finally{h.release();}a.equal(JSON.stringify(u),before); global.gc?.();
 }
 console.log('PASS',n,'actual saved world timeline ticks; nine literal approved PNG refs; opaque own blade, grip anatomy, shorts, iris and selected hair proven');
})().catch(e=>{console.error(e);process.exitCode=1;});
