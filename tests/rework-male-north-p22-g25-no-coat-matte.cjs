const path=require('node:path'),a=require('node:assert/strict'),crypto=require('node:crypto'),R=path.dirname(__dirname),{make,cv}=require(path.join(R,'tests/rework-integration-support.cjs')),A=require(path.join(R,'character-appearance'));
const load=require(path.join(R,'tools/rework-hd-test-loader.cjs')).create(R),api=make();
const id=def=>({def}),o={direction:'north',action:'attack',consumer:'world'},d=r=>r.pack.directions.north,suffix=':own-p22-g25-north-no-coat:',wornSuffix=':own-p22-c151:north:attack-unarmed-g25:';
const donor=[
 {
  "gloveHash":"ea58c7d3d806651ac0419800fc80874fed2adca35fa31677bb3b0608dcbb1e40",
  "skinSource":"9a11a56a800ed3150aedc977c240821ce7e644be94065736933f9721f6885f97",
  "skinMask":"8857a437f6daad7124a0092e4d3f338445e5a6be3c8f8024ef687a35e056a8ca"
 },
 {
  "gloveHash":"487b549010a5b4ac30fe6cf6028d3ab08dc31cae0f748cda1cfc3a7d0e19702e",
  "skinSource":"eebe26703d817b42082bb0a87755dae1add5303daae39016e31e595fe302ce4d",
  "skinMask":"eddc2bede7424f0c0b003a7a1d3f990f12706d77c4812b066aa71feadb822af0"
 },
 {
  "gloveHash":"2f7a6533b1ab232e0161e53ccb22bcd5b7be791294971c60945744d613cc2334",
  "skinSource":"443a426a01956892e6d26c74e4e5c6e788f5e3685c671fe8646042fcdf728a03",
  "skinMask":"e845503ac91a6d93f075ebf1836242a745811ef9057a54091b5c64e687bd930d"
 },
 {
  "gloveHash":"123afde6e8e34768cb9e9569e7babc993d08a63da7819cfddb838db49f2f6e5e",
  "skinSource":"acf14879bd873ba084eed990b5299c8ca12ef7accf4088d61d37927122949742",
  "skinMask":"a12dd112f4e644c73895920c015508caca5d49f1f8c498c220520117212e928d"
 },
 {
  "gloveHash":"d6a749560f9bd50e1c5f36d650a9c6ef6df897f2a6075bf4930525c00d1597a9",
  "skinSource":"1a0f2561bf6ddfdbe6167ac07ce569c5fb107136e722d05b919d35c62dd440be",
  "skinMask":"6ed125e146cf42cdd39204a3e63b14fabaf9e361a240a87d097f35b654f6706c"
 },
 {
  "gloveHash":"bd3c8fa936b3b67d39ceff859b2f3c81cb56cb0ed412b5009a67f50563006693",
  "skinSource":"ea78b3bbe7da1935c45a4d39ae73d8ab13a84c811f54da142145093d9f5efb07",
  "skinMask":"0619ccca822eb82f6654a1a38016b8a335f8af2eef9de7e3f2e514063b2b3705"
 },
 {
  "gloveHash":"f136ddd5020896db93f242f7d9d14ce0e7fccc5cc7aafe8c032c99280f24450c",
  "skinSource":"b072b3256a05b69c4a7f994c2f98503cf1ec968cd1ee710d7f8ebdd41b99a4fd",
  "skinMask":"ea8465f4a2e17111a35c62ce95644b54385789bdaf42b849741fe87e86a4cdb1"
 },
 {
  "gloveHash":"ac6ee7bb928e6409d02296832fcd051d0cbe69217be2bffc7540ccef7fa652aa",
  "skinSource":"fd2616f94952dca6049960e9847a46ab54bc8e72beca12ac2ab4dec23fad7659",
  "skinMask":"39adce33bd4769afa7e4927c3abd2a00ece78f28496d0e8fe365dd645a2549b2"
 }
];
const hands=[[false,true],[false],[false],[false],[false],[false],[false],[false,true]];
const look=(skin,coat=false,extra={},appearance={})=>JSON.parse(JSON.stringify(A.commit({id:'same-save',classId:'brawler',equipment:{legs:id(22),gloves:id(25),...(coat?{coat:id(151)}:{}),...extra}},{skinColor:skin,hairColor:'black',eyeColor:'blue',...appearance},()=>true)));
const glove=l=>l.id==='registered-frozen-glove-native-attack',skinBase=l=>l.id==='skin-arms-phase',ownCoat=l=>l.id==='coat151-authored-attack',pix=c=>Buffer.from(c.getContext('2d').getImageData(0,0,640,640).data),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const swap=(r,allow,tag)=>({...r,id:r.id+':probe:'+tag,pack:{...r.pack,directions:{north:{...d(r),layers:d(r).layers.filter(allow)}}}});
const idx=new Map(require(path.join(R,'tools/rework-modular-outfits-hd/index.json')).records.map(r=>[r.id,r])),plain=idx.get('male-pants22-attack-unarmed-north'),ownGlove=idx.get('frozen-male-glove25-north-attack-unarmed-native-layers');
(async()=>{await api.ready;let checked=0;
 a.equal(ownGlove.frozenGloveSourceRef,'ref-0605');
 for(const skin of Object.keys(A.skins)){
  const p=look(skin),save=JSON.stringify(p),g=api.selectVisual(p,o),c=api.selectVisual(look(skin,true),o);
  a(g?.id.includes(suffix),'missing own G25 P22 North '+skin);a(c?.id.includes(wornSuffix));
  a.deepEqual(g.equipment,{pants:22,gloves:25});a.deepEqual(c.equipment,{pants:22,torso:151,gloves:25});
  a.equal(g.omitted.length,0);a.equal(g.slotRoutes.gloves.source,ownGlove.id);a.equal(g.slotRoutes.legs.quality,'hd');a(!g.slotRoutes.coat);
  a.equal(g.resolvedAction,'attack-unarmed');a.deepEqual(g.colorAppearance,{skin,hairColor:'black',eyeColor:'blue'});a.deepEqual(g.colorAppearance,c.colorAppearance);
  a.deepEqual(d(g).clip,{frames:8,fps:12,loop:false,contactFrame:4});
  for(const k of ['rest','poses','clip'])a.deepEqual(d(g)[k],d(c)[k]);
  a.deepEqual(d(g).layers.filter(l=>!glove(l)),d(plain).layers);
  a.deepEqual(d(g).layers,d(c).layers.filter(l=>!ownCoat(l)));
  a.deepEqual(g.paletteSourceMasks,c.paletteSourceMasks);
  a(!g.bodyOcclusion);a(!g.sourceRasterPadding);a(!g.mirrorX);
  a.deepEqual(d(g).layers.find(skinBase).frames,donor.map(f=>f.skinSource));
  for(const f of donor)a.equal(g.paletteSourceMasks[f.skinSource].skin,f.skinMask);
  const gp=d(g).layers.find(glove),cl=d(c).layers.find(ownCoat);
  a.deepEqual(gp,d(ownGlove).layers.find(glove));a.deepEqual(gp.frames,donor.map(f=>f.gloveHash));
  a.deepEqual(cl.binding,{kind:'fixed'});
  a(gp.depth===100&&d(c).layers.filter(l=>l!==gp).every(l=>l.depth<100&&!l.depthTrack));
  for(const f of donor)a(!g.paletteSourceMasks[f.gloveHash]);
  a(!cl.frames.some(h=>g.sourceRefs.includes(h)));
  for(const eq of [{weapon:id(0)},{legs:id(133)},{coat:id(6)},{boots:id(9)},{boots:id(155)},{gloves:{def:25,variant:'alt'}}])
   a(!api.selectVisual(look(skin,false,eq),o)?.id.includes(suffix));
  for(const opt of [{direction:'south'},{direction:'east'},{direction:'west'},{action:'walk'}])
   a(!api.selectVisual(p,{...o,...opt})?.id.includes(suffix));
  for(const opt of [{eyeColor:'amber'},{eyeStyle:'face-calm'},{hairStyle:'hair-cropped'}])
   a(!api.selectVisual(look(skin,false,{},opt),o)?.id.includes(suffix));
  for(const wear of [true,false,true,false]){if(wear)p.equipment.coat=id(151);else delete p.equipment.coat;a.deepEqual(api.selectVisual(p,o),wear?c:g);}
  a.equal(JSON.stringify(p),save);checked++;
 }
 a.equal(checked,8);
 if(process.env.SELECT_ONLY){console.log('PASS 8 saved profiles P22 G25 North without boots, actual coat remove and restore selector');return;}
 const skin=process.env.SKIN,p=look(skin),pc=look(skin,true),g=api.selectVisual(p,o),worn=api.selectVisual(pc,o),ord=global.ReworkAccessoryVendor.compositor;
 const sessions=[],add=async(player,source)=>sessions.push({player,s:await api.prepareConfiguration([{player,source,options:o}],{resolve:x=>x})});
 await add(p,g);await add(pc,worn);await add(p,swap(g,skinBase,'skin-only'));await add(p,swap(g,l=>!glove(l),'bare no glove'));await add(pc,swap(worn,l=>!glove(l),'coat no glove'));
 const get=(at,f)=>{const {player,s}=sessions[at];let c;a(s.draw({save(){},restore(){},drawImage(out){c=out;}},player,{...o,progress:(f+.2)/8}));return c;};
 const rawLayer=async h=>{const c=cv.createCanvas(640,640);c.getContext('2d').drawImage(await load('tools/rework-modular-outfits-hd/assets/'+h+'.png'),0,0);return c};
 try {
 const rows=[];
 for(const [f,info] of donor.entries()){
  const full=pix(get(0,f)),top=pix(get(1,f)),own=pix(get(2,f)),naked0=get(3,f),naked1=get(4,f),under0=pix(naked0),under1=pix(naked1),low=417*640*4;
  const [gOp,wOp]=[g,worn].map(r=>ord.plan(r.pack,'north',f).at(-1));a(glove(gOp)&&glove(wOp),'only G25 can be last');a.equal(wOp.ordinal,gOp.ordinal+1);a.deepEqual({...gOp,ordinal:0},{...wOp,ordinal:0},'exact ordered RGBA operation, including transform');
  a(full.subarray(low).equals(top.subarray(low)),'P22 feet/cloth changed on coat swap');
  const mask=await rawLayer(d(worn).layers.find(ownCoat).frames[f]),coat=pix(mask);mask.width=1;
  for(let j=low+3;j<coat.length;j+=4)a.equal(coat[j],0,"C151 stray alpha below feet boundary");
  const gearCanvas=await rawLayer(info.gloveHash),gear=pix(gearCanvas);
  const expected=cv.createCanvas(640,640),ec=expected.getContext('2d');
  for(const [bare,final] of [[naked0,full],[naked1,top]]){ec.clearRect(0,0,640,640);ec.drawImage(bare,0,0);ec.drawImage(gearCanvas,0,0);a(pix(expected).equals(final),'ordered source-over saved own hand');}
  expected.width=1;gearCanvas.width=1;
  const marks=hands[f].map(right=>({right,partial:[],open:[],opaque:0,sharedPartial:[],sharedOpen:[]})),active=new Map(marks.map(h=>[h.right,h]));
  const feet=[[],[]],alpha0=Buffer.alloc(640*640),alpha1=Buffer.alloc(640*640);let changed=0,fringe=0,maxFringe=0;
  for(let j=0;j<full.length;j+=4){
   const pt=j>>>2,y=Math.floor(pt/640),x=pt%640,skinPix=own.readUInt32LE(j),bare=under0.readUInt32LE(j),under=under1.readUInt32LE(j),out=full.readUInt32LE(j),outCoat=top.readUInt32LE(j),gA=gear[j+3];
   alpha0[pt]=full[j+3];alpha1[pt]=top[j+3];
   if(out!==outCoat){a(coat[j+3]>0,'delta outside C151 alpha');changed++;if(gA){a(gA<255,'opaque glove altered');fringe++;maxFringe=Math.max(maxFringe,gA);}}
   if(out!==bare||outCoat!==under)a(gA,'delta outside own G25');
   if(y>=417&&own[j+3]===255&&out===skinPix&&outCoat===skinPix)feet[+(x>=320)].push([pt,out]);
   const hand=active.get(x>=320);
   if(y<295||y>380||!hand)continue;
   if(gA===255){a.equal(out,gear.readUInt32LE(j));a.equal(outCoat,out);hand.opaque++;}
   if(own[j+3]!==255||bare!==skinPix)continue;
   if(gA===0){hand.open.push([pt,out]);if(under===skinPix&&out===outCoat)hand.sharedOpen.push([pt,out]);}
   else if(gA<255){hand.partial.push([pt,out]);if(under===skinPix&&out===outCoat)hand.sharedPartial.push([pt,out]);}
  }
  a.equal(marks.length,f===0||f===7?2:1);a.equal(marks.filter(x=>x.right).length,f===0||f===7?1:0);
  for(const h of marks)a(h.partial.length>0&&h.open.length>0&&h.opaque>0&&h.sharedPartial.length>0&&h.sharedOpen.length>0,'no actual hand/fringe shared between coat states '+f);
  a(feet.every(x=>x.length>100));a(changed>1000);
  a(pix(get(1,f)).equals(top),'restoring C151 exact');a(pix(get(0,f)).equals(full),'removing C151 again exact');
  rows.push({f,marks,feet,changed,fringe,maxFringe,alpha0:hash(alpha0),alpha1:hash(alpha1),lower:hash(full.subarray(low)),outerGlove:hash(gear)});
 }
 console.log(JSON.stringify(rows));
 }finally{for(const {s} of sessions)s.release();}
})().catch(e=>{console.error(e);process.exitCode=1});
