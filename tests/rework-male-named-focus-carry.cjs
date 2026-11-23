'use strict';
const a=require('node:assert/strict'),path=require('node:path');
const P=path.resolve(process.argv[2]||path.join(__dirname,'..')),A=require(P+'/character-appearance'),{make,cv}=require(P+'/tests/rework-integration-support.cjs'),api=make();
const load=require(P+'/tools/rework-hd-test-loader.cjs').create(P);
const roster={16:'strategist',31:'healer',32:'healer',121:'strategist',122:'strategist',123:'strategist',124:'strategist',125:'healer',126:'healer',127:'healer',128:'healer'};
function actor(id,cls,skinColor,hairStyle,hairColor){return JSON.parse(JSON.stringify(A.commit({classId:cls,equipment:{weapon:{def:id}}},{gender:'masculino',hairStyle,hairColor,eyeStyle:'original',eyeColor:'blue',skinColor},()=>true)))}
function px(canvas){return Buffer.from(canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data)}
(async()=>{await api.ready;let n=0,s=0;
 for(const [item,cls] of Object.entries(roster))for(const direction of ['south','north','east','west'])for(const action of ['idle','walk']){
  const id=Number(item),o={consumer:'world',direction,action};
  for(const tone of Object.keys(A.skins)){
   const color=tone==='porcelain'?'blue':'silver',named=actor(id,cls,tone,'hair-cropped',color),original=actor(id,cls,tone,'original','black');
   const reference=api.selectVisual(original,o),r=api.selectVisual(named,o);
   a(r?.namedFocusCarry,`missing ${item}/${direction}/${action}/${tone}/${color}`);
   a.deepEqual(r.plan,reference.plan);a.deepEqual(r.base,reference.base);a.deepEqual(r.relicEyes,reference.relicEyes);
   a.equal(r.colorAppearance.skin,tone);a.equal(r.colorAppearance.hairColor,color);s++;
   for(const q of [{...named,classId:'brawler'},{...named,equipment:{weapon:{def:id,variant:'other'}}}])a(!api.selectVisual(q,o)?.namedFocusCarry);
   if(direction==='north'){
    const withGlove=require(P+'/paper-doll-96-lobby').selectWorldHDOnly(api,require(P+'/tools/paper-doll-96-v3/weapons.json'),{...named,equipment:{...named.equipment,gloves:{def:26}}},o);
    a.equal(withGlove?.slotRoutes.gloves.item,26);a.equal(withGlove.slotRoutes.weapon.item,id);
    a.deepEqual(withGlove.omitted,[]);a.deepEqual(withGlove.plan,r.plan);
   }
   if(!['porcelain','ebony'].includes(tone))continue;
   const before=JSON.stringify(named),d=r.base.pack.directions[direction],frames=d.clip.frames,padding=r.plan.paddingPhysical??0;
   const baseH=d.layers.filter(l=>l.slot==='hair'),namedH=r.hairLayers;
   a.equal(baseH.length,1);a.equal(namedH.length,1);
   const ba=await api.prepareConfiguration([{player:original,options:o}]),bb=await api.prepareConfiguration([{player:named,options:o}]);
   const draw=(bundle,x,f)=>{let im;a(bundle.draw({save(){},restore(){},drawImage(v){im=v;}},x,{...o,progress:(f+.25)/frames}));return im;};
   for(let f=0;f<frames;f++){
    const x=draw(ba,original,f),y=draw(bb,named,f);a.equal(x.width,y.width);a.equal(x.height,y.height);
    const mask=cv.createCanvas(x.width,x.height),mc=mask.getContext('2d');
    mc.save();if(r.base.mirrorX){mc.translate(mask.width,0);mc.scale(-1,1);}mc.translate(padding,padding);
    for(const layers of [baseH,namedH]){
      const l=layers[0],sha=l.frames?.[f]||l.source,pack={...r.base.pack,directions:{[direction]:{...d,layers}}};
      // V.render clears its input; draw each authorized layer into an independent tile.
      const tile=cv.createCanvas(r.base.pack.frame.width*4,r.base.pack.frame.height*4);
      global.ReworkAccessoryVendor.compositor.render(tile.getContext('2d'),pack,new Map([[sha,await load('tools/rework-base-hd/assets/'+sha+'.png')]]),{direction,frame:f,density:4});
      mc.drawImage(tile,0,0);tile.width=1;
    }
    mc.restore();
    const b=px(x),c=px(y),m=px(mask);let delta=0;
    for(let i=0;i<b.length;i+=4)if(b.readUInt32LE(i)!==c.readUInt32LE(i)){a(m[i+3]>0,`outside approved hair ${id}/${direction}/${action}/${tone}/${f},${i/4%x.width},${i/4/x.width|0}`);delta++;}
    a(delta>50);n++;mask.width=1;
   }
   a.equal(before,JSON.stringify(named));ba.release();bb.release();global.gc?.();
  }
  console.log(item,direction,action,n);
 }
 a.equal(s,704);a.equal(n,1496);console.log('PASS 704 saved selector cases and 1496 actual World frames; original grip/clock/source unchanged, RGBA delta only within exact cropped/Original hair');
})().catch(e=>{console.error(e);process.exit(1)})
