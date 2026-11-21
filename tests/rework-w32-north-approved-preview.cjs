'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),z=require('node:zlib'),p=require('node:path'),crypto=require('node:crypto'),R=p.resolve(process.env.KAIZOKU_REPO||p.dirname(__dirname)),C=process.env.CANDIDATE_DIR;
const {make,cv}=require(R+'/tests/rework-integration-support.cjs'),A=require(R+'/character-appearance.js'),load=require(R+'/tools/rework-hd-test-loader.cjs').create(R),index=require(R+'/tools/rework-weapon-layers-hd/index.json'),stock=make();
const raw={gender:'masculino',skinStyle:'natural',skinColor:'light',hairStyle:'original',hairColor:'black',eyeStyle:'original',eyeColor:'blue'};
const save=(look={},equipment={weapon:{def:32}},classId='healer')=>JSON.parse(JSON.stringify(A.commit({id:'w32-disposable',classId,equipment},{...raw,...look},()=>true)));
const pix=c=>Buffer.from(c.getImageData(0,0,640,640).data),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const approvedPreviewHashes={"light":["46fd31a34353cd652de37a150113f633032ef653d3e1aafd6188b1fe8bb1630b","b3cae05203e965065715c44e5b42cd419d4380b043ddefdae3550f0c253819a7","214c8c998b8fe2e3fdd86aa5c778b00eb1921199deb7ba262e0bf3d6972783e1","982b801b7000cbcbdc27a328f7eba1607c627aab605f0c620c2d6d693cfd28ae","dcc72e8a35534268b8ae9249d437b5cf3d15a1c91b0ae8d390ff1ef58af32cef","28c10d1d3de4f9feb55390a5870a0cfb8d661a9b6c7435ffa3bfabbbbf7bf800","ff05a6e57820a3c132afd9ed1324caca03e2f7bec1f0f2efa9fc510bbbb27c1f","16745630760593840e07aa249f41cf12c3fdfe6c3e3b115bf95031eb9d93a906"],"dark":["4c9cac74e3ef6852e5036a6e0ea44411cb806ea5652069e4ce1e38a7fc02b2f3","2953924ddeb9a06440b6311c3d849c44b2321ccadf893a60ef13bef19c6eec04","f066a89dcd0976ece45020827ea38e84faf5e28e702a104710bb27941eb66733","76175afb45f89c4e16c6d1c7baed1b206a4761ba12bbee0eac3b1db2aaa01250","7736cb5c3c22d895be1fa03d139dcad3aa6ac7e7489ca109069a474b9561dbf8","74271b7146fc50dc5958251636c1449ae62779ec58dd34fce5de327cb9839c36","fc3ef3cd4128168388acae7b42ab4c7c5be78a39d5f47f7829bf6a725bd993e8","88b53afecb53c7544b7016b139b441a3902062dab40cf10c91e82f07fb3f30bf"]};
(async()=>{await stock.ready;let api=stock;
 if(C){global.MareReworkWeaponNativeHD=require(p.resolve(C,'player-rework-weapon-native-hd.js'));api=require(p.resolve(C,'player-rework-native-hd.js')).create({fetchJSON:async f=>JSON.parse(fs.existsSync(p.join(R,f))?fs.readFileSync(p.join(R,f)):z.gunzipSync(fs.readFileSync(p.join(R,f+'.gz')))),loadImage:load,makeCanvas:cv.createCanvas});await api.ready;}
 const o={direction:'north',action:'attack-focus',consumer:'world'},q=save(),r=api.selectVisual(q,o);
 assert(r?.relic32NorthApprovedPreview,'real normalized saved profile must select approved W32 NORTH preview');
 const strategist=save({},undefined,'strategist');
 assert.deepEqual(api.selectVisual(strategist,o),r,'the historical strategist alias stays pixel-identical');
 if(C){assert(!stock.selectVisual(q,o)?.relic32NorthApprovedPreview);assert(!stock.selectVisual(strategist,o)?.relic32NorthApprovedPreview);}
 const original=index.records.find(v=>v.id==='relicary32-north-original-base17-native-item-candidate');
 const datum=index.records.find(v=>v.id==='relicary31-north-original-base17-native-item-candidate');
 assert.deepEqual(datum.basePack,original.basePack);
 assert.deepEqual(r.basePack,original.basePack);assert.equal(r.states.length,8);assert.equal(r.fps,12);
 assert.deepEqual(r.timeline,['0','1','2','3','4','5','6','7']);assert.deepEqual(r.equipmentContract,{weapon:32});
 assert.equal(api.selectVisual(q,{...o,action:'attack'})?.id,r.id);
 for(const action of ['idle','walk'])assert(!api.selectVisual(q,{...o,action})?.relic32NorthApprovedPreview);
 for(const [a,b] of [[save({},undefined,'sword'),o],[save({hairStyle:'hair-spiky'}),o],[save({hairColor:'brown'}),o],[save({eyeColor:'brown'}),o],[save({eyeStyle:'face-calm'}),o],
 [save({},{weapon:{def:32,variantId:'original',appearanceVariant:'different'}}),o],[save({},{weapon:{def:32},coat:{def:151}}),o],[save({},{weapon:{def:32},head:{def:19}}),o],[save({},{weapon:{def:32},gloves:{def:26}}),o],
 [q,{...o,weaponless:true}],[q,{...o,consumer:'preview'}],[q,{...o,direction:'west'}],[q,{...o,direction:'east'}],[q,{...o,direction:'south'}],
 [{...q,appearance96:{...q.appearance96,hairColor:'original',eyeColor:'original',skinColor:'original'}},o]]){
  assert(!api.selectVisual(a,b)?.relic32NorthApprovedPreview);if(C)assert.deepEqual(api.selectVisual(a,b),stock.selectVisual(a,b));
 }
 const native=global.MareReworkWeaponNativeHD.create(index,{makeCanvas:cv.createCanvas});
 const manual={...original,id:original.id+':approved-test-reference',states:original.states.map((v,i)=>{const t=datum.states[i].attachment.targetGrip,f=v.attachment;return {...v,attachment:{...f,depth:3,targetGrip:t,matrix:[1,0,0,1,t[0]-f.sourceGrip[0],t[1]-f.sourceGrip[1]]}};})};
 assert.deepEqual(r.states,manual.states);
 const paths=native.requiredFiles(manual),ims=new Map(await Promise.all(paths.map(async f=>[f,await load(f)])));
 const dir=original.basePack.pack.directions.north;assert(!dir.layers.some(v=>v.slot==='face'));assert.equal(dir.layers.find(v=>v.id==='forearm-hand-far').depth,4);
 let n=0;
 for(const skinColor of Object.keys(A.skins)){
  const actor=save({skinColor}),appearance=A.read(actor),record=api.selectVisual(actor,o),memo=JSON.stringify(actor);
  assert(record?.relic32NorthApprovedPreview);assert(await api.prepareClip(actor,o));
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
