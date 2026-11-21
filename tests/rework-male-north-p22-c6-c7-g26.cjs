const a=require('node:assert/strict'),p=require('node:path'),R=p.dirname(__dirname);
const {make,cv}=require(p.join(R,'tests/rework-integration-support.cjs')),A=require(p.join(R,'character-appearance')),load=require(p.join(R,'tools/rework-hd-test-loader.cjs')).create(R);
const api=make();
const I=def=>({def}),o={direction:'north',action:'attack-unarmed',consumer:'world'},d=r=>r.pack.directions.north,sel=p=>api.selectVisual(p,o);
const rs=require(p.join(R,'tools/rework-modular-outfits-hd/index.json')).records,base=rs.find(x=>x.id==='male-pants22-attack-unarmed-north');
const donor=id=>rs.find(x=>x.id===`male-torso${id}-north-frozen-attack-native-candidate`),g26=l=>l.id==='registered-frozen-glove-native-attack';
const actor=(skinColor,hairColor,coat,g,look={})=>JSON.parse(JSON.stringify(A.commit({id:'same-save',classId:'fighter',equipment:{legs:I(22),...(coat?{coat:I(coat)}:{}),...(g?{gloves:I(g)}:{})}},{skinColor,hairColor,eyeColor:'blue',...look},()=>true)));
const before=[];const tag=(id,g)=>':own-p22-c'+id+(g?'-g26':'')+'-north-punch:';
(async()=>{await api.ready;let count=0;
for(const skin of Object.keys(A.skins))for(const g of [0,26]){
 const x=actor(skin,skin==='ebony'?'silver':'blonde',0,g),saved=JSON.stringify(x),bare=sel(x),ids={};
 a(bare?.id.includes(g?':own-p22-g26-north-no-coat:':'male-pants22-attack-unarmed-north'));
 for(const id of [6,7,6,7]){
  x.equipment.coat=I(id);const got=sel(x),auth=donor(id),cloth=d(auth).layers.filter(l=>!l.id.startsWith('base:'));
  a(got?.id.includes(tag(id,g)),[skin,g,id,got?.id]);a.equal(got.colorAppearance.skin,skin);a.equal(got.colorAppearance.hairColor,skin==='ebony'?'silver':'blonde');
  a.deepEqual(got.equipment,{pants:22,torso:id,...(g?{gloves:g}:{})});a.deepEqual(d(got).layers.filter(l=>!cloth.some(q=>q.id===l.id)),d(bare).layers);
  a.deepEqual(d(got).layers.filter(l=>cloth.some(q=>q.id===l.id)),cloth);a.deepEqual(got.sourceRasterPadding,auth.sourceRasterPadding);
  a.deepEqual(got.paletteSourceMasks,base.paletteSourceMasks);a.deepEqual(d(got).poses,d(auth).poses);
  for(let f=0;f<8;f++){
   const v=global.ReworkAccessoryVendor.compositor,plan=v.plan(got.pack,'north',f),body=l=>[l.id,l.source,l.matrix,l.depth];
   a.deepEqual(plan.filter(l=>!cloth.some(k=>k.id===l.id)).map(body),v.plan(bare.pack,'north',f).map(body));
   if(g)a(g26(plan.at(-1)));
  }
  if(ids[id])a.deepEqual(got,ids[id]);else ids[id]=got;
  for(const e of [{boots:I(9)},{boots:I(155)},{gloves:I(25)},{legs:I(133)},{coat:I(137)},{coat:{def:id,variant:'other'}}])
   a(!sel({...x,equipment:{...x.equipment,...e}})?.id.includes(':own-p22-c'+id));
  for(const look of [{eyeColor:'amber'},{hairStyle:'hair-bob'},{eyeStyle:'face-calm'}])a(!sel(actor(skin,'silver',id,g,look))?.id.includes(tag(id,g)));
 }
 delete x.equipment.coat;a.deepEqual(sel(x),bare);a.equal(JSON.stringify(x),saved);count+=2;
}
a.equal(count,32);console.log('PASS 32 saves, exact cloth joints and same-actor C6/C7 swaps');
if(process.env.SELECT_ONLY)return;
const official=id=>donor(id).pack.directions.north.layers.filter(l=>!l.id.startsWith('base:'));
const hair=l=>l.id==='hair',anatomy=l=>l.id==='skin-arms-phase';
const st=(r,fn,id)=>({...r,id:r.id+':audit:'+id,pack:{...r.pack,directions:{north:{...d(r),layers:d(r).layers.filter(fn)}}}});
const pix=c=>Buffer.from(c.getContext('2d').getImageData(0,0,640,640).data);
let phases=0;
for(const g of [0,26]){
 const looks=[];
 for(const [skin,h] of [['porcelain','blonde'],['ebony','silver']]){
  const p0=actor(skin,h,0,g), x0=sel(p0);
  const rows=[];
  for(const n of [0,6,7]){
   const person=actor(skin,h,n,g),real=sel(person),own=n?official(n):[],owns=l=>own.some(q=>q.id===l.id);
   const literal={...actor(skin,h,n,0),appearance96:{gender:'masculino',hairStyle:'original',eyeStyle:'original',hairColor:'original',eyeColor:'original',skinColor:'original'}};
   const control=n?sel(literal):null;
   const queue=[real,st(real,hair,'hair'),st(real,anatomy,'skin'),...(g?[st(real,g26,'glove'),st(real,l=>g26(l)||anatomy(l),'joint')]:[]),...(n?[st(real,owns,'coat'),st(control,owns,'literal-coat')]:[])];
   const entries=await Promise.all(queue.map((source,j)=>{const p=j===queue.length-1&&n?literal:person;return api.prepareConfiguration([{player:p,source,options:o}],{resolve:x=>x}).then(q=>({q,p}));}));
   rows.push({n,person,real,queue,entries});
  }
  const read=(row,j,f)=>{let c;const {q,p}=row.entries[j];a(q.draw({save(){},restore(){},drawImage(v){c=v;}},p,{...o,progress:(f+.2)/8}));return pix(c);};
  const scans=[];
  try{for(let f=0;f<8;f++){
   const canv=rows.map(row=>row.queue.map((_,i)=>read(row,i,f)));
   const [b,c6,c7]=canv;const ix=g?5:3,mask6=c6[ix],mask7=c7[ix],ha=b[1],sk=b[2];
   a(mask6.equals(c6[ix+1])&&mask7.equals(c7[ix+1]),'coat raw/ordering exact to literal authority');
   for(const C of [c6,c7]){a(C[1].equals(ha)&&C[2].equals(sk),'cloth adds no hair/skin source change');if(g)a(C[3].equals(b[3])&&C[4].equals(b[4]));}
   if(g){const r=cv.createCanvas(640,640),z=d(x0).layers.find(g26).frames[f];r.getContext('2d').drawImage(await load('tools/rework-modular-outfits-hd/assets/'+z+'.png'),0,0);a(pix(r).equals(b[3]));r.width=1;}
   let own=[0,0],swaps=0,visibleHair=[0,0,0],hand=[0,0,0],joint=[0,0,0],feet=[[0,0],[0,0],[0,0]];
   const prior=looks[0]?.[f];
   for(let j=0;j<b[0].length;j+=4){
    const y=Math.floor(j/2560),x=(j/4)%640,J=[b[0],c6[0],c7[0]].map(v=>v.readUInt32LE(j));
    if(J[1]!==J[0]){a(mask6[j+3]);own[0]++;} if(J[2]!==J[0]){a(mask7[j+3]);own[1]++;}
    if(J[1]!==J[2]){a(mask6[j+3]||mask7[j+3]);swaps++;}
    if(g&&b[3][j+3]===255)for(const v of J)a.equal(v,b[3].readUInt32LE(j));
    if(!prior)continue;
    const G=prior.rgba.map(x=>x.readUInt32LE(j)),ha0=prior.ha.readUInt32LE(j),ha1=ha.readUInt32LE(j),s0=prior.sk.readUInt32LE(j),s1=sk.readUInt32LE(j);
    for(let i=0;i<3;i++){
     a.equal(canv[i][0][j+3],prior.rgba[i][j+3]);
     if(ha[j+3]===255&&ha0!==ha1&&G[i]===ha0&&J[i]===ha1)visibleHair[i]++;
     if(sk[j+3]===255&&s0!==s1&&G[i]===s0&&J[i]===s1){if(y>=400)feet[i][+(x>=320)]++;else if(y>=250)hand[i]++;}
     if(g&&sk[j+3]===255&&s0!==s1&&b[3][j+3]&&b[3][j+3]<255&&y<400){
      const k0=prior.joint.readUInt32LE(j),k1=b[4].readUInt32LE(j);
      if(k0!==k1&&G[i]===k0&&J[i]===k1)joint[i]++;
     }
    }
   }
   a(own.every(n=>n>1000)&&swaps>1000);if(prior){a(visibleHair.every(n=>n>0));a(hand.every(n=>n>0));a(feet.every(z=>z[0]>100&&z[1]>100));a.deepEqual(feet[0],feet[1]);a.deepEqual(feet[0],feet[2]);if(g)a(joint.every(n=>n>0));}
   console.log(g,skin,f,{own,swaps,visibleHair,hand,joint,feet});
   scans.push({rgba:[b[0],c6[0],c7[0]],ha,sk,joint:b[4]});phases++;
  }}finally{rows.forEach(row=>row.entries.forEach(({q})=>q.release()));global.gc?.();}
  looks.push(scans);
 }
}
a.equal(phases,32);console.log('PASS 32 saves and 32 phases for North C6/C7 over P22 with and without G26');
})().catch(e=>{console.error(e);process.exitCode=1});
