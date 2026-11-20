'use strict';
const a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const R=path.resolve(process.env.KAIZOKU_REPO||path.dirname(__dirname)),C=process.env.CANDIDATE_DIR;
const {make,cv}=require(path.join(R,'tests/rework-integration-support.cjs')),A=require(path.join(R,'character-appearance.js'));
const load=require(path.join(R,'tools/rework-hd-test-loader.cjs')).create(R);
const stock=make();
if(C)global.MareReworkWeaponNativeHD=require(path.resolve(C,'player-rework-weapon-native-hd.js'));
const api=C?require(path.resolve(C,'player-rework-native-hd.js')).create({fetchJSON:async f=>JSON.parse(fs.readFileSync(path.join(R,f))),loadImage:load,makeCanvas:cv.createCanvas}):stock;
const raw={gender:'masculino',skinStyle:'natural',skinColor:'light',hairStyle:'original',hairColor:'black',eyeStyle:'original',eyeColor:'blue'};
const save=(look={},equipment={weapon:{def:32}},classId='healer')=>JSON.parse(JSON.stringify(A.commit({id:'disposable-relic32',classId,equipment},{...raw,...look},()=>true)));
const index=require(path.join(R,'tools/rework-weapon-layers-hd/index.json'));
const spec=index.separableAttackRigs.find(r=>r.rig==='male-focus-east-modular8');
const hw=global.MareReworkWeaponNativeHD.create(index,{makeCanvas:cv.createCanvas});
const capture=()=>cv.createCanvas(640,640).getContext('2d');
const data=c=>c.getImageData(0,0,640,640).data;
const source=async p=>{const c=capture();c.drawImage(await load(p),0,0);return data(c);};
(async()=>{await api.ready;await stock.ready;const player=save();a.equal(player.appearance96.version,1);
for(const direction of (process.env.SIDE?[process.env.SIDE]:['east','west'])){
 const opts={direction,consumer:'world',action:'attack-focus'},old=save({hairColor:'brown',eyeColor:'brown'}),rec=api.selectVisual(player,opts),legacy=api.selectVisual(old,opts);
 a(rec?.relic32SideBlue,'default Save must select true own E/W');a(legacy?.separableAttack&&!legacy.relic32SideBlue);
 a.equal(rec.contactTick,4);a.equal(rec.fps,12);a.deepEqual(rec.timeline,Array.from({length:8},(_,i)=>String(i)));
 a.equal(api.selectVisual(player,{...opts,action:'attack'}).id,rec.id);
 if(C){const dagger=save({},{weapon:{def:12}},'rogue'), daggerPose={...opts,action:'attack-daggers'};a.deepEqual(api.selectVisual(dagger,daggerPose),stock.selectVisual(dagger,daggerPose));
  a.deepEqual(api.selectVisual(old,opts),stock.selectVisual(old,opts));}
 for(const tone of Object.keys(A.skins).filter(t=>t!=='light'))a(!api.selectVisual(save({skinColor:tone}),opts)?.relic32SideBlue);
 for(const look of [{eyeColor:'green'},{hairColor:'brown'},{hairStyle:'hair-spiky'},{gender:'feminino'}])a(!api.selectVisual(save(look),opts)?.relic32SideBlue);
 for(const equipment of [{},{weapon:{def:32,variant:'not-original'}},{weapon:{def:32},coat:{def:137}},{weapon:{def:32},boots:{def:9}}])a(!api.selectVisual(save({},equipment),opts)?.relic32SideBlue);
 for(const d of ['north','south'])a(!api.selectVisual(player,{...opts,direction:d})?.relic32SideBlue);
 for(const action of ['idle','walk','attack-unarmed'])a(!api.selectVisual(player,{...opts,action})?.relic32SideBlue);
 a(!api.selectVisual(save({},player.equipment,'strategist'),opts)?.relic32SideBlue);
 a(!api.selectVisual(player,{...opts,weaponless:true})?.relic32SideBlue);
 const proof=[];
 a(await api.prepareClip(player,opts),JSON.stringify(api.snapshot()));
 for(let frame=0;frame<8;frame++){
  const args={frame},c=capture();
  const map=new Map(await Promise.all(hw.requiredFiles(rec,args).map(async s=>[s,await load(s)])));
  hw.render(c,rec,map,args);const got=data(c);
  const ctrl=capture(),legacyMap=new Map(await Promise.all(hw.requiredFiles(legacy,args).map(async s=>[s,await load(s)])));
  hw.render(ctrl,legacy,legacyMap,args);const ref=data(ctrl);
  const world=capture();let worldPixels;
  const nativeDraw=world.drawImage.bind(world);
  world.drawImage=(im,...args)=>{worldPixels=data(im.getContext('2d'));return nativeDraw(im,...args);};
  a(api.draw(world,player,{...opts,progress:(frame+.1)/8,x:320,y:512}),JSON.stringify(api.snapshot()));
  a(worldPixels,'consumer must draw native pixels');a.equal(Buffer.compare(Buffer.from(got),Buffer.from(worldPixels)),0,'consumer native input differs');
  a.equal(api.snapshot().last.source,rec.id);a.equal(api.snapshot().last.frame,frame);
  const {layers}=rec.basePack.pack.directions[direction],hair=await source(rec.basePack.images[layers.at(-1).source].slice(1)),
   hand=await source(rec.basePack.images[layers.find(l=>l.id==='forearm-hand-far').frames[frame]].slice(1)),gear=await source('tools/rework-weapon-layers-hd/'+spec.directions[direction].weapons[32][frame].url);
  const iris=new Map(global.MareReworkModularOutfitsHD.sideIrisSamples(direction).map(([x,y,...p])=>[(y+64)*640+x+64,p[4]]));
  let count=0,contact=0,hairDiff=0,weapon=0;
  const diff=(x,y,i)=>x[i]!==y[i]||x[i+1]!==y[i+1]||x[i+2]!==y[i+2]||x[i+3]!==y[i+3];
  for(let i=0;i<got.length;i+=4){
   const q=i/4,t=iris.get(q);a.equal(got[i+3],ref[i+3],'exact alpha at '+q);
   if(t){const color=parseInt(A.eyes.blue.ramp[t-1].slice(1),16);a.equal((got[i]<<16)|(got[i+1]<<8)|got[i+2],color);count++;}
   else if(diff(got,ref,i)){a(hair[i+3],'unowned RGBA change at '+q);hairDiff++;}
   if(gear[i+3]){a(!diff(got,gear,i),'gear not pure at '+q);weapon++;}
   if(hand[i+3]===255&&!diff(got,hand,i)&&[i-4,i+4,i-2560,i+2560].some(j=>gear[j+3]))contact++;
  }
  a.equal(count,18);a.equal(hairDiff,4048);a.equal(contact,[6,30,26,45,54,36,37,44][frame]);a.equal(weapon,[572,692,699,664,533,687,551,338][frame]);
  proof.push({frame,hairDiff,iris:count,contact,weapon});
  global.gc?.();
 }
 console.log(direction,JSON.stringify(proof));
}
})().catch(e=>{console.error(e);process.exitCode=1;});
