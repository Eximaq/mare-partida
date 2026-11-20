'use strict';
const a=require('node:assert/strict'),fs=require('node:fs'),p=require('node:path');
const R=p.resolve(process.env.KAIZOKU_REPO||p.dirname(__dirname)),C=process.env.CANDIDATE_DIR;
const {make,cv}=require(p.join(R,'tests/rework-integration-support.cjs')),A=require(p.join(R,'character-appearance.js'));
const load=require(p.join(R,'tools/rework-hd-test-loader.cjs')).create(R),stock=make();
const api=C?require(p.resolve(C,'player-rework-native-hd.js')).create({fetchJSON:async f=>JSON.parse(fs.readFileSync(p.join(R,f))),loadImage:load,makeCanvas:cv.createCanvas}):stock;
const raw={gender:'masculino',skinStyle:'natural',skinColor:'light',hairStyle:'original',hairColor:'black',eyeStyle:'original',eyeColor:'blue'};
const ids=[151,158,165,179],COAT=+(process.env.COAT||151);a(ids.includes(COAT));
const save=(look={},e={weapon:{def:32},coat:{def:COAT}},classId='healer')=>JSON.parse(JSON.stringify(A.commit({id:'w32-c151-disposable',classId,equipment:e},{...raw,...look},()=>true)));
const original=save({hairColor:'brown',eyeColor:'brown'});
const index=require(p.join(R,'tools/rework-weapon-layers-hd/index.json')),weapon=global.MareReworkWeaponNativeHD.create(index,{makeCanvas:cv.createCanvas});
const spec=index.separableAttackRigs.find(r=>r.rig==='male-focus-east-modular8');
const Q=640,ctx=()=>cv.createCanvas(Q,Q).getContext('2d'), bytes=c=>Buffer.from(c.getImageData(0,0,Q,Q).data),
 render=im=>{const c=ctx();c.drawImage(im,0,0);return bytes(c);};
async function draw(game,player,opts,f,expected){
 const phase={...opts,progress:(f+.1)/8,x:320,y:512};a(await game.prepareStablePose(player,phase),JSON.stringify(game.snapshot()));
 let pix;a(game.draw({save(){},restore(){},drawImage(im){pix=bytes(im.getContext('2d'))}},player,phase));
 a.equal(game.snapshot().last.frame,f);a.equal(game.snapshot().last.source,expected);
 a.deepEqual(game.snapshot().last.pivot,{x:320,y:512});return pix;
}
(async()=>{await api.ready;await stock.ready;
 for(const direction of (process.env.SIDE?[process.env.SIDE]:['east','west'])){
  const o={direction,action:'attack-focus',consumer:'world'},coatPlayer=save(),plainPlayer=save({},{weapon:{def:32}}),
   worn=api.selectVisual(coatPlayer,o),plain=api.selectVisual(plainPlayer,o),brown=api.selectVisual(original,o);
  a(worn?.relic32SideBlue&&plain?.relic32SideBlue);a(brown?.separableAttack&&!brown.relic32SideBlue);
  a.deepEqual(worn.equipmentContract,{weapon:32,coat:COAT});a.deepEqual(plain.equipmentContract,{weapon:32});
  a.deepEqual(worn.basePack,plain.basePack);a.equal(worn.fps,12);a.equal(worn.contactTick,4);a.deepEqual(worn.timeline,plain.timeline);
  a.equal(api.selectVisual(coatPlayer,{...o,action:'attack'})?.id,worn.id);
  if(C){a.deepEqual(stock.selectVisual(plainPlayer,o),plain);a.deepEqual(stock.selectVisual(original,o),brown);a(!stock.selectVisual(coatPlayer,o)?.relic32SideBlue);}
  for(const [q,opt] of [
   [save({},{weapon:{def:32},coat:{def:COAT,variant:'alt'}}),o],[save({},{weapon:{def:32},coat:{def:137}}),o],
   [save({},{weapon:{def:32},coat:{def:COAT},boots:{def:9}}),o],[save({},{weapon:{def:32},coat:{def:COAT},head:{def:19}}),o],
   [{...save({},{weapon:{def:32},coat:{def:COAT},head:{def:19}}),preferences:{hideHeadgear:true}},o],
   [coatPlayer,{...o,consumer:'preview'}],[save({skinColor:'ebony'}),o],[save({eyeStyle:'face-calm'}),o],[save({hairStyle:'hair-spiky'}),o],
   [coatPlayer,{...o,action:'attack-unarmed'}],[coatPlayer,{...o,direction:'north'}],[coatPlayer,{...o,direction:'south'}],
   [save({},coatPlayer.equipment,'strategist'),o],[coatPlayer,{...o,weaponless:true}]]){
    const r=api.selectVisual(q,opt);a(!r?.relic32SideBlue);if(C)a.deepEqual(r,stock.selectVisual(q,opt));
  }
  const proofs=[];
  for(let f=0;f<8;f++){
   const player=save(),first=await draw(api,player,o,f,worn.id);
   const actualCoat=player.equipment.coat;delete player.equipment.coat;
   const bare=await draw(api,player,o,f,plain.id);
   player.equipment.coat=actualCoat;const restored=await draw(api,player,o,f,worn.id);a(restored.equals(first));
   if(C){const originalPlain=stock.selectVisual(plainPlayer,o),origBrown=stock.selectVisual(original,o);
    a(bare.equals(await draw(stock,plainPlayer,o,f,originalPlain.id)));
    a((await draw(api,original,o,f,brown.id)).equals(await draw(stock,original,o,f,origBrown.id)));
   }
   const layers=worn.basePack.pack.directions[direction].layers,part=l=>worn.basePack.images[l.frames?.[f]||l.source].slice(1),
    from=l=>load('tools/rework-weapon-layers-hd/'+l.url),s=worn.states[f];
   const [cam,arm,feet,hair,gear]=await Promise.all([from(s.layers[0]),load(part(layers.find(l=>l.id==='forearm-hand-far'))),load(part(layers.find(l=>l.id==='legs'))),load(part(layers.find(l=>l.slot==='hair'))),from(s.layers[1])]);
   a.equal(s.layers[1].sha256,plain.states[f].layers[0].sha256);
   const bodyRef=await draw(api,original,o,f,brown.id),placed=ctx(),px=placed.createImageData(Q,Q);px.data.set(bare);placed.putImageData(px,0,0);placed.drawImage(cam,0,0);const predicted=bytes(placed);
   const alpha=render(cam),hand=render(arm),foot=render(feet),hairOwner=render(hair),w=render(gear);
   const iris=new Map(global.MareReworkModularOutfitsHD.sideIrisSamples(direction).map(([x,y,...z])=>[(y+64)*Q+x+64,Number.parseInt(A.eyes.blue.ramp[z[4]-1].slice(1),16)]));
   let contact=0,changed=0,eyes=0,sole=0,weaponPixels=0,hairDiff=0,authoredContact=0;
   for(let i=0;i<first.length;i+=4){
    const a0=first.readUInt32LE(i),b0=bare.readUInt32LE(i),old=bodyRef.readUInt32LE(i),color=iris.get(i/4);
    a.equal(first[i+3],bodyRef[i+3],'saved profile changed silhouette');
    if(!alpha[i+3])a.equal(a0,b0,'not peitoral owned');else {if(a0!==b0)changed++;for(let k=0;k<4;k++)a(Math.abs(first[i+k]-predicted[i+k])<=1,'coat draw/depth differs');}
    if(color!==undefined){a(!alpha[i+3]);a.equal((first[i]<<16)|(first[i+1]<<8)|first[i+2],color);eyes++;}
    else if(a0!==old){a(hairOwner[i+3],'saved Light skin or garment changed');hairDiff++;}
    if(w[i+3]){a(!alpha[i+3]);a.equal(a0,w.readUInt32LE(i),'weapon own alpha/color changed');weaponPixels++;}
    if(hand[i+3]===255&&[i-4,i+4,i-2560,i+2560].some(j=>w[j+3])){
     if(hand.readUInt32LE(i)===a0)contact++;if(hand.readUInt32LE(i)===old)authoredContact++;
    }
    if(i>=Q*4*465&&foot[i+3]===255&&foot.readUInt32LE(i)===b0){a.equal(a0,b0);sole++;}
   }
   a.equal(eyes,18);a.equal(contact,authoredContact,'original grip contact changed');a.equal(contact,[5,30,26,45,54,36,37,COAT===179?27:COAT===165?35:36][f]);a(changed>9000&&sole>100&&hairDiff>3900);a(weaponPixels>300);
   proofs.push({f,changed,eyes,contact,sole,weaponPixels,hairDiff});global.gc?.();
  }
  console.log(COAT,direction,JSON.stringify(proofs));
 }
})().catch(e=>{console.error(e);process.exitCode=1});
