'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),z=require('node:zlib'),p=require('node:path'),crypto=require('node:crypto'),R=p.resolve(process.env.KAIZOKU_REPO||p.dirname(__dirname)),C=process.env.CANDIDATE_DIR;
const {make,cv}=require(R+'/tests/rework-integration-support.cjs'),A=require(R+'/character-appearance.js'),load=require(R+'/tools/rework-hd-test-loader.cjs').create(R),index=require(R+'/tools/rework-weapon-layers-hd/index.json'),stock=make();
const raw={gender:'masculino',skinStyle:'natural',skinColor:'light',hairStyle:'original',hairColor:'black',eyeStyle:'original',eyeColor:'blue'};
const save=(look={},equipment={weapon:{def:31}},classId='strategist')=>JSON.parse(JSON.stringify(A.commit({id:'w31-disposable',classId,equipment},{...raw,...look},()=>true)));
const pix=c=>Buffer.from(c.getImageData(0,0,640,640).data),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const approvedPreviewHashes={"light":["b9281f89bf0d874253fc3ac0269b6a4c043fd5b5591348c0e70ebe56fed19740","95e5657e9e69a1291be9919701824ae53b51f5f227e33b6652e2d937dc35b7fc","6809e56bbccc3ef0efc0cb1fddf8f9ef2f8636cdbfd4cabde82c58c817a72e52","de229a72bff03c9a174689cfb1d3384ad27c4d5d2d608dfc561e9470cbda5038","b7a6f9a1e790c920a71e9ca8bf77cfe3df6e47f0cf9ddf1a5391604084642dc7","e84a724f510068a5745165c30f7ab6c79100d7a9f0156f2af7ee57e9c5a6296c","3726702aad7402d0896053e76d1306ec507b9f78ae4a03cfa3adadbcb1380952","cb7d12e7a17b788203efec391574888906c59ee9d0b5ef96bfdd23efd4db2cf9"],"dark":["d60f6d2598aa355dcc4c29ee7facba27852bf7b0255d3f9841f33630f5f4b800","fc338e06f9f657f34c802fdd049ea5e9cd097870119a9e502890aba10f9cb977","01dd2044eadcd8c50b46a2b2688d1b4e0793aa69dd31b9604c3acff713f8b762","bfe4610f61d9bf4dd5fa06a261104ef5db0bd2ad4a31da674c96580e7d8e967f","8626501c16cfcb73129de5dcb42c3ae59c67eba018b332b55542b3686a9a5c50","888e98f0bdc9a3e28d1796ff27b3a02f1f3bb2ea564c5c669a356b63b194c095","b5188aae51adf14f5abaf456d911156a35925789689d74be6788656ff5cc755e","d7c827fb1b910b3359f004bfea9e450abc476c18a4e695f203b4ba5205e0c746"]};
(async()=>{await stock.ready;let api=stock;
 if(C){global.MareReworkWeaponNativeHD=require(p.resolve(C,'player-rework-weapon-native-hd.js'));api=require(p.resolve(C,'player-rework-native-hd.js')).create({fetchJSON:async f=>JSON.parse(fs.existsSync(p.join(R,f))?fs.readFileSync(p.join(R,f)):z.gunzipSync(fs.readFileSync(p.join(R,f+'.gz')))),loadImage:load,makeCanvas:cv.createCanvas});await api.ready;}
 const o={direction:'north',action:'attack-focus',consumer:'world'},q=save(),r=api.selectVisual(q,o);
 assert(r?.relic31NorthApprovedPreview,'real normalized saved profile must select approved W31 NORTH preview');
 const original=index.records.find(v=>v.id==='relicary31-north-original-base17-native-item-candidate');
 const gear='assets/9acb8f39056d3f761b73d6d32cb2f28b446b535473c09e08be5cc609b053eb77.png';
 assert.deepEqual(r.basePack,original.basePack);assert.equal(r.states.length,8);assert.equal(r.fps,12);
 assert.deepEqual(r.timeline,['0','1','2','3','4','5','6','7']);assert.deepEqual(r.equipmentContract,{weapon:31});
 assert.equal(api.selectVisual(q,{...o,action:'attack'})?.id,r.id);
 for(const [a,b] of [[save({},undefined,'healer'),o],[save({hairStyle:'hair-spiky'}),o],[save({hairColor:'brown'}),o],[save({eyeColor:'brown'}),o],[save({eyeStyle:'face-calm'}),o],
 [save({},{weapon:{def:31,variantId:'original',appearanceVariant:'different'}}),o],[save({},{weapon:{def:31},coat:{def:151}}),o],[save({},{weapon:{def:31},head:{def:19}}),o],[save({},{weapon:{def:31},gloves:{def:26}}),o],
 [q,{...o,weaponless:true}],[q,{...o,consumer:'preview'}],[q,{...o,direction:'west'}],[q,{...o,direction:'east'}],[q,{...o,direction:'south'}],[q,{...o,action:'idle'}],[q,{...o,action:'walk'}],
 [{...q,appearance96:{...q.appearance96,hairColor:'original',eyeColor:'original',skinColor:'original'}},o]]){
  assert(!api.selectVisual(a,b)?.relic31NorthApprovedPreview);if(C)assert.deepEqual(api.selectVisual(a,b),stock.selectVisual(a,b));
 }
 const native=global.MareReworkWeaponNativeHD.create(index,{makeCanvas:cv.createCanvas});
 const manual={...original,id:original.id+':approved-test-reference',states:original.states.map(v=>({...v,attachment:{...v.attachment,url:gear,sha256:gear.slice(7,-4)}}))};
 assert.deepEqual(r.states,manual.states);
 const paths=native.requiredFiles(manual),ims=new Map(await Promise.all(paths.map(async f=>[f,await load(f)])));
 const dir=original.basePack.pack.directions.north;assert(!dir.layers.some(v=>v.slot==='face'));assert.equal(dir.layers.find(v=>v.id==='forearm-hand-far').depth,4);
 let n=0;
 for(const skinColor of Object.keys(A.skins)){
  const actor=save({skinColor}),appearance=A.read(actor),record=api.selectVisual(actor,o),memo=JSON.stringify(actor);
  assert(record?.relic31NorthApprovedPreview);assert(await api.prepareClip(actor,o));
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
