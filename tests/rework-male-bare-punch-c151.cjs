'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const repo=process.argv[2]||path.resolve(__dirname,'..');
if(process.env.KAIZOKU_CANDIDATE){
 const file=repo+'/player-rework-native-hd.js',m=new Module(file,module);m.filename=file;m.paths=Module._nodeModulePaths(repo);require.cache[file]=m;
 m._compile(fs.readFileSync(process.env.KAIZOKU_CANDIDATE,'utf8'),file);
}
const {make,cv}=require(repo+'/tests/rework-integration-support.cjs'),A=require(repo+'/character-appearance');
const load=require(repo+'/tools/rework-hd-test-loader.cjs').create(repo);
const o={consumer:'world',direction:'north',action:'attack-unarmed'}, ticks=[0,5,8,10,15,18,20,25,28,30,35,38];
const px=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
const V=global.ReworkAccessoryVendor.compositor;
const draw=(b,p,o,k)=>{let c;assert(b.draw({save(){},restore(){},drawImage(im){c=im;}},p,{...o,progress:(k+.25)/8}));return c;};
(async()=>{
 const w=make();await w.ready;
 const states=process.argv[4]?[process.argv[4]]:Object.keys(A.skins),dir=process.argv[3]||'south',o1={...o,direction:dir};
 for(const skinColor of states){
  const off=JSON.parse(JSON.stringify(A.commit({classId:'brawler',equipment:{legs:null,coat:null,boots:null,gloves:null,head:null,weapon:null}},{gender:'masculino',skinColor},()=>true)));
  const on={...off,equipment:{...off.equipment,coat:{def:151}}};
  const b=w.selectVisual(off,o1),r=w.selectVisual(on,o1),f=w.selectVisual(on,{...o1,action:'attack'});assert(r?.barePunchOwnCoat,[dir,skinColor,r?.id]);assert.equal(f?.resolvedAction,'attack-unarmed');
  assert.deepEqual(r.colorAppearance,b.colorAppearance);assert.equal(r.slotRoutes.coat.item,151);assert.deepEqual(r.omitted,[]);
  const d=r.pack.directions[dir],ba=b.pack.directions[dir],part=r.barePunchOwnCoat.cloth;
  assert.deepEqual(d.layers.filter(x=>x!==part),ba.layers);assert.deepEqual(d.clip,ba.clip);assert.deepEqual(d.rest,ba.rest);assert.deepEqual(d.poses,ba.poses);
  const onCfg=await w.prepareConfiguration([{player:on,options:o1}]),offCfg=await w.prepareConfiguration([{player:off,options:o1}]);
  const snapshot=JSON.stringify(on);let changed=0,count=0;const hist=[],stock=[];
  try{for(let k=0;k<8;k++){
   const x=draw(offCfg,off,o1,k),y=draw(onCfg,on,o1,k),a=px(x),z=px(y);stock.push(a);
   const image=await load('tools/rework-modular-outfits-hd/assets/'+part.frames[k]+'.png'),n=cv.createCanvas(x.width,x.height),nc=n.getContext('2d');
   assert.equal(image.width,x.width);assert.equal(image.height,x.height);nc.drawImage(image,0,0);const mask=px(n);let hit=0;
   for(let j=0;j<a.length;j+=4){
    if(a[j+3]>z[j+3])throw Error('Native silhouette lost alpha '+dir+'/'+k+'/'+j/4);
    if(a.readUInt32LE(j)!==z.readUInt32LE(j)){assert(mask[j+3],`changed pixel outside chest piece ${dir}/${skinColor}/${k}/${j/4}`);hit++;}
   }
   if(process.env.PREVIEW&&['light','ebony'].includes(skinColor))fs.writeFileSync(__dirname+`/${dir}-${skinColor}-${k}.png`,y.toBuffer('image/png'));
   assert(hit>1000);count++;changed+=hit;hist.push(hit);n.width=1;
  }}finally{onCfg.release();offCfg.release();}
  assert.equal(JSON.stringify(on),snapshot);on.equipment.coat=null;
  const restored=await w.prepareConfiguration([{player:on,options:o1}]);
  try{for(let k=0;k<8;k++)assert(px(draw(restored,on,o1,k)).equals(stock[k]),'exact unequip');}finally{restored.release();}
  assert.equal(count,8);console.log('PASS',dir,skinColor,changed,count,JSON.stringify(hist));global.gc?.();
 }
})().catch(e=>{console.error(e);process.exitCode=1});
