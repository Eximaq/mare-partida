const {make,cv}=require('./rework-integration-support.cjs'),A=require('../character-appearance'),a=require('node:assert/strict'),api=make(),cp=global.ReworkAccessoryVendor.compositor;
const index=require('../tools/rework-modular-outfits-hd/index.json').records,rootId='male-pants133-attack-unarmed-north-drawn8-candidate-boots9-isolated-candidate-coat151-existing-gloves152-visible-native-candidate',pure=index.find(r=>r.id===rootId);
const opts={action:'attack-unarmed',direction:'north',consumer:'world'},p=(item,skin)=>JSON.parse(JSON.stringify(A.commit({id:'same-save',classId:'fighter',equipment:{coat:{def:151},legs:{def:133},boots:{def:9},gloves:{def:item}}},{skinColor:skin,hairColor:'black',eyeColor:'blue'},()=>true)));
const load=require('../tools/rework-hd-test-loader.cjs').create(require('node:path').join(__dirname,'..')),d=r=>r.pack.directions.north,isRear=l=>/^boot9-.*-rear$/.test(l.id),isFront=l=>/^boot9-.*-front$/.test(l.id),isGlove=l=>l.slot==='foreground',isSkin=l=>l.id==='skin-arms-phase';
const pix=c=>Buffer.from(c.getContext('2d').getImageData(0,0,640,640).data),slice=(r,layers,name)=>({...r,id:r.id+':audit:'+name,...(!layers.some(isSkin)?{bodyOcclusion:undefined,paletteSourceMasks:undefined,paletteRefs:undefined}:{}),pack:{...r.pack,directions:{north:{...d(r),layers}}}});
(async()=>{await api.ready;let checks=0;
 for(const skin of Object.keys(A.skins)){const x=p(26,skin),save=JSON.stringify(x),G=api.selectVisual(x,opts),C=api.selectVisual(p(152,skin),opts);a(G?.id.endsWith(':own-north-punch-g26-b9'));a(!C.id.endsWith(':own-north-punch-g26-b9'));a.equal(C.sourceId,rootId);a.deepEqual(d(C),d(pure));
  for(const key of ['rest','poses','clip'])a.deepEqual(d(C)[key],d(G)[key]);a.equal(d(G).clip.contactFrame,4);
  for(let i=0;i<8;i++){const old=cp.plan(C.pack,'north',i),cur=cp.plan(G.pack,'north',i);const pos=(xs,pred)=>xs.findIndex(pred),tr=x=>{const {depth,...same}=x;return same};
   a(pos(old,isRear)>pos(old,l=>l.id.startsWith('pants133-')));a(cur.filter(isRear).every(l=>cur.indexOf(l)<pos(cur,v=>v.id.startsWith('pants133-'))));
   a(cur.filter(isFront).every(l=>cur.indexOf(l)>pos(cur,v=>v.id.startsWith('pants133-'))));
   for(const l of cur)if(l.id.startsWith('boot9-'))a.deepEqual(tr(l),tr(old.find(o=>o.id===l.id)));
  }
  for(const patch of [{appearance96:{...x.appearance96,eyeColor:'amber'}},{appearance96:{...x.appearance96,hairStyle:'hair-bob'}},{appearance96:{...x.appearance96,eyeStyle:'face-focused'}},{equipment:{...x.equipment,boots:{def:148}}},{equipment:{...x.equipment,legs:{def:154}}},{equipment:{...x.equipment,gloves:{def:25}}},{equipment:{...x.equipment,weapon:{def:1}}},{equipment:{...x.equipment,boots:{def:9,variant:'alt'}}}])a(!api.selectVisual({...x,...patch},opts)?.id.endsWith(':own-north-punch-g26-b9'));
  a(!api.selectVisual(x,{...opts,direction:'west'})?.id.endsWith(':own-north-punch-g26-b9'));a(!api.selectVisual(x,{...opts,action:'walk'})?.id.endsWith(':own-north-punch-g26-b9'));
  x.equipment.gloves={def:152};a.deepEqual(api.selectVisual(x,opts),C);x.equipment.gloves={def:26};a.deepEqual(api.selectVisual(x,opts),G);a.equal(JSON.stringify(x),save);checks++;
 }
 a.equal(checks,8);console.log('SELECT',checks,'all eight real saved tones and negative guards');
 let frames=0,min=Infinity,contrast=[];
 for(const skin of ['porcelain','ebony']){
  const look=p(26,skin),oldActor=p(152,skin),G=api.selectVisual(look,opts),C=api.selectVisual(oldActor,opts),ls=d(G).layers,partial=ls.map(l=>isRear(l)?{...l,depth:2.5}:l),onlyPant=l=>l.id.startsWith('pants133-');
  const variants=[[look,G],[look,slice(G,partial,'uncorrected')],[oldActor,C],[look,slice(G,ls.filter(l=>isRear(l)||onlyPant(l)),'rim')],[look,slice(G,ls.filter(isGlove),'donor-glove')],[oldActor,slice(C,d(C).layers.filter(isGlove),'g152-glove')],[look,slice(G,ls.filter(isSkin),'skin')],[look,slice(G,ls.filter(l=>onlyPant(l)||isFront(l)),'front')]];
  const q=await Promise.all(variants.map(([player,source])=>api.prepareConfiguration([{player,source,options:opts}],{resolve:t=>t})));
  const draw=(j,i)=>{let c;a(q[j].draw({save(){},restore(){},drawImage(out){c=out;}},variants[j][0],{...opts,progress:(i+.2)/8}));return pix(c);};
  const sources=ls.filter(l=>isRear(l)||onlyPant(l)||isGlove(l)||isFront(l)),refs=new Map();
  for(const l of [...sources,...d(C).layers.filter(isGlove)])for(const h of l.frames||[l.source])if(!refs.has(h)){const c=cv.createCanvas(640,640);c.getContext('2d').drawImage(await load('tools/rework-modular-outfits-hd/assets/'+h+'.png'),0,0);refs.set(h,pix(c));c.width=1;}
  const raw=(l,i)=>refs.get(l.frames?.[i]||l.source);
  try{for(let i=0;i<8;i++){
   const [got,pre,control,_rim,g26,g152,skinOnly,fr]=q.map((x,j)=>draw(j,i));const b0=raw(sources.find(onlyPant),i),rears=sources.filter(isRear).map(l=>raw(l,i)),fronts=sources.filter(isFront).map(l=>raw(l,i));
   a(g26.equals(raw(sources.find(isGlove),i)));a(!g26.equals(g152));a(g26.some((v,j)=>j%4===3&&v===255));a(g152.equals(raw(d(C).layers.find(isGlove),i)));
   let rim=0,visibleSkin=0;
   for(let j=0;j<got.length;j+=4){const y=Math.floor(j/2560),alpha=j+3;
    a.equal(got[alpha],pre[alpha]);if(got.readUInt32LE(j)!==pre.readUInt32LE(j)){rim++;a(b0[alpha]&&rears.some(z=>z[alpha])&&y>=425&&y<=443,j);}
    if(y>=444&&(rears.some(z=>z[alpha])||fronts.some(z=>z[alpha])))a.equal(got.readUInt32LE(j),control.readUInt32LE(j));
    if(y>=400)a.equal(skinOnly[alpha],0);
    if(fronts.some(z=>z[alpha]===255))a.equal(got.readUInt32LE(j),fr.readUInt32LE(j));
    const prev=contrast[i];if(prev&&skinOnly[alpha]===255&&got.readUInt32LE(j)===skinOnly.readUInt32LE(j)&&prev.skinOnly[alpha]===255&&prev.got.readUInt32LE(j)===prev.skinOnly.readUInt32LE(j)&&got.readUInt32LE(j)!==prev.got.readUInt32LE(j))visibleSkin++;
   }
   a(rim>850);if(skin==='porcelain')contrast.push({got,skinOnly});else{a(visibleSkin>0);min=Math.min(min,visibleSkin);}a.deepEqual(draw(0,i),got);frames++;
  }}finally{q.forEach(x=>x.release());}global.gc?.();
 }
 a.equal(frames,16);console.log('PASS',frames,'Canvas; visible contrast skin minimum',min);
})().catch(e=>{console.error(e);process.exitCode=1});
