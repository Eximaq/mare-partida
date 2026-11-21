'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),p=require('node:path'),crypto=require('node:crypto'),R=p.resolve(process.env.KAIZOKU_REPO||p.dirname(__dirname)),C=process.env.CANDIDATE_DIR;
const {make,cv}=require(R+'/tests/rework-integration-support.cjs'),A=require(R+'/character-appearance.js'),load=require(R+'/tools/rework-hd-test-loader.cjs').create(R),
 index=require(R+'/tools/rework-weapon-layers-hd/index.json'),stock=make(),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const raw={gender:'masculino',skinStyle:'natural',skinColor:'light',hairStyle:'original',hairColor:'black',eyeStyle:'original',eyeColor:'blue'};
const save=(id,look={},equipment={weapon:{def:id}},classId='sword')=>JSON.parse(JSON.stringify(A.commit({id:'sword-disposable',classId,equipment},{...raw,...look},()=>true)));
const img=(ctx)=>Buffer.from(ctx.getImageData(0,0,ctx.canvas.width,ctx.canvas.height).data);
(async()=>{await stock.ready;let api=stock,asset=load;
 if(C){
  const ai=require(p.join(C,'archive-index.json'));const entry=ai.archives.find(e=>e.file==='swords67-70-north-own-poses.zip');
  const zip=await global.MareReworkZip.loadArchive(fs.readFileSync(p.join(C,entry.file)),entry.sha256);
  asset=async f=>{const h=p.basename(f,'.png'),e=ai.sources[h];if(e?.archive!==entry.file)return load(f);return cv.loadImage(Buffer.from(await zip.read(e.path)));};
  global.MareReworkWeaponNativeHD=require(p.resolve(C,'player-rework-weapon-native-hd.js'));
  api=require(p.resolve(C,'player-rework-native-hd.js')).create({fetchJSON:async f=>JSON.parse(fs.readFileSync(p.join(R,f))),loadImage:asset,makeCanvas:cv.createCanvas});await api.ready;
 }
 const native=global.MareReworkWeaponNativeHD.create(index,{makeCanvas:cv.createCanvas});
 let n=0;
 for(const id of [67,70]){
  const o={direction:'north',action:'attack-sword',consumer:'world'},pad=id===70?64:0,dim=640+pad*2, q=save(id),r=api.selectVisual(q,o);
  assert(r?.ownedNorthSwordRestored,'normalized save must select the authored North layers');
  if(C) assert(!stock.selectVisual(q,o)?.ownedNorthSwordRestored);
  const original=index.records.find(v=>v.id==='sword'+id+'-north-native-layers');
  assert.equal(r.fps,12);assert.deepEqual(r.timeline,original.timeline);assert.deepEqual(r.equipmentContract,{weapon:id});
  assert.equal(api.selectVisual(q,{...o,action:'attack'})?.id,r.id);
  assert.equal(r.basePack.pack.directions.north.layers.length,10);
  for(const [a,b] of [[save(id,{},undefined,'brawler'),o],[save(id,{hairStyle:'hair-spiky'}),o],[save(id,{hairColor:'brown'}),o],[save(id,{eyeColor:'brown'}),o],[save(id,{eyeStyle:'face-calm'}),o],
   [save(id,{},{weapon:{def:id,variantId:'original',appearanceVariant:'different'}}),o],[save(id,{},{weapon:{def:id},coat:{def:151}}),o],[save(id,{},{weapon:{def:id},head:{def:19}}),o],[save(id,{},{weapon:{def:id},gloves:{def:26}}),o],
   [q,{...o,weaponless:true}],[q,{...o,consumer:'preview'}],[q,{...o,direction:'west'}],[q,{...o,direction:'east'}],[q,{...o,direction:'south'}],[q,{...o,action:'idle'}],[q,{...o,action:'walk'}]]){
   assert(!api.selectVisual(a,b)?.ownedNorthSwordRestored);
   if(C)assert.deepEqual(api.selectVisual(a,b),stock.selectVisual(a,b));
  }
  const mapped=new Map(await Promise.all(native.requiredFiles(r).map(async f=>[f,await asset(f)])));
  const states=[];
  for(let f=0;f<8;f++){
   const cc=cv.createCanvas(dim,dim).getContext('2d'),dd=cv.createCanvas(dim,dim).getContext('2d'),gg=cv.createCanvas(dim,dim).getContext('2d');
   native.render(cc,r,mapped,{frame:f,appearance:{}});
   dd.drawImage(await load('tools/rework-weapon-layers-hd/'+original.states[f].approved.url),0,0);
   gg.drawImage(mapped.get('tools/rework-weapon-layers-hd/'+r.states[f].attachment.url),0,0);
   const neu=img(cc),sig=img(dd),gear=img(gg);let maxA=0,maxPremul=0,exact=0,alphaDiff=0;
   for(let j=0;j<neu.length;j+=4){
    if(neu.readUInt32LE(j)!==sig.readUInt32LE(j))exact++;
    const da=Math.abs(neu[j+3]-sig[j+3]);if(da)alphaDiff++;maxA=Math.max(maxA,da);
    for(let k=0;k<3;k++)maxPremul=Math.max(maxPremul,Math.abs(Math.round(neu[j+k]*neu[j+3]/255)-Math.round(sig[j+k]*sig[j+3]/255)));
   }
   console.log(id,f,'approved PNG-to-Canvas diff',exact,'alpha',alphaDiff,'max alpha',maxA,'max premul',maxPremul);
   assert(maxA<=1&&maxPremul<=2);states.push({neu,gear});
  }
  for(const skin of Object.keys(A.skins)){
   const actor=save(id,{skinColor:skin}),look=A.read(actor),vis=api.selectVisual(actor,o),before=JSON.stringify(actor);
   assert(vis?.ownedNorthSwordRestored);assert(await api.prepareClip(actor,o));
   const hashes=[];
   for(let f=0;f<8;f++){
    const independent=cv.createCanvas(dim,dim).getContext('2d');
    native.render(independent,r,mapped,{frame:f,appearance:look});
    let submitted;assert(api.draw({save(){},restore(){},drawImage(c){submitted=c;}},actor,{...o,progress:(f+.5)/8,x:384,y:576}));
    assert.deepEqual(api.snapshot().last.pivot,{x:320+pad,y:512+pad});assert.equal(api.snapshot().last.frame,f);
    const v=img(submitted.getContext('2d'));assert(v.equals(img(independent)));
    const {neu,gear}=states[f];let liveSkin=0,sword=0;
    for(let j=0;j<v.length;j+=4){
     assert.equal(v[j+3],neu[j+3]);
     if(gear[j+3]===255&&neu.readUInt32LE(j)===gear.readUInt32LE(j)){assert.equal(v.readUInt32LE(j),gear.readUInt32LE(j));sword++;}
     else if(v.readUInt32LE(j)!==neu.readUInt32LE(j))liveSkin++;
    }
    assert(liveSkin>500&&sword>250,JSON.stringify([id,skin,f,liveSkin,sword]));hashes.push(sha(v));n++;
   }
   assert(new Set(hashes).size>=7);assert.equal(JSON.stringify(actor),before);
  }
 }
 assert.equal(n,128);console.log('PASS 128 actual world frames: W67/W70 NORTH, eight tones, saved appearance/prior routes, armor/timing/alpha unchanged');
})().catch(e=>{console.error(e);process.exitCode=1;});
