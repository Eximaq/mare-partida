'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),z=require('node:zlib'),p=require('node:path'),crypto=require('node:crypto'),R=p.resolve(process.env.KAIZOKU_REPO||p.dirname(__dirname)),C=process.env.CANDIDATE_DIR;
const {make,cv}=require(R+'/tests/rework-integration-support.cjs'),A=require(R+'/character-appearance.js'),load=require(R+'/tools/rework-hd-test-loader.cjs').create(R),index=require(R+'/tools/rework-weapon-layers-hd/index.json'),stock=make();
const raw={gender:'masculino',skinStyle:'natural',skinColor:'light',hairStyle:'original',hairColor:'black',eyeStyle:'original',eyeColor:'blue'};
const save=(look={},equipment={weapon:{def:16}},classId='strategist')=>JSON.parse(JSON.stringify(A.commit({id:'w16-disposable',classId,equipment},{...raw,...look},()=>true)));
const pix=c=>Buffer.from(c.getImageData(0,0,640,640).data),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const approvedPreviewHashes={"light":["1213922411b4b5261c652337cf068e8290e6c4477c0339bc4643abed84389a0a","14a98d52028790bf3858624e7c0cedceb7bf2df566aef3e6327ac570ba57d212","9576adf642a9cae7482ebab0ad9ef8a2433823c1085b243f0ffe4b1712777cd1","108b277c6ce40965245ac844579843964b215345b33bf53cdf29500731fa56b5","0d9e7a923adef521edd4e5b446e689e4ce756f5e84c622cc34586d29a45c8184","7ef6fde57b5c00a617449a8e9b15818819392354c425fc8c10e1603d64de32ea","f6db5e4be53ecc0d2b7d0c004df939fff1186d097616a01a85348d447aefc71d","c9465b86a6bac589458a9dc6eb93fdae0b78ca8ebbc3649e0cf3ea289ab597fc"],"dark":["b9bc9a3a304592cd899a7d4b021e82aa466be5c6ee947366b3e843e5bfc78205","ce7fa2299859ffe1cc0cc40ec7138885bebf99f85205746e5f882783d14bc093","02da443cd7301dd9e20789d2d63f68a3ea265ca78243af4d317b14c6adfdd10d","87588a1f320f0345f8f022061996e7d68ac334f346b95b49414e8217d2b1bf64","0586be2fd86f50679c5681028a8887557395631a03f397e5652501896369cee9","4ac47b6c764041f653e57e8acf0ec0cf70b2e1528e14d61fbc47436acac979f6","04396351322e01a34b18a53b5100ce20aad152ede901489c3e4eb4090acf6446","a1d950933bc2c02ed45d9698069fdd5ddfaad16ef8ba73622a2ceb14be8a9ce8"]};
(async()=>{await stock.ready;let api=stock;
 if(C){global.MareReworkWeaponNativeHD=require(p.resolve(C,'player-rework-weapon-native-hd.js'));api=require(p.resolve(C,'player-rework-native-hd.js')).create({fetchJSON:async f=>JSON.parse(fs.existsSync(p.join(R,f))?fs.readFileSync(p.join(R,f)):z.gunzipSync(fs.readFileSync(p.join(R,f+'.gz')))),loadImage:load,makeCanvas:cv.createCanvas});await api.ready;}
 const o={direction:'north',action:'attack-focus',consumer:'world'},q=save(),r=api.selectVisual(q,o);
 assert(r?.compass16NorthApprovedPreview,'real normalized saved profile must select approved W16 NORTH preview');
 const original=index.records.find(v=>v.id==='orb17-north-native-layers');
 const gear='assets/b9ff9fb23315eeae625bac311953a4fb1b1c63500045fba42be3f9954f70d0fd.png';
 assert.deepEqual(r.basePack,original.basePack);assert.equal(r.states.length,8);assert.equal(r.fps,12);
 assert.deepEqual(r.timeline,['0','1','2','3','4','5','6','7']);assert.deepEqual(r.equipmentContract,{weapon:16});
 assert.equal(api.selectVisual(q,{...o,action:'attack'})?.id,r.id);
 for(const [a,b] of [[save({},undefined,'healer'),o],[save({hairStyle:'hair-spiky'}),o],[save({hairColor:'brown'}),o],[save({eyeColor:'brown'}),o],[save({eyeStyle:'face-calm'}),o],
 [save({},{weapon:{def:16,variantId:'original',appearanceVariant:'different'}}),o],[save({},{weapon:{def:16},coat:{def:151}}),o],[save({},{weapon:{def:16},head:{def:19}}),o],[save({},{weapon:{def:16},gloves:{def:26}}),o],
 [q,{...o,weaponless:true}],[q,{...o,consumer:'preview'}],[q,{...o,direction:'west'}],[q,{...o,direction:'east'}],[q,{...o,direction:'south'}],[q,{...o,action:'idle'}],[q,{...o,action:'walk'}],
 [{...q,appearance96:{...q.appearance96,hairColor:'original',eyeColor:'original',skinColor:'original'}},o]]){
  assert(!api.selectVisual(a,b)?.compass16NorthApprovedPreview);if(C)assert.deepEqual(api.selectVisual(a,b),stock.selectVisual(a,b));
 }
 if(process.env.SELECT_ONLY){console.log('PASS guarded save selector');return;}
 const native=global.MareReworkWeaponNativeHD.create(index,{makeCanvas:cv.createCanvas});
 const historic=index.records.find(v=>v.id==='daggers16-north-native-original-source');
 const targets=[[365,352],[366,312],[358,268],[389,224],[394,223],[385,225],[358,270],[365,352]];
 const manual={...historic,basePack:original.basePack,hairSeparated:true,id:historic.id+':approved-test-reference',
  states:historic.states.map((v,f)=>({...v,layers:[],attachment:{url:gear,sha256:gear.slice(7,-4),size:[640,640],
  matrix:[1,0,0,1,targets[f][0]-341,targets[f][1]-349],depth:3}}))};
 const off={...manual,states:manual.states.map(s=>({...s,attachment:null}))};
 assert.deepEqual(r.states,manual.states);
 const paths=native.requiredFiles(manual),ims=new Map(await Promise.all(paths.map(async f=>[f,await load(f)])));
 const dir=original.basePack.pack.directions.north;assert(!dir.layers.some(v=>v.slot==='face'));assert.equal(dir.layers.find(v=>v.id==='forearm-hand-far').depth,4);
 const render=(r,f,appearance)=>{const c=cv.createCanvas(640,640).getContext('2d');native.render(c,r,ims,{frame:f,appearance});return pix(c);};
 const hand=dir.layers.find(v=>v.id==='forearm-hand-far');
 const sourceGear=ims.get('tools/rework-weapon-layers-hd/'+gear);
 const controls=Array.from({length:8},(_,f)=>{
  const h=cv.createCanvas(640,640).getContext('2d'),g=cv.createCanvas(640,640).getContext('2d');
  h.drawImage(ims.get('tools/rework-weapon-layers-hd/'+original.basePack.images[hand.frames[f]]),0,0);
  g.imageSmoothingEnabled=false;g.transform(...manual.states[f].attachment.matrix);g.drawImage(sourceGear,0,0);
  return [pix(h),pix(g)];
 });
 let n=0;
 for(const skinColor of (process.env.SKIN?[process.env.SKIN]:Object.keys(A.skins))){
  const actor=save({skinColor}),appearance=A.read(actor),record=api.selectVisual(actor,o),memo=JSON.stringify(actor);
  assert(record?.compass16NorthApprovedPreview);assert(await api.prepareClip(actor,o));
  const hashes=[];
  for(let f=0;f<8;f++){
   const ref=render(manual,f,appearance),bare=render(off,f,appearance);
   let submitted;assert(api.draw({save(){},restore(){},drawImage(c){submitted=c;}},actor,{...o,progress:(f+.5)/8,x:320,y:512}));
   assert.deepEqual(api.snapshot().last.pivot,{x:320,y:512});assert.equal(api.snapshot().last.frame,f);assert.equal(api.snapshot().last.source,record.id);
   const actual=pix(submitted.getContext('2d'));assert(actual.equals(ref),skinColor+' frame '+f+' world differs from reviewed pose or tone');
   const key={light:'light',ebony:'dark'}[skinColor];if(key)assert.equal(sha(actual),approvedPreviewHashes[key][f],skinColor+' frame '+f+' approved preview pixels');
   const [h,g]=controls[f];let contact=0,hardware=0;
   for(let i=0;i<actual.length;i+=4){
    if(!g[i+3])assert.equal(actual.readUInt32LE(i),bare.readUInt32LE(i),'out of authored hardware');
    else if(h[i+3]===255){assert.equal(actual.readUInt32LE(i),bare.readUInt32LE(i),'far hand under weapon changed');contact++;}
    else if(!h[i+3]&&g[i+3]===255&&actual.readUInt32LE(i)===g.readUInt32LE(i))hardware++;
   }
   assert.equal(contact,[215,136,560,260,169,218,550,205][f]);assert.equal(hardware,[580,680,256,556,647,598,266,611][f]);
   hashes.push(sha(actual));n++;
  }
  assert(new Set(hashes).size>=7);assert.equal(JSON.stringify(actor),memo);
 }
 assert.equal(n,process.env.SKIN?8:64);console.log('PASS 64: 8 saves x 8 frames, 16 captures byte-exact to approved preview, Original/gear/variant controls');
})().catch(e=>{console.error(e);process.exitCode=1});
