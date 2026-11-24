'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const R=path.resolve(process.env.PROOF_STAGE||path.join(__dirname,'..'));
const {make,cv}=require(path.join(R,'tests/rework-integration-support.cjs'));
const A=require(path.join(R,'character-appearance.js'));
const load=require(path.join(R,'tools/rework-hd-test-loader.cjs')).create(R);
const a=require(path.join(R,'tools/rework-female-dagger-p22/index.json'));
const api=make();
(async()=>{await api.ready;const piece=cv.createCanvas(640,640),gear=cv.createCanvas(640,640),pc=piece.getContext('2d'),gc=gear.getContext('2d');let frames=0;
 for(const [direction,items] of Object.entries(a.signedBootLayers)){
  const weaponIds=[12,13,71,72,73,74],o={action:'attack-daggers',direction,consumer:'world'};
  const states=weaponIds.map(def=>{
   const p=A.commit({classId:'rogue',equipment:{weapon:{def}}},{gender:'feminino'},()=>true);
   const r=api.selectVisual(p,o);assert(r?.femaleDaggerSavedTones);
   assert.equal(r.paddingPhysical,0);return r.states;
  });
  for(let frame=0;frame<8;frame++){
   // Union of the native projected footprints of all weapon passes of every
   // receiver at this tick; exact authorized matrix, clipping and alpha.
   gc.clearRect(0,0,640,640);
   for(const row of states)for(const part of row[frame].parts){
    gc.save();gc.imageSmoothingEnabled=false;gc.transform(...part.matrix);
    if(part.sourceClip){gc.beginPath();gc.rect(...part.sourceClip);gc.clip();}
    gc.drawImage(await load(part.url),0,0);gc.restore();
   }
   const g=new Uint32Array(gc.getImageData(0,0,640,640).data.buffer);
   for(const [id,layers]of Object.entries(items)){
    // This is the legacy all-weapons union check. The new staged passes
    // have their own exact weapon-projection intersections test.
    if(direction!=='north'||layers.some(l=>l.frames.some(h=>
      a.archiveIndex.sources[h]?.archive!=='female-dagger-authored-boots-north.zip')))continue;
    pc.clearRect(0,0,640,640);for(const l of layers)pc.drawImage(await load('tools/rework-female-dagger-p22/assets/'+l.frames[frame]+'.png'),0,0);
    const b=new Uint32Array(pc.getImageData(0,0,640,640).data.buffer);let overlap=0;
    for(let i=0;i<b.length;i++)if((b[i]>>>24)&&(g[i]>>>24))overlap++;
    assert.equal(overlap,0,[direction,id,frame,'native dagger overlaps the boot passes']);frames++;
   }
  }
  console.log(direction,frames);
 }
 console.log('PASS boot alpha disjoint across all native dagger poses,',frames,'piece frames vs six recipients each');
})().catch(e=>{console.error(e);process.exitCode=1});
