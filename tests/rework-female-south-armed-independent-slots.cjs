'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const repo=process.argv[2]||path.resolve(__dirname,'..');
if(process.env.KAIZOKU_CANDIDATE){
 const file=repo+'/player-rework-native-hd.js',m=new Module(file,module);m.filename=file;m.paths=Module._nodeModulePaths(repo);require.cache[file]=m;
 m._compile(fs.readFileSync(process.env.KAIZOKU_CANDIDATE,'utf8'),file);
}
const {make,cv}=require(repo+'/tests/rework-integration-support.cjs'),A=require(repo+'/character-appearance');
const load=require(repo+'/tools/rework-hd-test-loader.cjs').create(repo);
const o={consumer:'world',direction:'south',action:'walk'}, ticks=[0,5,10,15,18,20,25,30,35,38];
const px=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
const draw=(b,p,t)=>{let c;assert(b.draw({save(){},restore(){},drawImage(im){c=im;}},p,{...o,time:(t+.1)/40}));return c;};
const asset=h=>load('tools/rework-modular-outfits-hd/assets/'+h+'.png');
const add=(c,im,pad)=>c.getContext('2d').drawImage(im,pad,pad);
(async()=>{
 const w=make();await w.ready;let n=0;
 for(const [weapon,cl,p0,p1,boot] of [[0,'sword',21,182,null],[5,'gunner',21,168,null],[17,'strategist',21,168,155],[17,'strategist',168,168,9],[17,'strategist',168,168,176]])for(const skinColor of ['light','ebony']){
  const off=A.commit({classId:cl,equipment:{weapon:{def:weapon},legs:{def:p0}}},{gender:'feminino',hairStyle:'hair-cropped',hairColor:'black',eyeColor:'blue',eyeStyle:'original',skinColor},()=>true);
  const on={...off,equipment:{...off.equipment,legs:{def:p1},...(boot==null?{}:{boots:{def:boot}})}};
  const [r0,r1]=[off,on].map(p=>w.selectVisual(p,o));
  assert(r0?.carrySouth&&r1?.carrySouth);assert.equal(r1.slotRoutes.weapon.item,weapon);assert.equal(r1.slotRoutes.legs.item,p1);
  if(boot!=null)assert.equal(r1.slotRoutes.boots.item,boot);
  assert.deepEqual(r0.carrySouth.states,r1.carrySouth.states);assert.deepEqual(r0.colorAppearance,r1.colorAppearance);
  assert.deepEqual(r0.pack.directions.south,r1.pack.directions.south);assert.deepEqual(r1.omitted,[]);
  const a=await w.prepareConfiguration([{player:off,options:o}]),b=await w.prepareConfiguration([{player:on,options:o}]);
  try{
   assert.equal(a.coverage[0].frames,40);assert.equal(b.coverage[0].frames,40);
   for(const [k,t] of ticks.entries()){
    const c0=draw(a,off,t),c1=draw(b,on,t),pad=r1.carrySouth.paddingPhysical||0;
    const d0=px(c0),d1=px(c1),mask=cv.createCanvas(c0.width,c0.height),spec=r1.authoredPantsLayer.spec;
    if(p0!==p1)for(const h of [p0,p1].flatMap(p=>Object.values(spec.items[p][k])))add(mask,await asset(h),pad);
    for(const l of r1.authoredPantsLayer.layers.filter(l=>l.slot==='boots'))add(mask,await asset(l.frames[k]),pad);
    const m=px(mask);let changed=0;
    for(let j=0;j<d0.length;j+=4)if(d0.readUInt32LE(j)!==d1.readUInt32LE(j)){assert(m[j+3]>0,`outside ${weapon}/${p1}/${boot}/${k} at (${(j/4)%c0.width},${Math.floor(j/4/c0.width)})`);changed++;}
    assert(changed>500);assert(px(draw(a,off,t)).equals(d0));
    // Every original hold tick uses the same authored phase object.
    for(let v=t+1;v<40&&spec.frameToPhase[v]===k;v++)assert(draw(b,on,v)===c1);
    if(process.env.PREVIEW&&skinColor==='ebony'&&k===5)fs.writeFileSync(__dirname+`/world-${weapon}-${p1}-${boot}.png`,c1.toBuffer('image/png'));
    n++;
   }
  } finally {a.release();b.release();}
  global.gc?.();
  console.log('SWAP',weapon,p0,p1,boot,skinColor,n);
 }
 assert.equal(n,100);
})().catch(e=>{console.error(e);process.exitCode=1});
