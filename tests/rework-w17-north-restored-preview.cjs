'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),z=require('node:zlib'),p=require('node:path'),crypto=require('node:crypto'),R=p.resolve(process.env.KAIZOKU_REPO||p.dirname(__dirname)),C=process.env.CANDIDATE_DIR;
const {make,cv}=require(R+'/tests/rework-integration-support.cjs'),A=require(R+'/character-appearance.js'),load=require(R+'/tools/rework-hd-test-loader.cjs').create(R),index=require(R+'/tools/rework-weapon-layers-hd/index.json'),stock=make();
const raw={gender:'masculino',skinStyle:'natural',skinColor:'light',hairStyle:'original',hairColor:'black',eyeStyle:'original',eyeColor:'blue'};
const save=(look={},equipment={weapon:{def:17}},classId='strategist')=>JSON.parse(JSON.stringify(A.commit({id:'w17-disposable',classId,equipment},{...raw,...look},()=>true)));
// A scratch candidate can keep unpublished assets in its own archive.
const asset=C?async f=>{
  const root=p.resolve(C,'tools/rework-weapon-layers-hd/archives'),h=p.basename(f,'.png');
  if(!/tools\/rework-weapon-layers-hd\/assets\//.test(f))return load(f);
  const ai=JSON.parse(fs.readFileSync(p.join(root,'archive-index.json'))),e=ai.sources[h];
  if(e?.archive!=='orb17-north-restored-approved.zip')return load(f);
  const packed=ai.archives.find(a=>a.file===e.archive),zip=await global.MareReworkZip.loadArchive(fs.readFileSync(p.join(root,e.archive)),packed.sha256);
  return cv.loadImage(Buffer.from(await zip.read(e.path)));
}:load;
const pix=c=>Buffer.from(c.getImageData(0,0,640,640).data),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const approvedPreviewHashes={"light":["fc7ccaa2bce336039f8f2fcfa235f7039cc22793ffec1a9b7a3d23ef5969ce87","2fb8ceefae5bcd2c725aad527c673b809c88bc2e2d0b90a6180311513328fa2a","20bc82311b6d5073a96e3769dec0b795e6375f33005310b24b442e1bf4350c9f","22406a4fafbb86b7b7ab8e1dc4bf8e00f2abe5970df07c24dd14761b867597fd","fe18d1f622b9eeecdcc5f46eb76099dd7c79ae0367f3458397a5665f18e9f7a5","8299acf6447e4d76292c2ee55ddc2293c6912e9412d27a6067717e850422e7fa","16aaf3f17b0f5bd96bf48700f6859eac38f29e50f40446487f6231be76051918","7faea5cde653757a7c3edda49fba8ab86fb9a54764fe53f6b45cffe7a508651b"],"dark":["6cbab998a41af76e24522532a57de42c7d17f2b148111dfdc34ef37e3454ff6a","e0e4912dba257e71ffd2d5755af5108e3b61cfac5d08e8b331c03a2e87d1a546","fb513077f4f6725ff8c7dd743c02f58563a80586203a6243bb63502642ae6ee7","f253318cafcc7094e6b41a62d3deaffdb596af2ddca68ecd4f1f6b43a69dc55e","ab4b5ea51620ff98faae7add40c17b2ef89b2b962ea0f68fc42e32bceb8e2c57","c09c8d1e5fb1ce8e73005665acd4bec1a505809fd4dfe8b3b2780faf2e210c6b","12a85b73ed0236e1e4809553c53a069fafd38da2937989e30488c919757543c2","4af2d0f88bcd4bebc7d721c3605c98d068168f5d4aa991d8cbc0cb21290a0679"]};
(async()=>{await stock.ready;let api=stock;
 if(C){global.MareReworkWeaponNativeHD=require(p.resolve(C,'player-rework-weapon-native-hd.js'));api=require(p.resolve(C,'player-rework-native-hd.js')).create({fetchJSON:async f=>JSON.parse(fs.existsSync(p.join(R,f))?fs.readFileSync(p.join(R,f)):z.gunzipSync(fs.readFileSync(p.join(R,f+'.gz')))),loadImage:asset,makeCanvas:cv.createCanvas});await api.ready;}
 const o={direction:'north',action:'attack-focus',consumer:'world'},q=save(),r=api.selectVisual(q,o);
 assert(r?.orb17NorthRestoredApproved,'real normalized saved profile must select approved W17 NORTH preview');
 if(C)assert(!stock.selectVisual(q,o)?.orb17NorthRestoredApproved);
 const original=index.records.find(v=>v.id==='orb17-north-native-layers');
 assert.equal(r.basePack.pack.directions.north.layers.length,original.basePack.pack.directions.north.layers.length);assert.equal(r.states.length,8);assert.equal(r.fps,12);
 assert.deepEqual(r.timeline,['0','1','2','3','4','5','6','7']);assert.deepEqual(r.equipmentContract,{weapon:17});
 assert.equal(api.selectVisual(q,{...o,action:'attack'})?.id,r.id);
 for(const action of ['idle','walk'])assert(!api.selectVisual(q,{...o,action})?.orb17NorthRestoredApproved);
 for(const [a,b] of [[save({},undefined,'sword'),o],[save({hairStyle:'hair-spiky'}),o],[save({hairColor:'brown'}),o],[save({eyeColor:'brown'}),o],[save({eyeStyle:'face-calm'}),o],
 [save({},{weapon:{def:17,variantId:'original',appearanceVariant:'different'}}),o],[save({},{weapon:{def:17},coat:{def:151}}),o],[save({},{weapon:{def:17},head:{def:19}}),o],[save({},{weapon:{def:17},gloves:{def:26}}),o],
 [q,{...o,weaponless:true}],[q,{...o,consumer:'preview'}],[q,{...o,direction:'west'}],[q,{...o,direction:'east'}],[q,{...o,direction:'south'}],
 [{...q,appearance96:{...q.appearance96,hairColor:'original',eyeColor:'original',skinColor:'original'}},o]]){
  assert(!api.selectVisual(a,b)?.orb17NorthRestoredApproved);if(C)assert.deepEqual(api.selectVisual(a,b),stock.selectVisual(a,b));
 }
 const native=global.MareReworkWeaponNativeHD.create(index,{makeCanvas:cv.createCanvas});
 const approvals={"own-gear-0.png":"f8655feda5e88838d7472889939b5dcbf4081b90a5fbafc7efcf4bdcb2d10acb","own-gear-1.png":"11fb41253fa529564e113dfa9b5821d8687a61ad52f22cad47bf8f65d9a42279","own-gear-2.png":"24565377431a1597b0d96da2b7bf9989614c5491165b8d517078a62175edc3de","own-gear-3.png":"cda54fc00027cf391f14ab69cbab69c01213cff828045a01990e3ad71ec66daf","own-gear-4.png":"41cb6a4cc535a310faed05a2a4882e91ca19047f510859299588d1f9dd9306cf","own-gear-5.png":"6451fcf8b84e5d5b3e3de5db8feaf9b1eee420760fbbe081691003f375a360c0","own-gear-6.png":"c93144fae8f9a1c9044d78cd1f750b3df3499212598a668ab477e2250f2854ef","own-gear-7.png":"f8655feda5e88838d7472889939b5dcbf4081b90a5fbafc7efcf4bdcb2d10acb","restored-hand-0.png":"8a04e32cc28b9a80ea73b47268bf6c9acd8d48d3d82659d869bbc3c9bb50674d","restored-hand-7.png":"a862cc9edc9b9dba03580edf28d115ab06863cbb7b3b4523ef6eb5af07d772eb","restored-background-0.png":"bb94bb7c0081fc93dd65e54133d65df76cebea83fc1b81af2ecc42c4895e82f2"};
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
  assert(record?.orb17NorthRestoredApproved);assert(await api.prepareClip(actor,o));
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
