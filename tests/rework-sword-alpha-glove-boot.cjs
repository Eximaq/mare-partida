'use strict';
const a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=process.env.KAIZOKU_AUDIT_STAGE||path.resolve(__dirname,'..'),release=path.resolve(process.argv[2]||path.join(base,'dist'));
const Module=require('node:module');
if(process.env.COMPOSE_TRIAL){
 for(const filename of ['player-rework-native-hd.js','player-rework-sword0-checkpoint.js']){
  const f=base+'/'+filename,m=new Module(f);m.filename=f;m.paths=Module._nodeModulePaths(base);
  m._compile(fs.readFileSync(process.env.COMPOSE_TRIAL+'/'+filename,'utf8'),f);m.loaded=true;require.cache[f]=m;
 }
}
require(base+'/player-rework-sword0-checkpoint.js');
const {make,cv}=require(base+'/tests/rework-integration-support.cjs'),A=require(base+'/character-appearance');
const loader=require(base+'/tools/rework-hd-test-loader.cjs').create(base),prefix='tools/rework-sword0-checkpoint/';
const catalog=require(path.join(release,prefix,'sword-catalog.json'));
const api=make({fetchJSON:async f=>f===prefix+'sword-catalog.json'?catalog:JSON.parse(fs.readFileSync(path.join(base,f))),
 loadImage:f=>f.startsWith(prefix)?cv.loadImage(path.join(release,f)):loader(f)});
const R=f=>require(path.join(base,f)),skin=global.MareFemaleNamedHairHD.create(R('tools/rework-accessories/head-layer-index.json'),R('tools/rework-accessories/female-original-face-ownership.json'),{baseRegistry:global.MareReworkBaseHD.create(R('tools/rework-base-hd/index.json')),makeCanvas:cv.createCanvas});
const reg=global.MareReworkFemaleEquipmentHD.create({schema:'female-native-equipment-registration-v1',records:R('tools/rework-weapon-layers-hd/index.json').femaleRegistrations},{makeCanvas:cv.createCanvas,appearanceRegistry:skin});
async function get(rec,frame){const imgs=new Map(),c=cv.createCanvas(1,1);for(const f of reg.requiredFiles(rec,{frame}))imgs.set(f,await (f.startsWith(prefix)?cv.loadImage(path.join(release,f)):loader(f)));reg.render(c.getContext('2d'),rec,imgs,{frame});return c;}
const pixels=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);

(async()=>{
 await api.ready;a(await api.warmSwordCheckpoint(),'checkpoint ready');
 const expected={north:{boots:[8,134,141,155,148],gloves:[25,131,138,152,180]},
  south:{boots:[8,9,134,148,162],gloves:[131,180]}};
 const stock=[0,1,67,68,69,70];let covered=0,frames=0;
 for(const [direction,{boots,gloves}] of Object.entries(expected))for(const def of stock)
  for(const skinColor of Object.keys(global.MareAppearance96.skins)){
   const o={consumer:'world',action:'attack-sword',direction};
   const face=A.normalize({gender:'feminino',hairStyle:'original',hairColor:'black',eyeStyle:'original',eyeColor:'blue',skinColor,skinStyle:'natural'});
   const actor=(b,g)=>({appearance96:face,classId:'sword',equipment:{weapon:{def},...(b?{boots:{def:b}}:{}),...(g?{gloves:{def:g}}:{})}});
   const bare=api.selectVisual(actor(),o);a(bare);
   for(const b of boots)for(const g of gloves){
    const boot=api.selectVisual(actor(b),o),glove=api.selectVisual(actor(null,g),o),on=actor(b,g),before=JSON.stringify(on),both=api.selectVisual(on,o);
    a.equal(boot?.slotRoutes?.boots?.item,b);a.equal(glove?.slotRoutes?.gloves?.item,g);
    a.equal(both?.slotRoutes?.boots?.item,b,JSON.stringify([direction,def,b,g,skinColor,both?.id]));
    a.equal(both.slotRoutes.gloves.item,g);a.equal(both.slotRoutes.weapon.item,def);a.deepEqual(both.omitted,[]);
    a.deepEqual(both.material,bare.material);a.deepEqual(both.states,bare.states);
    const bd=boot.pack.directions[direction],gd=glove.pack.directions[direction],md=both.pack.directions[direction];
    const hand=l=>['left-hand','right-hand'].includes(l.id);
    a.deepEqual(md.layers.filter(hand),gd.layers.filter(hand));a.deepEqual(md.layers.filter(l=>!hand(l)),bd.layers.filter(l=>!hand(l)));
    a.deepEqual(md.clip,bd.clip);a.deepEqual(md.poses,bd.poses);a.deepEqual(both.pack.pivot,bare.pack.pivot);
    a.equal(JSON.stringify(on),before);covered++;
    if((skinColor==='light'||skinColor==='ebony')&&def===(direction==='north'?0:69)&&g===gloves[0]&&[boots[0],boots.at(-1)].includes(b)){
     for(let i=0;i<8;i++){
      const cells=[];for(const rec of [bare,glove,boot,both]){const c=await get(rec,i);cells.push(pixels(c));c.width=c.height=1;global.gc?.();}
      const [bareP,gloveP,bootP,bothP]=cells;let h=0,k=0;
      for(let j=0;j<bareP.length;j+=4){
       const x=bareP.readUInt32LE(j),u=gloveP.readUInt32LE(j),v=bootP.readUInt32LE(j);
       a(!(x!==u&&x!==v),'visible hand/boot deltas intersect');
       a(bothP.readUInt32LE(j)===(x!==u?u:v),'combined pixels differ from independent passes at '+[direction,def,b,g,i,j/4]);
       h+=+(x!==u);k+=+(x!==v);
      }
      a(h>0&&k>0,'each equipped layer is actually visible');frames++;
     }
     a.equal(api.selectVisual(actor(null,g),o).id,glove.id);a.equal(api.selectVisual(actor(b),o).id,boot.id);
    }
   }
  }
 console.log('PASS',covered,'combined World selectors;',frames,'exact rendered RGBA frames');
})().catch(e=>{console.error(e);process.exitCode=1;});
