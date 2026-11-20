'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),z=require('node:zlib'),p=require('node:path'),R=p.resolve(process.env.KAIZOKU_REPO||p.dirname(__dirname)),C=process.env.CANDIDATE_DIR;
const {make,cv}=require(R+'/tests/rework-integration-support.cjs'),A=require(R+'/character-appearance.js'),load=require(R+'/tools/rework-hd-test-loader.cjs').create(R),index=require(R+'/tools/rework-weapon-layers-hd/index.json'),stock=make();
const raw={gender:'masculino',skinStyle:'natural',skinColor:'light',hairStyle:'original',hairColor:'black',eyeStyle:'original',eyeColor:'blue'};
const save=(look={},equipment={weapon:{def:14}},classId='cyborg')=>JSON.parse(JSON.stringify(A.commit({id:'w14-disposable',classId,equipment},{...raw,...look},()=>true)));
const context=()=>cv.createCanvas(640,640).getContext('2d'),pix=c=>Buffer.from(c.getImageData(0,0,640,640).data);
const raster=async f=>{const c=context();c.drawImage(await load(f),0,0);return pix(c);};
(async()=>{await stock.ready;let api=stock;
 if(C){global.MareReworkWeaponNativeHD=require(p.resolve(C,'player-rework-weapon-native-hd.js'));api=require(p.resolve(C,'player-rework-native-hd.js')).create({fetchJSON:async f=>JSON.parse(fs.existsSync(p.join(R,f))?fs.readFileSync(p.join(R,f)):z.gunzipSync(fs.readFileSync(p.join(R,f+'.gz')))),loadImage:load,makeCanvas:cv.createCanvas});await api.ready;}
 const o={direction:'south',action:'attack-unarmed',consumer:'world'},q=save(),r=api.selectVisual(q,o);
 assert(r?.gauntlet14SouthSavedHead,'registered Light deed with real Black/Blue save must resolve W14 South');
 const old=index.records.find(v=>v.id==='gauntlet14-south-native-original-source'),ord=index.orderedAttackProfiles.find(v=>v.id==='authored-ordered-14-south');
 assert.deepEqual(r.states,old.states);assert.equal(r.fps,12);assert.deepEqual(r.timeline,old.timeline);assert.deepEqual(r.equipmentContract,{weapon:14});
 assert.equal(api.selectVisual(q,{...o,action:'attack'})?.id,r.id);
 const original=save({hairColor:'brown',eyeColor:'brown'});assert(api.selectVisual(original,o)?.orderedAttack);
 for(const [a,b] of [[save({},undefined,'healer'),o],[save({skinColor:'ebony'}),o],[save({hairStyle:'hair-spiky'}),o],[save({hairColor:'brown'}),o],[save({eyeColor:'brown'}),o],[save({eyeStyle:'face-calm'}),o],
 [save({},{weapon:{def:14,variant:'original',appearanceVariant:'different'}}),o],[save({},{weapon:{def:14},coat:{def:151}}),o],[save({},{weapon:{def:14},head:{def:19}}),o],[q,{...o,weaponless:true}],
 [q,{...o,consumer:'preview'}],[q,{...o,direction:'east'}],[q,{...o,direction:'north'}],[q,{...o,action:'idle'}],[q,{...o,action:'walk'}],[original,o]]){
  assert(!api.selectVisual(a,b)?.gauntlet14SouthSavedHead);if(C)assert.deepEqual(api.selectVisual(a,b),stock.selectVisual(a,b));
 }
 const mh='tools/rework-modular-outfits-hd/assets/',wr='tools/rework-weapon-layers-hd/';
 const hair=await raster(mh+'4d7b8fa3090367f80f4ded64a1bbc2c0759f3a1d2402ec9e8be112333c0297a7.png'),mask=await raster(mh+'dbe167d2e9103349e34109ea3ca90dfd0683b2bde79e322883c69c027c3a76f5.png');
 const eyes=global.MareReworkModularOutfitsHD.southIrisSamples(),write=(out,i,color)=>{const n=parseInt(color.slice(1),16);out.set([n>>>16,(n>>>8)&255,n&255],i);};
 assert.equal(eyes.length,45);assert(await api.prepareClip(q,o));const memo=JSON.stringify(q);
 for(let f=0;f<12;f++){
  const base=await raster(wr+old.states[f].layers[0].url),gear=await raster(wr+ord.states[f].layers[1].url),ref=Buffer.from(base);
  const b=await raster(wr+ord.states[f].layers[0].url);
  let cnt=0;for(let i=0;i<mask.length;i+=4)if(mask[i]){cnt++;assert.equal(gear[i+3],0);assert.equal(b.readUInt32LE(i),hair.readUInt32LE(i));assert.equal(base.readUInt32LE(i),hair.readUInt32LE(i));write(ref,i,A.hairs.black.ramp[mask[i]-1]);}
  assert.equal(cnt,4090);
  for(const [x,y,rr,g,bb,a,t] of eyes){const i=(y*640+x)*4;assert.deepEqual([...base.subarray(i,i+4)],[rr,g,bb,a]);assert.equal(gear[i+3],0);assert.equal(b.readUInt32LE(i),base.readUInt32LE(i));write(ref,i,A.eyes.blue.ramp[t-1]);}
  let submitted;assert(api.draw({save(){},restore(){},drawImage(c){submitted=c;}},q,{...o,progress:(f+.5)/12,x:320,y:512}));
  assert.equal(api.snapshot().last.source,r.id);assert.equal(api.snapshot().last.frame,f);assert.deepEqual(api.snapshot().last.pivot,{x:320,y:512});
  assert(pix(submitted.getContext('2d')).equals(ref),'frame '+f+' recolors only 4090 own hair and 45 own eyes');
 }
 assert.equal(JSON.stringify(q),memo);console.log('PASS 12/12 real world Light saved, exact 4090 hair + 45 eyes only, own body/gear retained, 12@12 and Original preserved');
})().catch(e=>{console.error(e);process.exitCode=1});
