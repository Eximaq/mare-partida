if(!process.env.DIR){
 for(const side of ['east','west']){
  const q=require('node:child_process').spawnSync(process.execPath,['--expose-gc',__filename],{stdio:'inherit',env:{...process.env,DIR:side}});
  if(q.error)throw q.error;
  if(q.status!==0)process.exit(q.status??1);
 }
 process.exit(0);
}
const P=require('node:path'),a=require('node:assert/strict'),R=P.dirname(__dirname);
const {make,cv}=require(P.join(R,'tests/rework-integration-support.cjs')),A=require(P.join(R,'character-appearance.js')),load=require(P.join(R,'tools/rework-hd-test-loader.cjs')).create(R);
const api=make();
const dir=process.env.DIR; a(['east','west'].includes(dir));const I=def=>({def}),o={action:'attack-unarmed',direction:dir,consumer:'world'};
const actor=(equipment,look)=>JSON.parse(JSON.stringify(A.commit({id:'test',classId:'brawler',equipment},{gender:'feminino',...look},()=>true)));
const look=[{skinColor:'light',hairColor:'brown',eyeColor:'brown',hairStyle:'original'},{skinColor:'ebony',hairColor:'black',eyeColor:'green',hairStyle:'hair-bob'}];
const rgb=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
const alpha=async (f,hash)=>load('tools/'+f+'/assets/'+hash+'.png');
const region=(c,r,g)=>{const cx=c.getContext('2d');cx.drawImage(r,0,0);if(g)cx.drawImage(g,0,0);return rgb(c);};
async function hairSupport(base){
 const m=base.femaleNamedHairRecord,d=base.pack.directions[dir],out=cv.createCanvas(640,640),x=out.getContext('2d');
 if(m.style==='original'){
  for(const l of m.ownership.attackLayers.filter(l=>l.slot==='hair'))x.drawImage(await alpha('rework-base-hd',l.source),0,0);
 }else{
  const s=m.source,v=global.ReworkAccessoryVendor;
  a.equal(s.package,'hair_user_adjustments_source-only_v1');a.equal(s.snapshot,'482be66cf0f31ab6f2abe823877cbbf8b0aeec31a9e4fc463a35c8a499ab8f98');
  const adjust=v.hairFemale.adjustment(s.adjustmentRecord.adjustment,s.entry,dir);
  const raw=new Map(await Promise.all(s.layers.filter(l=>l.slot==='hair').map(async l=>[l.source,await alpha('rework-accessories',l.source)])));
  const prepared=v.hairPreview.prepare(s.entry,dir,raw,adjust,cv.createCanvas),n=prepared.pack.directions[dir];
  const temp=cv.createCanvas(512,512);v.compositor.render(temp.getContext('2d'),{...prepared.pack,directions:{[dir]:{...n,layers:n.layers.filter(l=>l.slot==='hair')}}},prepared.images,{direction:dir,frame:0,density:4});
  const dx=Math.round((d.rest.NECK.x-s.rest.NECK.x)*4),dy=Math.round((d.rest.NECK.y-s.rest.NECK.y)*4);
  x.drawImage(temp,dx,dy);temp.width=1;
 }
 return out;
}
function projectHead(r,raw,f){
 const pack=r.pack,d=pack.directions[dir],h=d.layers.find(x=>x.slot==='headBase'),k='own-proof-material';
 const layer={...h,frames:undefined,source:k},out=cv.createCanvas(640,640);
 global.ReworkAccessoryVendor.compositor.render(out.getContext('2d'),{...pack,directions:{[dir]:{...d,layers:[layer]}}},new Map([[k,raw]]),{direction:dir,frame:f,density:4});
 const pix=rgb(out);out.width=1;return pix;
}
(async()=>{await api.ready;let count=0;const skinReference=[];for(const l of look){
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
 for(const [e,op,fields] of [[{coat:I(151)},o,{}],[{boots:I(155)},o,{}],[{gloves:I(26)},o,{}],[{weapon:I(114)},o,{}],[{legs:I(182)},o,{}],[{head:I(129)},o,{}],[{head:{def:157,variantId:'alt'}},o,{}],[{legs:{def:168,appearanceVariant:'alt'}},o,{}],[{},{...o,direction:'north',action:'walk'},{}],[{},{...o,action:'idle'},{}],[{},o,{hairStyle:'hair-spiky'}]]){
  a(!claims(api.selectVisual(actor({...equipment,...e},{...l,...fields}),op)));
 }
 const anatomy=b.pack.directions[dir].layers,skin=global.MareNativeSkinHD;
 a.equal(skin.ownership(anatomy.filter(l=>l.id==='legs-base')),'anatomy');
 a.equal(skin.ownership(anatomy.filter(l=>/^(left|right)-(upper|forearm|hand)$/.test(l.id))),'anatomy');
 if(process.env.SELECT_ONLY==='1')continue;
 const hairTile=await hairSupport(b), irisLayer=b.femaleNamedHairRecord.ownership.attackLayers.find(x=>x.id==='iris');
 const irisTile=await alpha('rework-base-hd',irisLayer.source);
 const active=b.pack.directions[dir].layers.find(x=>x.id==='iris');a.equal(irisLayer.source,active.source);
 const irisDetails=[],gearR=h.femaleNamedHairRecord.gearRecord,originalHat=cv.createCanvas(640,640),material=h.femaleNamedHairRecord,hd=b.pack.directions[dir];
 const gearLayer=gearR.layers.find(l=>l.id===gearR.headgearPolicy.gearId),g=gearR.adjustmentRecord.adjustment,prior=gearR.headgearPolicy.headAdjustment;
 if(l.hairStyle==='original'){
  const offs=axis=>Math.round(4*(hd.rest.NECK[axis]-gearR.rest.NECK[axis]+(g['gear'+axis.toUpperCase()]||0)+(prior?.[axis]||0)));
  a.deepEqual(['x','y'].map(offs),dir==='east'?[52,67]:[77,66]);
  originalHat.getContext('2d').drawImage(await alpha('rework-accessories',gearLayer.source),offs('x'),offs('y'));
 }else{
  const vendor=global.ReworkAccessoryVendor,entry=JSON.parse(JSON.stringify(gearR.entry)),bound=entry.pack.directions[dir];
  bound.headgearPolicy.headAdjustment={x:0,y:0,scale:100,...bound.headgearPolicy.headAdjustment};
  const pack=vendor.headFemale.apply(entry.pack,dir,vendor.headFemale.adjustment(g),entry),dd=pack.directions[dir];
  const source=dd.layers.find(l=>l.id===dd.headgearPolicy.gearId);dd.layers=[source];
  const owned=require(P.join(R,'tools/rework-accessories/female-original-face-ownership.json')).approvedGearRasters?.[gearR.snapshot];
  const sha=owned?.source&&owned.originalLayer===source.source&&owned.item===gearR.item&&owned.style===gearR.style&&owned.direction===dir?owned.source:source.source;
  const overlay=cv.createCanvas(512,512);vendor.compositor.render(overlay.getContext('2d'),pack,new Map([[source.source,await alpha('rework-accessories',sha)]]),{direction:dir,frame:0,density:4});
  const dx=Math.round((hd.rest.NECK.x-material.source.rest.NECK.x)*4),dy=Math.round((hd.rest.NECK.y-material.source.rest.NECK.y)*4);
  originalHat.getContext('2d').drawImage(overlay,dx,dy);overlay.width=1;
 }
 const assets=name=>require(P.join(R,name));
 const originalHead=global.MareFemaleNamedHairHD.create(assets('tools/rework-accessories/head-layer-index.json'),assets('tools/rework-accessories/female-original-face-ownership.json'),
  {baseRegistry:global.MareReworkBaseHD.create(assets('tools/rework-base-hd/index.json')),makeCanvas:cv.createCanvas});
 const underBob={...b.femaleNamedHairRecord,id:'proof-without-bob-hair:'+dir,style:'none',source:null,gearRecord:null};
 const bareEye=l.hairStyle==='hair-bob'?originalHead.compose(b,underBob,new Map(await Promise.all(originalHead.requiredFiles(underBob).map(async url=>[url,await load(url)])))):null;
 const binds=await Promise.all([[p,r],[pants,t],[helmet,h],[plain,b],[hide,t],[show,r]].map(async([player,source])=>[player,await api.prepareConfiguration([{player,source,options:o}],{resolve:x=>x})]));
 for(let f=0;f<8;f++){
  const [w,c,g,n,hidden,shown]=binds.map(([p,b])=>{let x;const ok=b.draw({save(){},restore(){},drawImage(t){x=t;}},p,{...o,progress:(f+.25)/8});a(ok);return rgb(x);});
  a(w.equals(shown));a(c.equals(hidden));
  const cloth=r.authoredPunchPants.cloth,shorts=b.pack.directions[dir].layers[r.authoredPunchPants.index];
  const cvt=cv.createCanvas(640,640);
  const pantsMask=region(cvt,await alpha('rework-modular-outfits-hd',cloth.frames[f]),await alpha('rework-base-hd',shorts.frames?.[f]||shorts.source));
  const hands=b.pack.directions[dir].layers.filter(x=>/^(left|right)-(upper|forearm|hand)$/.test(x.id));
  const hx=cvt.getContext('2d');hx.clearRect(0,0,640,640);
  for(const hand of hands)hx.drawImage(await alpha('rework-base-hd',hand.frames?.[f]||hand.source),0,0);const hand=pixOrRGB(cvt);
  hx.clearRect(0,0,640,640);
  for(const foot of b.pack.directions[dir].layers.filter(x=>x.id==='legs-base'))hx.drawImage(await alpha('rework-base-hd',foot.frames?.[f]||foot.source),0,0);
  const feet=rgb(cvt),old=skinReference[f];
  const hair=projectHead(b,hairTile,f),iris=projectHead(b,irisTile,f),hat=projectHead(b,originalHat,f),withoutBob=bareEye&&projectHead(b,bareEye,f);
  let hd=0,cd=0,restored=0,handWitnesses=0,irisVisible=0,irisRetained=0,footWitness=0,handTone=0,footTone=0;
  for(let i=0;i<w.length;i+=4){
   const v=w.readUInt32LE(i),c0=c.readUInt32LE(i),g0=g.readUInt32LE(i),n0=n.readUInt32LE(i);
   if(v!==c0){a.equal(v,g0);a.equal(c0,n0);a(!pantsMask[i+3]);hd++;if(hair[i+3]&&c[i+3])restored++;}
   if(v!==g0){a.equal(v,c0);a.equal(g0,n0);a(pantsMask[i+3]);cd++;}
   if(iris[i+3]&&c[i+3]){a.equal(c0,n0);a.equal(v,g0);irisVisible++;if(v===c0)irisRetained++;else if(!hat[i+3]){a(withoutBob&&hair[i+3],'Iris changed outside authored cap or suppressed Bob hair');a.equal(v,withoutBob.readUInt32LE(i),'Suppression must reveal original registered iris without Bob, not repaint it');}}
   if(hand[i+3]&&!pantsMask[i+3]&&((i/4/640)|0)>=245){a.equal(v,c0);a.equal(g0,n0);handWitnesses++;if(old&&old.readUInt32LE(i)!==c0)handTone++;}
   if(feet[i+3]&&!pantsMask[i+3]&&((i/4/640)|0)>=460){a.equal(v,c0);a.equal(g0,n0);footWitness++;if(old&&old.readUInt32LE(i)!==c0)footTone++;}
  }
  a(hd>0&&cd>100&&restored>0&&handWitnesses>0&&footWitness>0&&irisVisible>0,JSON.stringify({f,hd,cd,restored,handWitnesses,irisVisible,footWitness,handTone,footTone}));
  if(old)a(handTone>0&&footTone>0,JSON.stringify({f,handTone,footTone}));else skinReference[f]=c;
  irisDetails.push([irisVisible,irisRetained,handTone,footTone]);cvt.width=1;count++;
 }
 console.log(l.hairStyle,'authored iris area kept or naturally covered',irisDetails);hairTile.width=originalHat.width=1;
 binds.forEach(([,v])=>v.release());a.equal(JSON.stringify(p),save);global.gc?.();
}
if(process.env.SELECT_ONLY!=='1')a.equal(count,16);console.log('PASS',dir,'two normalized Saves /',count,'Canvas H157 + P168');
})().catch(e=>{console.error(e);process.exitCode=1});
function pixOrRGB(c){return rgb(c);}
