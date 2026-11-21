const p=require('node:path'),a=require('node:assert/strict'),R=p.dirname(__dirname);
const {make,cv}=require(p.join(R,'tests/rework-integration-support.cjs')),A=require(p.join(R,'character-appearance')),
 index=require(p.join(R,'tools/rework-weapon-layers-hd/index.json')),load=require(p.join(R,'tools/rework-hd-test-loader.cjs')).create(R),old=make();
const api=old;
const id=def=>({def}),I=[4,113,115],n=Number(process.env.WEAPON||0),ids=n?[n]:I;
const actor=(item,x={},e={})=>JSON.parse(JSON.stringify(A.commit({id:'real-save',classId:'gunner',equipment:{weapon:id(item),...e}},{gender:'masculino',hairStyle:'original',hairColor:'black',eyeStyle:'original',eyeColor:'blue',skinColor:'light',...x},()=>true)));
const px=c=>Buffer.from(c.getContext('2d').getImageData(0,0,640,640).data),vendor=global.ReworkAccessoryVendor.compositor;
(async()=>{await Promise.all([api.ready,old.ready]);const native=global.MareReworkWeaponNativeHD.create(index,{makeCanvas:cv.createCanvas}),before=require(p.join(R,'player-rework-weapon-native-hd.js')).create(index,{makeCanvas:cv.createCanvas});let cases=0,frames=0;
for(const item of ids)for(const direction of ['south']){
 const o={direction,action:'attack-firearm',consumer:'world'},x=actor(item),save=JSON.stringify(x),r=api.select(x,o),actual=index.records.find(z=>z.item===item&&z.body==='male'&&z.direction===direction&&z.basePack);
 a.equal(r?.id,actual.id+':owned-south-firearm-iris:blue','missing true normalized route '+[item,direction]);
 a.equal(r.colorAppearance.eyeColor,'blue');a.equal(r.fps,12);a.equal(r.timeline.length,8);a.equal(r.states.length,8);
 for(const k of ['states','nativeCanvas','pivot','timeline','basePack'])a.deepEqual(r[k],actual[k]);
 const ctrlActor={...x,appearance96:{...x.appearance96,eyeColor:'original'}},control=old.select(ctrlActor,o);a.equal(control.id,actual.id);a.deepEqual(control.states,r.states);
 a(api.select(actor(item,{skinColor:'ebony'}),o)?.firearmSouthSignedPalette);
 for(const [look,eq] of [[{eyeColor:'green'},{}],[{hairColor:'silver'},{}],[{hairStyle:'hair-bob'},{}],[{eyeStyle:'face-calm'},{}],[{},{coat:id(151)}],[{},{boots:id(155)}],[{},{weapon:{def:item,variant:'other'}}]]){
  const p=actor(item,look,eq),z=api.select(p,o);a(!z?.ownedSouthFirearmIris);
 }
 for(const off of [5,114,116]){const q=api.select(actor(off),o);a(!q?.ownedSouthFirearmIris);}cases++;
 if(process.env.SELECT_ONLY)continue;
 const q=await Promise.all([[x,r],[ctrlActor,control]].map(([player,source])=>api.prepareConfiguration([{player,source,options:o}],{resolve:x=>x})));
 const draw=(j,f)=>{let c;a(q[j].draw({save(){},restore(){},drawImage(z){c=z;}},[x,ctrlActor][j],{...o,progress:(f+.2)/8}));return px(c);};
 try{for(let f=0;f<8;f++){
  const images=new Map(await Promise.all(native.requiredFiles(r,{frame:f}).map(async h=>[h,await load(h)])));
  const emit=(api,s)=>{const c=cv.createCanvas(640,640);api.render(c.getContext('2d'),s,images,{frame:f});const b=px(c);c.width=1;return b;};
  const b=emit(native,r),c=emit(before,control);a(b.equals(draw(0,f))&&c.equals(draw(1,f)));
  const g=r.basePack.pack,d=g.directions[direction],face=d.layers.find(l=>l.id==='face'),source=cv.createCanvas(640,640),paint=source.getContext('2d'),tile=cv.createCanvas(640,640);
  const pts=[[303,205,40,5,0,255,1],[304,205,50,20,14,255,1],[303,206,41,4,0,255,1],[304,206,53,21,13,255,1],[303,207,71,25,13,255,2],[304,207,82,40,29,255,2],[307,207,40,21,16,255,1],[308,207,62,24,15,255,2],[303,208,88,37,22,255,2],[304,208,103,53,38,255,3],[305,208,38,17,11,255,1],[307,208,85,43,33,255,2],[308,208,78,31,18,255,2],[303,209,57,22,13,255,1],[304,209,95,46,31,255,3],[305,209,92,44,31,255,3],[306,209,92,43,30,255,3],[307,209,108,52,38,255,3],[308,209,66,20,7,255,2],[303,210,66,50,44,255,2],[304,210,55,17,9,255,1],[305,210,80,34,22,255,2],[306,210,84,34,22,255,2],[307,210,82,32,19,255,2],[332,206,50,7,0,255,1],[332,207,84,31,18,255,2],[333,207,43,20,14,255,1],[336,207,63,29,19,255,2],[337,207,47,18,11,255,1],[332,208,81,29,15,255,2],[333,208,77,38,26,255,2],[335,208,49,22,15,255,1],[336,208,91,45,32,255,3],[337,208,62,28,17,255,2],[332,209,70,22,10,255,2],[333,209,93,46,33,255,3],[334,209,87,41,27,255,2],[335,209,95,45,30,255,3],[336,209,98,49,33,255,3],[337,209,58,27,17,255,1],[332,210,38,5,0,255,1],[333,210,67,29,19,255,2],[334,210,69,29,18,255,2],[335,210,75,33,21,255,2],[336,210,47,11,3,255,1]];a.equal(pts.length,45);
  for(const [x,y,,,,,rank] of pts){paint.fillStyle=A.eyes.blue.ramp[rank-1];paint.fillRect(x,y,1,1);}
  vendor.render(tile.getContext('2d'),{...g,directions:{[direction]:{...d,layers:[face]}}},new Map([[face.source,source]]),{direction,frame:f,density:4});
  const expected=px(tile);tile.width=source.width=1;
  const gun=r.states[f].attachment,raw=images.get('tools/rework-weapon-layers-hd/'+gun.url),arm=cv.createCanvas(640,640),cx=arm.getContext('2d');cx.transform(...gun.matrix);if(gun.mirrorX){cx.translate(gun.size[0],0);cx.scale(-1,1);}cx.drawImage(raw,0,0);const own=px(arm);arm.width=1;
  let affected=0,domain=0,ownGun=0;
  for(let i=0;i<b.length;i+=4){
   a.equal(b[i+3],c[i+3]);if(own[i+3])ownGun++;
   if(expected[i+3]){domain++;a(!own[i+3],'iris touches gun');}
   if(b.readUInt32LE(i)!==c.readUInt32LE(i)){a(expected[i+3]);a.equal(b.readUInt32LE(i),expected.readUInt32LE(i));affected++;}
  }
  a.equal(affected,domain);a(domain>=42&&domain<=48&&ownGun>100,[item,direction,f,affected,domain,ownGun]);frames++;console.log(item,direction,f,affected,ownGun);
 }}finally{q.forEach(x=>x.release());global.gc?.();}
 a.equal(JSON.stringify(x),save);
}
a.equal(cases,ids.length);if(!process.env.SELECT_ONLY)a.equal(frames,ids.length*8);
console.log('PASS',cases,'saved cases',frames,'own render phase comparisons');
})().catch(e=>{console.error(e);process.exitCode=1});
