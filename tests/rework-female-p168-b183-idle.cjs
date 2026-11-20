const p=require('node:path'),fs=require('fs'),a=require('node:assert/strict');
const root=process.env.KAIZOKU_REPO||p.resolve(__dirname,'..');
const {make,cv}=require(p.join(root,'tests/rework-integration-support.cjs'));const orig=make(),loader=require(p.join(root,'tools/rework-hd-test-loader.cjs')).create(root);
const api=require(process.env.KAIZOKU_SELECTOR||p.join(root,'player-rework-native-hd.js')).create({fetchJSON:async f=>JSON.parse(fs.existsSync(p.join(root,f))?fs.readFileSync(p.join(root,f)):require('node:zlib').gunzipSync(fs.readFileSync(p.join(root,f+'.gz')))),loadImage:loader,makeCanvas:cv.createCanvas});
const o={action:'idle',direction:'south',consumer:'world'};
const draw=async(api,player,options=o)=>{
 const source=api.selectVisual(player,options);a(source,JSON.stringify([player,options]));
 const q=await api.prepareConfiguration([{player,options,source}],{resolve:x=>x});
 let c;a(q.draw({save(){},restore(){},drawImage(t){c=t;}},player,{...options,progress:0}));const b=c.getContext('2d').getImageData(0,0,512,512).data;q.release();return [source,Buffer.from(b)];
};
const catalog=require(p.join(root,'tools/rework-modular-outfits-hd/index.json'));
const assertDonor=(r,boot)=>{
 const d=catalog.records.find(x=>x.id==='frozen-v47-female-151-boot'+boot+'-south-idle').pack.directions.south;
 for(const l of r.authoredPantsLayer.layers){
  const expected=d.layers.find(x=>x.id===l.id);a(expected);
  a.equal(l.frames[0],expected.frames[0]);a.equal(l.depth,expected.depth);
 }
};
const src='tools/rework-modular-outfits-hd/assets/';
const mask=async (...hashes)=>{const c=cv.createCanvas(512,512),t=c.getContext('2d');for(const h of hashes)t.drawImage(await loader(src+h+'.png'),0,0);return t.getImageData(0,0,512,512).data;};
const feet=(x,y,alpha,owner)=>{let n=0;for(let k=0;k<x.length;k+=4)if(x.readUInt32LE(k)!==y.readUInt32LE(k)){a(alpha[k+3]&&!(owner?.[k+3]),'unauthorized '+((k/4)%512)+','+Math.floor(k/2048));n++;}return n;};
(async()=>{await Promise.all([orig.ready,api.ready]);const normal=global.MareCharacterAppearance.normalize;
const sameSkin=new Map(),seam=new Map();for(const appearance96 of [{gender:'feminino'},...Object.keys(global.MareAppearance96.skins).filter(k=>k!=='original').map(skinColor=>({gender:'feminino',skinColor,hairStyle:'hair-bob',hairColor:'pink',eyeStyle:'face-calm',eyeColor:'green'}))].map(normal)){
 const actor=(pants,boots)=>({classId:'brawler',appearance96,equipment:{...(pants?{legs:{def:pants}}:{}),...(boots?{boots:{def:boots}}:{})}});
 const [,base]=await draw(api,actor());const [,pants]=await draw(api,actor(168));const [,old]=await draw(orig,actor(168));a(pants.equals(old));
 for(const boot of [183]){
  const [r,both]=await draw(api,actor(168,boot)),[q,bootOnly]=await draw(api,actor(null,boot));
  a.equal(q.authoredPantsLayer.item,null);a.equal(r.authoredPantsLayer.item,168);a.equal(r.equipment.boots,183);
  const [ref,control]=await draw(api,actor(168,176));a.equal(ref.equipment.boots,176);
  seam.set(appearance96.skinColor,{both,pants,control});
  assertDonor(q,boot);
  const B=await mask(...q.authoredPantsLayer.layers.map(l=>l.frames[0])),spec=q.authoredPantsLayer.spec.items[168][0],P=await mask(spec.cloth),O=await mask(spec.ownerAlpha);
  for(const [other,options] of [[actor(182,176),o],[actor(147,176),o],[actor(168,9),o],[{...actor(168,176),equipment:{legs:{def:168},pants:{def:168},boots:{def:176}}},o],[{...actor(168,176),equipment:{legs:{def:168},boots:{def:176},head:{def:19}}},o],[actor(168,183),{...o,direction:'east'}],[actor(168,183),{...o,action:'attack-unarmed'}],[actor(168,183),{...o,action:'walk'}]])
   a(!api.selectVisual(other,options)?.id.includes(':idle-phase0'),'route escaped accepted pose/slots');
  let bottom=0;for(let i=0;i<B.length;i+=4)if(B[i+3])bottom=Math.floor(i/2048);
  const prev=sameSkin.get(boot);if(!prev)sameSkin.set(boot,[both,bootOnly]);else for(const [i,now] of [both,bootOnly].entries()){
   const then=prev[i];
   for(let k=(bottom-15)*2048;k<B.length;k+=4)if(B[k+3]){
    a.equal(now[k+3],then[k+3],'skin shade changed sole silhouette');
    for(let j=0;j<3;j++)a(Math.abs(now[k+j]-then[k+j])<=3,'sole material reacts visibly to skin shade');
   }
  }
  const n0=feet(bootOnly,base,B),n1=feet(both,pants,B),n2=feet(both,bootOnly,P,O);
  a((await draw(api,actor(168)))[1].equals(pants));
  a((await draw(api,actor(null,boot)))[1].equals(bootOnly));
  a((await draw(api,actor()))[1].equals(base));
  for(const other of [{...actor(168,183),equipment:{legs:{def:168},boots:{def:183,variant:'alternate'}}},actor(182,183),actor(147,183)]){
   a(!api.selectVisual(other,o)?.id.includes(':b183-source'),'route escaped seam/variant contract');
  }
  console.log(appearance96.skinColor,boot,n0,n1,n2);
 }
}
 const L=seam.get('porcelain'),D=seam.get('ebony');let gained=0;
 for(let y=303;y<512;y++)for(let x=100;x<400;x++){
  const k=(y*512+x)*4,delta=which=>Math.max(...[0,1,2].map(j=>Math.abs(L[which][k+j]-D[which][k+j])));
  if(delta('both')>3&&delta('control')<=3&&delta('pants')>3)gained++;
 }
 a.equal(gained,0,'new skin leak around hem relative to B176');
 console.log('P168 cuff check: no new skin response >3/255');
})().catch(e=>{console.error(e);process.exitCode=1});
