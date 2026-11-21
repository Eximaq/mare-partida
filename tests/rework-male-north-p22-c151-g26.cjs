const a=require('node:assert/strict'),p=require('node:path'),R=p.dirname(__dirname);
const {make,cv}=require(p.join(R,'tests/rework-integration-support.cjs')),A=require(p.join(R,'character-appearance')),load=require(p.join(R,'tools/rework-hd-test-loader.cjs')).create(R);
const api=make();
const item=26;
const index=require(p.join(R,'tools/rework-modular-outfits-hd/index.json')).records,src=id=>index.find(r=>r.id===id),d=r=>r.pack.directions.north;
const target=src('male-pants22-attack-unarmed-north'),coat=src('male-pants133-attack-unarmed-north-drawn8-candidate-coat151-native'),donor=src(`frozen-male-glove${item}-north-attack-unarmed-native-layers`);
const human=l=>l.id==='skin-arms-phase',coatPart=l=>l.id==='coat151-authored-attack',glove=l=>l.id==='registered-frozen-glove-native-attack';
const test=o=>api.selectVisual(o,opts),opts={action:'attack-unarmed',direction:'north',consumer:'world'},I=def=>({def});
const actor=(skinColor,eyeColor='blue',e={})=>A.commit({id:'actor',classId:'fighter',equipment:{legs:I(22),coat:I(151),...e}},{skinColor,eyeColor,hairColor:'black'},()=>true);
const pix=c=>Buffer.from(c.getContext('2d').getImageData(0,0,640,640).data);
const slice=(r,layers,suffix)=>({...r,id:r.id+':audit:'+suffix,strictSouthAppearance:undefined,pack:{...r.pack,directions:{north:{...d(r),layers}}}});
(async()=>{await api.ready;
const gl=true,add=gl?{gloves:I(item)}:{},sig=':own-p22-c151:north:attack-unarmed-g26:';
for(const tone of Object.keys(A.skins)){
 const q=actor(tone,'blue',add),save=JSON.stringify(q),r=test(q);
 a(r?.id.includes(sig));a.equal(r.colorAppearance.skin,tone);a.equal(r.colorAppearance.eyeColor,'blue');a(!r.bodyOcclusion);
 a.deepEqual(d(r).layers.filter(l=>!coatPart(l)&&!glove(l)),d(target).layers);a.deepEqual(d(r).layers.filter(coatPart),d(coat).layers.filter(coatPart));
 if(gl)a.deepEqual(d(r).layers.filter(glove),[d(donor).layers[1]]);
 for(const k of ['clip','rest','poses'])a.deepEqual(d(r)[k],d(target)[k]);
 a.deepEqual(r.paletteSourceMasks,target.paletteSourceMasks);a(!test(actor(tone,'amber',add))?.id.includes(sig));
 const p133=actor(tone,'blue',{...add,legs:I(133)}); if(gl)a(test(p133)?.id.includes(':own-north-punch-g'+item+'-bare:'));
 for(const extra of [{boots:I(9)},{boots:I(148)},{boots:I(155)},{gloves:{def:25,variant:'other'}},{weapon:I(0)},{legs:I(21)},{coat:I(6)}])a(!test(actor(tone,'blue',{...add,...extra}))?.id.includes(':own-p22-c151:north:attack-unarmed-g26:'));
 for(const o of [{...opts,action:'walk'},{...opts,direction:'south'},{...opts,direction:'east'},{...opts,direction:'west'}])a(!api.selectVisual(q,o)?.id.includes(sig));
 for(const look of [{hairStyle:'hair-bob'},{eyeStyle:'face-calm'}])a(!test({...q,appearance96:{...q.appearance96,...look}})?.id.includes(sig));
 if(gl){q.equipment.gloves={def:item,variant:'other'};a(!test(q)?.id.includes(sig));delete q.equipment.gloves;a(test(q)?.id.includes(':own-p22-c151:north:attack-unarmed:'));q.equipment.gloves=I(item);}
 else{delete q.equipment.coat;const plain=test(q);a.equal(plain.equipment.pants,22);a.deepEqual(d(plain).layers,d(target).layers);q.equipment.coat=I(151);}
 a.deepEqual(test(q),r);a.equal(JSON.stringify(q),save);
}
if(process.env.SELECT_ONLY)return;
const a0=actor('porcelain','blue',add),a1=actor('ebony','blue',add);
const r=test(a0),e=test(a1),plainActor=actor('porcelain','blue',gl?{}:{coat:undefined}),plain=test(plainActor),ls=d(r).layers;
const controlGl=gl?test(actor('porcelain','blue',{legs:I(133),gloves:I(item)})):null;
const wear=gl?glove:coatPart;
a(plain);const sessions=await Promise.all([[a0,r],[a1,e],[plainActor,plain],[a0,slice(r,ls.filter(wear),'owned')],[a0,slice(r,ls.filter(human),'skin')],[a1,slice(e,d(e).layers.filter(human),'skin')],[a0,slice(r,ls.filter(l=>/^coat|^pants|^shorts/.test(l.id)),'cloth')],[a1,slice(e,d(e).layers.filter(l=>/^coat|^pants|^shorts/.test(l.id)),'cloth')],...(gl?[[a0,slice(controlGl,d(controlGl).layers.filter(glove),'g26-donor')]]:[])].map(async([player,source])=>({player,q:await api.prepareConfiguration([{player,source,options:opts}],{resolve:x=>x})})));
const draw=(i,f)=>{const {q,player}=sessions[i];let c;a(q.draw({save(){},restore(){},drawImage(v){c=v}},player,{...opts,progress:(f+.2)/8}));return pix(c);};
try{for(let f=0;f<8;f++){
 const [bright,dark,plain,owned,bskin,dskin,cloth0,cloth1,other]=sessions.map((_,i)=>draw(i,f));
 a(cloth0.equals(cloth1));if(gl){a(owned.equals(other));const compositor=global.ReworkAccessoryVendor.compositor;for(const rec of [r,controlGl])a(glove(compositor.plan(rec.pack,'north',f).at(-1)),'no later occluder may hide own glove');}
 const l=ls.find(wear),ref=cv.createCanvas(640,640);ref.getContext('2d').drawImage(await load('tools/rework-modular-outfits-hd/assets/'+l.frames[f]+'.png'),0,0);a(owned.equals(pix(ref)));ref.width=1;
 let feet=[0,0],hands=0,changed=0,ir=0;
 for(let j=0;j<bright.length;j+=4){
  const y=Math.floor(j/2560),x=(j>>>2)%640,B=bright.readUInt32LE(j),D=dark.readUInt32LE(j);
  a.equal(bright[j+3],dark[j+3]);

  if(gl&&owned[j+3]===255)a.equal(B,owned.readUInt32LE(j));
  if(B!==plain.readUInt32LE(j)){changed++;a(owned[j+3]>0);}
  if(B!==D&&bskin[j+3]===255&&dskin[j+3]===255&&B===bskin.readUInt32LE(j)&&D===dskin.readUInt32LE(j)){
   if(y>=400)feet[+(x>=320)]++;else if(y>=250&&y<=386)hands++;
  }
 }
 a(changed>100&&feet.every(x=>x>100)&&hands>0,[f,ir,changed,feet,hands]);
 a(bright.equals(draw(0,f)));console.log(f,{feet,hands,ir,changed});
}}finally{sessions.forEach(x=>x.q.release());global.gc?.();}
console.log('PASS 8 saves, 16 Canvas, P22/C151, glove='+item);
})().catch(e=>{console.error(e);process.exitCode=1});
