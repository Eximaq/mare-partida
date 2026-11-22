'use strict';
const a=require('node:assert/strict'),p=require('node:path'),R=p.resolve(process.env.KAIZOKU_REPO||p.join(__dirname,'..'));
if(process.env.FIREARM_CAP_CANDIDATE){
 const fs=require('node:fs'),M=require('node:module'),f=R+'/player-rework-native-hd.js',m=new M(f);
 m.filename=f;m.paths=M._nodeModulePaths(R);m._compile(fs.readFileSync(process.env.FIREARM_CAP_CANDIDATE,'utf8'),f);m.loaded=true;require.cache[f]=m;
}
const {make,cv}=require(R+'/tests/rework-integration-support.cjs'),A=require(R+'/character-appearance'),W=require(R+'/paper-doll-96-lobby.js'),
 catalog=require(R+'/tools/paper-doll-96-v3/weapons.json'),load=require(R+'/tools/rework-hd-test-loader.cjs').create(R),api=make();
const V=ReworkAccessoryVendor.compositor,P='tools/rework-weapon-layers-hd/';
const equip=(weapon,skin,head)=>A.commit({classId:'gunner',equipment:{weapon:{def:weapon},...(head==null?{}:{head:{def:head}})}},{gender:'masculino',skinColor:skin},()=>true);
const capture=(b,actor,o,i)=>{let c;a(b.draw({save(){},restore(){},drawImage(r){c=r;}},actor,{...o,progress:(i+.2)/8}));return c;};
const data=c=>new Uint32Array(c.getContext('2d').getImageData(0,0,640,640).data.buffer);
const get=u=>load(u.startsWith('/')?u.slice(1):P+u);
(async()=>{
 await api.ready;let frames=0,selects=0;
 for(const weapon of (process.env.FIREARM_CAP_IDS?.split(',').map(Number)||[4,5,113,115,116]))for(const direction of ['east','west']){
  const o={action:'attack-firearm',direction,consumer:'world'};
  const C=cv.createCanvas(640,640),ctx=C.getContext('2d'),clear=()=>ctx.clearRect(0,0,640,640);
  for(const head of [164,178])for(const skinColor of Object.keys(A.skins)){
   const solo=equip(weapon,skinColor),on=equip(weapon,skinColor,head),saved=JSON.stringify(on),ref=api.selectVisual(solo,o),r=api.selectVisual(on,o);
   if(weapon===115&&head===178){a(!r?.ownGauntletHead);continue;}
   const q=r?.ownGauntletHead;
   a(q,JSON.stringify([weapon,direction,head,skinColor,r?.id]));
   a.deepEqual(r.timeline,ref.timeline);a.deepEqual(r.states,ref.states);a.deepEqual(r.basePack,ref.basePack);a.deepEqual(r.colorAppearance,ref.colorAppearance);
   a.equal(r.slotRoutes.weapon.item,weapon);a.equal(r.slotRoutes.head.item,head);a.deepEqual(r.omitted,[]);
   a.equal(api.selectVisual({...on,preferences:{hideHeadgear:true}},o)?.id,ref.id);
   for(const action of ['attack','skill'])a.equal(W.selectWorldHD(api,catalog,on,{...o,action})?.id,r.id);
   a(!api.selectVisual({...on,equipment:{...on.equipment,head:{def:head,variant:'alternative'}}},o)?.ownGauntletHead);
   selects++;
   if(!['light','ebony'].includes(skinColor))continue;
   const [x,y]=await Promise.all([api.prepareConfiguration([{player:solo,options:o}]),api.prepareConfiguration([{player:on,options:o}])]),headgear=await load(q.source);
   try{
    const pack=ref.basePack.pack,d=pack.directions[direction],body=d.layers.filter(l=>!['headBase','face','hair'].includes(l.slot));
    clear();ctx.drawImage(headgear,...q.offset);const hat=data(C);
    for(let f=0;f<8;f++){
     const before=capture(x,solo,o,f),old=data(before),actual=data(capture(y,on,o,f)),attach=ref.states[f].attachment;
     clear();ctx.save();ctx.transform(...attach.matrix);if(attach.mirrorX){ctx.translate(attach.size[0],0);ctx.scale(-1,1);}ctx.drawImage(await get(attach.url),0,0);ctx.restore();
     const weaponMask=data(C);
     const imgs=new Map(await Promise.all(body.map(async l=>{const k=l.frames?.[f]||l.source;return [k,await get(ref.basePack.images[k])];})));
     clear();V.render(ctx,{...pack,directions:{[direction]:{...d,layers:body}}},imgs,{direction,frame:f,density:4});const bodyMask=data(C);
     clear();ctx.drawImage(before,0,0);ctx.drawImage(headgear,...q.offset);a.deepEqual(data(C),actual);
     let changed=0;
     for(let i=0;i<hat.length;i++){if(hat[i]>>>24){a.equal(weaponMask[i]>>>24,0);a.equal(bodyMask[i]>>>24,0);}if(old[i]!==actual[i]){a(hat[i]>>>24);changed++;}}
     a(changed>100);frames++;
    }
   }finally{x.release();y.release();global.gc?.();}
   a.equal(JSON.stringify(on),saved);
  }
  C.width=C.height=1;
  console.log('PASS lateral firearm head',weapon,direction,{frames,selects});
 }
 if(!process.env.FIREARM_CAP_IDS)a.deepEqual({frames,selects},{frames:288,selects:144});
})().catch(e=>{console.error(e);process.exitCode=1});
