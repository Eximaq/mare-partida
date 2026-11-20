const p=require('node:path'),a=require('node:assert/strict'),R=p.dirname(__dirname);
const {make,cv}=require(p.join(R,'tests/rework-integration-support.cjs')),A=require(p.join(R,'character-appearance')),
 index=require(p.join(R,'tools/rework-weapon-layers-hd/index.json')),load=require(p.join(R,'tools/rework-hd-test-loader.cjs')).create(R),old=make();
const api=old;
const id=def=>({def}),o={direction:'north',action:'attack-firearm',consumer:'world'},ids=[4,5,113,115,116];
const actor=(item,x={},e={})=>JSON.parse(JSON.stringify(A.commit({id:'real-save',classId:'gunner',equipment:{weapon:id(item),...e}},{gender:'masculino',hairStyle:'original',hairColor:'black',eyeStyle:'original',eyeColor:'blue',skinColor:'light',...x},()=>true)));
const source=i=>index.records.find(r=>r.item===i&&r.body==='male'&&r.direction==='north'&&r.paletteSupport?.includes('hairColor'));
(async()=>{await Promise.all([api.ready,old.ready]);
for(const item of ids){
 const x=actor(item),save=JSON.stringify(x),r=api.select(x,o),ref=source(item);
 a(r?.id===ref.id,'default saved Blue route missing for '+item);
 a.equal(r.colorAppearance.eyeColor,'blue');a.equal(JSON.stringify(x),save);
 a.equal(r.fps,24);a.equal(r.timeline.length,48);a.equal(r.states.length,3);
 for(const k of ['states','nativeCanvas','pivot','timeline','sourceArchiveSHA256'])a.deepEqual(r[k],ref[k]);
 const eyeCtrl={...x,appearance96:{...x.appearance96,eyeColor:'original'}},ctrl=api.select(eyeCtrl,o);
 a.equal(ctrl?.id,ref.id);a.deepEqual(r.states,ctrl.states);a.deepEqual(r.timeline,ctrl.timeline);
 for(const [eye,extra,options] of [
  [{eyeColor:'green'},{},o],[{skinColor:'ebony'},{},o],[{hairColor:'silver'},{},o],[{eyeStyle:'face-calm'},{},o],[{hairStyle:'hair-bob'},{},o],
  [{},{coat:id(151)},o],[{},{gloves:id(26)},o],[{},{boots:id(9)},o],[{},{weapon:{def:item,variant:'other'}},o],
  [{},{}, {...o,direction:'east'}],[{},{}, {...o,direction:'west'}],[{},{}, {...o,direction:'south'}],[{},{}, {...o,action:'walk'}]
 ]){
  const p=actor(item,eye,extra),y=api.select(p,options);
  a(!y||y.id!==ref.id);
 }
}
a(!api.select(actor(114),o));
console.log('PASS 5 default North bare firearm saves, true Blue metadata and signed state/clock');
if(process.env.SELECT_ONLY)return;
const native=global.MareReworkWeaponNativeHD.create(index,{makeCanvas:cv.createCanvas});
const bytes=c=>Buffer.from(c.getContext('2d').getImageData(0,0,640,640).data);
let all=0,states=0;
for(const item of ids){
 const saved=actor(item),snapshot=JSON.stringify(saved),ref={...saved,appearance96:{...saved.appearance96,eyeColor:'original'}};
 const r=api.select(saved,o),c=old.select(ref,o);a(c);
 const photos=await Promise.all([[saved,r],[ref,c]].map(([player,source])=>api.prepareConfiguration([{player,source,options:o}],{resolve:x=>x})));
 const draw=(j,k)=>{let img;a(photos[j].draw({save(){},restore(){},drawImage(v){img=v;}},[saved,ref][j],{...o,progress:(k+.2)/48}));a.equal(img.width,640);return bytes(img);};
 const groups=[];
 try{
  for(let f=0;f<3;f++){
   const images=new Map(await Promise.all(native.requiredFiles(r,{frame:f}).map(async h=>[h,await load(h)])));
   const emit=(record,look)=>{const tile=cv.createCanvas(640,640),result=native.render(tile.getContext('2d'),record,images,{frame:f,appearance:look});a.equal(result.fps,24);a.deepEqual(result.timeline,r.timeline);const res=bytes(tile);tile.width=1;return res;};
   const originalEyes=emit(c,c.colorAppearance),actual=emit(r,r.colorAppearance);
   a(actual.equals(originalEyes),'Blue changed immutable pixels');
   const contrast=emit(c,{...c.colorAppearance,skin:'ebony',skinColor:'ebony',hairColor:'silver'});
   const [arms,gear,hands,rear]=r.states[f].layers;
   const source=l=>images.get('tools/rework-weapon-layers-hd/'+l.url);
   // The authored weapon contribution is the original raster with later
   // anatomical alpha erased, not the final color behind a transparent fringe.
   const overlay=cv.createCanvas(640,640),ctx=overlay.getContext('2d');
   ctx.drawImage(source(gear),0,0);ctx.globalCompositeOperation='destination-out';for(const l of [hands,rear])ctx.drawImage(source(l),0,0);
   const ownGun=bytes(overlay);overlay.width=1;
   const human=(look,l)=>emit({...r,states:r.states.map((st,i)=>i===f?{...st,layers:[l]}:st)},look);
   const layerCompare=[arms,hands,rear].map(l=>[human(r.colorAppearance,l),human({...c.colorAppearance,skin:'ebony',skinColor:'ebony',hairColor:'silver'},l)]);
   let skin=0,hair=0,outline=0,opaqueGun=0,visibleGun=0;
   const q=cv.createCanvas(640,640),cx=q.getContext('2d');
   const mat=[arms,hands,rear].map(l=>{cx.clearRect(0,0,640,640);cx.drawImage(images.get('tools/rework-weapon-layers-hd/'+l.paletteMask.url),0,0);return bytes(q);});
   q.width=1;
   for(let j=0;j<actual.length;j+=4){
    a.equal(actual[j+3],contrast[j+3]);for(const [p,q] of layerCompare)a.equal(p[j+3],q[j+3]);if(ownGun[j+3])visibleGun++;
    const v=actual.readUInt32LE(j),t=contrast.readUInt32LE(j);
    if(v!==t)a(mat.some(b=>b[j]||b[j+1]),'changed outside signed material channels');
    if(ownGun[j+3]===255){a(v===ownGun.readUInt32LE(j)&&t===v);opaqueGun++;}
    const y=Math.floor(j/2560),h0=layerCompare[2][0],h1=layerCompare[2][1];
    if(y<218&&h0[j+3]===255){
     a(v===h0.readUInt32LE(j)&&t===h1.readUInt32LE(j),'movement or gear changed the rear head');
     if(mat[2][j+1]){if(v!==t)hair++;}else{a.equal(v,t,'outline unowned may not be recolored');outline++;}
    }
    if(v!==t&&mat.some(m=>m[j])&&y>=218)skin++;
   }
   a(hair>4000&&skin>1000&&outline>500&&visibleGun>0,JSON.stringify({item,f,hair,skin,outline,opaqueGun,visibleGun}));
   // Directly re-render the isolated hand in both eye metadata states.
   a(human(r.colorAppearance,hands).equals(human(c.colorAppearance,hands)));a(human(r.colorAppearance,gear).equals(human(c.colorAppearance,gear)));
   groups.push(actual);states++;
   console.log(item,f,{hair,skin,outline,opaqueGun,visibleGun});
  }
  for(let k=0;k<48;k++){
   const b=draw(0,k),a0=draw(1,k),expected=groups[Number(r.timeline[k])];
   a(b.equals(a0)&&b.equals(expected),'weapon/world tick '+[item,k,r.timeline[k]]);all++;
  }
 }finally{photos.forEach(q=>q.release());global.gc?.();}
 a.equal(JSON.stringify(saved),snapshot);
}
a.equal(all,240);a.equal(states,15);console.log('PASS 15 own North source states, 240 rendered tick comparisons, no eyes and no saved look mutation');
})().catch(e=>{console.error(e);process.exitCode=1});
