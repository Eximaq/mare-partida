'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const repo=process.argv[2]||path.resolve(__dirname,'..');
if(process.env.KAIZOKU_CANDIDATE){
 const file=repo+'/player-rework-native-hd.js',m=new Module(file,module);m.filename=file;m.paths=Module._nodeModulePaths(repo);require.cache[file]=m;
 m._compile(fs.readFileSync(process.env.KAIZOKU_CANDIDATE,'utf8'),file);
}
const {make,cv}=require(repo+'/tests/rework-integration-support.cjs'),A=require(repo+'/character-appearance');
const load=require(repo+'/tools/rework-hd-test-loader.cjs').create(repo);
const o={consumer:'world',direction:'north',action:'walk'}, ticks=[0,5,8,10,15,18,20,25,28,30,35,38];
const px=c=>Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data);
const draw=(b,p,t)=>{let c;assert(b.draw({save(){},restore(){},drawImage(im){c=im;}},p,{...o,time:(t+.1)/40}));return c;};
(async()=>{
 const w=make();await w.ready;
 const active=process.argv[3]?Number(process.argv[3]):0, tone=process.argv[4]||'ebony',
 caseP=process.argv[5]==='none'?null:Number(process.argv[5]||168), caseB=process.argv[6]==='none'?null:Number(process.argv[6]||9);
 const actor=e=>A.commit({classId:active===0?'sword':active===5?'gunner':'strategist',equipment:Object.fromEntries(Object.entries(e).filter(([k,v])=>v!=null).map(([k,def])=>[k,{def}]))},{gender:'feminino',hairStyle:'hair-bob',hairColor:'pink',eyeColor:'green',eyeStyle:'face-calm',skinColor:tone},()=>true);
 const on=actor({weapon:active,legs:caseP,boots:caseB}),off=actor({weapon:active}),ung=actor({legs:caseP,boots:caseB}),
  r=w.selectVisual(on,o),ref=w.selectVisual(off,o),bare=w.selectVisual(ung,o);
 assert(r?.northLayers?.lower,`no HD ${active},${caseP},${caseB},${tone} ${r?.id}`);
 assert.deepEqual(r.northLayers.body.states,ref.northLayers.body.states);assert.deepEqual(r.northLayers.lower,bare.northLayers.lower);
 assert.deepEqual(r.northLayers.body.material,ref.northLayers.body.material);assert.deepEqual(r.pack,ref.pack);
 assert.equal(r.slotRoutes.weapon.item,active);assert.deepEqual(r.omitted,[]);
 const spec=r.northLayers.spec, lower=r.northLayers.lower, read=f=>JSON.parse(fs.readFileSync(path.join(repo,f))), registry=global.MareReworkBaseHD.create(read('tools/rework-base-hd/index.json'));
 const ar=global.MareFemaleNamedHairHD.create(read('tools/rework-accessories/head-layer-index.json'),read('tools/rework-accessories/female-original-face-ownership.json'),{baseRegistry:registry,makeCanvas:cv.createCanvas});
 const fr=global.MareReworkFemaleEquipmentHD.create({schema:'female-native-equipment-registration-v1',records:read('tools/rework-weapon-layers-hd/index.json').femaleRegistrations},{outfits:read('tools/rework-modular-outfits-hd/index.json'),appearanceRegistry:ar});
 const body=r.northLayers.body,pad=body.paddingPhysical||0,W=512+pad*2,mapping=new Map();
 for(const url of fr.requiredFiles(body))mapping.set(url,await load(url));
 const z=await Promise.all([on,off,ung].map(player=>w.prepareConfiguration([{player,options:o}])));
 let nn=0,visibleGear=0,lowerAndGear=0,nearContact=0;
 try{for(const [k,t] of ticks.entries()){
  const domain=cv.createCanvas(W,W),dc=domain.getContext('2d');
  for(const l of [...lower.gear,...[lower.cloth,lower.owner].filter(Boolean)])dc.drawImage(await load(lower.prefix+l.frames[t]+'.png'),pad,pad);
  const wa=cv.createCanvas(W,W);wa.getContext('2d').drawImage(draw(z[2],ung,t),pad,pad);
  const actual=px(draw(z[0],on,t)),stock=px(draw(z[1],off,t)),unarmed=px(wa),mask=px(domain),ops=[];
  const rc=cv.createCanvas(W,W);
  fr.render(rc.getContext('2d'),body,mapping,{frame:spec.phaseMap[k],makeCanvas:cv.createCanvas,captureOps:x=>ops.push(x)});
  const gear=px(ops.find(x=>x.op.part).canvas);
  let c=0,wc=0;
  for(let j=0;j<actual.length;j+=4){
   if(actual.readUInt32LE(j)!==stock.readUInt32LE(j)){assert(mask[j+3],`lower action affected other slots F${k} at ${j/4}`);c++;}
   if(actual.readUInt32LE(j)!==unarmed.readUInt32LE(j)){assert(gear[j+3],`weapon action affected other slots F${k} at ${j/4}`);wc++;}
   if(gear[j+3]&&!mask[j+3]&&actual.readUInt32LE(j)!==unarmed.readUInt32LE(j))visibleGear++;
   if(gear[j+3]&&mask[j+3]){lowerAndGear++;if(gear[j+3]<255)nearContact++;}
   if(stock[j+3]&&!actual[j+3])throw Error('Slot lowered previously visible alpha at F'+k+' : '+j/4);
  }
  assert(c>100&&wc>100,[k,c,wc]);assert(px(draw(z[1],off,t)).equals(stock));
  for(let v=t+1;v<40&&spec.frameToPhase[v]===k;v++)assert(draw(z[0],on,v)===draw(z[0],on,t));
  if(process.env.PREVIEW&&k===3)fs.writeFileSync(__dirname+`/preview-${active}-${caseP}-${caseB}-${tone}.png`,draw(z[0],on,t).toBuffer('image/png'));
  domain.width=wa.width=rc.width=1;for(const x of ops)x.canvas.width=1;nn++;
 }}finally{for(const b of z)b.release();}
 assert.equal(nn,12);
 console.log('PASS',active,tone,caseP,caseB,nn,visibleGear,lowerAndGear,nearContact);
})().catch(e=>{console.error(e);process.exitCode=1});
