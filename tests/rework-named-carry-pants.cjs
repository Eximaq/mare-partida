'use strict';
const a=require('node:assert/strict'),path=require('node:path'),R=path.resolve(process.argv[2]||path.join(__dirname,'..'));
const ids={16:'strategist',17:'strategist',31:'healer',32:'healer',121:'strategist',122:'strategist',123:'strategist',124:'strategist',125:'healer',126:'healer',127:'healer',128:'healer',15:'cyborg',118:'cyborg',119:'cyborg',120:'cyborg'};
const only=Number(process.env.KAIZOKU_NAMED_CARRY_ITEM||0);
if(!only){
 const spawn=require('node:child_process').spawnSync,total={renders:0,selects:0,controls:0};
 for(const item of Object.keys(ids)){
  const out=spawn(process.execPath,[...process.execArgv,__filename,R],{encoding:'utf8',env:{...process.env,KAIZOKU_NAMED_CARRY_ITEM:item}});
  if(out.status!==0)throw Error('item '+item+' failed: '+out.stderr+'\n'+out.stdout);
  const row=JSON.parse(out.stdout.trim().split('\n').at(-1));
  Object.keys(total).forEach(k=>total[k]+=row[k]);console.log('item',item,row);
 }
 a.deepEqual(total,{renders:1542,selects:4112,controls:368});console.log('PASS',total);
 process.exit(0);
}

const {make,cv}=require(R+'/tests/rework-integration-support.cjs'),A=require(R+'/character-appearance'),api=make();
const load=require(R+'/tools/rework-hd-test-loader.cjs').create(R),V=global.ReworkAccessoryVendor.compositor;
const pixels=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
function save(item,tone,pants,hairStyle){return JSON.parse(JSON.stringify(A.commit({classId:ids[item],equipment:{weapon:{def:item},...(pants?{legs:{def:pants}}:{})}},{gender:'masculino',skinStyle:'natural',skinColor:tone,hairStyle,hairColor:'blue',eyeStyle:'original',eyeColor:'blue'},()=>true)))}
(async()=>{await api.ready;let renders=0,selects=0,controls=0;
 for(const pantsId of [21,22,133])for(const item of [only])for(const hairStyle of (ids[item]==='cyborg'?['hair-spiky']:['hair-spiky','hair-cropped']))for(const direction of ['south','north','east','west'])for(const action of ['idle','walk']){
  if(pantsId===133&&['east','west'].includes(direction))continue;
  const held=item===119&&direction==='south';
  const options={consumer:'world',direction,action};
  for(const tone of Object.keys(A.skins)){
   const off=save(item,tone,null,hairStyle),on=save(item,tone,pantsId,hairStyle),old=api.selectVisual(off,options),r=api.selectVisual(on,options);
   if(held){a(!r?.namedCarryPants);controls++;continue;}
   a.equal(r?.hdKind,'outfit-carry',`missing P21+${item}/${direction}/${action}/${tone}`);
   if(!r.namedCarryPants){a.equal(item,17);controls++;continue;}
   a.equal(r.namedCarryPants,pantsId);a.deepEqual(r.hairLayers,old.hairLayers);
   a.deepEqual(r.plan,old.plan);a.equal(r.base.sourcePackSHA256,old.base.sourcePackSHA256);a.deepEqual(r.colorAppearance,old.colorAppearance);a.deepEqual(r.omitted,[]);
   const od=old.base.pack.directions[direction],d=r.base.pack.directions[direction],p=r.base.pack;
   a.deepEqual(d.layers.filter(l=>l.id!=='lower-redrawn'&&l.slot!=='pants'),od.layers.filter(l=>l.id!=='lower-redrawn'&&l.slot!=='pants'));
   const lower=d.layers.filter(l=>l.id==='lower-redrawn'||(pantsId===133?l.id==='own133-isolated':l.id.startsWith('pants'+pantsId+'-')));
   for(const part of r.plan.parts){
    const hand=d.layers.find(l=>l.binding?.a===part.binding.a&&l.binding?.b===part.binding.b);a(hand);
    a(lower.every(l=>l.depth<hand.depth+(part.depthOffset??.1)),'lower cannot hide own weapon');
   }
   a.deepEqual([d.clip,d.rest,d.poses,p.pivot,p.frame,r.base.mirrorX],[od.clip,od.rest,od.poses,old.base.pack.pivot,old.base.pack.frame,old.base.mirrorX]);
   for(const bad of [{...on,classId:'rogue'},{...on,equipment:{...on.equipment,gloves:{def:25}}}])a(!api.selectVisual(bad,options)?.namedCarryPants);
   selects++;
   if(tone!=='ebony'&&!(tone==='porcelain'&&action==='idle'))continue;
   const b=await api.prepareConfiguration([{player:off,options}]),w=await api.prepareConfiguration([{player:on,options}]);
   const frames=d.clip.frames,pad=r.plan.paddingPhysical??0,s=p.frame.width*4;
   const draw=(bundle,actor,f)=>{let im;a(bundle.draw({save(){},restore(){},drawImage(v){im=v;}},actor,{...options,progress:(f+.25)/frames}));return im;};
   const oldL=od.layers.find(l=>l.id==='lower-redrawn'),newL=d.layers.find(l=>l.id==='lower-redrawn'),pants=d.layers.find(l=>(pantsId===133?l.id==='own133-isolated':l.id.startsWith('pants'+pantsId+'-')));
   a(newL&&oldL&&pants);
   for(let f=0;f<frames;f+=frames===16?4:1){
    const x=draw(b,off,f),y=draw(w,on,f);a.equal(x.width,y.width);a.equal(x.height,y.height);
    const mask=cv.createCanvas(x.width,x.height),mc=mask.getContext('2d');
    for(const l of [oldL,newL,pants]){
     const sha=l.frames?.[f]||l.source,prefix=r.outfitOverlay.sourceRefs.includes(sha)?'tools/rework-modular-outfits-hd':'tools/rework-base-hd',im=await load(prefix+'/assets/'+sha+'.png');
     const single={...p,directions:{[direction]:{...d,layers:[l]}}},tile=cv.createCanvas(s,s);
     V.render(tile.getContext('2d'),single,new Map([[sha,im]]),{direction,frame:f,density:4});
     mc.save();if(r.base.mirrorX&&!r.preMirroredLayers?.includes(l.id)){mc.translate(mask.width,0);mc.scale(-1,1);}mc.drawImage(tile,pad,pad);mc.restore();tile.width=1;
    }
    const u=pixels(x),v=pixels(y),m=pixels(mask);let change=0;
    for(let i=0;i<u.length;i+=4)if(u.readUInt32LE(i)!==v.readUInt32LE(i)){
     a(m[i+3],`outside exact own lower alpha ${item}/${direction}/${action}/${tone}/${f} ${i/4%x.width},${i/4/x.width|0}`);change++;
    }
    a(change>500);a.deepEqual(pixels(draw(b,off,f)),u);mask.width=1;renders++;
   }
   w.release();b.release();global.gc?.();
  }
  console.log(item,direction,action,renders,selects,controls);
 }
 
 console.log(JSON.stringify({renders,selects,controls}));
})().catch(e=>{console.error(e);process.exit(1)})
