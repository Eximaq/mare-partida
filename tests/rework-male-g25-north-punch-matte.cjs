const path=require('node:path'),a=require('node:assert/strict'),crypto=require('node:crypto'),R=path.dirname(__dirname),{make,cv}=require(path.join(R,'tests/rework-integration-support.cjs')),A=require(path.join(R,'character-appearance'));
const load=require(path.join(R,'tools/rework-hd-test-loader.cjs')).create(R),api=make();
const id=def=>({def}),o={direction:'north',action:'attack',consumer:'world'},d=r=>r.pack.directions.north,mode=process.env.MODE||'bare',boot=mode==='b9',suffix=':own-north-punch-g25-'+mode;
// SHA ledger for ref-0605: native G25 overlay plus each posed hand mask.
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
const look=(skin,gloves=25)=>JSON.parse(JSON.stringify(A.commit({id:'same-save',classId:'brawler',equipment:{coat:id(151),legs:id(133),gloves:id(gloves),...(boot?{boots:id(9)}:{})}},{skinColor:skin,hairColor:'black',eyeColor:'blue'},()=>true)));
const glove=l=>l.id==='registered-frozen-glove-native-attack',skinBase=l=>l.id==='skin-arms-phase',pix=c=>Buffer.from(c.getContext('2d').getImageData(0,0,640,640).data);
const swap=(r,allow,tag,keepSkin)=>({...r,id:r.id+':probe:'+tag,...(!keepSkin?{bodyOcclusion:undefined,paletteSourceMasks:undefined,paletteRefs:undefined}:{}),pack:{...r.pack,directions:{north:{...d(r),layers:d(r).layers.filter(allow)}}}});
(async()=>{await api.ready;let checked=0;
 for(const skin of Object.keys(A.skins)){
  const player=look(skin),save=JSON.stringify(player),g=api.selectVisual(player,o),c=api.selectVisual(look(skin,26),o);
  a(g?.id.includes(suffix),'missing G25 North '+mode);a.equal(g.slotRoutes.gloves.item,25);a.equal(g.slotRoutes.boots?.item,boot?9:undefined);
  a.equal(g.resolvedAction,'attack-unarmed');a.equal(g.colorAppearance.skin,skin);a.equal(g.colorAppearance.eyeColor,c.colorAppearance.eyeColor);if(!boot)a.equal(g.colorAppearance.eyeColor,'blue');a.deepEqual(d(g).clip,{frames:8,fps:12,loop:false,contactFrame:4});
  a.deepEqual(d(g).layers.filter(l=>!glove(l)),d(c).layers.filter(l=>!glove(l)));
  for(const field of ['colorAppearance','paletteSourceMasks','bodyOcclusion'])a.deepEqual(g[field],c[field]);
  const skinLayer=d(g).layers.find(skinBase);
  a.deepEqual(skinLayer.frames,donor.map(f=>f.skinSource));
  for(const f of donor)a.equal(g.paletteSourceMasks[f.skinSource].skin,f.skinMask);
  a.deepEqual(d(g).layers.find(glove).frames,donor.map(f=>f.gloveHash));
  for(const f of donor)a(!g.paletteSourceMasks[f.gloveHash]);
  for(const eq of [{weapon:id(0)},{legs:id(154)},{boots:id(148)},{gloves:{def:25,variant:'alt'}}])
   a(!api.selectVisual({...player,equipment:{...player.equipment,...eq}},o)?.id.includes(suffix));
  for(const opt of [{direction:'south'},{direction:'east'},{direction:'west'},{action:'walk'}])
   a(!api.selectVisual(player,{...o,...opt})?.id.includes(suffix));
  const keep=player.equipment.gloves; player.equipment.gloves=id(26);a.deepEqual(api.selectVisual(player,o),c);player.equipment.gloves=keep;a.deepEqual(api.selectVisual(player,o),g);a.equal(JSON.stringify(player),save);checked++;
 }
 a.equal(checked,8);
 if(process.env.SELECT_ONLY){console.log('PASS 8 saved profiles '+mode);return;}
 const skin=process.env.SKIN,player=look(skin),ctrl=look(skin,26),g=api.selectVisual(player,o),c=api.selectVisual(ctrl,o);
 const pure=swap(g,l=>!glove(l),'ungloved',true),parts=swap(g,skinBase,'skin-only',true);
 const contexts=[];
 const add=async(p,source)=>contexts.push({p,s:await api.prepareConfiguration([{player:p,source,options:o}],{resolve:x=>x})});
 await add(player,g);await add(player,pure);await add(player,parts);await add(ctrl,c);
 const get=(at,f)=>{const {p,s}=contexts[at];let c;a(s.draw({save(){},restore(){},drawImage(out){c=out;}},p,{...o,progress:(f+.2)/8}));return c;};
 try{
 const rows=[];
 for(const [f,info] of donor.entries()){
  const full=pix(get(0,f)),bare=get(1,f),bareData=pix(bare),own=pix(get(2,f)),control=pix(get(3,f));
  const img=await load('tools/rework-modular-outfits-hd/assets/'+info.gloveHash+'.png');
  const expected=cv.createCanvas(640,640),ec=expected.getContext('2d');ec.drawImage(bare,0,0);ec.drawImage(img,0,0);
  a.deepEqual(pix(expected),full,'ordered G25 finish not source over true hand');
  ec.clearRect(0,0,640,640);ec.drawImage(img,0,0);const glove=pix(expected);expected.width=1;
  const marks=authoredHandSides[f].map(right=>({right,partial:[],open:[],opaque:0}));
  const active=new Map(marks.map(v=>[v.right,v]));const feet=[[],[]];
  const al=Buffer.alloc(640*640),lower=full.subarray(400*640*4);
  if(boot)a.deepEqual(lower,control.subarray(400*640*4),'boot soles/body differs from existing G26 North B9');
  for(let j=0;j<full.length;j+=4){
   const pt=j>>>2,y=Math.floor(pt/640),x=pt%640,ownPix=own.readUInt32LE(j),under=bareData.readUInt32LE(j),out=full.readUInt32LE(j);
   al[pt]=full[j+3];
   const hand=active.get(x>=320);
   if(out!==under)a(glove[j+3],'delta outside authored G25');
   if(y>=400){
    if(boot)a.equal(own[j+3],0,'body cutoff lost');
    else if(own[j+3]===255&&out===ownPix)feet[+(x>=320)].push([pt,out]);
   }
   if(y<295||y>380||!hand)continue;
   if(glove[j+3]===255){a.equal(out,glove.readUInt32LE(j));hand.opaque++;}
   if(own[j+3]!==255||under!==ownPix)continue;
   if(glove[j+3]===0)hand.open.push([pt,out]);
   else if(glove[j+3]<255)hand.partial.push([pt,out]);
  }
  a.equal(marks.length,f===0||f===7?2:1,'unexpected authored hand count');
  for(const h of marks)a(h.partial.length>0&&h.open.length>0&&h.opaque>0,'no exposed anatomy and alpha in registered G25 hand '+f);
  if(!boot)a(feet.every(x=>x.length>100));
  rows.push({f,marks,feet,alpha:crypto.createHash('sha256').update(al).digest('hex'),lower:crypto.createHash('sha256').update(lower).digest('hex')});
 }
 console.log(JSON.stringify(rows));
 }finally{for(const t of contexts)t.s.release();}
})().catch(e=>{console.error(e);process.exitCode=1});
