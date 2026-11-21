if(!process.env.GLOVE){
 for(const id of [152,159,166,131,138,145,173,180]){
  const out=require('node:child_process').spawnSync(process.execPath,['--expose-gc',__filename],{stdio:'inherit',env:{...process.env,GLOVE:String(id)}});
  if(out.error)throw out.error;
  if(out.status!==0)process.exit(out.status??1);
 }
 console.log('PASS 64 saves / 128 Canvas for eight independent North barefoot punch gloves');process.exit(0);
}
const pth=require('node:path'),R=pth.dirname(__dirname);
const {make,cv}=require(pth.join(R,'tests/rework-integration-support.cjs')),A=require(pth.join(R,'character-appearance')),a=require('node:assert/strict'),rs=require(pth.join(R,'tools/rework-modular-outfits-hd/index.json')).records;
const load=require(pth.join(R,'tools/rework-hd-test-loader.cjs')).create(R);
const api=make();
const item=Number(process.env.GLOVE);a([131, 138, 145, 152, 159, 166, 173, 180].includes(item));
const ground=rs.find(x=>x.id==='male-pants133-attack-unarmed-north-drawn8-candidate-coat151-native'),o={direction:'north',action:'attack-unarmed',consumer:'world'},I=def=>({def});
const p=(skin,eyeColor='blue',b,glove=item)=>JSON.parse(JSON.stringify(A.commit({id:'same-save',classId:'fighter',equipment:{coat:I(151),legs:I(133),...(glove?{gloves:I(glove)}:{}),...(b?{boots:I(b)}:{})}},{skinColor:skin,hairColor:'black',eyeColor},()=>true)));
const D=r=>r.pack.directions.north,isGlove=l=>l.id==='registered-frozen-glove-native-attack',owner=l=>l.id==='skin-arms-phase',cloth=l=>/^coat|^pants|^shorts/.test(l.id);
const re=new RegExp(`:own-north-punch-g${item}-bare:`),test=(player,opt=o)=>api.selectVisual(player,opt);
const slice=(r,accept,s)=>({...r,id:r.id+':audit:'+s,strictSouthAppearance:undefined,pack:{...r.pack,directions:{north:{...D(r),layers:D(r).layers.filter(accept)}}}});
const pixels=c=>Buffer.from(c.getContext('2d').getImageData(0,0,640,640).data);
(async()=>{await api.ready;let checks=0;for(const tint of Object.keys(A.skins)){
 const actor=p(tint),saved=JSON.stringify(actor),r=test(actor),d=D(r);a(re.test(r.id));a.equal(r.colorAppearance.skin,tint);a.equal(r.colorAppearance.eyeColor,'blue');a(!r.bodyOcclusion);
 for(const k of ['poses','rest','clip'])a.deepEqual(d[k],D(ground)[k]);a.deepEqual(d.clip,{frames:8,fps:12,loop:false,contactFrame:4});
 a.deepEqual(d.layers.filter(l=>!isGlove(l)),D(ground).layers);a.deepEqual(d.layers.find(isGlove),D(rs.find(q=>q.id===`frozen-male-glove${item}-north-attack-unarmed-native-layers`)).layers[1]);a.equal(r.slotRoutes.gloves.item,item);a(!r.slotRoutes.boots);
 delete actor.equipment.gloves;a(!re.test(test(actor)?.id));actor.equipment.gloves=I(item);a.deepEqual(test(actor),r);a.equal(JSON.stringify(actor),saved);
 for(const q of [p(tint,'blue',9),p(tint,'blue',155),p(tint,'blue',null,25),{...actor,equipment:{...actor.equipment,weapon:I(1)}},{...actor,equipment:{...actor.equipment,gloves:{def:item,appearanceVariant:'other'}}},{...actor,appearance96:{...actor.appearance96,hairStyle:'hair-bob'}},{...actor,appearance96:{...actor.appearance96,eyeStyle:'face-focused'}}])a(!re.test(test(q)?.id));
 a(!re.test(test(p(tint,'amber'))?.id));
 const boot9=test(p(tint,'blue',9));a(item===152?boot9?.equipment?.gloves===152:boot9?.id.endsWith(':own-north-punch-g'+item+'-b9'));
 const boot155=test(p(tint,'blue',155));a(boot155?.slotRoutes?.boots?.item===155||boot155?.equipment?.boots===155);
 for(const direction of ['south','east','west'])a(!re.test(test(actor,{...o,direction})?.id));a(!re.test(test(actor,{...o,action:'walk'})?.id));checks++;
 }
 a.equal(checks,8);if(process.env.SELECT_ONLY)return;
 const q=async(p,r)=>api.prepareConfiguration([{player:p,source:r,options:o}],{resolve:x=>x});
 const pics=async(a0,a1)=>{
  const red=test(a0),dark=test(a1),ownR=slice(red,owner,'skin'),ownD=slice(dark,owner,'skin'),cR=slice(red,cloth,'cloth'),cD=slice(dark,cloth,'cloth'),gl=slice(red,isGlove,'glove'),ung={...red,id:red.id+':ungloved-audit',pack:{...red.pack,directions:{north:{...D(red),layers:D(red).layers.filter(l=>!isGlove(l))}}}};
  return Promise.all([[a0,red],[a1,dark],[a0,ownR],[a1,ownD],[a0,cR],[a1,cD],[a0,gl],[a0,ung]].map(async ([actor,r])=>({actor,r,session:await q(actor,r)})));
 };
 const Z=await pics(p('porcelain'),p('ebony'));
 const draw=(i,f)=>{const t=Z[i];let c;a(t.session.draw({save(){},restore(){},drawImage(out){c=out;}},t.actor,{...o,progress:(f+.2)/8}));return pixels(c);};
 let raw=new Set(),skinLo=[Infinity,Infinity];try{for(let f=0;f<8;f++){
  const [r,d,sk,dk,cloth0,cloth1,g,noG]=Z.map((_,i)=>draw(i,f));a.deepEqual(cloth0,cloth1);
  const c=cv.createCanvas(640,640),ctx=c.getContext('2d');ctx.drawImage(await load('tools/rework-modular-outfits-hd/assets/'+D(Z[0].r).layers.find(isGlove).frames[f]+'.png'),0,0);a.deepEqual(pixels(c),g);c.width=1;
  let glove=0,feet=[0,0],hands=0;
  for(let j=0;j<r.length;j+=4){const y=Math.floor(j/2560),x=(j>>>2)%640,R=r.readUInt32LE(j),B=d.readUInt32LE(j);
   a.equal(r[j+3],d[j+3]);
   if(R!==noG.readUInt32LE(j)){glove++;a(g[j+3]);if(g[j+3]===255)a.equal(R,g.readUInt32LE(j));}
   if(R!==B&&sk[j+3]===255&&dk[j+3]===255&&R===sk.readUInt32LE(j)&&B===dk.readUInt32LE(j)){
    if(y>=400){feet[+(x>=320)]++;}else if(y>=250&&y<=386)hands++;
   }
  }
  a(glove>100);a(feet.every(n=>n>100),JSON.stringify({f,feet}));a(hands>0);skinLo=skinLo.map((v,j)=>Math.min(v,feet[j]));a.deepEqual(draw(0,f),r);
  raw.add(D(Z[0].r).layers.find(owner).frames[f]);console.log('frame',f,{feet,hands,glove});
 }}finally{Z.forEach(x=>x.session.release());}a.equal(raw.size,8);console.log('PASS 8 real saves; 16 Canvas contrast; 8 distinct lower sources; min left/right',skinLo);
})().catch(e=>{console.error(e);process.exitCode=1});
