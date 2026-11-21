const a=require('node:assert/strict'),p=require('node:path'),fs=require('node:fs'),R=p.dirname(__dirname),{cv}=require(p.join(R,'tests/rework-integration-support.cjs'));
const load=require(p.join(R,'tools/rework-hd-test-loader.cjs')).create(R),A=require(p.join(R,'character-appearance.js')),v=global.ReworkAccessoryVendor.compositor;
const api=require(p.join(R,'player-rework-native-hd.js')).create({fetchJSON:async f=>JSON.parse(fs.existsSync(p.join(R,f))?fs.readFileSync(p.join(R,f)):require('node:zlib').gunzipSync(fs.readFileSync(p.join(R,f+'.gz')))),loadImage:load,makeCanvas:cv.createCanvas});
const asset=h=>'tools/rework-modular-outfits-hd/assets/'+h+'.png';
const pants=147;
const I=def=>({def}),d=x=>x.pack.directions.north,pix=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
const actor=(boot,skin)=>JSON.parse(JSON.stringify(A.commit({id:'same-actor',classId:'fighter',equipment:{coat:I(151),legs:I(pants),gloves:I(25),...(boot?{boots:I(155)}:{})}},{skinColor:skin,hairColor:'black',eyeColor:'blue'},()=>true)));
async function plane(r,layers,f){const c=cv.createCanvas(512,512);let m=new Map();
 for(const l of layers){const h=l.frames?.[f]||l.source;m.set(h,await load(asset(h)));}
 v.render(c.getContext('2d'),{...r.pack,directions:{north:{...d(r),layers}}},m,{direction:'north',frame:f,density:4});const data=pix(c);c.width=1;return data;
}
(async()=>{await api.ready;const rows=[];
 for(const action of ['idle','walk']){
  const o={action,direction:'north',consumer:'world'};
  for(const s of ['Left','Right']){
   const combos=[];
   try{
    for(const boot of [0,155])for(const skin of ['porcelain','ebony']){
     const player=actor(boot,skin),r=api.selectVisual(player,o), hand=d(r).layers.find(l=>l.id==='hand'+s),g=d(r).layers.find(l=>l.id==='glove25-north-'+s.toLowerCase());
     a(r.paletteSourceMasks[hand.source].skin);a(!r.paletteSourceMasks[g.source]&&!r.baseMaterialSources[g.source]);
     const reference=api.selectVisual({...player,equipment:{...player.equipment,legs:I(133)}},o);a.deepEqual(hand,d(reference).layers.find(l=>l.id===hand.id));a.deepEqual(g,d(reference).layers.find(l=>l.id===g.id));a.deepEqual(r.paletteSourceMasks[hand.source],reference.paletteSourceMasks[hand.source]);
     const {[hand.source]:removed,...paletteSourceMasks}=r.paletteSourceMasks;
     const muted={...r,id:r.id+':probe-muted-'+s,paletteSourceMasks};
     const prepare=source=>api.prepareConfiguration([{player,source,options:o}],{resolve:x=>x});
     combos.push({player,r,hand,g,on:await prepare(r),off:await prepare(muted)});
    }
    const n=d(combos[0].r).clip.frames;
    for(let f=0;f<n;f++){
     const {r,hand}=combos[0],allG=d(r).layers.filter(l=>l.id.startsWith('glove25-north-'));
     const [handPlane,glovePlane]=await Promise.all([plane(r,[hand],f),plane(r,allG,f)]);
     const draw=(q,player)=>{let c;a(q.draw({save(){},restore(){},drawImage(x){c=x;}},player,{...o,progress:(f+.2)/n}));return pix(c);};
     const images=combos.map(({player,on,off})=>[draw(on,player),draw(off,player)]);
     let count=0,soft=0,opening=0,tones=0;
     for(let k=0;k<handPlane.length;k+=4){
      const q=images.map(x=>x.map(im=>im.readUInt32LE(k)));
      if(!q.some(([x,y])=>x!==y))continue;
      a(handPlane[k+3]>0,'hand-mask delta outside own posed hand');
      a(glovePlane[k+3]<255,'hand pigment visible over opaque glove');
      a.deepEqual(q[0],q[2],'porcelain hand/art depends on boot');
      a.deepEqual(q[1],q[3],'ebony hand/art depends on boot');
      a.equal(q[0][0]>>>24,q[1][0]>>>24,'hand matte alfa altered');
      if(q[0][0]!==q[1][0])tones++;
      if(glovePlane[k+3])soft++;else opening++;
      count++;
     }
     rows.push({action,hand:s,f,count,soft,opening,tones});
    }
   }finally{for(const c of combos){c.on.release();c.off.release();}global.gc?.();}
  }
 }
 a.equal(rows.length,34);for(const row of rows){a(row.count>400);a(row.soft>300);a(row.opening>0);a(row.tones>0);}
 console.log('PASS 34 separate finger mattes for P147/G25');
})().catch(e=>{console.error(e);process.exitCode=1});
