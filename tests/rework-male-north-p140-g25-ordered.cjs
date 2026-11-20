const a=require('node:assert/strict'),p=require('node:path'),fs=require('node:fs'),crypto=require('node:crypto'),R=p.dirname(__dirname),{cv}=require(p.join(R,'tests/rework-integration-support.cjs'));
const load=require(p.join(R,'tools/rework-hd-test-loader.cjs')).create(R),A=require(p.join(R,'character-appearance.js')),v=global.ReworkAccessoryVendor.compositor;
const api=require(p.join(R,'player-rework-native-hd.js')).create({fetchJSON:async f=>JSON.parse(fs.existsSync(p.join(R,f))?fs.readFileSync(p.join(R,f)):require('node:zlib').gunzipSync(fs.readFileSync(p.join(R,f+'.gz')))),loadImage:load,makeCanvas:cv.createCanvas});
const asset=h=>'tools/rework-modular-outfits-hd/assets/'+h+'.png';
const I=def=>({def}),d=x=>x.pack.directions.north,pix=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
const actor=(pants,boot,skin)=>JSON.parse(JSON.stringify(A.commit({id:'same-actor',classId:'fighter',equipment:{coat:I(151),legs:I(pants),gloves:I(25),...(boot?{boots:I(155)}:{})}},{skinColor:skin,hairColor:'black',eyeColor:'blue'},()=>true)));
async function ownVisible(r,f){
 a(!r.bodyOcclusion&&!r.sourceRasterPadding&&!r.mirrorLayerIDs&&!d(r).headgearPolicy&&!d(r).renderMirrorFrom);
 const stack=v.plan(r.pack,'north',f),t=stack.filter(x=>/^glove25-north-/.test(x.id));a.equal(t.length,2);
 const renderLayer=async l=>{
  const c=cv.createCanvas(512,512);const img=await load(asset(l.source));
  v.render(c.getContext('2d'),{...r.pack,directions:{north:{...d(r),layers:[l]}}},new Map([[l.source,img]]),{direction:'north',frame:f,density:4});
  return c;
 };
 const rows=[];
 for(const g of t){
  a(!r.paletteSourceMasks[g.source]&&!r.baseMaterialSources[g.source]);
  const c=await renderLayer(g),ctx=c.getContext('2d');ctx.globalCompositeOperation='destination-out';
  const above=stack.slice(stack.indexOf(g)+1);
  for(const l of above){const z=await renderLayer(l);ctx.drawImage(z,0,0);z.width=1;}
  const data=pix(c);c.width=1;let solid=0,partial=0;
  for(let i=3;i<data.length;i+=4){if(data[i]===255)solid++;else if(data[i]>0)partial++;}
  a(solid>0||partial>0);
  rows.push({data,id:g.id,source:g.source,matrix:g.matrix,depth:g.depth,rgba:crypto.createHash('sha256').update(data).digest('hex'),solid,partial});
 }
 return rows;
}
(async()=>{await api.ready;const rows=[];
 for(const action of ['idle','walk'])for(const skin of ['porcelain','ebony'])for(const boot of [0,155]){
  const o={action,direction:'north',consumer:'world'},x=api.selectVisual(actor(140,boot,skin),o),y=api.selectVisual(actor(133,boot,skin),o);
  a(x.id.includes(':p140-g25-owned:')); a.equal(y.slotRoutes.gloves.item,25);a.equal(x.slotRoutes?.boots?.item,boot||undefined);
  for(let f=0;f<d(x).clip.frames;f++){
   const candidate=await ownVisible(x,f),control=await ownVisible(y,f);
   a.deepEqual(candidate,control,[action,skin,boot,f].join('/'));
   rows.push({action,skin,boot,f,gloves:candidate.map(({data,...log})=>log)});
  }
  global.gc?.();
 }
 a.equal(rows.length,68);a(rows.some(r=>r.gloves.some(q=>q.partial>0)));console.log('PASS 68 ordered glove pairs without losing either matte');
})().catch(e=>{console.error(e);process.exitCode=1});
