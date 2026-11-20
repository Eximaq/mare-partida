const a=require('node:assert/strict'),p=require('node:path'),R=p.dirname(__dirname);
const {make,cv}=require(p.join(R,'tests/rework-integration-support.cjs')),A=require(p.join(R,'character-appearance')),load=require(p.join(R,'tools/rework-hd-test-loader.cjs')).create(R);
const api=make();
const idx=new Map(require(p.join(R,'tools/rework-modular-outfits-hd/index.json')).records.map(r=>[r.id,r]));
const I=def=>({def}),coat=l=>l.id.startsWith('coat151-');
const cases=[['north','attack-unarmed',8]];
(async()=>{await api.ready;let count=0,checks=0;
for(const [direction,action,frames] of cases){
 const d=r=>r.pack.directions[direction],o={direction,action,consumer:'world'},plain=idx.get(`male-pants22-${action}-${direction}`),
  donor=idx.get(`male-pants133-${action}-${direction}${action==='attack-unarmed'?'-drawn8-candidate':'-isolated-r2'}-coat151-native`);
 const player=(skin,e={},look={})=>JSON.parse(JSON.stringify(A.commit({id:'same-actor',classId:'fighter',equipment:{legs:I(22),coat:I(151),...e}},{skinColor:skin,hairColor:'black',eyeColor:direction==='south'?'green':'blue',...look},()=>true)));
 for(const skin of Object.keys(A.skins)){
  const q=player(skin),save=JSON.stringify(q),x=api.selectVisual(q,o);
  a(x?.id.includes(':own-p22-c151:'),[direction,action,skin,x?.id]);
  a.equal(x.colorAppearance.skin,skin);a.equal(x.colorAppearance.eyeColor,direction==='south'?'green':'blue');
  a.equal(!!x.strictSouthAppearance,direction==='south');
  a.deepEqual(x.equipment,{pants:22,torso:151});a(!x.bodyOcclusion);
  a.deepEqual(d(x).layers.filter(l=>!coat(l)),d(plain).layers);
  a.deepEqual(d(x).layers.filter(coat),d(donor).layers.filter(coat));
  for(const k of ['rest','poses','clip'])a.deepEqual(d(x)[k],d(plain)[k]);a.equal(d(x).clip.frames,frames);
  delete q.equipment.coat;const bare=api.selectVisual(q,o);a.deepEqual(d(bare).layers,d(plain).layers);
  q.equipment.coat=I(151);a.deepEqual(api.selectVisual(q,o),x);a.equal(JSON.stringify(q),save);count++;
  for(const e of [{legs:I(133)},{coat:I(6)},{coat:{def:151,variant:'other'}},{boots:I(9)},{boots:I(155)},{gloves:I(26)},{weapon:I(0)}])
   a(!api.selectVisual(player(skin,e),o)?.id.includes(':own-p22-c151:'));
  for(const look of [{head:'custom',hairStyle:'hair-bob'},{eyeStyle:'face-calm'},...(direction==='north'?[{eyeColor:'amber'}]:[])])
   a(!api.selectVisual(player(skin,{},look),o)?.id.includes(':own-p22-c151:'));
  for(const side of ['east','west'])a(!api.selectVisual(q,{...o,direction:side})?.id.includes(':own-p22-c151:'));
 }
 if(process.env.SELECT_ONLY)continue;
 const before=player('porcelain'),after=player('ebony'),bare=player('porcelain',{coat:null}),r=api.selectVisual(before,o),t=api.selectVisual(after,o),without=api.selectVisual(bare,o),w=d(r).clip.frames===8?640:512;
 const ep=direction==='south'?player('porcelain',{}, {eyeColor:'amber'}):null;
 const art=l=>coat(l)||/^pants22-|^shorts/.test(l.id), owner=l=>/^(skin-arms-phase|lower-redrawn|armLeft|armRight|handLeft|handRight)$/.test(l.id);
 const slice=(x,get,suffix)=>({...x,id:x.id+':audit:'+suffix,strictSouthAppearance:undefined,pack:{...x.pack,directions:{...x.pack.directions,[direction]:{...d(x),layers:d(x).layers.filter(get)}}}});
 const order=global.ReworkAccessoryVendor.compositor;
 const pixels=c=>Buffer.from(c.getContext('2d').getImageData(0,0,w,w).data);
 const packQ=[[before,r],[after,t],[bare,without],[before,slice(r,coat,'coat')],[before,slice(r,art,'cloth0')],[after,slice(t,art,'cloth1')],[before,slice(r,owner,'skin0')],[after,slice(t,owner,'skin1')],...(ep?[[ep,api.selectVisual(ep,o)]]:[])];
 const sessions=await Promise.all(packQ.map(async([player,source])=>await api.prepareConfiguration([{player,source,options:o}],{resolve:x=>x})));
 const draw=(j,f)=>{let c;a(sessions[j].draw({save(){},restore(){},drawImage(out){c=out}},packQ[j][0],{...o,progress:(f+.2)/frames}));return pixels(c);};
 try{
 for(let f=0;f<frames;f++){
  const [b,e,no,C,cloth0,cloth1,sk0,sk1,iris]=packQ.map((_,i)=>draw(i,f));
  a(cloth0.equals(cloth1),'clothes recolored');
  const c=cv.createCanvas(w,w), plan=d(r), src=d(donor);
  const images=new Map();
  for(const l of src.layers.filter(coat)){const h=l.frames?.[f]||l.source;images.set(h,await load('tools/rework-modular-outfits-hd/assets/'+h+'.png'));}
  order.render(c.getContext('2d'),{...donor.pack,directions:{...donor.pack.directions,[direction]:{...src,layers:src.layers.filter(coat)}}},images,{direction,frame:f,density:4});
  a(C.equals(pixels(c)),'C151 exact official rendered channels');c.width=1;
  const ownership=new Uint8Array(w*w);
  // Use the actual material-rendered isolated source layer, not skin-colour thresholds.
  let diff=0,eyes=0,hand=0,foot=[0,0],bodyY=w===640?400:336;
  for(let j=0;j<b.length;j+=4){const x=(j/4)%w,y=Math.floor(j/(4*w));const B=b.readUInt32LE(j),E=e.readUInt32LE(j);
   a.equal(b[j+3],e[j+3]);
   if(B!==no.readUInt32LE(j)){a(C[j+3],'coat change outside own transformed alpha');diff++;}
   if(iris&&B!==iris.readUInt32LE(j)){a(y<(w===640?260:210));eyes++;}
   if(B!==E&&sk0[j+3]===255&&sk1[j+3]===255&&B===sk0.readUInt32LE(j)&&E===sk1.readUInt32LE(j)){ownership[j/4]=1;if(y>=bodyY)foot[+(x>=w/2)]++;else if(y>=(w===640?250:200))hand++;}
  }
  a(diff>1000,'no meaningful coat change');if(iris)a.equal(eyes,45);
  a(foot[0]>0&&foot[1]>0&&hand>0,JSON.stringify({direction,action,f,hand,foot}));
  a(draw(0,f).equals(b),'restore/replay exact');checks++;
  console.log(direction,action,f,{foot,hand,eyes,diff});
 }
 }finally{sessions.forEach(s=>s.release());global.gc?.();}
}
a.equal(count,8);
if(process.env.SELECT_ONLY)console.log('PASS 8 saves for North punch P22/C151; selector only');
else{a.equal(checks,8);console.log('PASS 8 saves, 16 Canvas 8 phases x 2, North own P22/C151 punch');}
})().catch(e=>{console.error(e);process.exitCode=1});
