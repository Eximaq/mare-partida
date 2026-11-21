'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {make,cv}=require('./rework-integration-support.cjs');

test('NORTH/EAST/WEST retain one native canvas per authored pose, not one per tick',{timeout:120000},async()=>{
 const native=make();await native.ready;
 const player={classId:'gunner',factionId:'pirate',appearance96:{gender:'feminino',hairStyle:'hair-cropped',hairColor:'blonde',eyeStyle:'original',eyeColor:'amber',skinColor:'dark'},equipment:{legs:{def:21},weapon:{def:5}}};
 const dirs=['north','east','west'];
 const poses=dirs.map(direction=>({player,options:{action:'walk',direction,consumer:'world'}}));
 const bundle=await native.prepareConfiguration(poses);
 try{
  assert.equal(bundle.coverage.length,3);
  for(const {options:o} of poses){
   const r=native.select(player,o),holds=r.northLayers?.spec.frameToPhase??r.profileLayers.spec.directions[o.direction].clock;
   const byPhase=new Map(),sink=cv.createCanvas(1,1),ctx=sink.getContext('2d');
   let seen;
   ctx.drawImage=im=>{seen=im;};
   for(let tick=0;tick<40;tick++){
    seen=null;assert(bundle.draw(ctx,player,{...o,time:(tick+.1)/40,x:1,y:1}));
    assert(seen);assert.equal(seen.width,512);assert.equal(seen.height,512);
    const phase=holds[tick];
    if(byPhase.has(phase))assert.strictEqual(seen,byPhase.get(phase),o.direction+'/'+tick);
    else byPhase.set(phase,seen);
   }
   assert.equal(byPhase.size,12);assert.equal(new Set(byPhase.values()).size,12);
   assert.equal(bundle.coverage.find(x=>x.direction===o.direction).frames,40);
  }
 } finally {bundle.release();}
 const ctx=cv.createCanvas(1,1).getContext('2d');
 assert.equal(bundle.draw(ctx,player,{...poses[0].options,time:0,x:0,y:0}),false);
});
