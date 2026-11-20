const P=require('node:path'),a=require('node:assert/strict'),R=P.dirname(__dirname);
const {make,cv}=require(P.join(R,'tests/rework-integration-support.cjs')),A=require(P.join(R,'character-appearance.js')),load=require(P.join(R,'tools/rework-hd-test-loader.cjs')).create(R);
const api=make();
const I=def=>({def}),o={action:'attack-unarmed',direction:'north',consumer:'world'};
const actor=(equipment,look)=>JSON.parse(JSON.stringify(A.commit({id:'test',classId:'brawler',equipment},{gender:'feminino',...look},()=>true)));
const look=[{skinColor:'light',hairColor:'brown',eyeColor:'brown',hairStyle:'original'},{skinColor:'ebony',hairColor:'black',eyeColor:'green',hairStyle:'hair-bob'}];
const rgb=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
const alpha=async (f,hash)=>load('tools/'+f+'/assets/'+hash+'.png');
const region=(c,r,g)=>{const cx=c.getContext('2d');cx.drawImage(r,0,0);if(g)cx.drawImage(g,0,0);return rgb(c);};
async function hairSupport(base){
 const m=base.femaleNamedHairRecord,d=base.pack.directions.north,out=cv.createCanvas(640,640),x=out.getContext('2d');
 if(m.style==='original'){
  for(const l of m.ownership.attackLayers.filter(l=>l.slot==='hair'))x.drawImage(await alpha('rework-base-hd',l.source),0,0);
 }else{
  const s=m.source,v=global.ReworkAccessoryVendor;
  a.equal(s.package,'hair_user_adjustments_source-only_v1');a.equal(s.snapshot,'482be66cf0f31ab6f2abe823877cbbf8b0aeec31a9e4fc463a35c8a499ab8f98');
  const adjust=v.hairFemale.adjustment(s.adjustmentRecord.adjustment,s.entry,'north');
  const raw=new Map(await Promise.all(s.layers.filter(l=>l.slot==='hair').map(async l=>[l.source,await alpha('rework-accessories',l.source)])));
  const prepared=v.hairPreview.prepare(s.entry,'north',raw,adjust,cv.createCanvas),n=prepared.pack.directions.north;
  const temp=cv.createCanvas(512,512);v.compositor.render(temp.getContext('2d'),{...prepared.pack,directions:{north:{...n,layers:n.layers.filter(l=>l.slot==='hair')}}},prepared.images,{direction:'north',frame:0,density:4});
  const dx=Math.round((d.rest.NECK.x-s.rest.NECK.x)*4),dy=Math.round((d.rest.NECK.y-s.rest.NECK.y)*4);
  x.drawImage(temp,dx,dy);temp.width=1;
 }
 const pixels=rgb(out);out.width=1;return pixels;
}
(async()=>{await api.ready;let count=0;for(const l of look){
 const equipment={legs:I(168),head:I(157)},p=actor(equipment,l),pants=actor({legs:I(168)},l),helmet=actor({head:I(157)},l),plain=actor({},l);
 const hide={...p,preferences:{...p.preferences,hideHeadgear:true}},show={...hide,preferences:{...hide.preferences,hideHeadgear:false}},save=JSON.stringify(p);
 const r=api.selectVisual(p,o),t=api.selectVisual(pants,o),h=api.selectVisual(helmet,o),b=api.selectVisual(plain,o);
 a(r?.slotRoutes?.head?.item===157&&r?.slotRoutes?.legs?.item===168,'Missing saved H157+P168');a(t&&h&&b);
 a.deepEqual(r.authoredPunchPants.base,h);a.deepEqual(t.authoredPunchPants.base,b);
 a.deepEqual(r.authoredPunchPants.cloth,t.authoredPunchPants.cloth);a.equal(r.authoredPunchPants.index,t.authoredPunchPants.index);a.deepEqual(r.pack,t.pack);
 a.deepEqual(r.colorAppearance,t.colorAppearance);a.deepEqual(api.selectVisual(hide,o),t);a.deepEqual(api.selectVisual(show,o),r);
 a.equal(r.femaleNamedHairRecord.skinColor,l.skinColor);a.equal(r.femaleNamedHairRecord.eyeColor,l.eyeColor);a.equal(r.femaleNamedHairRecord.hairColor,l.hairColor);
 if(l.hairStyle==='hair-bob')a.equal(r.femaleNamedHairRecord.gearRecord.adjustmentRecord.adjustment.policy,'full');
 const claims=q=>q?.authoredPunchPants&&q?.slotRoutes?.head?.item===157;
 for(const [e,op,fields] of [[{coat:I(151)},o,{}],[{boots:I(155)},o,{}],[{gloves:I(26)},o,{}],[{weapon:I(114)},o,{}],[{legs:I(182)},o,{}],[{head:I(129)},o,{}],[{head:{def:157,variantId:'alt'}},o,{}],[{legs:{def:168,appearanceVariant:'alt'}},o,{}],[{},{...o,direction:'south'},{}],[{},{...o,action:'idle'},{}],[{},o,{hairStyle:'hair-spiky'}]]){
  a(!claims(api.selectVisual(actor({...equipment,...e},{...l,...fields}),op)));
 }
 if(process.env.SELECT_ONLY==='1')continue;
 const hair=await hairSupport(b);
 const binds=await Promise.all([[p,r],[pants,t],[helmet,h],[plain,b],[hide,t],[show,r]].map(async([player,source])=>[player,await api.prepareConfiguration([{player,source,options:o}],{resolve:x=>x})]));
 for(let f=0;f<8;f++){
  const [w,c,g,n,hidden,shown]=binds.map(([p,b])=>{let x;const ok=b.draw({save(){},restore(){},drawImage(t){x=t;}},p,{...o,progress:(f+.25)/8});a(ok);return rgb(x);});
  a(w.equals(shown));a(c.equals(hidden));
  const cloth=r.authoredPunchPants.cloth,shorts=b.pack.directions.north.layers[r.authoredPunchPants.index];
  const cvt=cv.createCanvas(640,640);
  const pantsMask=region(cvt,await alpha('rework-modular-outfits-hd',cloth.frames[f]),await alpha('rework-base-hd',shorts.frames?.[f]||shorts.source));
  const hands=b.pack.directions.north.layers.filter(x=>/^(left|right)-(upper|forearm|hand)$/.test(x.id));
  const hx=cvt.getContext('2d');hx.clearRect(0,0,640,640);
  for(const hand of hands)hx.drawImage(await alpha('rework-base-hd',hand.frames?.[f]||hand.source),0,0);const hand=pixOrRGB(cvt);
  let hd=0,cd=0,restored=0,handWitnesses=0;
  for(let i=0;i<w.length;i+=4){
   const v=w.readUInt32LE(i),c0=c.readUInt32LE(i),g0=g.readUInt32LE(i),n0=n.readUInt32LE(i);
   if(v!==c0){a.equal(v,g0);a.equal(c0,n0);a(!pantsMask[i+3]);hd++;if(hair[i+3]&&c[i+3])restored++;}
   if(v!==g0){a.equal(v,c0);a.equal(g0,n0);a(pantsMask[i+3]);cd++;}
   if(hand[i+3]&&!pantsMask[i+3]&&((i/4/640)|0)>=245){a.equal(v,c0);a.equal(g0,n0);handWitnesses++;}
  }
  a(hd>0&&cd>100&&restored>0&&handWitnesses>0,JSON.stringify({f,hd,cd,restored,handWitnesses}));cvt.width=1;count++;
 }
 binds.forEach(([,v])=>v.release());a.equal(JSON.stringify(p),save);global.gc?.();
}
if(process.env.SELECT_ONLY!=='1')a.equal(count,16);console.log('PASS two normalized Saves /',count,'Canvas H157 + P168');
})().catch(e=>{console.error(e);process.exitCode=1});
function pixOrRGB(c){return rgb(c);}
