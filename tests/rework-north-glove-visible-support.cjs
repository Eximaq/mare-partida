'use strict';
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),assert=require('node:assert/strict');
const root=path.resolve(process.env.KAIZOKU_REPO||path.join(__dirname,'..'));
if(process.env.KAIZOKU_NORTH_GLOVE_CANDIDATE){
 const p=path.join(root,'player-rework-native-hd.js'),m=new Module(p);m.filename=p;m.paths=Module._nodeModulePaths(root);
 m._compile(fs.readFileSync(process.env.KAIZOKU_NORTH_GLOVE_CANDIDATE,'utf8'),p);m.loaded=true;require.cache[p]=m;
}
const {make}=require(path.join(root,'tests/rework-integration-support.cjs')),A=require(path.join(root,'character-appearance.js'));
const uri='tools/rework-weapon-layers-hd/north-glove-visible-support.json';
const data=JSON.parse(fs.readFileSync(process.env.KAIZOKU_NORTH_GLOVE_INDEX||path.join(root,uri)));
const load=(corrupt=false)=>make({fetchJSON:async f=>f===uri?(corrupt?{...data,weaponAlpha:[]}:data):JSON.parse(fs.readFileSync(path.join(root,f)))});
const capture=(bundle,actor,o,i,n)=>{
 let image;assert(bundle.draw({save(){},restore(){},drawImage(src){image=src;}},actor,{...o,progress:(i+.125)/n}));
 return image;
};
const pixels=c=>new Uint32Array(c.getContext('2d').getImageData(0,0,c.width,c.height).data.buffer);
const key=q=>JSON.stringify(q);
const from=(values,value)=>values.findIndex(x=>key(x)===key(value));
const bitmap=span=>{
 const m=new Uint8Array(512*512);
 for(let i=0;i<span.length;i+=2)m.fill(1,span[i],span[i+1]);
 return m;
};
const save=(weapon,gloves,skin,classId='sword')=>A.commit({classId,equipment:{weapon:{def:weapon},...(gloves==null?{}:{gloves:{def:gloves}})}},{gender:'masculino',skinColor:skin},()=>true);
(async()=>{
 const api=load(),bad=load(true);
 await Promise.all([api.ready,bad.ready]);let frames=0,selects=0;
 for(const [weapon,actions]of [[0,['idle','walk']],[67,['idle']]])for(const action of actions)for(const gloves of [25,26])for(const skin of Object.keys(A.skins)){
  const o={action,direction:'north',consumer:'world'},off=save(weapon,null,skin),on=save(weapon,gloves,skin),before=JSON.stringify(on),
   base=api.selectVisual(off,o),r=api.selectVisual(on,o),q=r?.independentCarryGlove;
  assert(q,JSON.stringify([weapon,action,gloves,skin,r?.id]));
  assert.deepEqual(q.base,base);assert.deepEqual(r.plan,base.plan);assert.deepEqual(r.colorAppearance,base.colorAppearance);
  assert.equal(r.slotRoutes.gloves.item,gloves);assert.equal(r.slotRoutes.weapon.item,weapon);
  assert(!bad.selectVisual(on,o)?.independentCarryGlove,'corrupt proof must not activate a new route');selects++;
  if(!['light','ebony'].includes(skin))continue;
  const p=base.base.pack,d=p.directions.north,body=from(data.bodyScopes,[p.frame,p.pivot,p.density,d.clip,d.rest,d.poses,d.layers,base.hairLayers||[]]),
   part=from(data.partScopes,base.plan.parts.map(x=>[x.binding,x.sourceBone,x.source.sha256,x.source.url,x.source.sourceClip??null,x.source.nativeSize??null,
    x.calibrationOffsetPhysical??null,x.mirrorSource??false,x.depthOffset??.1])),cloth=from(data.gloveScopes,q.gloves);
  const own=data.gloveAlpha.find(g=>g.body===body&&g.cloth===cloth).frames,weaponSupport=data.weaponAlpha.find(w=>w.body===body&&w.part===part).frames;
  const x=await api.prepareConfiguration([{player:off,options:o}]),y=await api.prepareConfiguration([{player:on,options:o}]);
  try{
   const pad=base.plan.paddingPhysical??0,n=d.clip.frames;
   for(let i=0;i<n;i++){
    const a=capture(x,off,o,i,n),b=capture(y,on,o,i,n),aa=pixels(a),bb=pixels(b),support=bitmap(own[i]),protectedPixels=bitmap(weaponSupport[i]);let count=0;
    assert.equal(a.width,b.width);assert.equal(a.height,b.height);
    for(let j=0;j<aa.length;j++)if(aa[j]!==bb[j]){
     const u=j%a.width-pad,v=(j/a.width|0)-pad,idx=v*512+u;count++;
     assert(u>=0&&u<512&&v>=0&&v<512&&support[idx],'delta left the independent glove');
     assert.equal(protectedPixels[idx],0,'weapon pixel changed');
    }
    assert(count>1000);frames++;
   }
  }finally{x.release();y.release();global.gc?.();}
  assert.equal(JSON.stringify(on),before);
 }
 for(const it of [[67,25,'walk'],[0,131,'idle'],[1,25,'idle']]){
  const [w,g,action]=it;assert(!api.selectVisual(save(w,g,'light'),{action,direction:'north',consumer:'world'})?.independentCarryGlove);
 }
 const compass=save(16,25,'light','strategist');
 assert.deepEqual(api.selectVisual(compass,{action:'idle',direction:'north',consumer:'world'}),bad.selectVisual(compass,{action:'idle',direction:'north',consumer:'world'}));
 assert.deepEqual({frames,selects},{frames:72,selects:48});
 console.log('PASS independent North gloves: 72 rendered phases, 48 selectors, protected visible weapon and unchanged old compass');
})().catch(e=>{console.error(e);process.exitCode=1;});
