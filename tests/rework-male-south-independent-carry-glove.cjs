'use strict';
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const R=path.resolve(process.env.KAIZOKU_REPO||path.join(__dirname,'..')),get=f=>require(R+'/'+f);
if(process.env.TRIAL_JS){
 const M=require('node:module'),f=R+'/player-rework-native-hd.js',m=new M(f);
 m.filename=f;m.paths=M._nodeModulePaths(R);m._compile(fs.readFileSync(process.env.TRIAL_JS,'utf8'),f);m.loaded=true;require.cache[f]=m;
}
const {make,cv}=get('tests/rework-integration-support.cjs'),A=get('character-appearance.js');
const api=make(process.env.TRIAL_CERT?{fetchJSON:async f=>JSON.parse(fs.readFileSync(f.endsWith('/south-glove-visible-support.json')?process.env.TRIAL_CERT:R+'/'+f))}:{});
const load=get('tools/rework-hd-test-loader.cjs').create(R), V=global.ReworkAccessoryVendor.compositor;
const routes=[[4,'gunner',152],[16,'strategist',26],[16,'strategist',131],[16,'strategist',138],[16,'strategist',145],
 [16,'strategist',166],[16,'strategist',180],[31,'healer',159],[31,'healer',173]];
const pixels=c=>new Uint32Array(c.getContext('2d').getImageData(0,0,c.width,c.height).data.buffer);
const frame=(r,p,o,k,n)=>{let c;assert(r.draw({save(){},restore(){},drawImage(x){c=x;}},p,{...o,progress:(k+.25)/n}));return c;};
(async()=>{
 await api.ready;let renders=0,selections=0;
 for(const [weapon,classId,gloves] of routes)for(const action of ['idle','walk'])for(const skinColor of Object.keys(A.skins)){
  const o={consumer:'world',direction:'south',action},p={classId,appearance96:A.normalize({gender:'masculino',skinColor}),equipment:{weapon:{def:weapon}}};
  const on={...p,equipment:{...p.equipment,gloves:{def:gloves}}},save=JSON.stringify(on),
   base=api.selectVisual(p,o),selected=api.selectVisual(on,o),q=selected?.independentCarryGlove;
  assert(q,'independent glove could not be applied '+[weapon,gloves,skinColor,action]);
  assert.deepEqual(q.base,base);assert.deepEqual(selected.plan,base.plan);assert.deepEqual(selected.colorAppearance,base.colorAppearance);
  assert.equal(selected.slotRoutes.weapon.source,base.id);assert.equal(selected.slotRoutes.gloves.item,gloves);
  assert.deepEqual(selected.omitted,[]);
  assert(!api.selectVisual({...on,classId:classId==='sword'?'gunner':'sword'},o)?.independentCarryGlove);
  assert(!api.selectVisual({...on,equipment:{...on.equipment,gloves:{def:25}}},o)?.independentCarryGlove,'grip overlap should reject G25');
  selections++;
  if(!['light','ebony'].includes(skinColor))continue;
  const bare=await api.prepareConfiguration([{player:p,options:o}]),own=await api.prepareConfiguration([{player:on,options:o}]);
  const t=cv.createCanvas(512,512),ctx=t.getContext('2d'),d=base.pack.directions.south,pad=base.plan.paddingPhysical??0,n=d.clip.frames;
  const imgs=new Map(await Promise.all(q.hashes.map(async h=>[h,await load('tools/rework-modular-outfits-hd/assets/'+h+'.png')])));
  try{
   for(let i=0;i<n;i++){
    ctx.clearRect(0,0,512,512);
    V.render(ctx,{...base.pack,directions:{south:{...d,layers:q.gloves}}},imgs,{direction:'south',density:4,frame:i});
    const stock=frame(bare,p,o,i,n),a=pixels(stock),b=pixels(frame(own,on,o,i,n)),mask=pixels(t);
    let delta=0;
    for(let j=0;j<a.length;j++)if(a[j]!==b[j]){
     const x=(j%stock.width)-pad,y=(j/stock.width|0)-pad;
     assert(x>=0&&x<512&&y>=0&&y<512&&(mask[y*512+x]>>>24),'pixel changed beyond declared glove');
     delta++;
    }
    assert(delta>100);renders++;
   }
   assert.equal(JSON.stringify(on),save);
  }finally{bare.release();own.release();t.width=1;global.gc?.();}
 }
 console.log('PASS independent South carry gloves',selections,'selections and',renders,'Clear/Ebony frames');
})().catch(e=>{console.error(e);process.exitCode=1});
