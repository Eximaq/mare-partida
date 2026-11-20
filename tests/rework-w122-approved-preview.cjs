'use strict';
const a=require('node:assert/strict'),fs=require('node:fs'),p=require('node:path'),R=p.resolve(process.env.KAIZOKU_REPO||p.dirname(__dirname)),C=process.env.CANDIDATE_DIR;
const {make,cv}=require(p.join(R,'tests/rework-integration-support.cjs')),A=require(p.join(R,'character-appearance.js'));
const load=require(p.join(R,'tools/rework-hd-test-loader.cjs')).create(R),stock=make(),raw={gender:'masculino',skinStyle:'natural',skinColor:'light',hairStyle:'original',hairColor:'black',eyeStyle:'original',eyeColor:'blue'};
const save=(look={},equipment={weapon:{def:122}},classId='strategist')=>JSON.parse(JSON.stringify(A.commit({id:'w122-disposable',classId,equipment},{...raw,...look},()=>true)));
const index=require(p.join(R,'tools/rework-weapon-layers-hd/index.json')),N=640;
const head={east:['45de7576039c538aee29ff5a5d0def51143e8cbf90a33cdead504d88fd2ea713','fc4d94176143c1a1bace649e35262ec9f5e5b5aae0e7e932d2eeb1f882c5359a'],
 west:['a1359e16013832c487942d028404f7a5c59f4afd4a7e96eb480aa1a1d34db07e','fccea53415dc2acf040461dcc81b112d6275bf0dddf888b4f9d947ad552324c1']};
const cap=()=>cv.createCanvas(N,N).getContext('2d'),pix=c=>Buffer.from(c.getImageData(0,0,N,N).data);
const data=async path=>{const c=cap();c.drawImage(await load(path),0,0);return pix(c);};
(async()=>{await stock.ready;let api=stock;
 if(C){global.MareReworkWeaponNativeHD=require(p.resolve(C,'player-rework-weapon-native-hd.js'));api=require(p.resolve(C,'player-rework-native-hd.js')).create({fetchJSON:async f=>JSON.parse(fs.readFileSync(p.join(R,f))),loadImage:load,makeCanvas:cv.createCanvas});await api.ready;}
 const native=global.MareReworkWeaponNativeHD.create(index,{makeCanvas:cv.createCanvas});
 for(const direction of ['east','west']){
  const o={direction,action:'attack-focus',consumer:'world'},q=save(),r=api.selectVisual(q,o),brown=save({hairColor:'brown',eyeColor:'brown'},{weapon:{def:122},coat:{def:151}}),
   legacy={...q,appearance96:{...q.appearance96,hairColor:'original',eyeColor:'original',skinColor:'original'}};
  a(r?.orb122ApprovedPreview,'real normalized default must activate the exact reviewed art');a.equal(r.visualSampling,undefined);a.equal(r.fps,12);a.equal(r.contactTick,4);
  a.deepEqual(r.timeline,['0','1','2','3','4','5','6',...Array(13).fill('7')]);a.deepEqual(r.equipmentContract,{weapon:122});
  a.equal(api.selectVisual(q,{...o,action:'attack'})?.id,r.id);a(api.selectVisual(brown,o)?.orderedAttack);a(!api.selectVisual(legacy,o)?.orb122ApprovedPreview);
  if(C){a(!stock.selectVisual(q,o)?.orb122ApprovedPreview);a.deepEqual(api.selectVisual(legacy,o),stock.selectVisual(legacy,o));a.deepEqual(api.selectVisual(brown,o),stock.selectVisual(brown,o));}
  for(const [who,opt] of [[save({skinColor:'ebony'}),o],[save({hairColor:'brown'}),o],[save({eyeColor:'brown'}),o],
    [save({hairStyle:'hair-spiky'}),o],[save({eyeStyle:'face-calm'}),o],[save({},{weapon:{def:122,variant:'other'}}),o],
    [save({},{weapon:{def:122},coat:{def:151}}),o],[save({},{weapon:{def:122},head:{def:19}}),o],
    [save({},{weapon:{def:17}}),o],[save({},{weapon:{def:122}},'healer'),o],[q,{...o,action:'attack-unarmed'}],
    [q,{...o,consumer:'preview'}],[q,{...o,direction:'north'}],[q,{...o,direction:'south'}],[q,{...o,weaponless:true}]]){
   a(!api.selectVisual(who,opt)?.orb122ApprovedPreview); if(C)a.deepEqual(api.selectVisual(who,opt),stock.selectVisual(who,opt));
  }
  const maps=await Promise.all(head[direction].map(h=>data('tools/rework-modular-outfits-hd/assets/'+h+'.png'))),[hair,mask]=maps,ref=[],metrics=[];
  const authored=index.orderedAttackProfiles.find(s=>s.id==='authored-orb-122-'+direction);
  for(let f=0;f<8;f++){
   const k=authored.states[f],m=new Map(await Promise.all(native.requiredFiles(authored,{frame:f}).map(async path=>[path,await load(path)]))),c=cap();
   native.render(c,authored,m,{frame:f});const rgb=pix(c),out=Buffer.from(rgb),dy=[0,-1,0,0,1,1,1,1][f],pa=parseInt;
   const own=new Set(),write=(i,str)=>{const n=pa(str.slice(1),16);out.set([n>>>16,n>>>8&255,n&255],i);own.add(i/4);};
   for(let i=0;i<rgb.length;i+=4)if(mask[i]){const j=i+dy*N*4;a.equal(hair.readUInt32LE(i),rgb.readUInt32LE(j));write(j,A.hairs.black.ramp[mask[i]-1]);}
   a.equal(own.size,4040);
   for(const [x,y,r,g,b,alpha,t] of global.MareReworkModularOutfitsHD.sideIrisSamples(direction)){
    const i=((y+64+dy)*N+x+64)*4;a.deepEqual([...rgb.subarray(i,i+4)],[r,g,b,alpha]);write(i,A.eyes.blue.ramp[t-1]);
   }
   a.equal(own.size,4058);
   const ownGear=await data('tools/rework-weapon-layers-hd/'+k.layers[1].url),matte=await data('tools/rework-weapon-layers-hd/'+k.layers[2].mask.url);
   let contacts=0,gearVisible=0;
   for(let i=0;i<out.length;i+=4){if(ownGear[i+3]){a(!own.has(i/4));if(matte[i])contacts++;else gearVisible++;}if(matte[i])a(!own.has(i/4));}
   a(contacts>20&&gearVisible>900,'restored hand or own gear absent at phase '+f);
   ref.push(out);metrics.push([contacts,gearVisible]);global.gc?.();
  }
  a(await api.prepareClip(q,o));
  for(let tick=0;tick<20;tick++){
   let c;const options={...o,progress:(tick+.5)/20,timing:{locked:true,duration:1.4,hitFrameRatio:.43},x:320,y:512};
   a(api.draw({save(){},restore(){},drawImage(x){c=x}},q,options),JSON.stringify(api.snapshot()));
   a.equal(api.snapshot().last.source,r.id);a.equal(api.snapshot().last.frame,Math.min(tick,7));
   a.deepEqual(api.snapshot().last.pivot,{x:320,y:512});a(pix(c.getContext('2d')).equals(ref[Math.min(tick,7)]),'approved source/hand/skin/cosmetics differs at tick '+tick);
  }
  console.log(direction,'20/20 current clock ticks; 12fps, control source minus 4040 hair +18 iris exact; gear/restored overlap',JSON.stringify(metrics));global.gc?.();
 }
})().catch(e=>{console.error(e);process.exitCode=1});
