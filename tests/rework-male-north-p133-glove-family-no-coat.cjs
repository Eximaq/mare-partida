if(!process.env.GLOVE){
 for(const id of [159,166,131,138,145,152,173,180]){
  const out=require('node:child_process').spawnSync(process.execPath,['--expose-gc',__filename],{stdio:'inherit',env:{...process.env,GLOVE:String(id)}});
  if(out.error)throw out.error;
  if(out.status!==0)process.exit(out.status??1);
 }
 console.log('PASS 64 saves + 128 Canvas for North own P133 glove family coat removal');process.exit(0);
}
const a=require('node:assert/strict'),p=require('node:path'),R=p.dirname(__dirname);
const {make,cv}=require(p.join(R,'tests/rework-integration-support.cjs')),A=require(p.join(R,'character-appearance')),load=require(p.join(R,'tools/rework-hd-test-loader.cjs')).create(R);
const api=make();
const item=Number(process.env.GLOVE);a([131,138,145,152,159,166,173,180].includes(item));
const d=r=>r.pack.directions.north,I=def=>({def}),coat=l=>l.id==='coat151-authored-attack',glove=l=>l.id==='registered-frozen-glove-native-attack',owner=l=>l.id==='skin-arms-phase';
const o={direction:'north',action:'attack-unarmed',consumer:'world'},idx=require(p.join(R,'tools/rework-modular-outfits-hd/index.json')).records;
const base=idx.find(x=>x.id==='male-pants133-attack-unarmed-north-drawn8-candidate'),A26=idx.find(x=>x.id===`frozen-male-glove${item}-north-attack-unarmed-native-layers`);
const player=(skinColor,extra={},look={})=>JSON.parse(JSON.stringify(A.commit({id:'same-actor',classId:'fighter',equipment:{legs:I(133),gloves:I(item),...extra}},{skinColor,hairColor:'black',eyeColor:'blue',...look},()=>true)));
const pix=c=>Buffer.from(c.getContext('2d').getImageData(0,0,640,640).data);
const tag=':own-p133-g'+item+'-north-no-coat:',strip=(r,allow,s)=>({...r,id:r.id+':audit:'+s,pack:{...r.pack,directions:{...r.pack.directions,north:{...d(r),layers:d(r).layers.filter(allow)}}}});
(async()=>{await api.ready;
const sel=x=>api.selectVisual(x,o);
for(const skin of Object.keys(A.skins)){
 const x=player(skin),y=player(skin,{coat:I(151)}),save=JSON.stringify(x),G=sel(x),C=sel(y);
 a(G?.id.includes(tag));a(C?.id.includes(':own-north-punch-g'+item+'-bare:'));
 a.deepEqual(G.equipment,{pants:133,gloves:item});a.equal(G.slotRoutes.gloves.item,item);a.equal(G.slotRoutes.legs.item,133);a(!G.slotRoutes.coat);
 a.deepEqual(d(G).layers.filter(l=>!glove(l)),d(base).layers);
 a.deepEqual(d(G).layers.filter(glove),[d(A26).layers[1]]);
 a.deepEqual(d(G).layers,d(C).layers.filter(l=>!coat(l)));
 a(!G.sourceRefs.some(h=>d(C).layers.find(coat).frames.includes(h)));a.deepEqual(G.paletteSourceMasks,base.paletteSourceMasks);
 for(const k of ['rest','poses','clip'])a.deepEqual(d(G)[k],d(C)[k]);
 a.deepEqual(G.colorAppearance,C.colorAppearance);a(!G.bodyOcclusion);
 for(const on of [true,false,true,false]){if(on)x.equipment.coat=I(151);else delete x.equipment.coat;a.deepEqual(sel(x),on?C:G);}
 a.equal(JSON.stringify(x),save);
 for(const e of [{legs:I(22)},{gloves:I(25)},{boots:I(9)},{boots:I(155)},{weapon:I(0)},{coat:I(6)},{gloves:{def:item,variant:'other'}}])
  a(!sel(player(skin,e))?.id.includes(tag));
 for(const opts of [{...o,action:'walk'},...['south','east','west'].map(direction=>({...o,direction}))])a(!api.selectVisual(x,opts)?.id.includes(tag));
 for(const look of [{hairStyle:'hair-bob'},{eyeStyle:'face-calm'},{eyeColor:'amber'}])a(!sel(player(skin,{},look))?.id.includes(tag));
}
if(process.env.SELECT_ONLY)return;
let count=0,see=[];
for(const tone of ['porcelain','ebony']){
 const u=player(tone),v=player(tone,{coat:I(151)}),G=sel(u),C=sel(v),pairs=[[u,G],[v,C],[v,strip(C,coat,'coat')],[u,strip(G,glove,'bare-glove')],[v,strip(C,glove,'worn-glove')],[u,strip(G,owner,'own-skin')],[u,strip(G,l=>owner(l)||glove(l),'authored-attachment-contact')]];
 const sessions=await Promise.all(pairs.map(([player,source])=>api.prepareConfiguration([{player,source,options:o}],{resolve:x=>x})));
 const draw=(j,f)=>{let c;a(sessions[j].draw({save(){},restore(){},drawImage(v){c=v;}},pairs[j][0],{...o,progress:(f+.2)/8}));return pix(c);};
 try{for(let f=0;f<8;f++){
  const [g,c,k,gb,gc,skin,joint]=pairs.map((_,j)=>draw(j,f));
  const ord=global.ReworkAccessoryVendor.compositor;
  for(const x of [G,C])a(glove(ord.plan(x.pack,'north',f).at(-1)),'mandatory last/authored order');
  const src=cv.createCanvas(640,640);src.getContext('2d').drawImage(await load('tools/rework-modular-outfits-hd/assets/'+d(A26).layers[1].frames[f]+'.png'),0,0);
  a(gb.equals(gc)&&gb.equals(pix(src)));src.width=1;
  let changes=0,fringe=0,contactBare=0,contactWorn=0,plain=[0,0,0],worn=[0,0,0];for(let j=0;j<g.length;j+=4){
   const x=(j/4)%640,y=Math.floor(j/2560),a0=g.readUInt32LE(j),a1=c.readUInt32LE(j);
   if(a0!==a1){a(k[j+3]>0,'coat swap outside its own transformed alpha');changes++;if(gb[j+3]){a(gb[j+3]<255,'opaque glove changed');fringe++;}}
   if(gb[j+3]===255)a(a0===gb.readUInt32LE(j)&&a1===gc.readUInt32LE(j));
   const old=see[f];if(old&&skin[j+3]===255&&old.skin[j+3]===255&&y>=250){
    const n=y>=400?(x>=320?2:1):0,vs=skin.readUInt32LE(j),oldSkin=old.skin.readUInt32LE(j);
    if(vs!==oldSkin){
     // Proof of tone on contact, not an arbitrary arm ROI: actual authored
     // glove has a non-zero fractional raster contribution at this pixel and
     // the world color matches the engine's raw hand/skin + same glove sample.
     if(y<400&&gb[j+3]>0&&gb[j+3]<255){
      const b=joint.readUInt32LE(j),a=old.joint.readUInt32LE(j);
      if(a!==b&&a0===b&&old.g.readUInt32LE(j)===a)contactBare++;
      if(a!==b&&a1===b&&old.c.readUInt32LE(j)===a)contactWorn++;
     }
     if(a0===vs&&old.g.readUInt32LE(j)===oldSkin)plain[n]++;
     if(a1===vs&&old.c.readUInt32LE(j)===oldSkin)worn[n]++;
    }
   }
  }
  a(changes>1000);if(tone==='porcelain')see.push({g,c,skin,joint});else{a(plain.every((x,i)=>x>=worn[i]&&worn[i]>(i===0?0:100)),JSON.stringify({tone,f,plain,worn}));a.deepEqual(plain.slice(1),worn.slice(1));a(contactBare>0&&contactWorn>0,JSON.stringify({tone,f,contactBare,contactWorn}));}
  a(g.equals(draw(0,f)));a(c.equals(draw(1,f)));count++;
  console.log(tone,f,{changes,fringe,plain,worn,contactBare,contactWorn});
 }}finally{sessions.forEach(x=>x.release());global.gc?.();}
}
a.equal(count,16);console.log('PASS 8 saved tones and 16 North coat-removal Canvas checks',item);
})().catch(e=>{console.error(e);process.exitCode=1});
