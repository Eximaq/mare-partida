'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),z=require('node:zlib'),p=require('node:path'),crypto=require('node:crypto'),R=p.resolve(process.env.KAIZOKU_REPO||p.dirname(__dirname)),C=process.env.CANDIDATE_DIR;
const {make,cv}=require(R+'/tests/rework-integration-support.cjs'),A=require(R+'/character-appearance.js'),load=require(R+'/tools/rework-hd-test-loader.cjs').create(R),index=require(R+'/tools/rework-weapon-layers-hd/index.json'),stock=make();
const raw={gender:'masculino',skinStyle:'natural',skinColor:'light',hairStyle:'original',hairColor:'black',eyeStyle:'original',eyeColor:'blue'};
const save=(look={},equipment={weapon:{def:14}},classId='cyborg')=>JSON.parse(JSON.stringify(A.commit({id:'w14-disposable',classId,equipment},{...raw,...look},()=>true)));
// A scratch candidate can keep unpublished assets in its own archive.
const asset=C?async f=>{
  const root=p.resolve(C,'tools/rework-weapon-layers-hd/archives'),h=p.basename(f,'.png');
  if(!/tools\/rework-weapon-layers-hd\/assets\//.test(f))return load(f);
  const ai=JSON.parse(fs.readFileSync(p.join(root,'archive-index.json'))),e=ai.sources[h];
  if(e?.archive!=='gauntlet14-north-own-attack.zip')return load(f);
  const packed=ai.archives.find(a=>a.file===e.archive),zip=await global.MareReworkZip.loadArchive(fs.readFileSync(p.join(root,e.archive)),packed.sha256);
  return cv.loadImage(Buffer.from(await zip.read(e.path)));
}:load;
const pix=c=>Buffer.from(c.getImageData(0,0,768,768).data),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{await stock.ready;let api=stock;
 if(C){global.MareReworkWeaponNativeHD=require(p.resolve(C,'player-rework-weapon-native-hd.js'));api=require(p.resolve(C,'player-rework-native-hd.js')).create({fetchJSON:async f=>JSON.parse(fs.existsSync(p.join(R,f))?fs.readFileSync(p.join(R,f)):z.gunzipSync(fs.readFileSync(p.join(R,f+'.gz')))),loadImage:asset,makeCanvas:cv.createCanvas});await api.ready;}
 const o={direction:'north',action:'attack-unarmed',consumer:'world'},q=save(),r=api.selectVisual(q,o);
 assert(r?.gauntlet14NorthOwnAttack,'real normalized saved profile must select approved W14 NORTH preview');
 if(C)assert(!stock.selectVisual(q,o)?.gauntlet14NorthOwnAttack);
 const original=index.records.find(v=>v.id==='gauntlet14-north-native-original-source');
 assert.equal(r.basePack.pack.directions.north.layers.length,4);assert.equal(r.states.length,8);assert.equal(r.fps,12);
 assert.deepEqual(r.timeline,['0','1','2','3','4','5','6','7']);assert.deepEqual(r.equipmentContract,{weapon:14});
 assert.equal(api.selectVisual(q,{...o,action:'attack'})?.id,r.id);
 for(const action of ['idle','walk'])assert(!api.selectVisual(q,{...o,action})?.gauntlet14NorthOwnAttack);
 for(const [a,b] of [[save({},undefined,'sword'),o],[save({hairStyle:'hair-spiky'}),o],[save({hairColor:'brown'}),o],[save({eyeColor:'brown'}),o],[save({eyeStyle:'face-calm'}),o],
 [save({},{weapon:{def:14,variantId:'original',appearanceVariant:'different'}}),o],[save({},{weapon:{def:14},coat:{def:151}}),o],[save({},{weapon:{def:14},head:{def:19}}),o],[save({},{weapon:{def:14},gloves:{def:26}}),o],
 [q,{...o,weaponless:true}],[q,{...o,consumer:'preview'}],[q,{...o,direction:'west'}],[q,{...o,direction:'east'}],[q,{...o,direction:'south'}],
 [{...q,appearance96:{...q.appearance96,hairColor:'original',eyeColor:'original',skinColor:'original'}},o]]){
  assert(!api.selectVisual(a,b)?.gauntlet14NorthOwnAttack);if(C)assert.deepEqual(api.selectVisual(a,b),stock.selectVisual(a,b));
 }
 const native=global.MareReworkWeaponNativeHD.create(index,{makeCanvas:cv.createCanvas});
 const gearHashes=["ac01458a434dc2ffb05168c22651e6631f7977101db543f886cdd6386950145b", "466deadd155086eb001e9f9f03adbd05dbac56183dceff35ceab249537cb166e", "4d0d9ead18191ec4d6c6cf6f73bd3d1c1aca1cc99c8e54b7021cc4d8fe23d8a0", "09a0d968ba655c74649b2aab24d6fd41f4d3960637021e21c04388cdaab4f46d", "88b7bfbec9aab1c1718af5092f779c217bf6305c4c35e2fe64137389239cfc7d", "4432a37e90bfd10c06fb7b4c6aaf931ffa21c838065758d98c2a3177f838f970", "0707c727810986e448c03fd1034d2993810be2381445eb218a5d50a3aeb42732", "ac01458a434dc2ffb05168c22651e6631f7977101db543f886cdd6386950145b"];
 const signedBody=index.records.find(v=>v.id==='gauntlet112-north-native-layers').basePack;
 const manual={...original,id:original.id+':independent-archive-reference',basePack:signedBody,hairSeparated:true,pivot:[80,128],renderOffsetPhysical:[64,64],states:original.states.map((s,f)=>({...s,layers:[],attachment:{url:'assets/'+gearHashes[f]+'.png',sha256:gearHashes[f],size:[640,640],depth:12,matrix:[1,0,0,1,0,0]}}))};
 assert.deepEqual(r.basePack,signedBody);assert.deepEqual(r.states,manual.states);
 const paths=native.requiredFiles(manual),ims=new Map(await Promise.all(paths.map(async f=>[f,await asset(f)])));
 const refNative=global.MareReworkWeaponNativeHD.create(index,{makeCanvas:cv.createCanvas});
 const dir=signedBody.pack.directions.north;assert(!dir.layers.some(v=>v.slot==='face'));
 const gearOnly=[]; const neutral=[];
 for(let f=0;f<8;f++){
  const own=manual.states[f].attachment.url,c=cv.createCanvas(768,768).getContext('2d'),d=cv.createCanvas(768,768).getContext('2d'),e=cv.createCanvas(768,768).getContext('2d');
  c.drawImage(ims.get('tools/rework-weapon-layers-hd/'+own),64,64);
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
  assert(record?.gauntlet14NorthOwnAttack);assert(await api.prepareClip(actor,o));
  const hashes=[];
  for(let f=0;f<8;f++){
   const ref=cv.createCanvas(768,768).getContext('2d');native.render(ref,manual,ims,{frame:f,appearance});
   let submitted;assert(api.draw({save(){},restore(){},drawImage(c){submitted=c;}},actor,{...o,progress:(f+.5)/8,x:384,y:576}));
   assert.deepEqual(api.snapshot().last.pivot,{x:384,y:576});assert.equal(api.snapshot().last.frame,f);assert.equal(api.snapshot().last.source,record.id);
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
