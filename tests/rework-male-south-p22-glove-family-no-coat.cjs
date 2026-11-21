if(!process.env.GLOVE){
 for(const id of [159,166,131,138,145,152,173,180]){
  const out=require('node:child_process').spawnSync(process.execPath,['--expose-gc',__filename],{stdio:'inherit',env:{...process.env,GLOVE:String(id)}});
  if(out.error)throw out.error;
  if(out.status!==0)process.exit(out.status??1);
 }
 console.log('PASS 64 saves / 128 Canvas for P22 South independent glove family without coat');process.exit(0);
}
const a=require('node:assert/strict'),p=require('node:path'),R=p.dirname(__dirname);
const {make,cv}=require(p.join(R,'tests/rework-integration-support.cjs')),A=require(p.join(R,'character-appearance')),load=require(p.join(R,'tools/rework-hd-test-loader.cjs')).create(R);
const api=make();
const item=Number(process.env.GLOVE);a([131,138,145,152,159,166,173,180].includes(item));
const idx=require(p.join(R,'tools/rework-modular-outfits-hd/index.json')).records,by=id=>idx.find(x=>x.id===id),b=by('male-pants22-attack-unarmed-south'),G=by(`frozen-male-glove${item}-south-attack-unarmed-native-layers`);
const v=global.ReworkAccessoryVendor.compositor,d=r=>r.pack.directions.south,I=def=>({def}),glove=l=>l.id==='registered-frozen-glove-native-attack',skin=l=>l.id==='skin-arms-phase';
const o={direction:'south',action:'attack-unarmed',consumer:'world'},sel=x=>api.selectVisual(x,o),tag=':own-p22-g'+item+'-south-no-coat:';
const coatIds=id=>id===151?['coat151-registered-south']:d(by(`male-torso${id}-south-frozen-attack-native-candidate`)).layers.filter(l=>!l.id.startsWith('base:')).map(l=>l.id);
const p0=(skinColor,g=item,c=null,look={})=>JSON.parse(JSON.stringify(A.commit({id:'same-save',classId:'fighter',equipment:{legs:I(22),...(g?{gloves:I(g)}:{}),...(c?{coat:I(c)}:{})}},{skinColor,hairColor:skinColor==='ebony'?'silver':'blonde',eyeColor:'green',...look},()=>true)));
const slice=(r,t,s)=>({...r,id:r.id+':audit:'+s,strictSouthAppearance:undefined,pack:{...r.pack,directions:{south:{...d(r),layers:d(r).layers.filter(t)}}}});
const pix=c=>Buffer.from(c.getContext('2d').getImageData(0,0,640,640).data);
(async()=>{await api.ready;let checks=0;
for(const tone of Object.keys(A.skins)){
 const actor=p0(tone),save=JSON.stringify(actor),x=sel(actor);a(x?.id.includes(tag),[tone,x?.id]);a.equal(x.colorAppearance.skin,tone);a.equal(x.colorAppearance.eyeColor,'green');for(const other of [6,7]){const y=sel(p0(tone,item,other));a(!y?.id.includes('-g'+item+'-south-punch:'));}
 a.deepEqual(x.equipment,{pants:22,gloves:item});a(!x.slotRoutes.coat&&!x.bodyOcclusion);
 a.deepEqual(d(x).layers,[...d(b).layers,d(G).layers[1]]);
 a.deepEqual(x.sourceRefs,[...b.sourceRefs,...d(G).layers[1].frames]);a.deepEqual(d(x).clip,{frames:8,fps:12,loop:false,contactFrame:4});
 const states=new Map();for(const id of [151,null,151,null]){
  if(id)actor.equipment.coat=I(id);else delete actor.equipment.coat;
  const got=sel(actor);a(got);
  if(id){
   const own=coatIds(id);a(!got.id.includes(tag));a.equal(got.equipment.torso,id);a.equal(got.equipment.gloves,item);
   a.deepEqual(got.strictSouthAppearance,x.strictSouthAppearance);
   for(let f=0;f<8;f++){const pick=({id,source,matrix,depth})=>({id,source,matrix,depth});const c=v.plan(got.pack,'south',f);a(glove(c.at(-1)));a.deepEqual(c.filter(l=>!own.includes(l.id)).map(pick),v.plan(x.pack,'south',f).map(pick));}
  }else a.deepEqual(got,x);
  if(states.has(id))a.deepEqual(got,states.get(id));else states.set(id,got);
 }
 a.equal(JSON.stringify(actor),save);
 for(const e of [{gloves:I(25)},{gloves:{def:item,variant:'alt'}},{boots:I(9)},{boots:I(148)},{boots:I(155)},{weapon:I(0)},{legs:I(133)}])
  a(!sel({...actor,equipment:{...actor.equipment,...e}})?.id.includes(tag));
 for(const q of [{...o,direction:'north'},{...o,direction:'east'},{...o,direction:'west'},{...o,action:'walk'}])a(!api.selectVisual(actor,q)?.id.includes(tag));
 for(const look of [{eyeStyle:'face-calm'},{hairStyle:'hair-bob'}])a(!sel(p0(tone,item,null,look))?.id.includes(tag));checks++;
}
a.equal(checks,8);console.log('PASS 8 saves, no-coat own P22 and unchanged C151; C6/C7 out of scope');
if(process.env.SELECT_ONLY)return;
let checksCanvas=0;
for(const id of [151]){
 const saved=[];
 for(const tone of ['porcelain','ebony']){
  const un=p0(tone),on=p0(tone,item,id),g=sel(un),c=sel(on),co=l=>coatIds(id).includes(l.id);
  const eye=tone==='porcelain'?p0(tone,item,null,{eyeColor:'amber'}):null;
  const pairs=[[un,g],[on,c],[on,slice(c,co,'coat')],[un,slice(g,glove,'bare-glove')],[on,slice(c,glove,'on-glove')],[un,slice(g,skin,'skin')],[un,slice(g,l=>skin(l)||glove(l),'contact')],...(eye?[[eye,sel(eye)]]:[])];
  const prepared=await Promise.all(pairs.map(([player,source])=>api.prepareConfiguration([{player,source,options:o}],{resolve:x=>x})));
  const draw=(i,f)=>{let c;a(prepared[i].draw({save(){},restore(){},drawImage(out){c=out}},pairs[i][0],{...o,progress:(f+.2)/8}));return pix(c);};
  try{for(let f=0;f<8;f++){
   const [bare,worn,K,bg,wg,S,J,E]=pairs.map((_,i)=>draw(i,f));a(bg.equals(wg));
   const src=cv.createCanvas(640,640);src.getContext('2d').drawImage(await load('tools/rework-modular-outfits-hd/assets/'+d(G).layers[1].frames[f]+'.png'),0,0);a(bg.equals(pix(src)));src.width=1;
   let changes=0,eyes=0,contact=[0,0],feet=[[0,0],[0,0]],fringe=0;const prev=saved[f];
   for(let j=0;j<bare.length;j+=4){
    const u=bare.readUInt32LE(j),v=worn.readUInt32LE(j),y=Math.floor(j/2560),x=(j/4)%640;
    if(u!==v){a(K[j+3]);changes++;if(bg[j+3]){a(bg[j+3]<255);fringe++;}}
    if(bg[j+3]===255)a(u===bg.readUInt32LE(j)&&v===wg.readUInt32LE(j));
    if(E&&u!==E.readUInt32LE(j)){a(y<260);eyes++;}
    if(prev){
     const P=S.readUInt32LE(j),O=prev.S.readUInt32LE(j),v0=prev.bare.readUInt32LE(j),v1=prev.worn.readUInt32LE(j);a(bare[j+3]===prev.bare[j+3]&&worn[j+3]===prev.worn[j+3]);
     if(P!==O&&S[j+3]===255&&prev.S[j+3]===255){
      if(y>=400){if(u===P&&v0===O)feet[0][+(x>=320)]++;if(v===P&&v1===O)feet[1][+(x>=320)]++;}
      else if(bg[j+3]>0&&bg[j+3]<255){
       const sj=J.readUInt32LE(j),sp=prev.J.readUInt32LE(j);
       if(sj!==sp&&u===sj&&v0===sp)contact[0]++;
       if(sj!==sp&&v===sj&&v1===sp)contact[1]++;
      }
     }
    }
   }
   a(changes>1000);if(E){a.equal(eyes,45);saved.push({bare,worn,S,J});}
   else{a(contact.every(n=>n>0)&&feet.every(p=>p.every(n=>n>100)));if(id!==151)a.deepEqual(feet[0],feet[1]);}
   console.log(id,tone,f,{changes,eyes,contact,feet,fringe});checksCanvas++;
  }}finally{prepared.forEach(p=>p.release());global.gc?.();}
 }
}
a.equal(checksCanvas,16);console.log('PASS 8 saved tones / 16 Canvas and 8 exact iris phases / own arms-foot-fringe / C151 preserved',item);
})().catch(e=>{console.error(e);process.exitCode=1});
