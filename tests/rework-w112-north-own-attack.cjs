'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),z=require('node:zlib'),p=require('node:path'),crypto=require('node:crypto'),R=p.resolve(process.env.KAIZOKU_REPO||p.dirname(__dirname)),C=process.env.CANDIDATE_DIR;
const {make,cv}=require(R+'/tests/rework-integration-support.cjs'),A=require(R+'/character-appearance.js'),load=require(R+'/tools/rework-hd-test-loader.cjs').create(R),index=require(R+'/tools/rework-weapon-layers-hd/index.json'),stock=make();
const raw={gender:'masculino',skinStyle:'natural',skinColor:'light',hairStyle:'original',hairColor:'black',eyeStyle:'original',eyeColor:'blue'};
const save=(look={},equipment={weapon:{def:112}},classId='brawler')=>JSON.parse(JSON.stringify(A.commit({id:'w112-disposable',classId,equipment},{...raw,...look},()=>true)));
// A scratch candidate can keep unpublished assets in its own archive.
const asset=C?async f=>{
  const root=p.resolve(C,'tools/rework-weapon-layers-hd/archives'),h=p.basename(f,'.png');
  if(!/tools\/rework-weapon-layers-hd\/assets\//.test(f))return load(f);
  const ai=JSON.parse(fs.readFileSync(p.join(root,'archive-index.json'))),e=ai.sources[h];
  if(e?.archive!=='gauntlet112-north-own-attack.zip')return load(f);
  const packed=ai.archives.find(a=>a.file===e.archive),zip=await global.MareReworkZip.loadArchive(fs.readFileSync(p.join(root,e.archive)),packed.sha256);
  return cv.loadImage(Buffer.from(await zip.read(e.path)));
}:load;
const pix=c=>Buffer.from(c.getImageData(0,0,640,640).data),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{await stock.ready;let api=stock;
 if(C){global.MareReworkWeaponNativeHD=require(p.resolve(C,'player-rework-weapon-native-hd.js'));api=require(p.resolve(C,'player-rework-native-hd.js')).create({fetchJSON:async f=>JSON.parse(fs.existsSync(p.join(R,f))?fs.readFileSync(p.join(R,f)):z.gunzipSync(fs.readFileSync(p.join(R,f+'.gz')))),loadImage:asset,makeCanvas:cv.createCanvas});await api.ready;}
 const o={direction:'north',action:'attack-unarmed',consumer:'world'},q=save(),r=api.selectVisual(q,o);
 assert(r?.gauntlet112NorthOwnAttack,'real normalized saved profile must select approved W112 NORTH preview');
 if(C)assert(!stock.selectVisual(q,o)?.gauntlet112NorthOwnAttack);
 const original=index.records.find(v=>v.id==='gauntlet112-north-native-layers');
 assert.equal(r.basePack.pack.directions.north.layers.length,original.basePack.pack.directions.north.layers.length);assert.equal(r.states.length,8);assert.equal(r.fps,12);
 assert.deepEqual(r.timeline,['0','1','2','3','4','5','6','7']);assert.deepEqual(r.equipmentContract,{weapon:112});
 assert.equal(api.selectVisual(q,{...o,action:'attack'})?.id,r.id);
 for(const action of ['idle','walk'])assert(!api.selectVisual(q,{...o,action})?.gauntlet112NorthOwnAttack);
 for(const [a,b] of [[save({},undefined,'sword'),o],[save({hairStyle:'hair-spiky'}),o],[save({hairColor:'brown'}),o],[save({eyeColor:'brown'}),o],[save({eyeStyle:'face-calm'}),o],
 [save({},{weapon:{def:112,variantId:'original',appearanceVariant:'different'}}),o],[save({},{weapon:{def:112},coat:{def:151}}),o],[save({},{weapon:{def:112},head:{def:19}}),o],[save({},{weapon:{def:112},gloves:{def:26}}),o],
 [q,{...o,weaponless:true}],[q,{...o,consumer:'preview'}],[q,{...o,direction:'west'}],[q,{...o,direction:'east'}],[q,{...o,direction:'south'}],
 [{...q,appearance96:{...q.appearance96,hairColor:'original',eyeColor:'original',skinColor:'original'}},o]]){
  assert(!api.selectVisual(a,b)?.gauntlet112NorthOwnAttack);if(C)assert.deepEqual(api.selectVisual(a,b),stock.selectVisual(a,b));
 }
 const native=global.MareReworkWeaponNativeHD.create(index,{makeCanvas:cv.createCanvas});
 const gearHashes=["764438c4dcf05bf9a8492b231796c6c8bee28dfbb4431e909dcba04199b63a6a", "671b775dcc1aafefa62cd7d53bbbecc33bd3cf9e6b2179339c75005942d5d3c8", "81dc30c1ef8eaee4105faeb910373853b1b2aaafbff348edc2fb2b96e6717527", "28a06ef869eef38b19dcd86a7b239d00637c588c5239e9ba9684c9424ad652ee", "1f777c4ee7cf9ff11d67121f5462cb527c70b5609f3db387c4c602669ed16ba9", "b6dc56047729214e7dad00c129897065abdcfaab49efaa66d7df1ba3d5111a34", "4752200d8ff893a4c15b80b9125d0605bde9fd6a67c4bc98c1ad07925a74201f", "0ed72f0c056ab56071a6c5a98ebc1c0d90db484ca87259113290b74608ac0ab3"];
 const manual={...original,id:original.id+':independent-archive-reference',states:original.states.map((s,f)=>({...s,layers:[{url:'assets/'+gearHashes[f]+'.png',sha256:gearHashes[f],size:[640,640],role:'equipment',depth:12,operation:'source-over'}]}))};
 assert.deepEqual(r.basePack,original.basePack);assert.deepEqual(r.states,manual.states);
 const paths=native.requiredFiles(manual),ims=new Map(await Promise.all(paths.map(async f=>[f,await asset(f)])));
 const refNative=global.MareReworkWeaponNativeHD.create(index,{makeCanvas:cv.createCanvas});
 const dir=original.basePack.pack.directions.north;assert(!dir.layers.some(v=>v.slot==='face'));
 const gearOnly=[]; const neutral=[];
 for(let f=0;f<8;f++){
  const own=manual.states[f].layers[0].url,c=cv.createCanvas(640,640).getContext('2d'),d=cv.createCanvas(640,640).getContext('2d'),e=cv.createCanvas(640,640).getContext('2d');
  c.drawImage(ims.get('tools/rework-weapon-layers-hd/'+own),0,0);
  const h=original.states[f].approved.url,target=await load('tools/rework-weapon-layers-hd/'+h);
  d.drawImage(target,0,0);refNative.render(e,manual,ims,{frame:f,appearance:{}});
  const g=pix(c),t=pix(d),r=pix(e);let diffs=0,edge=0,opaqueGear=0,maxPremul=0,gearVisible=0;
  for(let j=0;j<t.length;j+=4){
    if([0,1,2,3].some(k=>t[j+k]!==r[j+k]))diffs++;
    const da=Math.abs(t[j+3]-r[j+3]);assert(da<=1);if(da)edge++;
    if(g[j+3])gearVisible++; for(let k=0;k<3;k++)maxPremul=Math.max(maxPremul,Math.abs(Math.round(t[j+k]*t[j+3]/255)-Math.round(r[j+k]*r[j+3]/255)));
    if(g[j+3]===255){assert.equal(r.readUInt32LE(j),g.readUInt32LE(j));opaqueGear++;}
  }
  assert(gearVisible>400);assert(maxPremul<=2);gearOnly.push(g);neutral.push(r);
  console.log(f,'approved raw vs Canvas software blend differences',diffs,'alpha',edge,'max premul +/-',maxPremul,'own gear visible/opaque',gearVisible,opaqueGear);
 }
 let n=0;
 for(const skinColor of Object.keys(A.skins)){
  const actor=save({skinColor}),appearance=A.read(actor),record=api.selectVisual(actor,o),memo=JSON.stringify(actor);
  assert(record?.gauntlet112NorthOwnAttack);assert(await api.prepareClip(actor,o));
  const hashes=[];
  for(let f=0;f<8;f++){
   const ref=cv.createCanvas(640,640).getContext('2d');native.render(ref,manual,ims,{frame:f,appearance});
   let submitted;assert(api.draw({save(){},restore(){},drawImage(c){submitted=c;}},actor,{...o,progress:(f+.5)/8,x:320,y:512}));
   assert.deepEqual(api.snapshot().last.pivot,{x:320,y:512});assert.equal(api.snapshot().last.frame,f);assert.equal(api.snapshot().last.source,record.id);
   const actual=pix(submitted.getContext('2d'));assert(actual.equals(pix(ref)),skinColor+' frame '+f+' world differs from reviewed pose or tone');
   const g=gearOnly[f];let liveSkin=0;
   for(let j=0;j<actual.length;j+=4){assert.equal(actual[j+3],neutral[f][j+3]);if(g[j+3]===255)assert.equal(actual.readUInt32LE(j),g.readUInt32LE(j));else if(actual.readUInt32LE(j)!==neutral[f].readUInt32LE(j))liveSkin++;}
   assert(liveSkin>500);
   hashes.push(sha(actual));n++;
  }
  assert(new Set(hashes).size>=7);assert.equal(JSON.stringify(actor),memo);
 }
 assert.equal(n,64);console.log('PASS 64: 8 saves x 8 frames, whole authored gear exact, Original / other gear / variant controls');
})().catch(e=>{console.error(e);process.exitCode=1});
