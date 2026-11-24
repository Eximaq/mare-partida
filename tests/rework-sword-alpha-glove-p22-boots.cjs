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
 const expected={north:{boots:[8,148],gloves:[25,131,138,152,180]}};
 const stock=[0,1,67,68,69,70];let covered=0,frames=0,soloCount=0,cuffCount=0,cuffFrames=0;
 for(const [direction,{boots,gloves}] of Object.entries(expected))for(const def of stock)
  for(const skinColor of Object.keys(global.MareAppearance96.skins)){
   const o={consumer:'world',action:'attack-sword',direction};
   const face=A.normalize({gender:'feminino',hairStyle:'original',hairColor:'black',eyeStyle:'original',eyeColor:'blue',skinColor,skinStyle:'natural'});
   const actor=(b,g,legs)=>({appearance96:face,classId:'sword',equipment:{weapon:{def},...(legs?{legs:{def:22}}:{}),...(b?{boots:{def:b}}:{}),...(g?{gloves:{def:g}}:{})}});
   const bare=api.selectVisual(actor(),o);a(bare);
   const p22=api.selectVisual(actor(null,null,true),o);a.equal(p22?.slotRoutes?.legs?.item,22);
   a.deepEqual(p22.material,bare.material);a.deepEqual(p22.states,bare.states);
   const cloth=p22.pack.directions.north.layers.find(l=>l.id==='pants22-independent');a(cloth);
   const cropped=equipment=>({...equipment,appearance96:A.normalize({...catalog.appearance96,skinColor})});
   const croppedPlain=api.selectVisual(cropped(actor()),o),croppedP22=api.selectVisual(cropped(actor(null,null,true)),o);
   a.deepEqual(croppedP22?.pack,p22.pack);soloCount++;
   for(const b of boots)for(const g of gloves){
    const boot=api.selectVisual(actor(b,null,true),o),glove=api.selectVisual(actor(null,g),o),on=actor(b,g,true),before=JSON.stringify(on),both=api.selectVisual(on,o);
    a.equal(boot?.slotRoutes?.boots?.item,b);a.equal(glove?.slotRoutes?.gloves?.item,g);
    if(g===gloves[0]){
     const croppedCuff=api.selectVisual(cropped(actor(b,null,true)),o);
     a.deepEqual(croppedCuff?.pack,boot.pack);
     a.deepEqual(boot.material,bare.material);a.deepEqual(boot.states,bare.states);
     cuffCount++;
    }
    a.equal(both?.slotRoutes?.boots?.item,b,JSON.stringify([direction,def,b,g,skinColor,both?.id]));
    a.equal(both.slotRoutes.legs.item,22);a.equal(both.slotRoutes.gloves.item,g);a.equal(both.slotRoutes.weapon.item,def);a.deepEqual(both.omitted,[]);
    a.deepEqual(both.material,bare.material);a.deepEqual(both.states,bare.states);
    const bd=boot.pack.directions[direction],gd=glove.pack.directions[direction],md=both.pack.directions[direction];
    const hand=l=>['left-hand','right-hand'].includes(l.id);
    a.deepEqual(md.layers.filter(hand),gd.layers.filter(hand));a.deepEqual(md.layers.filter(l=>!hand(l)),bd.layers.filter(l=>!hand(l)));
    a.deepEqual(md.clip,bd.clip);a.deepEqual(md.poses,bd.poses);a.deepEqual(both.pack.pivot,bare.pack.pivot);
    a.equal(JSON.stringify(on),before);covered++;
    if((skinColor==='light'||skinColor==='ebony')&&[0,69].includes(def)&&g===gloves[0]&&[boots[0],boots.at(-1)].includes(b)){
     for(let i=0;i<8;i++){
      const cells=[];for(const rec of [bare,glove,boot,both]){const c=await get(rec,i);cells.push(pixels(c));c.width=c.height=1;global.gc?.();}
      const [bareP,gloveP,bootP,bothP]=cells;let h=0,k=0;
      for(let j=0;j<bareP.length;j+=4){
       const x=bareP.readUInt32LE(j),u=gloveP.readUInt32LE(j),v=bootP.readUInt32LE(j);
       if(x===u||x===v)a(bothP.readUInt32LE(j)===(x!==u?u:v),'unexpected pixel outside intersecting support');
       else {
        a.equal(bothP[j+3],bootP[j+3],'exact hand alpha must preserve composite alpha');
        for(let c=0;c<3;c++)a(Math.abs(bothP[j+c]-(gloveP[j+c]+bootP[j+c]-bareP[j+c]))<=3,'premultiplied rounding bounds at '+[def,b,i,j/4,c]);
       }
       h+=+(x!==u);k+=+(x!==v);
      }
      a(h>0&&k>0,'each equipped layer is actually visible');frames++;
      if(def===0){
       const other=[];for(const rec of [p22,croppedPlain,croppedP22,api.selectVisual(cropped(actor(b,null,true)),o)]){
        const c=await get(rec,i);other.push(pixels(c));c.width=c.height=1;global.gc?.();
       }
       const [pantsP,witnessPlain,witnessPants,witnessBoot]=other;
       let pDelta=0,bDelta=0,opaqueCuff=0,lastBare=0,lastBoot=0;
       for(let j=0;j<pantsP.length;j+=4){
        const x=bareP.readUInt32LE(j),p=pantsP.readUInt32LE(j),b=bootP.readUInt32LE(j),wp=witnessPants.readUInt32LE(j);
        const w=Math.round(Math.sqrt(pantsP.length/4));const row=Math.floor(j/4/w);
        if(pantsP[j+3])lastBare=Math.max(lastBare,row);
        if(bootP[j+3])lastBoot=Math.max(lastBoot,row);
        a(!pantsP[j+3]||bootP[j+3],'cuff introduces a hole');
        if(x!==p||witnessPlain.readUInt32LE(j)!==wp){a(p===wp&&x===witnessPlain.readUInt32LE(j),'Original and witness pants differ in claimed material');pDelta++;}
        if(p!==b||wp!==witnessBoot.readUInt32LE(j)){a(p===wp&&b===witnessBoot.readUInt32LE(j),'Original and witness cuff differ in claimed material');bDelta++;opaqueCuff+=+(bootP[j+3]===255);}
       }
       a(pDelta>0&&bDelta>0&&opaqueCuff>0);a.equal(lastBare,lastBoot);cuffFrames++;
      }
     }
     a.equal(api.selectVisual(actor(null,g),o).id,glove.id);a.equal(api.selectVisual(actor(null,g,true),o).slotRoutes.legs.item,22);a.equal(api.selectVisual(actor(b,null,true),o).id,boot.id);
    }
   }
  }
 console.log('PASS',soloCount,'P22 selectors;',cuffCount,'P22+boot selectors;',covered,'P22+boot+glove selectors;',frames,'combined frames;',cuffFrames,'exact lower material/cuff frames');
})().catch(e=>{console.error(e);process.exitCode=1;});
