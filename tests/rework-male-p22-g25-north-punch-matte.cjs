const path=require('node:path'),a=require('node:assert/strict'),crypto=require('node:crypto'),R=path.dirname(__dirname),{make,cv}=require(path.join(R,'tests/rework-integration-support.cjs')),A=require(path.join(R,'character-appearance'));
const load=require(path.join(R,'tools/rework-hd-test-loader.cjs')).create(R),api=make();
const id=def=>({def}),o={direction:'north',action:'attack',consumer:'world'},d=r=>r.pack.directions.north,suffix=':own-p22-c151:north:attack-unarmed-g25:';
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
const authoredHandSides=[[false,true],[false],[false],[false],[false],[false],[false],[false,true]];
const look=(skin,legs=22,gloves=25)=>JSON.parse(JSON.stringify(A.commit({id:'same-save',classId:'brawler',equipment:{coat:id(151),legs:id(legs),...(gloves==null?{}:{gloves:id(gloves)})}},{skinColor:skin,hairColor:'black',eyeColor:'blue'},()=>true)));
const glove=l=>l.id==='registered-frozen-glove-native-attack',skinBase=l=>l.id==='skin-arms-phase',pants=l=>l.slot==='pants'||/^(pants(22|133)-|own133-)/.test(l.id),pix=c=>Buffer.from(c.getContext('2d').getImageData(0,0,640,640).data),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const swap=(r,allow,tag)=>({...r,id:r.id+':probe:'+tag,pack:{...r.pack,directions:{north:{...d(r),layers:d(r).layers.filter(allow)}}}});
const plain=require(path.join(R,'tools/rework-modular-outfits-hd/index.json')).records.find(r=>r.id==='male-pants22-attack-unarmed-north');
(async()=>{await api.ready;let checked=0;
 for(const skin of Object.keys(A.skins)){
  const p=look(skin),save=JSON.stringify(p),g=api.selectVisual(p,o),pure=api.selectVisual(look(skin,22,null),o),ref=api.selectVisual(look(skin,133),o);
  a(g?.id.includes(suffix),'missing own G25 P22 North '+skin);
  a.deepEqual(g.equipment,{pants:22,torso:151,gloves:25});a.equal(g.omitted.length,0);a.equal(g.slotRoutes.gloves.source,'frozen-male-glove25-north-attack-unarmed-native-layers');a.equal(g.slotRoutes.coat.quality,'hd');a.equal(g.slotRoutes.legs.quality,'hd');
  a.equal(g.resolvedAction,'attack-unarmed');a.deepEqual(g.colorAppearance,{skin,hairColor:'black',eyeColor:'blue'});
  a.deepEqual(d(g).clip,{frames:8,fps:12,loop:false,contactFrame:4});
  a.deepEqual(d(g).layers.filter(l=>!glove(l)),d(pure).layers);
  a.deepEqual(d(g).layers.filter(l=>!pants(l)),d(ref).layers.filter(l=>!pants(l)));
  a.deepEqual(d(g).layers.filter(pants),d(plain).layers.filter(pants));
  a.deepEqual(g.paletteSourceMasks,ref.paletteSourceMasks);
  a(!g.bodyOcclusion);a(!g.sourceRasterPadding);a(!g.mirrorX);
  a.deepEqual(d(g).layers.find(skinBase).frames,donor.map(f=>f.skinSource));
  for(const f of donor)a.equal(g.paletteSourceMasks[f.skinSource].skin,f.skinMask);
  a.deepEqual(d(g).layers.find(glove).frames,donor.map(f=>f.gloveHash));
  for(const f of donor)a(!g.paletteSourceMasks[f.gloveHash]);
  for(const eq of [{weapon:id(0)},{legs:id(133)},{coat:null},{coat:id(6)},{boots:id(9)},{boots:id(155)},{gloves:{def:25,variant:'alt'}}])
   a(!api.selectVisual({...p,equipment:{...p.equipment,...eq}},o)?.id.includes(suffix));
  for(const opt of [{direction:'south'},{direction:'east'},{direction:'west'},{action:'walk'}])
   a(!api.selectVisual(p,{...o,...opt})?.id.includes(suffix));
  for(const opt of [{eyeColor:'amber'},{eyeStyle:'face-calm'},{hairStyle:'hair-cropped'}])
   a(!api.selectVisual({...p,appearance96:{...p.appearance96,...opt}},o)?.id.includes(suffix));
  const keep=p.equipment.gloves; delete p.equipment.gloves;a.deepEqual(api.selectVisual(p,o),pure);p.equipment.gloves=keep;a.deepEqual(api.selectVisual(p,o),g);a.equal(JSON.stringify(p),save);checked++;
 }
 a.equal(checked,8);
 if(process.env.SELECT_ONLY){console.log('PASS 8 saved profiles P22 C151 G25 North without boots');return;}
 const skin=process.env.SKIN,p=look(skin),pBare=look(skin,22,null),pRef=look(skin,133),g=api.selectVisual(p,o),bare=api.selectVisual(pBare,o),ref=api.selectVisual(pRef,o);
 const gp=d(g).layers.find(glove);a(gp.depth===100&&d(g).layers.filter(l=>l!==gp).every(l=>l.depth<100&&!l.depthTrack));
 const sessions=[];
 const add=async(player,source)=>sessions.push({player,s:await api.prepareConfiguration([{player,source,options:o}],{resolve:x=>x})});
 await add(p,g);await add(pBare,bare);await add(p,swap(g,skinBase,'skin-only'));await add(pRef,ref);await add(p,swap(g,glove,'g25 ordered ownership'));await add(pRef,swap(ref,glove,'g25 ordered ownership'));
 const get=(at,f)=>{const {player,s}=sessions[at];let c;a(s.draw({save(){},restore(){},drawImage(out){c=out;}},player,{...o,progress:(f+.2)/8}));return c;};
 try {
 const rows=[];
 for(const [f,info] of donor.entries()){
  const full=pix(get(0,f)),naked=get(1,f),lower=full.subarray(400*640*4),bareData=pix(naked),own=pix(get(2,f)),previous=pix(get(3,f));
  a.deepEqual(lower,bareData.subarray(400*640*4),'P22 feet/cloth changed on G25 equip');
  const effective=pix(get(4,f)),previousEffective=pix(get(5,f));
  a.deepEqual(effective,previousEffective,'own G25 ordered contribution differs from P133');
  const pantsMasks=cv.createCanvas(640,640),pm=pantsMasks.getContext('2d');
  for(const r of [g,ref])for(const l of d(r).layers.filter(l=>pants(l)&&l.id!=='shorts-phase')){
   a.deepEqual(l.binding,{kind:'fixed'});
   pm.drawImage(await load('tools/rework-modular-outfits-hd/assets/'+(l.frames?.[f]||l.source)+'.png'),0,0);
  }
  const garment=pix(pantsMasks);pantsMasks.width=1;
  const img=await load('tools/rework-modular-outfits-hd/assets/'+info.gloveHash+'.png');
  const expected=cv.createCanvas(640,640),ec=expected.getContext('2d');ec.drawImage(naked,0,0);ec.drawImage(img,0,0);
  a.deepEqual(pix(expected),full,'ordered G25 finish not source-over saved P22/C151');
  ec.clearRect(0,0,640,640);ec.drawImage(img,0,0);const gear=pix(expected);expected.width=1;
  a.deepEqual(gear,effective,'G25 contribution differs from own authority');
  const marks=authoredHandSides[f].map(right=>({right,partial:[],open:[],opaque:0})),active=new Map(marks.map(h=>[h.right,h]));
  const feet=[[],[]],alpha=Buffer.alloc(640*640);let ordered=0,changed=0,fringeBackdrop=0,maxBackdropAlpha=0;
  for(let j=0;j<full.length;j+=4){
   const pt=j>>>2,y=Math.floor(pt/640),x=pt%640,skinPix=own.readUInt32LE(j),under=bareData.readUInt32LE(j),out=full.readUInt32LE(j),gA=gear[j+3];
   alpha[pt]=full[j+3];
   if(gA){ 
    ordered++;
    if(out!==previous.readUInt32LE(j)){
     a(gA<255&&garment[j+3]>0,`unexpected composite delta beyond pants beneath glove fringe at frame ${f}, x${x}, y${y}, glove alpha ${gA}, pants alpha ${garment[j+3]}`);
     maxBackdropAlpha=Math.max(maxBackdropAlpha,gA);fringeBackdrop++;
    }
   }
   if(out!==under){a(gA,'delta outside authored G25');changed++;}
   if(y>=400&&own[j+3]===255&&out===skinPix)feet[+(x>=320)].push([pt,out]);
   const hand=active.get(x>=320);
   if(y<295||y>380||!hand)continue;
   if(gA===255){a.equal(out,gear.readUInt32LE(j));hand.opaque++;}
   if(own[j+3]!==255||under!==skinPix)continue;
   if(gA===0)hand.open.push([pt,out]);else if(gA<255)hand.partial.push([pt,out]);
  }
  a.equal(marks.length,f===0||f===7?2:1);a.equal(marks.filter(x=>x.right).length,f===0||f===7?1:0);
  for(const h of marks)a(h.partial.length>0&&h.open.length>0&&h.opaque>0,'no displayed hand/fringe '+f);
  a(feet.every(x=>x.length>100));a(ordered>0&&changed>0);
  a.deepEqual(pix(get(0,f)),full,'replay G25');
  rows.push({f,marks,feet,ordered,changed,fringeBackdrop,maxBackdropAlpha,alpha:hash(alpha),lower:hash(lower)});
 }
 console.log(JSON.stringify(rows));
 }finally{for(const {s} of sessions)s.release();}
})().catch(e=>{console.error(e);process.exitCode=1});
