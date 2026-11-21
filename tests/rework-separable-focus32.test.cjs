'use strict';
const assert=require('node:assert/strict'),{test}=require('node:test'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const{make,cv}=require('./rework-integration-support.cjs'),index=require('../tools/rework-weapon-layers-hd/index.json'),api=require('../player-rework-weapon-native-hd.js'),fixture=require('./fixtures/separable-focus32-approved.json');
test('relic32 uses independent focus layers and its authored eight-tick clock',async()=>{
 const world=make();await world.ready;const h=api.create(index,{makeCanvas:cv.createCanvas}),load=require('../tools/rework-hd-test-loader.cjs').create(path.resolve(__dirname,'..'));
 const zip=await require('../player-rework-zip.js').loadArchive(fs.readFileSync(path.join(__dirname,'fixtures/separable-focus32-approved.zip')),fixture.fixtureZIP);let count=0;const bareFrames=new Map(),rig=index.separableAttackRigs.find(s=>s.action==='attack-focus');
 for(const direction of ['east','west'])for(const coat of [undefined,151,158,165,179]){
  const p={appearance96:{gender:'male',hairStyle:'original',hairColor:'brown',skinColor:'light',eyeStyle:'original',eyeColor:'brown'},equipment:{weapon:{def:32},...(coat?{coat:{def:coat}}:{})}},pose={consumer:'world',action:'attack-focus',direction};
  const r=world.select(p,pose);assert(r?.separableAttack);assert(r.id.includes('male-focus-east-modular8'));assert.equal(r.timeline.length,8);assert.equal(r.fps,12);assert.deepEqual(r.equipmentContract,{weapon:32,...(coat?{coat}:{})});
  assert(await world.prepareClip(p,pose));const images=new Map(await Promise.all(h.requiredFiles(r).map(async f=>[f,await load(f)])));
  for(let frame=0;frame<8;frame++){
   const x=cv.createCanvas(640,640).getContext('2d');h.render(x,r,images,{frame});const name=coat?'M'+coat+'/'+frame+'-east.png':'source-'+frame+'.png',raw=await zip.read(name);assert.equal(crypto.createHash('sha256').update(raw).digest('hex'),fixture.members[name]);
   const ref=cv.createCanvas(640,640).getContext('2d');if(direction==='west'){ref.translate(640,0);ref.scale(-1,1);}ref.drawImage(await cv.loadImage(Buffer.from(raw)),0,0);
   const a=x.getImageData(0,0,640,640).data,b=ref.getImageData(0,0,640,640).data;for(let n=0;n<a.length;n++)assert(n%4===3?a[n]===b[n]:Math.abs(a[n]-b[n])<=1,'32 source '+coat+'/'+direction+'/'+frame+' byte'+n);
   const key=direction+'/'+frame;
   if(!coat)bareFrames.set(key,a);else{
    const g=cv.createCanvas(640,640).getContext('2d');g.drawImage(images.get('tools/rework-weapon-layers-hd/'+rig.directions[direction].weapons[32][frame].url),0,0);const ownership=g.getImageData(0,0,640,640).data;
    const coatRecord=h.resolveSeparable({body:'male',action:'attack-focus',direction,appearance:rig.approvedAppearance,equipment:{coat}}),without=cv.createCanvas(640,640).getContext('2d');h.render(without,coatRecord,images,{frame});const coatPixels=without.getImageData(0,0,640,640).data,bare=bareFrames.get(key);
    for(let n=0;n<a.length;n+=4)for(let q=0;q<4;q++)assert.equal(a[n+q],ownership[n+3]?bare[n+q]:coatPixels[n+q],ownership[n+3]?'32 gear must survive coat swap':'32 coat outside gear must remain unchanged');
   }
   assert(world.draw(cv.createCanvas(640,640).getContext('2d'),p,{...pose,progress:(frame+.1)/8,x:320,y:512}));count++;
  }
  for(const slot of ['gloves','head','legs','boots','cloak'])assert(!world.select({...p,equipment:{...p.equipment,[slot]:{def:152}}},pose)?.separableAttack,slot);
  for(const action of ['idle','walk','attack-unarmed','attack-firearm'])assert(!world.select(p,{...pose,action})?.separableAttack,action);
  assert(!world.select({...p,__reworkSubset:true},pose)?.separableAttack);
  assert(!world.select({...p,appearance96:{...p.appearance96,hairColor:'pink'}},pose)?.separableAttack);
 }
 assert.equal(count,80);
});
