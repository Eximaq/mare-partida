'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),R=path.resolve(process.argv[2]||path.join(__dirname,'..'));
const {make,cv}=require(R+'/tests/rework-integration-support.cjs'),A=require(R+'/character-appearance'),load=require(R+'/tools/rework-hd-test-loader.cjs').create(R),api=make();
const i=require(R+'/tools/rework-weapon-layers-hd/index.json'),own=i.orderedAttackProfiles.find(x=>x.id==='authored-ordered-14-south');
const save=(item,s,extra={})=>JSON.parse(JSON.stringify(A.commit({id:'held-tool-test',classId:'brawler',equipment:{weapon:{def:item}},...extra},{gender:'masculino',hairStyle:'original',hairColor:'black',eyeStyle:'original',eyeColor:'blue',skinColor:s},()=>true)));
const o={direction:'south',action:'attack',consumer:'world'},pix=c=>Buffer.from(c.getContext('2d').getImageData(0,0,640,640).data);
const actual=(p,n)=>{let c;assert(api.draw({save(){},restore(){},drawImage(q){c=q}},p,{...o,progress:(n+.1)/12}),JSON.stringify(api.snapshot()));assert.equal(c.width,640);return pix(c)};
const url='tools/rework-weapon-layers-hd/';
(async()=>{await api.ready;let checked=0,near=0,maxNear=0,maxPremul=0;
const eyes=global.MareReworkModularOutfitsHD.southIrisSamples();assert.equal(eyes.length,45);
for(const item of [2,3,110]){
 const stock=i.records.find(x=>x.id===`gauntlet${item}-south-native-original-source`),ref=save(item,'light'),contrast=save(item,'ebony'),route=api.selectVisual(contrast,o),frames=[];
 assert(route?.gauntletSouthOwnedPalette);
 assert(await api.prepareClip(ref,o));
 for(let n=0;n<12;n++){
  const layer=route.states[n].layers[1],g=cv.createCanvas(640,640),gx=g.getContext('2d'),ownGear=await load(url+layer.url),legacy=await load(url+stock.states[n].approved.url),body=await load(url+own.states[n].layers[0].url);
  gx.drawImage(ownGear,0,0);const gearRGBA=pix(g);g.width=1;
  const neu=cv.createCanvas(640,640),x=neu.getContext('2d');x.drawImage(body,0,0);x.drawImage(ownGear,0,0);const b=pix(neu);
  x.clearRect(0,0,640,640);x.drawImage(legacy,0,0);const a=pix(neu);neu.width=1;
  for(let k=0;k<a.length;k+=4){
   assert.equal(a[k+3],b[k+3]);
   if(a.readUInt32LE(k)===b.readUInt32LE(k))continue;
   assert(gearRGBA[k+3]>0&&gearRGBA[k+3]<255,'neutral difference outside translucent equipment');
   near++;
   for(let j=0;j<3;j++){
     maxNear=Math.max(maxNear,Math.abs(a[k+j]-b[k+j]));
     maxPremul=Math.max(maxPremul,Math.abs(Math.round(a[k+j]*a[k+3]/255)-Math.round(b[k+j]*b[k+3]/255)));
   }
  }
  frames.push([actual(ref,n),gearRGBA]);
 }
 for(const s of Object.keys(A.skins)){
  const p=save(item,s),r=api.selectVisual(p,o);assert(r,s);assert.equal(p.appearance96.skinColor,s);
  assert.equal(Boolean(r.gauntletsSouthSavedHead),s==='light');
  assert.equal(Boolean(r.gauntletSouthOwnedPalette),s!=='light');
  assert.equal(r.w14SouthOwnedSkin,s==='light'?undefined:s);
  assert.equal(r.fps,12);assert.deepEqual(r.timeline,stock.timeline);assert.deepEqual(r.pivot,[80,128]);
  if(s!=='light')assert.deepEqual(r.states,route.states);else assert.deepEqual(r.states,stock.states);
  assert(await api.prepareClip(p,o));let changed=0,metal=0,fringe=0;
  for(let n=0;n<12;n++){
   const [b,g]=frames[n],a=actual(p,n);
   for(let k=0;k<a.length;k+=4){
    assert.equal(a[k+3],b[k+3]);
    if(g[k+3]===255){assert.equal(a.readUInt32LE(k),b.readUInt32LE(k));metal++;}
    else {if(g[k+3]>0)fringe++;if(a.readUInt32LE(k)!==b.readUInt32LE(k))changed++;}
   }
   for(const [x,y] of eyes){const k=(y*640+x)*4;assert.equal(a.readUInt32LE(k),b.readUInt32LE(k));}
   checked++;
  }
  assert(metal+fringe>100);assert(s==='light'?changed===0:changed>1000);
  for(const q of [save(item,s,{classId:'cyborg'}),save(item,s,{equipment:{weapon:{def:item},coat:{def:151}}}),save(item,s,{equipment:{weapon:{def:item,variant:'special'}}})])assert(!api.selectVisual(q,o)?.gauntletSouthOwnedPalette);
  for(const k of [{direction:'north'},{direction:'east'},{direction:'west'},{consumer:'portrait'},{action:'walk'},{weaponless:true}])assert(!api.selectVisual(p,{...o,...k})?.gauntletSouthOwnedPalette);
  console.log(item,s,12,changed,metal,fringe);global.gc?.();
 }
}
assert.equal(checked,288);console.log('neutral Canvas rounding samples:',near,'max decoded',maxNear,'max premultiplied',maxPremul);assert(maxPremul<=2);console.log('PASS',checked);
})().catch(e=>{console.error(e);process.exitCode=1});
