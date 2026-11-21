const {make,cv}=require('./rework-integration-support.cjs'),A=require('../character-appearance'),a=require('node:assert/strict'),api=make(),W=require('../player-rework-weapon-native-hd').create(require('../tools/rework-weapon-layers-hd/index.json'));
const path='tools/rework-modular-outfits-hd/assets/',load=require('../tools/rework-hd-test-loader.cjs').create(require('node:path').join(__dirname,'..'));
const auth={east:{x:-8,y:4,source:'45de7576039c538aee29ff5a5d0def51143e8cbf90a33cdead504d88fd2ea713',mask:'fc4d94176143c1a1bace649e35262ec9f5e5b5aae0e7e932d2eeb1f882c5359a'},west:{x:8,y:4,source:'a1359e16013832c487942d028404f7a5c59f4afd4a7e96eb480aa1a1d34db07e',mask:'fccea53415dc2acf040461dcc81b112d6275bf0dddf888b4f9d947ad552324c1'}};
const makeSave=(def,hairColor,eyeColor,other={})=>JSON.parse(JSON.stringify(A.commit({id:'body-save',classId:'rogue',equipment:{weapon:{def}}},{hairStyle:'original',hairColor,eyeStyle:'original',skinColor:'light',eyeColor,...other},()=>true)));
const pixels=c=>Buffer.from(c.getContext('2d').getImageData(0,0,640,640).data);
async function read(h){const c=cv.createCanvas(640,640);c.getContext('2d').drawImage(await load(path+h+'.png'),0,0);const p=pixels(c);c.width=c.height=1;return p;}
(async()=>{await api.ready;let count=0,selects=0;
 for(const direction of ['east','west']){const reg=auth[direction],atlas=await read(reg.mask),source=await read(reg.source),rank=new Uint8Array(640*640),iris=new Uint8Array(640*640);
 for(let k=0;k<rank.length;k++)if(atlas[k*4])rank[k+reg.x+reg.y*640]=atlas[k*4];
 a.equal(rank.filter(x=>x).length,4040);
 for(const [x,y,R,G,B,A,t] of global.MareReworkModularOutfitsHD.sideIrisSamples(direction))iris[(y+68)*640+x+(direction==='east'?56:72)]=t;
 for(let j=0;j<rank.length;j++)if(rank[j])a(!iris[j]);a.equal(iris.filter(x=>x).length,18);
 for(const def of [12,13,71,72,73,74]){
 const o={direction,action:'attack-daggers',consumer:'world'},go=p=>api.selectVisual(p,o),baseline=go(makeSave(def,'brown','brown'));
 for(const hair of Object.keys(A.hairs).filter(k=>k!=='brown'))for(const eye of ['brown','green']){
  const actor=makeSave(def,hair,eye),copy=JSON.stringify(actor),r=go(actor);a.equal(r?.orderedDaggerHair,hair);a.equal(r.orderedDaggerIris,eye==='brown'?undefined:eye);
  for(const k of ['states','timeline','pivot','nativeCanvas','approvedAppearance','equipmentContract','visualSampling'])a.deepEqual(r[k],baseline[k]);
  a.equal(r.fps,12);a.equal(r.contactTick,4);a.equal(r.timeline.length,8);
  const baseFiles=W.requiredFiles(baseline),actual=W.requiredFiles(r);a.deepEqual(actual.filter(f=>!baseFiles.includes(f)),[path+reg.source+'.png',path+reg.mask+'.png']);
  a.equal(go(makeSave(def,hair,eye,{skinColor:'ebony'}))?.maleDaggerSideTone,'ebony');
  for(const bad of [makeSave(def,hair,eye,{hairStyle:'hair-bob'}),makeSave(def,hair,eye,{eyeStyle:'face-focused'}),{...actor,classId:'fighter'},{...actor,equipment:{weapon:{def,variant:'other'}}},{...actor,equipment:{...actor.equipment,coat:{def:151}}}])a(!go(bad)?.orderedDaggerHair);
  a(!api.selectVisual(actor,{...o,direction:'north'})?.orderedDaggerHair);const southRoute=api.selectVisual(actor,{...o,direction:'south'});
  if([12,13].includes(def)){a(southRoute?.approvedDagger13South);a.equal(southRoute.orderedDaggerHair,hair);a(!southRoute.orderedDaggerIris);}
  else a(!southRoute?.orderedDaggerHair);a(!api.selectVisual(actor,{...o,action:'idle'})?.orderedDaggerHair);
  a.equal(JSON.stringify(actor),copy);selects++;
 }
 const rows=[['brown','brown'],['silver','brown'],['pink','amber']].map(([hair,eye])=>{const player=makeSave(def,hair,eye);return {hair,eye,player,source:go(player)};});
 const q=await Promise.all(rows.map(row=>api.prepareConfiguration([{player:row.player,source:row.source,options:o}],{resolve:x=>x})));
 const draw=(i,f)=>{let c;a(q[i].draw({save(){},restore(){},drawImage(im){c=im;}},rows[i].player,{...o,progress:(f+.2)/8}));return pixels(c);};
 try{for(let f=0;f<8;f++){
  const b=draw(0,f);for(const i of [1,2]){const x=draw(i,f),colors=A.hairs[rows[i].hair].ramp.map(c=>Buffer.from(c.slice(1),'hex')),eyes=A.eyes[rows[i].eye].ramp.map(c=>Buffer.from(c.slice(1),'hex'));let n=0,e=0;
   for(let k=0;k<rank.length;k++){
    const j=k*4;a.equal(x[j+3],b[j+3]);const changed=x.readUInt32LE(j)!==b.readUInt32LE(j);
    if(rank[k]){a(changed);a.equal(b.readUInt32LE(j),source.readUInt32LE((k-reg.x-reg.y*640)*4));a.deepEqual(x.subarray(j,j+3),colors[rank[k]-1]);n++;}
    else if(i===2&&iris[k]){a(changed);a.deepEqual(x.subarray(j,j+3),eyes[iris[k]-1]);e++;}else a(!changed);
   }a.equal(n,4040);a.equal(e,i===2?18:0);count++;
  }a.deepEqual(draw(0,f),b);
 }}finally{q.forEach(s=>s.release());}console.log('PASS',def,direction,16);global.gc?.();
 }
 }
 a.equal(count,192);a.equal(selects,216);console.log('PASS',selects,'saved combinations;',count,'Canvas vs 96 original controls; 4040 hair / max 18 iris samples');
})().catch(e=>{console.error(e);process.exitCode=1});
