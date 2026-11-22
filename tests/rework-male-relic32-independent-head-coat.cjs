'use strict';
const a=require('node:assert/strict'),fs=require('node:fs'),p=require('node:path');
const R=p.resolve(process.env.KAIZOKU_REPO||p.join(__dirname,'..'));
if(process.env.KAIZOKU_CANDIDATE){
 const Module=require('node:module'),f=R+'/player-rework-native-hd.js',m=new Module(f);
 m.filename=f;m.paths=Module._nodeModulePaths(R);require.cache[f]=m;
 m._compile(fs.readFileSync(process.env.KAIZOKU_CANDIDATE,'utf8'),f);m.loaded=true;
}
const {make,cv}=require(R+'/tests/rework-integration-support.cjs'),A=require(R+'/character-appearance.js'),W=require(R+'/paper-doll-96-lobby.js');
const api=make(),load=require(R+'/tools/rework-hd-test-loader.cjs').create(R),cat=require(R+'/tools/paper-doll-96-v3/weapons.json');
const dirs=process.env.SIDE?[process.env.SIDE]:['east','west'],coats=[151,158,165,179];
const naked=(skinColor,extra={})=>({classId:'healer',appearance96:A.normalize({gender:'masculino',hairColor:'black',eyeColor:'blue',skinColor}),equipment:{weapon:{def:32},...extra}});
const px=ctx=>new Uint32Array(ctx.getImageData(0,0,640,640).data.buffer);
function shot(b,player,o,f){let c;a(b.draw({save(){},restore(){},drawImage(v){c=v;}},player,{...o,progress:(f+.25)/8}));return c;}
(async()=>{await api.ready;let rows=0,n=0;
 for(const direction of dirs){
  const o={consumer:'world',action:'attack-focus',direction};
  for(const skin of Object.keys(A.skins))for(const coat of coats){
   const actor=naked(skin,{coat:{def:coat},head:{def:164}}),before=JSON.stringify(actor),
    solo=naked(skin,{coat:{def:coat}}),head=naked(skin,{head:{def:164}}),
    r=W.selectWorldHD(api,cat,actor,{...o,action:'attack'}),c=api.selectVisual(solo,o),h=api.selectVisual(head,o);
   a(r?.ownGauntletHead&&r?.relic32SideBlue,'mixed authored coat and hat missing '+direction+'/'+skin+'/'+coat);
   a.deepEqual(r.ownGauntletHead,h.ownGauntletHead);a.deepEqual(r.states,c.states);a.deepEqual(r.basePack,c.basePack);
   a.deepEqual(r.colorAppearance,c.colorAppearance);a.deepEqual(r.timeline,c.timeline);a.equal(r.fps,12);a.equal(r.contactTick,4);
   a.deepEqual(r.slotRoutes.head,h.slotRoutes.head);a.deepEqual(r.slotRoutes.weapon,h.slotRoutes.weapon);
   a.equal(r.slotRoutes.coat.item,coat);a.deepEqual(r.omitted,[]);
   a.equal(W.selectWorldHD(api,cat,actor,{...o,action:'skill'})?.id,r.id);
   a.deepEqual(W.selectWorldHD(api,cat,{...actor,equipment:{...actor.equipment,cloak:{def:23}}},{...o,action:'attack'}),r);
   a.equal(api.selectVisual({...actor,preferences:{hideHeadgear:true}},o)?.id,c.id);
   a(!api.selectVisual(naked(skin,{coat:{def:coat},head:{def:178}}),o)?.ownGauntletHead,'unattested 178 contact unlocked');
   a.equal(JSON.stringify(actor),before);rows++;
  }
  for(const skin of (process.env.TONE?[process.env.TONE]:['light','ebony']))for(const coat of coats){
   const actor=naked(skin,{coat:{def:coat},head:{def:164}}),solo=naked(skin,{coat:{def:coat}}),r=api.selectVisual(actor,o),pure=api.selectVisual(solo,o);
   const q0=await api.prepareConfiguration([{player:solo,options:o}]),q1=await api.prepareConfiguration([{player:actor,options:o}]);
   const canvas=cv.createCanvas(640,640),ctx=canvas.getContext('2d'),hat=await load(r.ownGauntletHead.source);
   const paint=(img,...args)=>{ctx.clearRect(0,0,640,640);ctx.drawImage(img,...args);return px(ctx);};
   const hatMask=paint(hat,...r.ownGauntletHead.offset);
   try{for(let f=0;f<8;f++){
    const base=shot(q0,solo,o,f),out=shot(q1,actor,o,f),b=px(base.getContext('2d')),v=px(out.getContext('2d'));
    for(const l of pure.states[f].layers){
     const owner=paint(await load('tools/rework-weapon-layers-hd/'+l.url),0,0);
     for(let i=0;i<owner.length;i++)a(!(owner[i]>>>24&&hatMask[i]>>>24),'unproven hat/coat/weapon depth');
    }
    ctx.clearRect(0,0,640,640);ctx.drawImage(base,0,0);ctx.drawImage(hat,...r.ownGauntletHead.offset);
    a.deepEqual(px(ctx),v);let changed=0;
    for(let i=0;i<v.length;i++)if(v[i]!==b[i]){a(hatMask[i]>>>24);changed++;}
    a(changed>100);n++;
   }}finally{q0.release();q1.release();canvas.width=1;global.gc?.();}
  }
 }
 console.log('PASS',rows,'selectors and',n,'rendered mixed poses with independent hat/coat/weapon alpha, 8-phase clock and remove preserved; incompatible 178 blocked');
})().catch(e=>{console.error(e);process.exitCode=1});
