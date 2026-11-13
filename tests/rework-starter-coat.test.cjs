'use strict';
const assert=require('node:assert/strict');
const {test}=require('node:test');
const base=require('../tools/rework-base-hd/index.json');
const outfits=require('../tools/rework-modular-outfits-hd/index.json');
const plan=require('../tools/rework-weapon-layers-hd/carry-binding-plan.json');
const carry=require('../player-rework-weapon-carry-hd.js').create(base,plan,{vendor:{compositor:{}}});
const {adaptIsolatedCoat,adaptPants22}=require('../player-rework-outfit-carry-overlay-hd.js');

test('male starter keeps authored body, weapon, pivots and timing when applying coat 6',()=>{
 for(const direction of ['south','north','east','west'])for(const action of ['idle','walk']){
  const source=carry.resolve({item:0,body:'male',action,direction,equipment:{weapon:0}});
  const dressed=adaptIsolatedCoat(source,outfits,{coat:6});
  assert(dressed,direction+'/'+action);
  assert.equal(dressed.outfitOverlay.sourceRecord,'male-torso6-'+direction+'-frozen-'+action+'-native');
  assert.equal(dressed.plan,source.plan);
  assert.deepEqual(dressed.base.pack.pivot,source.base.pack.pivot);
  const authored=source.base.pack.directions[direction],resolved=dressed.base.pack.directions[direction];
  assert.deepEqual(resolved.clip,authored.clip);
  assert.deepEqual(resolved.poses,authored.poses);
  assert.deepEqual(resolved.layers.slice(0,authored.layers.length),authored.layers);
  assert.deepEqual(dressed.preMirroredLayers,direction==='west'?resolved.layers.slice(authored.layers.length).map(layer=>layer.id):[]);
 }
});

test('male coat seam and collar repair layers keep the registered coat identity',()=>{
 for(const coat of [7,130,137,144,158,165,172,179])
  for(const direction of ['south','north','east','west'])for(const action of ['idle','walk']){
   const source=carry.resolve({item:0,body:'male',action,direction,equipment:{weapon:0}});
   const dressed=adaptIsolatedCoat(source,outfits,{coat});
   assert.equal(dressed?.outfitOverlay.item,coat,coat+'/'+action+'/'+direction);
   assert.equal(dressed?.outfitOverlay.sourceRecord,'male-torso'+coat+'-'+direction+'-frozen-'+action+'-native');
  }
});

test('coat 6 is rejected when its authored body or frame contract differs',()=>{
 const source=carry.resolve({item:0,body:'male',action:'walk',direction:'east',equipment:{weapon:0}});
 const changed=structuredClone(source);
 changed.base.pack.directions.east.poses[0].HIP.x++;
 assert.equal(adaptIsolatedCoat(changed,outfits,{coat:6}),null);
 assert.equal(adaptIsolatedCoat(source,outfits,{coat:9999}),null);
 assert.equal(adaptIsolatedCoat({...source,base:{...source.base,body:'female'}},outfits,{coat:6}),null);
});

test('pants 22 uses its own authored leg layer alongside weapon and coat',()=>{
 for(const direction of ['south','north','east','west'])for(const action of ['idle','walk']){
  const source=carry.resolve({item:0,body:'male',action,direction,equipment:{weapon:0},appearance:{hairStyle:'hair-bob'}});
  const coat=adaptIsolatedCoat(source,outfits,{coat:6});
  const pants=adaptPants22(coat,outfits);
  assert(pants,direction+'/'+action);
  assert.equal(pants.outfitOverlay.sourceRecord,'male-pants22-'+action+'-'+direction);
  assert(pants.id.endsWith('-coat6-native-pants22-native'));
  assert.deepEqual(pants.base.pack.directions[direction].poses,source.base.pack.directions[direction].poses);
  assert.equal(pants.plan,source.plan);
 }
});

test('female equipment resolves authored coat walk and matching punch without treating the sword as a punch',async()=>{
 const {make,cv}=require('./rework-integration-support.cjs');
 const api=make();
 await api.ready;
 const appearance96={gender:'feminino',hairStyle:'hair-bob',hairColor:'pink',skinColor:'dark',eyeStyle:'face-calm',eyeColor:'green'};
 for(const direction of ['south','north','east','west']){
  const look=weapon=>({appearance96,equipment:{weapon:{def:weapon},coat:{def:6}}});
  const walk=api.select(look(0),{action:'walk',direction});
  assert(walk?.outfitSourceId?.startsWith('female-torso6-'),direction);
  assert.equal(walk.material.hairColor,'pink');
  assert.equal(walk.material.skinColor,'dark');
  assert.equal(walk.states.length,40);
  assert.equal(walk.states[0],walk.states[4]);
  assert.notEqual(walk.states[4],walk.states[5]);
  const punch=api.select(look(2),{action:'attack-unarmed',direction});
  assert(punch?.outfitSourceId?.startsWith('female-torso6-'),direction);
  const options={action:'attack-unarmed',direction,x:100,y:140};
  const prepared=await api.prepareConfiguration([{player:look(2),options}]);
  try{
   const ctx=cv.createCanvas(200,200).getContext('2d');
   assert.equal(prepared.coverage[0].frames,8);
   assert(prepared.draw(ctx,look(2),options));
  }finally{prepared.release();}
  const swordOptions={...options,action:'attack-sword'};
  const bare=api.select({appearance96,equipment:{weapon:{def:0}}},swordOptions);
  for(const def of [6,7,130,137,144,151,158,165,172,179]){
   const equipped={appearance96,equipment:{weapon:{def:0},coat:{def}}};
   const record=api.select(equipped,swordOptions);
   assert.equal(record.outfitSourceId,'female-torso'+def+'-'+direction+'-frozen-attack-native');
   assert.deepEqual(record.states,bare.states);
   const base=record.baseRecord.pack.directions[direction];
   assert.deepEqual(base.clip,bare.baseRecord.pack.directions[direction].clip);
   assert(base.layers.some(layer=>layer.id.startsWith('coat'+def+'-')));
  }
  const sword=api.select(look(0),swordOptions);
  assert.match(sword.id,new RegExp('^female0-attack-sword-'+direction+'-candidate-coat6-native-sword'));
  assert.equal(sword.states.length,8);
  assert.equal(sword.material.skinColor,'dark');
  const preparedSword=await api.prepareConfiguration([{player:look(0),options:swordOptions}]);
  try{
   assert.equal(preparedSword.coverage[0].frames,8);
   const ctx=cv.createCanvas(200,200).getContext('2d');
   for(let frame=0;frame<8;frame++){
    ctx.clearRect(0,0,200,200);
    assert(preparedSword.draw(ctx,look(0),{...swordOptions,progress:(frame+.25)/8}));
    assert(ctx.getImageData(0,0,200,200).data.some((value,i)=>i%4===3&&value));
   }
  }finally{preparedSword.release();}
 }
});

test('male starter sword uses isolated blade sources with the selected coat and hair',async()=>{
 const {make,cv}=require('./rework-integration-support.cjs');
 const api=make();
 await api.ready;
 const player={appearance96:{gender:'masculino',hairStyle:'hair-bob',hairColor:'pink',skinColor:'dark',eyeStyle:'face-calm',eyeColor:'green'},equipment:{weapon:{def:0},coat:{def:6}}};
 const canvas=cv.createCanvas(200,200),ctx=canvas.getContext('2d');
 for(const direction of ['east','west','north']){
  const options={action:'attack-sword',direction,consumer:'world',x:100,y:140};
  const record=api.select(player,options);
  assert.match(record.id,/sword0-.*-(?:native-attachment|historical-attack)-coat6-adapted-bob/);
  assert.equal(record.adaptedCoat,'male-torso6-'+direction+'-frozen-attack-native-candidate');
  const prepared=await api.prepareConfiguration([{player,options}]);
  try{
   assert.equal(prepared.coverage[0].frames,record.timeline.length);
   assert(prepared.draw(ctx,player,options));
   assert(ctx.getImageData(0,0,200,200).data.some((value,i)=>i%4===3&&value));
  }finally{prepared.release();}
 }
});

test('female pants 168 replaces only shorts in compatible equipped weapon clips',async()=>{
 const {make,cv}=require('./rework-integration-support.cjs'),api=make();
 await api.ready;
 const appearance96={gender:'feminino',hairStyle:'hair-bob',hairColor:'pink',skinColor:'dark',eyeStyle:'face-almond',eyeColor:'green'};
 const player={appearance96,equipment:{weapon:{def:2},legs:{def:168},coat:{def:151}}};
 const options=[];
 for(const direction of ['south','north','east','west'])for(const action of ['idle','walk','attack-unarmed']){
  const o={action,direction,x:100,y:145};
  const source=api.select(player,o);
  assert.equal(source?.outfitSourceId,'female-pants168-'+action+'-'+direction);
  assert.match(source.coatSourceId,/female-torso151-/);
  assert.equal(source.material.eyeStyle,'face-almond');
  assert.equal(source.material.eyeColor,'green');
  options.push({player,options:o});
 }
 const prepared=await api.prepareConfiguration(options);
 try{
  const ctx=cv.createCanvas(200,200).getContext('2d');
  assert.equal(prepared.coverage.length,12);
  for(const {options:o} of options)assert(prepared.draw(ctx,player,o));
 }finally{prepared.release();}
 assert.equal(api.select({...player,equipment:{...player.equipment,weapon:{def:0}}},{action:'attack-sword',direction:'east'}),null);
});

test('male pants 21 renders independent generated layers in all supported directions and actions',async()=>{
 const {make,cv}=require('./rework-integration-support.cjs'),api=make();
 await api.ready;
 const player={appearance96:{gender:'masculino',hairStyle:'original',hairColor:'original',skinColor:'original'},equipment:{legs:{def:21}}};
 const poses=['south','north','east','west'].flatMap(direction=>['idle','walk','attack-unarmed'].map(action=>({player,options:{direction,action,x:100,y:150}})));
 const prepared=await api.prepareConfiguration(poses);
 try{
  for(const {options} of poses){
   assert.equal(api.select(player,options)?.id,'male-pants21-'+options.action+'-'+options.direction);
   const ctx=cv.createCanvas(200,200).getContext('2d');
   assert(prepared.draw(ctx,player,options));
   assert(ctx.getImageData(0,0,200,200).data.some((value,i)=>i%4===3&&value));
  }
 }finally{prepared.release();}
});

test('male pants 133 and boots 9 use verified lower poses with sword carry',async()=>{
 const {make}=require('./rework-integration-support.cjs'),api=make();
 await api.ready;
 const player={appearance96:{gender:'masculino',hairStyle:'hair-bob',hairColor:'pink',eyeColor:'green',skinColor:'dark'},equipment:{weapon:{def:0},legs:{def:133},boots:{def:9}}};
 for(const direction of ['south','north','east','west'])for(const action of ['idle','walk']){
  const source=api.select(player,{direction,action});
  assert.equal(source?.outfitOverlay.item,133,direction+'/'+action);
  assert.equal(source?.bootsOverlay.item,9);
 }
});

test('female no-hair uses the clean authored head instead of falling back',async()=>{
 const {make}=require('./rework-integration-support.cjs'),api=make();
 await api.ready;
 const player={appearance96:{gender:'feminino',hairStyle:'none',hairColor:'pink',skinColor:'dark',eyeColor:'green'},equipment:{weapon:{def:0},coat:{def:6}}};
 const poses=['south','north','east','west'].flatMap(direction=>['idle','walk'].map(action=>({player,options:{direction,action}})));
 const prepared=await api.prepareConfiguration(poses);
 try{assert(prepared.coverage.every(p=>p.source.includes(':female-original-face:none:')));}
 finally{prepared.release();}
});

test('sword carry reuses only the 151 lateral coat and each recovered pants layer',async()=>{
 const {make}=require('./rework-integration-support.cjs'),api=make();
 await api.ready;
 for(const [slot,items] of [['coat',[151]],['legs',[140,147,154,161,175,182]]])for(const def of items){
  const player={appearance96:{gender:'masculino',hairStyle:'hair-bob',hairColor:'pink',eyeStyle:'face-almond',eyeColor:'green',skinColor:'dark'},equipment:{weapon:{def:0},[slot]:{def}}};
  for(const direction of ['south','north','east','west'])for(const action of ['idle','walk']){
   const source=api.select(player,{direction,action});
   assert.equal(source?.outfitOverlay.item,def,def+'/'+direction+'/'+action);
   assert(source.id.includes((slot==='coat'?'coat':'pants')+def+'-native'));
   assert.equal(source.base.pack.directions[direction].clip.frames,action==='idle'?1:16);
   if(slot==='legs')assert(source.outfitOverlay.sourceRecord.includes('pants'+def));
  }
 }
});

test('sword 0 south retains all nine modular historical phases with the selected coat and hair',async()=>{
 const {make,cv}=require('./rework-integration-support.cjs'),api=make();
 await api.ready;
 const player={appearance96:{gender:'masculino',hairStyle:'hair-bob',hairColor:'pink',skinColor:'dark',eyeStyle:'face-almond',eyeColor:'green'},equipment:{weapon:{def:0},coat:{def:6}}};
 const options={action:'attack-sword',direction:'south',x:100,y:145};
 const source=api.select(player,options);
 assert.match(source.id,/sword0-south-modular-nine-coat6-adapted-bob/);
 assert.deepEqual(source.timeline,['0','1','2','2','3','3','4','4','5','5','6','6','7','7','8','8']);
 assert.equal(source.fps,24);
 assert.equal(new Set(source.basePack.pack.directions.south.poses.map(p=>JSON.stringify(p['RIGHT ARM']))).size,9);
 assert(source.states.every(state=>state.attachment&&state.layers.length===1&&state.layers[0].skinOnly));
 const ready=await api.prepareConfiguration([{player,options}]),ctx=cv.createCanvas(200,200).getContext('2d');
 try{
  assert.equal(ready.coverage[0].frames,9);
  const frames=new Set();
  for(let tick=0;tick<source.timeline.length;tick++){
   ctx.clearRect(0,0,200,200);
   assert(ready.draw(ctx,player,{...options,progress:(tick+.25)/source.timeline.length}));
   frames.add(api.snapshot().last.frame);
  }
  assert.equal(frames.size,9);
 }finally{ready.release();}
});

test('female sword uses all six independent pants without replacing its weapon states',async()=>{
 const {make}=require('./rework-integration-support.cjs'),api=make();
 await api.ready;
 const appearance96={gender:'feminino',hairStyle:'hair-bob',hairColor:'pink',skinColor:'dark'};
 for(const def of [140,147,154,161,175,182])for(const direction of ['south','north','east','west'])for(const action of ['idle','walk','attack-sword']){
  const options={action,direction};
  const equipment={weapon:{def:0},coat:{def:6}};
  const original=api.select({appearance96,equipment},options);
  const fitted=api.select({appearance96,equipment:{...equipment,legs:{def}}},options);
  assert.equal(fitted?.pantsSourceId,'female-pants'+def+'-sword-'+action+'-'+direction);
  assert.deepEqual(fitted.states,original.states);
  const layers=fitted.pack.directions[direction].layers;
  assert(!layers.some(layer=>layer.id==='shorts'));
  assert.equal(layers.filter(layer=>layer.slot==='pants').length,1);
 }
});

test('helmet 19 hides original and wavy hair independently of color and restores it when hidden',async()=>{
 const {make,cv}=require('./rework-integration-support.cjs'),api=make();
 await api.ready;
 const options={action:'idle',direction:'south',x:100,y:145};
 for(const gender of ['masculino','feminino'])for(const hairStyle of ['original','hair-wavy']){
  const render=async(hairColor,head)=>{
   const player={appearance96:{gender,hairStyle,hairColor,skinColor:'dark',eyeStyle:'face-almond',eyeColor:'green'},
    equipment:{weapon:{def:0},coat:{def:6},...(head?{head:{def:19}}:{})}};
   const prepared=await api.prepareConfiguration([{player,options}]);
   try{
    const ctx=cv.createCanvas(200,200).getContext('2d');
    assert(prepared.draw(ctx,player,options));
    return Buffer.from(ctx.getImageData(0,0,200,200).data);
   }finally{prepared.release();}
  };
  assert((await render('pink',true)).equals(await render('silver',true)),gender+'/'+hairStyle);
  assert(!(await render('pink',false)).equals(await render('silver',false)),gender+'/'+hairStyle);
 }
});

test('sword 0 SOUTH retains the historical nine-state raster and respects the identity contract',async()=>{
 const {make,cv}=require('./rework-integration-support.cjs');
 const api=make();
 await api.ready;
 const options={action:'attack-sword',direction:'south',consumer:'world'};
 const appearance96={gender:'masculino',hairStyle:'original',hairColor:'original',skinColor:'original',eyeStyle:'original',eyeColor:'original'};
 const player={appearance96,equipment:{weapon:{def:0}}};
 const defaultLook=require('../character-appearance.js').defaults;
 assert.equal(api.select({...player,appearance96:defaultLook},options)?.id,'sword0-south-historical-layers-appearance-original');
 const source=api.select(player,options);
 assert.equal(source?.id,'sword0-south-historical-attack');
 assert.equal(source.sourceArchiveSHA256,'9e95e9dcea550cadf43c3aa36bd12a6604d92c287a1058bf0d8c210baf8c5991');
 assert.deepEqual(source.timeline,['0','1','2','2','3','3','4','4','5','5','6','6','7','7','8','8']);
 assert.equal(source.fps,24);
 const load=require('../tools/rework-hd-test-loader.cjs').create(require('node:path').resolve(__dirname,'..'));
 const prepared=await api.prepareConfiguration([{player,options}]);
 try{
  const actual=cv.createCanvas(640,688),expected=cv.createCanvas(640,688);
  const ax=actual.getContext('2d'),ex=expected.getContext('2d');
  for(const [tick,phase] of source.timeline.entries()){
   ax.clearRect(0,0,640,688);
   ex.clearRect(0,0,640,688);
   assert(prepared.draw(ax,player,{...options,preview:true,progress:(tick+.25)/source.timeline.length}));
   const ref=await load('tools/rework-weapon-layers-hd/'+source.states[Number(phase)].approved.url);
   ex.drawImage(ref,0,152);
   assert.deepEqual(ax.getImageData(0,0,640,688).data,ex.getImageData(0,0,640,688).data,'phase '+phase);
  }
 }finally{prepared.release();}
 for(const [look,equipment,expected] of [
  [{...appearance96,hairStyle:'hair-bob',hairColor:'pink'},player.equipment,'sword0-south-historical-layers-appearance-bob'],
  [appearance96,{...player.equipment,coat:{def:6}},'sword0-south-modular-nine-coat6-adapted-original'],
 ]){
  assert.equal(api.select({appearance96:look,equipment},options)?.id,expected);
 }
});

test('109 and 17 SOUTH retain approved phase order with a saved hairstyle',async()=>{
 const {make,cv}=require('./rework-integration-support.cjs'),api=make();
 await api.ready;
 const appearance96={gender:'masculino',hairStyle:'hair-bob',hairColor:'pink',skinColor:'dark',eyeStyle:'original',eyeColor:'blue'};
 for(const [item,action,expected] of [[109,'attack-unarmed',7],[17,'attack-focus',8]]){
  const options={action,direction:'south',consumer:'world',x:100,y:145};
  const player={appearance96,equipment:{weapon:{def:item}}};
  const base=api.select({...player,appearance96:{gender:'masculino'}},options);
  const source=api.select(player,options);
  assert.match(source?.id,/-south-native-layers-appearance-bob$/);
  assert.equal(source.states.length,expected);
  assert.deepEqual(source.timeline,base.timeline);
  assert.equal(source.fps,base.fps);
  assert.deepEqual(source.basePack.pack.directions.south.poses,base.basePack.pack.directions.south.poses);
  assert.equal(api.select({...player,equipment:{...player.equipment,coat:{def:151}}},options),null);
  const prepared=await api.prepareConfiguration([{player,options}]);
  try{
   assert.equal(prepared.coverage[0].frames,expected);
   const ctx=cv.createCanvas(200,200).getContext('2d');
   const phases=new Set();
   for(let tick=0;tick<source.timeline.length;tick++){
    assert(prepared.draw(ctx,player,{...options,progress:(tick+.25)/source.timeline.length}));
    phases.add(api.snapshot().last.frame);
   }
   assert.equal(phases.size,expected);
  }finally{prepared.release();}
 }
});
