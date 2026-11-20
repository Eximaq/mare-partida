'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),z=require('node:zlib'),p=require('node:path'),crypto=require('node:crypto'),R=p.resolve(process.env.KAIZOKU_REPO||p.dirname(__dirname)),C=process.env.CANDIDATE_DIR;
const {make,cv}=require(R+'/tests/rework-integration-support.cjs'),A=require(R+'/character-appearance.js'),load=require(R+'/tools/rework-hd-test-loader.cjs').create(R),index=require(R+'/tools/rework-weapon-layers-hd/index.json'),stock=make();
const raw={gender:'masculino',skinStyle:'natural',skinColor:'light',hairStyle:'original',hairColor:'black',eyeStyle:'original',eyeColor:'blue'};
const save=(look={},equipment={weapon:{def:122}},classId='strategist')=>JSON.parse(JSON.stringify(A.commit({id:'w122-disposable',classId,equipment},{...raw,...look},()=>true)));
// A scratch candidate can keep unpublished assets in its own archive.
const asset=C?async f=>{
  const root=p.resolve(C,'tools/rework-weapon-layers-hd/archives'),h=p.basename(f,'.png');
  if(!/tools\/rework-weapon-layers-hd\/assets\//.test(f))return load(f);
  const ai=JSON.parse(fs.readFileSync(p.join(root,'archive-index.json'))),e=ai.sources[h];
  if(e?.archive!=='orb122-north-restored-approved.zip')return load(f);
  const packed=ai.archives.find(a=>a.file===e.archive),zip=await global.MareReworkZip.loadArchive(fs.readFileSync(p.join(root,e.archive)),packed.sha256);
  return cv.loadImage(Buffer.from(await zip.read(e.path)));
}:load;
const pix=c=>Buffer.from(c.getImageData(0,0,640,640).data),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const approvedPreviewHashes={"light":["f28d422935ff1f442ae3fa26a0da978d21653208c8eae9151120fabab143c154","862327b805806f66369c69aef281bbf30da935df333948c9e368ecef3965af19","e0a67f10d9210b4722d2784fac060c929c285225f08f5f7a2276e945d59cb130","e477767c22aec6ba5b0ddf5291c178132d3aefdfff8c21fe99ff0eec4bd75c4d","9765f0f060ad8a0271969e38957947b37e5566e7a090c6aa7c9aa5564f917872","97071b31ffc18cff1e749198c03a34f8d839996c5be49cbaaf0800ab267765b9","388ab8fb51111a8ff3c2442c53277d193fd8e5ddfba6d9027035fa3d0a97642b","d8677da6387dcdf124ad560ce69f2fc026ed998447c622090e1408db325bbcb8"],"dark":["88bf97f3482271928d24d3ff76c508cd06faff5a11389558e949cafa0c58893e","8956fb26fe9cbfd0350942b7596a269d7f0be451e409bceeb144759d5291de56","eac3bfcb6e1a776baec2374d3c8fa65273ffd13732703936ff615e7a58a80631","967353822ebe6050dc9a44a487ae35e2b02e8a1b929a6446fd79922d4ad57f40","cadf4891c6fee569ac6c13bcd6ab425fba18240d8c311a65017b9376bc82d363","0ff99f28750337971fc8e195e9b4e5032b4c38472948ec51bfb467c4deffb497","c1b1505ed822593122fe2a1ea467ae5ef4b748896a2d60e7a6d72778a117acd7","e0d2c1c19aef226efb13d7e60d418a5f7f0e1885de3caade6f1e6fc587f39839"]};
(async()=>{await stock.ready;let api=stock;
 if(C){global.MareReworkWeaponNativeHD=require(p.resolve(C,'player-rework-weapon-native-hd.js'));api=require(p.resolve(C,'player-rework-native-hd.js')).create({fetchJSON:async f=>JSON.parse(fs.existsSync(p.join(R,f))?fs.readFileSync(p.join(R,f)):z.gunzipSync(fs.readFileSync(p.join(R,f+'.gz')))),loadImage:asset,makeCanvas:cv.createCanvas});await api.ready;}
 const o={direction:'north',action:'attack-focus',consumer:'world'},q=save(),r=api.selectVisual(q,o);
 assert(r?.orb122NorthRestoredApproved,'real normalized saved profile must select approved W122 NORTH preview');
 if(C)assert(!stock.selectVisual(q,o)?.orb122NorthRestoredApproved);
 const original=index.records.find(v=>v.id==='orb122-north-native-layers');
 assert.equal(r.basePack.pack.directions.north.layers.length,original.basePack.pack.directions.north.layers.length);assert.equal(r.states.length,8);assert.equal(r.fps,12);
 assert.deepEqual(r.timeline,['0','1','2','3','4','5','6','7']);assert.deepEqual(r.equipmentContract,{weapon:122});
 assert.equal(api.selectVisual(q,{...o,action:'attack'})?.id,r.id);
 for(const action of ['idle','walk'])assert(!api.selectVisual(q,{...o,action})?.orb122NorthRestoredApproved);
 for(const [a,b] of [[save({},undefined,'sword'),o],[save({hairStyle:'hair-spiky'}),o],[save({hairColor:'brown'}),o],[save({eyeColor:'brown'}),o],[save({eyeStyle:'face-calm'}),o],
 [save({},{weapon:{def:122,variantId:'original',appearanceVariant:'different'}}),o],[save({},{weapon:{def:122},coat:{def:151}}),o],[save({},{weapon:{def:122},head:{def:19}}),o],[save({},{weapon:{def:122},gloves:{def:26}}),o],
 [q,{...o,weaponless:true}],[q,{...o,consumer:'preview'}],[q,{...o,direction:'west'}],[q,{...o,direction:'east'}],[q,{...o,direction:'south'}],
 [{...q,appearance96:{...q.appearance96,hairColor:'original',eyeColor:'original',skinColor:'original'}},o]]){
  assert(!api.selectVisual(a,b)?.orb122NorthRestoredApproved);if(C)assert.deepEqual(api.selectVisual(a,b),stock.selectVisual(a,b));
 }
 const native=global.MareReworkWeaponNativeHD.create(index,{makeCanvas:cv.createCanvas});
 const approvals={"own-gear-0.png":"f467775debc77b8536f714d85d6a1f839c2e89f3758efb047a1c3ae0564dcee0","own-gear-1.png":"c245e496da1a03f205a01fc59908f559304bbbc1e14f9ad3d818f06c8a437884","own-gear-2.png":"e0bdaf5508466f017d82fb71c420b91ea408c1daefb1a724abe0154cbf199237","own-gear-3.png":"d6575eb64dd26806906991fe3f55e5a64d6d82eb257e42b7ced5a6c802c8f5b5","own-gear-4.png":"a50b597952643cb497391c2aa17fcb5c1dbcc6c3df16253141a6eff08d08073e","own-gear-5.png":"1d435b91b01beadde049b6d99632377d8ce06ff4e14f1aed2723b4cb7b64e93a","own-gear-6.png":"22c1eab8323d4a1d8a728ae99dbbff5a9ff8d994fc0e4b42f1666f953c4277c1","own-gear-7.png":"f467775debc77b8536f714d85d6a1f839c2e89f3758efb047a1c3ae0564dcee0","restored-hand-0.png":"8a04e32cc28b9a80ea73b47268bf6c9acd8d48d3d82659d869bbc3c9bb50674d","restored-hand-7.png":"a862cc9edc9b9dba03580edf28d115ab06863cbb7b3b4523ef6eb5af07d772eb","restored-background-0.png":"bb94bb7c0081fc93dd65e54133d65df76cebea83fc1b81af2ecc42c4895e82f2"};
 const dir0=original.basePack.pack.directions.north;
 const layers=dir0.layers.map(l=>!['shorts','forearm-hand-far'].includes(l.id)?l:{...l,frames:l.frames.map((h,k)=>l.id==='shorts'&&k===0?approvals['restored-background-0.png']:l.id==='forearm-hand-far'&&[0,7].includes(k)?approvals['restored-hand-'+k+'.png']:h)});
 const images={...original.basePack.images,...Object.fromEntries(Object.values(approvals).map(h=>[h,'assets/'+h+'.png']))};
 const manual={...original,id:original.id+':approved-test-reference',basePack:{pack:{...original.basePack.pack,directions:{north:{...dir0,layers}}},images},
  states:original.states.map((s,k)=>({...s,layers:[],attachment:{url:'assets/'+approvals['own-gear-'+k+'.png']+'.png',sha256:approvals['own-gear-'+k+'.png'],size:[640,640],matrix:[1,0,0,1,0,0],depth:3}}))};
 assert.deepEqual(r.basePack.pack,manual.basePack.pack);
 assert.deepEqual(r.states,manual.states);
 const paths=native.requiredFiles(manual),ims=new Map(await Promise.all(paths.map(async f=>[f,await asset(f)])));
 const dir=original.basePack.pack.directions.north;assert(!dir.layers.some(v=>v.slot==='face'));assert.equal(dir.layers.find(v=>v.id==='forearm-hand-far').depth,4);
 let n=0;
 for(const skinColor of Object.keys(A.skins)){
  const actor=save({skinColor}),appearance=A.read(actor),record=api.selectVisual(actor,o),memo=JSON.stringify(actor);
  assert(record?.orb122NorthRestoredApproved);assert(await api.prepareClip(actor,o));
  const hashes=[];
  for(let f=0;f<8;f++){
   const ref=cv.createCanvas(640,640).getContext('2d');native.render(ref,manual,ims,{frame:f,appearance});
   let submitted;assert(api.draw({save(){},restore(){},drawImage(c){submitted=c;}},actor,{...o,progress:(f+.5)/8,x:320,y:512}));
   assert.deepEqual(api.snapshot().last.pivot,{x:320,y:512});assert.equal(api.snapshot().last.frame,f);assert.equal(api.snapshot().last.source,record.id);
   const actual=pix(submitted.getContext('2d'));assert(actual.equals(pix(ref)),skinColor+' frame '+f+' world differs from reviewed pose or tone');
   const key={light:'light',ebony:'dark'}[skinColor];if(key)assert.equal(sha(actual),approvedPreviewHashes[key][f],skinColor+' frame '+f+' approved preview pixels');
   hashes.push(sha(actual));n++;
  }
  assert(new Set(hashes).size>=7);assert.equal(JSON.stringify(actor),memo);
 }
 assert.equal(n,64);console.log('PASS 64: 8 saves x 8 frames, 16 captures byte-exact to approved preview, Original/gear/variant controls');
})().catch(e=>{console.error(e);process.exitCode=1});
