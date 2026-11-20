const p=require('node:path'),a=require('node:assert/strict'),r=p.resolve(__dirname,'..'),{make,cv}=require(p.join(r,'tests/rework-integration-support.cjs')),api=make(),base=api;
const load=require(p.join(r,'tools/rework-hd-test-loader.cjs')).create(r);
const o={action:'idle',direction:'north',consumer:'world'},data=c=>Buffer.from(c.getContext('2d').getImageData(0,0,512,512).data);
async function draw(w,actor,opts=o){
const q=w.selectVisual(actor,opts);a(q,JSON.stringify(actor));const b=await w.prepareConfiguration([{player:actor,options:opts,source:q}],{resolve:x=>x});let c;a(b.draw({save(){},restore(){},drawImage(x){c=x;}},actor,{...opts,progress:0}));const out=data(c);b.release();return out;}
function paint(ctx,b){const data=ctx.createImageData(512,512);data.data.set(b);ctx.putImageData(data,0,0);}
const image=buf=>{const s=cv.createCanvas(512,512);paint(s.getContext('2d'),buf);return s;};
function only(u,v,domain){
 let delta=0;for(let i=0;i<u.length;i+=4)if(u.readUInt32LE(i)!==v.readUInt32LE(i)){delta++;a(domain[i+3],'pixel outside owning slot '+i);}
 a(delta>0);return delta;
}
(async()=>{await Promise.all([api.ready,base.ready]);let frames=0;const baselinePairs=new Map;
const looks=[global.MareCharacterAppearance.normalize({gender:'feminino'}),...Object.keys(global.MareCharacterAppearance.skins).map(skinColor=>global.MareCharacterAppearance.normalize({gender:'feminino',skinColor,hairStyle:'hair-bob',hairColor:'pink',eyeColor:'green',eyeStyle:'face-calm'}))];
for(const [j,appearance96]of looks.entries()){
const actor=e=>({classId:'brawler',appearance96,equipment:Object.fromEntries(Object.entries(e).map(([k,def])=>[k,{def}]))});
const boot=actor({boots:9}),br=base.selectVisual(boot,o),bm=await draw(base,boot),bl=br.fixedIdleBoots.layers,canvas=cv.createCanvas(512,512),c=canvas.getContext('2d');
const tiles=await Promise.all(bl.map(l=>load('tools/rework-modular-outfits-hd/assets/'+l.frames[0]+'.png')));
for(const t of tiles)c.drawImage(t,0,0);
const domain=data(canvas);c.clearRect(0,0,512,512);for(const [i,t]of tiles.entries())if(bl[i].depth===45)c.drawImage(t,0,0);const front=data(canvas);let bottom=0;for(let i=0;i<domain.length;i+=4)if(domain[i+3])bottom=Math.floor(i/2048);
for(const legs of [168,182]){
const p=actor({legs}),q=actor({legs,boots:9}),save=JSON.stringify(q),pr=base.selectVisual(p,o),qr=api.selectVisual(q,o);a(qr?.fixedIdleBoots);
a.deepEqual(qr.fixedIdleBoots.layers,bl);a.deepEqual(qr.pack,pr.pack);a.deepEqual(qr.colorAppearance,pr.colorAppearance);
a.deepEqual(qr.omitted,[]);a.equal(qr.slotRoutes.boots.item,9);a.equal(qr.slotRoutes.legs.item,legs);
const pm=await draw(base,p),qm=await draw(api,q),bootChanges=only(pm,qm,domain);
const pa=pr.authoredNorthIdlePants,garment=await load('tools/rework-modular-outfits-hd/assets/'+pa.cloth+'.png'),owner=await load('tools/rework-modular-outfits-hd/assets/'+pa.ownerAlpha+'.png');
c.clearRect(0,0,512,512);c.drawImage(garment,0,0);const cloth=data(canvas);c.clearRect(0,0,512,512);c.drawImage(owner,0,0);const skin=data(canvas);
for(let i=0;i<cloth.length;i+=4)if(skin[i+3])cloth[i+3]=0;
const pantChanges=only(bm,qm,cloth);
let seam=0,sole=0;for(let i=0;i<domain.length;i+=4)if(domain[i+3]){
 if(Math.floor(i/2048)>=bottom-15&&qm.readUInt32LE(i)!==bm.readUInt32LE(i))sole++;
 if(cloth[i+3])seam++;
}
a.equal(sole,0,'pant alters boot sole');a(seam>=1);
if(j===0)baselinePairs.set(legs,qm);
let seamPalette=0,colDelta=0,weak=0;const first=baselinePairs.get(legs);
for(let i=0;i<domain.length;i+=4)if(domain[i+3]&&cloth[i+3]&&qm.readUInt32LE(i)!==first.readUInt32LE(i)){seamPalette++;colDelta=Math.max(colDelta,...[0,1,2].map(k=>Math.abs(qm[i+k]-first[i+k])));a.equal(qm[i+3],first[i+3]);if(front[i+3]===255||cloth[i+3]===255)weak++;}
a(weak<=1&&colDelta<=(legs===168?2:3),'seam palette energy exceeds existing antialias tolerance');
a.equal(JSON.stringify(q),save);
for(const bad of [{boots:169,legs},{legs:147,boots:9},{legs,boots:9,coat:151},{legs,boots:9,head:129},{legs,boots:9,gloves:152}])a(!api.selectVisual(actor(bad),o)?.id.includes('idle-north-frame0:fixed'));
frames++;console.log(legs,appearance96.skinColor,'boot',bootChanges,'pants',pantChanges,'seam',seam,'sole',sole,'seam palette blends',seamPalette,'max',colDelta);
}}
a.equal(frames,18);console.log('PASS',frames);
})().catch(e=>{console.error(e);process.exitCode=1});
