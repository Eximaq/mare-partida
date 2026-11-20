const p=require('node:path'),a=require('node:assert/strict'),R=p.resolve(__dirname,'..'),{make,cv}=require(p.join(R,'tests/rework-integration-support.cjs')),w=make();
const load=require(p.join(R,'tools/rework-hd-test-loader.cjs')).create(R),db=require(p.join(R,'tools/rework-modular-outfits-hd/index.json')),
 old=require(p.join(R,'tools/rework-base-hd/index.json')),get=(f,h)=>load('tools/rework-'+f+'-hd/assets/'+h+'.png');
const pixels=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
const sample=(bundle,actor,options,tick)=>{let c;a(bundle.draw({save(){},restore(){},drawImage(x){c=x;}},actor,{...options,progress:(tick+.1)/8}));return c;};
const raw={gender:'feminino',hairStyle:'original',hairColor:'original',eyeStyle:'original',eyeColor:'original',skinColor:'original'};
(async()=>{await w.ready;let frames=0;
const profiles=[{}, {skinColor:'ebony',hairStyle:'hair-bob',hairColor:'pink',eyeStyle:'face-calm',eyeColor:'green'}];
for(const direction of ['south','north','east','west']){
const o={direction,action:'attack-unarmed',consumer:'world'}, id='female-pants168-attack-unarmed-'+direction,
 donor=db.records.find(r=>r.id===id), origin=old.records.find(r=>r.id===donor.adaptation.targetBase),d=donor.pack.directions[direction],
 cloth=d.layers.find(l=>l.id==='pants168-independent'),shorts=origin.pack.directions[direction].layers.find(l=>l.id==='shorts');
const pair=(appearance96,equipment)=>({classId:'brawler',appearance96,equipment});
const bun=async player=>{const source=w.selectVisual(player,o);a(source);return await w.prepareConfiguration([{player,options:o,source}],{resolve:x=>x});};
const literal=pair(raw,{legs:{def:168}});a.equal(w.selectVisual(literal,o).id,id);
const lp=await bun(literal);
const paletteBuf=new Map();
for(const [profile,fields]of profiles.entries()){
 const look=global.MareCharacterAppearance.normalize({gender:'feminino',...fields}),bare=pair(look,{}),dressed=pair(look,{legs:{def:168}}),save=JSON.stringify(dressed),
  bareSource=w.selectVisual(bare,o),match=w.selectVisual(dressed,o),b=await bun(bare),q=await bun(dressed);
 a.deepEqual(match.authoredPunchPants?.base,bareSource);a.deepEqual(match.authoredPunchPants?.cloth,cloth);
 a.deepEqual(match.pack,bareSource.pack);a.deepEqual(match.colorAppearance,bareSource.colorAppearance);
 a.deepEqual(match.omitted,[]);a.equal(match.slotRoutes.legs.item,168);
 for(let j=0;j<8;j++){
  const b0=sample(b,bare,o,j),s1=pixels(sample(q,dressed,o,j)),s0=pixels(b0),lit=pixels(sample(lp,literal,o,j)),
   pngC=await get('modular-outfits',cloth.frames[j]),pngS=await get('base',shorts.frames[j]);
  const canvas=cv.createCanvas(b0.width,b0.height),x=canvas.getContext('2d');
  x.drawImage(pngC,0,0);const own=pixels(canvas);x.drawImage(pngS,0,0);const mask=pixels(canvas);let diff=0,clothPixels=0;
  for(let i=0;i<s0.length;i+=4){
   if(s0.readUInt32LE(i)!==s1.readUInt32LE(i)){a(mask[i+3],`${direction}/${j}/${i} outside shorts/pants`);diff++;}
   if(own[i+3]===255&&lit.readUInt32LE(i)===own.readUInt32LE(i)){
    a.equal(s1.readUInt32LE(i),lit.readUInt32LE(i),'opaque visible cloth unexpectedly recolored');clothPixels++;
   }
  }
  a(diff>100&&clothPixels>100);frames++;canvas.width=1;
  if(profile===0)paletteBuf.set(j,s1);
  else a.notDeepEqual(s1,paletteBuf.get(j),'skin or saved cosmetics did not survive');
 }
 a.equal(JSON.stringify(dressed),save);
 for(const e of [{legs:{def:182}},{legs:{def:168,variant:'other'}},{legs:{def:168},boots:{def:9}},{legs:{def:168},weapon:{def:2}},{legs:{def:168},head:{def:129}},{legs:{def:168},gloves:{def:152}}]){
  a(!w.selectVisual(pair(look,e),o)?.authoredPunchPants);
 }
 q.release();b.release();console.log(direction,look.skinColor,8);
}
lp.release();
}
a.equal(frames,64);console.log('PASS',frames);
})().catch(e=>{console.error(e);process.exitCode=1;});
