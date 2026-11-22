'use strict';
const p=require('node:path'),a=require('node:assert/strict'),crypto=require('node:crypto');
const R=p.resolve(process.env.KAIZOKU_REPO||p.join(__dirname,'..')),C=process.env.CANDIDATE_DIR||R;
const rootDir=R+'/tools/rework-modular-outfits-hd',I=require(rootDir+'/index.json'),A=require(rootDir+'/archives/archive-index.json');
const {cv}=require(R+'/tests/rework-integration-support.cjs'),V=global.ReworkAccessoryVendor.compositor;
const registry=require(p.join(C,'tools/verification/player-rework-male-boot-slots.js')).create(I,A),load=require(R+'/tools/rework-hd-test-loader.cjs').create(R);
const folded=e=>[e.action,e.direction,e.item];
(async()=>{
 const units=registry.entries(),summary={},held=registry.held();let attach=0;
 for(const e of units){
  summary[e.action]=(summary[e.action]||0)+1;
  a(e.layers.every(l=>!(e.record.equipmentLayerGroups?.torso||[]).includes(l.id)&&(l.frames||[l.source]).every(h=>A.sources[h])));
  a(registry.candidates(...folded(e)).includes(e));
  const exact=registry.forPose({target:e.record,item:e.item});
  if(e.requiresCalibration||e.fused||e.unavailable)a.equal(exact,null);
  if(exact){attach++;a.deepEqual(exact.layers,e.layers);}
 }
 a(summary.idle>60&&summary.walk>60);a(summary['attack-unarmed']>0&&summary['attack-focus']>0);
 const e=units.find(e=>e.kind==='declared'&&e.action==='walk'&&e.direction==='north');
 const d=e.record.pack.directions[e.direction],copy=(layers)=>({...e.record.pack,directions:{[e.direction]:{...d,layers}}}),ids=e.layers.map(l=>l.id);
 const without=d.layers.filter(l=>!ids.includes(l.id)),target={...e.record,equipment:{...e.record.equipment,boots:null},pack:copy(without)};
 const samePiece=registry.forPose({target,item:e.item});a(samePiece);a.deepEqual(samePiece.layers,e.layers);a.deepEqual(samePiece.replaceLayerIds,[]);
 // Occupancy numbers are not pose authority: metadata-only variations do
 // not affect resolution, but a different lower raster or transform does.
 a.deepEqual(registry.forPose({target:{...target,equipment:{torso:6,pants:22,gloves:25}},item:e.item}),samePiece);
 a.equal(registry.forPose({target:{...target,pack:copy(without.map(l=>l.id==='lower-redrawn'?{...l,frames:l.frames.map(()=>l.frames[1])}:l))},item:e.item}),null);
 a.equal(registry.forPose({target:{...target,action:'idle'},item:e.item}),null);
 a.equal(registry.forPose({target:{...target,body:'female'},item:e.item}),null);
 a.equal(registry.forPose({target,item:9999}),null);
 const manifest=new Map(await Promise.all([...new Set(e.record.sourceRefs)].map(async h=>[h,await load('tools/rework-modular-outfits-hd/assets/'+h+'.png')])));
 // Put unchanged boot layers back in the original signed paint order and
 // prove every rendered frame, not merely object equality or selection.
 const restored=d.layers.map(l=>ids.includes(l.id)?samePiece.layers.find(q=>q.id===l.id):without.find(q=>q.id===l.id));
 const packs=[e.record.pack,copy(restored),copy(without)];
 const draw=(pack,f)=>{const c=cv.createCanvas(pack.frame.width*4,pack.frame.height*4),x=c.getContext('2d');V.render(x,pack,manifest,{direction:e.direction,frame:f,density:4});
 const buf=x.getImageData(0,0,c.width,c.height).data;c.width=1;return crypto.createHash('sha256').update(buf).digest('hex');};
 for(let f=0;f<d.clip.frames;f++){const [before,on,off]=packs.map(q=>draw(q,f));a.equal(on,before);a.notEqual(on,off);}
 console.log(JSON.stringify({summary,sourceRows:units.length,heldRows:held.length,exactSelfRows:attach,nativeReplays:d.clip.frames,source:e.sourceId}));
})().catch(e=>{console.error(e);process.exitCode=1});
