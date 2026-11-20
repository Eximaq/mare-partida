if(process.env.WITH_GLOVE==null){
 for(const value of ['0','1']){
  const out=require('node:child_process').spawnSync(process.execPath,['--expose-gc',__filename],{stdio:'inherit',env:{...process.env,WITH_GLOVE:value}});
  if(out.error)throw out.error;
  if(out.status!==0)process.exit(out.status??1);
 }
 console.log('PASS 16 saves / 48 Canvas');process.exit(0);
}
const a=require('node:assert/strict'),p=require('node:path'),R=p.dirname(__dirname);
const {make,cv}=require(p.join(R,'tests/rework-integration-support.cjs')),A=require(p.join(R,'character-appearance')),load=require(p.join(R,'tools/rework-hd-test-loader.cjs')).create(R);
const api=make();
const index=require(p.join(R,'tools/rework-modular-outfits-hd/index.json')).records,src=id=>index.find(r=>r.id===id),d=r=>r.pack.directions.south;
const target=src('male-pants22-attack-unarmed-south'),coat=src('male-pants133-attack-unarmed-south-drawn8-candidate-coat151-native'),donor=src('frozen-male-glove26-south-attack-unarmed-native-layers');
const human=l=>l.id==='skin-arms-phase',coatPart=l=>l.id==='coat151-registered-south',glove=l=>l.id==='registered-frozen-glove-native-attack';
const test=o=>api.selectVisual(o,opts),opts={action:'attack-unarmed',direction:'south',consumer:'world'},I=def=>({def});
const actor=(skinColor,eyeColor='green',e={})=>A.commit({id:'actor',classId:'fighter',equipment:{legs:I(22),coat:I(151),...e}},{skinColor,eyeColor,hairColor:'black'},()=>true);
const pix=c=>Buffer.from(c.getContext('2d').getImageData(0,0,640,640).data);
const slice=(r,layers,suffix)=>({...r,id:r.id+':audit:'+suffix,strictSouthAppearance:undefined,pack:{...r.pack,directions:{south:{...d(r),layers}}}});
(async()=>{await api.ready;
const gl=process.env.WITH_GLOVE==='1',add=gl?{gloves:I(26)}:{},sig=':own-south-punch-p22-c151'+(gl?'-g26':'')+':';
for(const tone of Object.keys(A.skins)){
 const q=actor(tone,'green',add),save=JSON.stringify(q),r=test(q);
 a(r?.id.includes(sig));a.equal(r.colorAppearance.skin,tone);a.equal(r.colorAppearance.eyeColor,'green');a(!r.bodyOcclusion);
 a.deepEqual(d(r).layers.filter(l=>!coatPart(l)&&!glove(l)),d(target).layers);a.deepEqual(d(r).layers.filter(coatPart),d(coat).layers.filter(coatPart));
 if(gl)a.deepEqual(d(r).layers.filter(glove),[d(donor).layers[1]]);
 for(const k of ['clip','rest','poses'])a.deepEqual(d(r)[k],d(target)[k]);
 const {[d(target).layers.find(l=>l.id==='face').source]:face,...owned}=target.paletteSourceMasks;a.equal(r.strictSouthAppearance.face,d(target).layers.find(l=>l.id==='face').source);a(face.skin);a.deepEqual(r.paletteSourceMasks,owned);
 const p133=actor(tone,'green',{...add,legs:I(133)}); if(gl)a(test(p133)?.id.includes(':own-south-punch-g26-bare:'));
 for(const extra of [{boots:I(9)},{boots:I(148)},{boots:I(155)},{gloves:I(25)},{weapon:I(0)},{legs:I(21)},{coat:I(6)}])a(!test(actor(tone,'green',{...add,...extra}))?.id.includes(':own-south-punch-p22-c151'));
 for(const o of [{...opts,action:'walk'},{...opts,direction:'north'},{...opts,direction:'east'},{...opts,direction:'west'}])a(!api.selectVisual(q,o)?.id.includes(sig));
 for(const look of [{hairStyle:'hair-bob'},{eyeStyle:'face-calm'}])a(!test({...q,appearance96:{...q.appearance96,...look}})?.id.includes(sig));
 if(gl){q.equipment.gloves={def:26,variant:'other'};a(!test(q)?.id.includes(sig));delete q.equipment.gloves;a(test(q)?.id.includes(':own-south-punch-p22-c151:'));q.equipment.gloves=I(26);}
 else{delete q.equipment.coat;const plain=test(q);a.equal(plain.equipment.pants,22);a.deepEqual(d(plain).layers,d(target).layers);q.equipment.coat=I(151);}
 a.deepEqual(test(q),r);a.equal(JSON.stringify(q),save);
}
if(process.env.SELECT_ONLY)return;
const a0=actor('porcelain','green',add),a1=actor('ebony','green',add),eye=actor('porcelain','amber',add);
const r=test(a0),e=test(a1),iris=test(eye),plainActor=actor('porcelain','green',gl?{}:{coat:undefined}),plain=test(plainActor),ls=d(r).layers;
const controlGl=gl?test(actor('porcelain','green',{legs:I(133),gloves:I(26)})):null;
const wear=gl?glove:coatPart;
a(plain);const sessions=await Promise.all([[a0,r],[a1,e],[eye,iris],[plainActor,plain],[a0,slice(r,ls.filter(wear),'owned')],[a0,slice(r,ls.filter(human),'skin')],[a1,slice(e,d(e).layers.filter(human),'skin')],[a0,slice(r,ls.filter(l=>/^coat|^pants|^shorts/.test(l.id)),'cloth')],[a1,slice(e,d(e).layers.filter(l=>/^coat|^pants|^shorts/.test(l.id)),'cloth')],...(gl?[[a0,slice(controlGl,d(controlGl).layers.filter(glove),'g26-donor')]]:[])].map(async([player,source])=>({player,q:await api.prepareConfiguration([{player,source,options:opts}],{resolve:x=>x})})));
const draw=(i,f)=>{const {q,player}=sessions[i];let c;a(q.draw({save(){},restore(){},drawImage(v){c=v}},player,{...opts,progress:(f+.2)/8}));return pix(c);};
try{for(let f=0;f<8;f++){
 const [bright,dark,iris,plain,owned,bskin,dskin,cloth0,cloth1,other]=sessions.map((_,i)=>draw(i,f));
 a(cloth0.equals(cloth1));if(gl){a(owned.equals(other));const compositor=global.ReworkAccessoryVendor.compositor;for(const rec of [r,controlGl])a(glove(compositor.plan(rec.pack,'south',f).at(-1)),'no later occluder may hide G26');}
 const l=ls.find(wear),ref=cv.createCanvas(640,640);ref.getContext('2d').drawImage(await load('tools/rework-modular-outfits-hd/assets/'+l.frames[f]+'.png'),0,0);a(owned.equals(pix(ref)));ref.width=1;
 let feet=[0,0],hands=0,changed=0,ir=0;
 for(let j=0;j<bright.length;j+=4){
  const y=Math.floor(j/2560),x=(j>>>2)%640,B=bright.readUInt32LE(j),D=dark.readUInt32LE(j);
  a.equal(bright[j+3],dark[j+3]);
  if(B!==iris.readUInt32LE(j)){ir++;a(y<260);}
  if(gl&&owned[j+3]===255)a.equal(B,owned.readUInt32LE(j));
  if(B!==plain.readUInt32LE(j)){changed++;a(owned[j+3]>0);}
  if(B!==D&&bskin[j+3]===255&&dskin[j+3]===255&&B===bskin.readUInt32LE(j)&&D===dskin.readUInt32LE(j)){
   if(y>=400)feet[+(x>=320)]++;else if(y>=250&&y<=386)hands++;
  }
 }
 a.equal(ir,45);a(changed>100&&feet.every(x=>x>100)&&hands>0,[f,ir,changed,feet,hands]);
 a(bright.equals(draw(0,f)));console.log(f,{feet,hands,ir,changed});
}}finally{sessions.forEach(x=>x.q.release());global.gc?.();}
console.log('PASS 8 saves, 24 Canvas, P22/C151, G26='+gl);
})().catch(e=>{console.error(e);process.exitCode=1});
