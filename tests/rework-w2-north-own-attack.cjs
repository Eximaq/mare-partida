'use strict';
const a=require('node:assert/strict'),p=require('node:path'),fs=require('node:fs'),R=p.resolve(process.env.KAIZOKU_REPO||p.dirname(__dirname)),S=process.env.CANDIDATE_DIR&&p.resolve(process.env.CANDIDATE_DIR);
const {make,cv}=require(R+'/tests/rework-integration-support.cjs'),A=require(R+'/character-appearance.js'),stock=make(),load0=require(R+'/tools/rework-hd-test-loader.cjs').create(R),J=require(R+'/tools/rework-weapon-layers-hd/index.json'),assetPrefix='tools/rework-weapon-layers-hd/';
const assets=process.env.ARCHIVE_SOURCES&&JSON.parse(process.env.ARCHIVE_SOURCES),load=async f=>assets?.[p.basename(f,'.png')]?cv.loadImage(assets[p.basename(f,'.png')]):load0(f);
const save=(skinColor='light',look={},e={weapon:{def:2}},classId='brawler')=>JSON.parse(JSON.stringify(A.commit({id:'w2-n-test',classId,equipment:e},{skinColor,...look},()=>true)));
const pixels=(img,w=768)=>{const c=cv.createCanvas(w,w),x=c.getContext('2d');x.drawImage(img,0,0);return Buffer.from(x.getImageData(0,0,w,w).data);};
(async()=>{await stock.ready;let api=stock;
 if(S){global.MareReworkWeaponNativeHD=require(S+'/player-rework-weapon-native-hd');api=require(S+'/player-rework-native-hd').create({loadImage:load,fetchJSON:async f=>JSON.parse(fs.readFileSync(p.join(R,f))),makeCanvas:cv.createCanvas});await api.ready;}
 const o={direction:'north',action:'attack-unarmed',consumer:'world'},ref=J.records.find(r=>r.id==='gauntlet2-north-native-original-source'),l=api.selectVisual(save(),o);
 a(l?.w2NorthOwnAttack,'actual saved Brawler uses W2 signed attack');a.deepEqual(l.states,ref.states);a.deepEqual(l.timeline,ref.timeline);a.deepEqual(l.pivot,[96,144]);a.equal(l.fps,12);
 for(const [u,k] of [[save('light',{},undefined,'cyborg'),o],[save('light',{hairColor:'brown'}),o],[save('light',{}, {weapon:{def:2,variant:'alt'}}),o],[save('light',{}, {weapon:{def:2},coat:{def:151}}),o],[save('light',{}, {weapon:{def:3}}),o],
 [save(),{...o,direction:'south'}],[save(),{...o,direction:'east'}],[save(),{...o,consumer:'portrait'}],[save(),{...o,action:'walk'}],[save(),{...o,weaponless:true}]])a(!api.selectVisual(u,k)?.w2NorthOwnAttack);
 const originalSave=save(),literal={...originalSave,appearance96:{...originalSave.appearance96,skinColor:'original',hairColor:'original',eyeColor:'original'}};
 a(!api.selectVisual(literal,o)?.w2NorthOwnAttack);a.deepEqual(api.selectVisual(literal,o),stock.selectVisual(literal,o));
 const signedShorts=l.basePack.pack.directions.north.layers.find(x=>x.id==='shorts-phase');a(signedShorts);
 const support=[];
 for(let f=0;f<8;f++){
  const {gear,cut,removedSide}=l.w2NorthOwnAttack[f];a.equal(removedSide,f===6?'left':null);
  const [before,gg,cc,shorts]=await Promise.all([ref.states[f].approved.url,gear,cut,l.basePack.images[signedShorts.frames[f]]].map(x=>load(assetPrefix+x)));
  support.push({before:pixels(before),gear:pixels(gg,640),cut:pixels(cc,640),shorts:pixels(shorts,640)});
 }
 let count=0;
 for(const tone of Object.keys(A.skins)){
  const u=save(tone),q=api.selectVisual(u,o),handle=await api.prepareConfiguration([{player:u,source:q,options:o}],{resolve:x=>x});
  try{for(let f=0;f<8;f++){
   let c;a(handle.draw({save(){},restore(){},drawImage(x){c=x}},u,{...o,progress:(f+.2)/8}));const now=pixels(c),{before,gear,cut,shorts}=support[f];let delta=0,metal=0,cloth=0;
   for(let i=0;i<now.length;i+=4){a.equal(now[i+3],before[i+3]);const x=i/4%768-64,y=Math.floor(i/4/768)-64;
    const inside=x>=0&&x<640&&y>=0&&y<640,j=(y*640+x)*4,changed=now.readUInt32LE(i)!==before.readUInt32LE(i);
    if(!inside||cut[j+3]===255||gear[j+3]===255){a(!changed);if(inside&&gear[j+3]===255)metal++;}
    if(inside&&!gear[j+3]&&shorts[j+3]===255&&shorts.readUInt32LE(j)===before.readUInt32LE(i)){a(!changed);cloth++;}
    if(changed)delta++;
   }
   a(delta>500&&metal>10&&cloth>2000);count++;
  }}finally{handle.release();}global.gc?.();
 }
 a.equal(count,64);console.log('W2 Norte PASS',count,'8@12 pivot384/576 exact alpha, F6 own left omitted per live original');
})().catch(e=>{console.error(e);process.exitCode=1});
