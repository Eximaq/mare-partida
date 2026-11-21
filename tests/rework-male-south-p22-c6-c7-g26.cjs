const a=require('node:assert/strict'),p=require('node:path'),R=p.dirname(__dirname);
const {make,cv}=require(p.join(R,'tests/rework-integration-support.cjs')),A=require(p.join(R,'character-appearance')),load=require(p.join(R,'tools/rework-hd-test-loader.cjs')).create(R);
const api=make();
const d=r=>r.pack.directions.south,I=def=>({def}),g=l=>l.id==='registered-frozen-glove-native-attack',owner=l=>l.id==='skin-arms-phase',hair=l=>l.id==='hair';
const o={direction:'south',action:'attack-unarmed',consumer:'world'},sel=x=>api.selectVisual(x,o),tag=id=>':own-p22-c'+id+'-g26-south-punch:';
const idx=require(p.join(R,'tools/rework-modular-outfits-hd/index.json')).records,by=id=>idx.find(x=>x.id===id),b=by('male-pants22-attack-unarmed-south'),G=by('frozen-male-glove26-south-attack-unarmed-native-layers');
const coat=id=>by(`male-torso${id}-south-frozen-attack-native-candidate`),own=id=>d(coat(id)).layers.filter(l=>!l.id.startsWith('base:')),wear=id=>l=>own(id).some(k=>k.id===l.id);
const player=(skin,hair,coat,eyeColor='green',extras={})=>JSON.parse(JSON.stringify(A.commit({id:'same-actor',classId:'fighter',equipment:{legs:I(22),gloves:I(26),coat:I(coat),...extras}},{skinColor:skin,hairColor:hair,eyeColor},()=>true)));
const v=global.ReworkAccessoryVendor.compositor,pix=c=>Buffer.from(c.getContext('2d').getImageData(0,0,640,640).data);
const slice=(r,t,s)=>({...r,id:r.id+':audit:'+s,strictSouthAppearance:undefined,pack:{...r.pack,directions:{south:{...d(r),layers:d(r).layers.filter(t)}}}});
(async()=>{await api.ready;let checks=0;
for(const skin of Object.keys(A.skins)){
 const actor=player(skin,'blonde',6),save=JSON.stringify(actor),standard=sel(player(skin,'blonde',151)),heard={};
 for(const id of [6,7,6,7,6]){
  actor.equipment.coat=I(id);const x=sel(actor);a(x?.id.includes(tag(id)),[id,skin,x?.id]);
  a.deepEqual(x.equipment,{pants:22,torso:id,gloves:26});a.equal(x.colorAppearance.skin,skin);a.equal(x.colorAppearance.hairColor,'blonde');a.equal(x.colorAppearance.eyeColor,'green');
  a.deepEqual(x.strictSouthAppearance,standard.strictSouthAppearance);a.deepEqual(x.paletteSourceMasks,standard.paletteSourceMasks);
  a.deepEqual(d(x).layers.filter(l=>!wear(id)(l)&&!g(l)),d(b).layers);a.deepEqual(d(x).layers.filter(wear(id)),own(id));a.deepEqual(d(x).layers.filter(g),[d(G).layers[1]]);
  for(let f=0;f<8;f++){
   const pick=l=>[l.id,l.source,l.matrix,l.depth],pl=v.plan(x.pack,'south',f);
   a(g(pl.at(-1)));a.deepEqual(pl.filter(l=>!wear(id)(l)&&!g(l)).map(pick),v.plan(b.pack,'south',f).map(pick));
  }
  if(heard[id])a.deepEqual(x,heard[id]);else heard[id]=x;
  for(const extra of [{boots:I(9)},{boots:I(148)},{boots:I(155)},{gloves:I(25)},{gloves:{def:26,variant:'other'}},{coat:I(137)},{legs:I(133)},{weapon:I(0)},{coat:null}])
   a(!sel(player(skin,'blonde',id,'green',extra))?.id.includes(tag(id)));
  for(const direction of ['north','east','west'])a(!api.selectVisual(actor,{...o,direction})?.id.includes(tag(id)));
  a(!api.selectVisual(actor,{...o,action:'walk'})?.id.includes(tag(id)));
 }
 a.equal(JSON.stringify(actor),save);checks++;
}
a.equal(checks,8);if(process.env.SELECT_ONLY)return;
const old=[];let count=0;
for(const [skin,h] of [['porcelain','blonde'],['ebony','silver']]){
 const groups=[];
 for(const id of [6,7]){
  const p=player(skin,h,id),r=sel(p),eye=player(skin,h,id,'amber'),lit={...player(skin,h,id),equipment:{legs:I(22),coat:I(id)},appearance96:{gender:'masculino',hairStyle:'original',eyeStyle:'original',hairColor:'original',skinColor:'original',eyeColor:'original'}};
  const control=sel(lit),index=[ [p,r],[p,slice(r,wear(id),'coat')],[lit,slice(control,wear(id),'origcoat')],[p,slice(r,g,'g')],[p,slice(r,owner,'ownskin')],[p,slice(r,l=>owner(l)||g(l),'own-contact')],[p,slice(r,hair,'hair')],...(skin==='porcelain'?[[eye,sel(eye)]]:[]) ];
  const q=await Promise.all(index.map(([player,source])=>api.prepareConfiguration([{player,source,options:o}],{resolve:k=>k})));
  const draw=(i,f)=>{let c;a(q[i].draw({save(){},restore(){},drawImage(x){c=x}},index[i][0],{...o,progress:(f+.2)/8}));return pix(c);};
  groups.push({draw,q});
 }
 try{for(let f=0;f<8;f++){
  const r=groups.map(({draw})=>Array.from({length:skin==='porcelain'?8:7},(_,j)=>draw(j,f)));
  const [x,y]=r;
  a(x[1].equals(x[2])&&y[1].equals(y[2]));for(const j of [3,4,5,6])a(x[j].equals(y[j]));
  const png=cv.createCanvas(640,640);png.getContext('2d').drawImage(await load('tools/rework-modular-outfits-hd/assets/'+d(G).layers[1].frames[f]+'.png'),0,0);a(x[3].equals(pix(png)));png.width=1;
  let change=0,eyes=[0,0],hands=[0,0],hair=[0,0],contact=[0,0],feet=[[0,0],[0,0]];
  for(let j=0;j<x[0].length;j+=4){
   const X=r.map(z=>z[0].readUInt32LE(j)),row=Math.floor(j/2560),col=(j/4)%640;
   if(X[0]!==X[1]){a(x[1][j+3]||y[1][j+3]);change++;}
   if(x[3][j+3]===255){a.equal(X[0],x[3].readUInt32LE(j));a.equal(X[1],x[3].readUInt32LE(j));}
   for(let k=0;k<2;k++){
    const z=r[k];if(skin==='porcelain'){
     if(X[k]!==z[7].readUInt32LE(j)){a(row<260);eyes[k]++;}
    }else{
     const before=old[f][k],O=before[0].readUInt32LE(j),H=z[6].readUInt32LE(j),h0=before[6].readUInt32LE(j),S=z[4].readUInt32LE(j),s0=before[4].readUInt32LE(j);
     a.equal(z[0][j+3],before[0][j+3]);
     if(z[6][j+3]===255&&H!==h0&&X[k]===H&&O===h0)hair[k]++;
     if(z[4][j+3]===255&&S!==s0){
      if(X[k]===S&&O===s0){if(row>=400)feet[k][+(col>=320)]++;else if(row>=250)hands[k]++;}
      if(row<400&&z[3][j+3]>0&&z[3][j+3]<255&&z[5].readUInt32LE(j)!==before[5].readUInt32LE(j)&&X[k]===z[5].readUInt32LE(j)&&O===before[5].readUInt32LE(j))contact[k]++;
     }
    }
   }
  }
  a(change>1000);if(skin==='porcelain'){a.deepEqual(eyes,[45,45]);old.push(r);}else{
   a(hair.every(n=>n>0)&&hands.every(n=>n>0)&&contact.every(n=>n>0));a(feet.every(z=>z.every(n=>n>100)));a.deepEqual(feet[0],feet[1]);}
  console.log(skin,f,{change,eyes,hands,hair,contact,feet});count++;
 }}finally{groups.forEach(({q})=>q.forEach(x=>x.release()));global.gc?.();}
}
a.equal(count,16);console.log('PASS 8 saves, 16 contrast phases and 16 independent 45-pixel iris comparisons; C6/C7 P22 G26 South');
})().catch(e=>{console.error(e);process.exitCode=1});
