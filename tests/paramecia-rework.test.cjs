'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
test('approved paramecia visuals preserve combat data and retained exceptions',()=>{
 const mappings={'rank-a':['MareRankAData','rankA'],'rank-b':['MareRankBData','rankB'],'rank-c':['MareRankCData','rankC'],'rank-c-expansion':['MareRankCExpansionData','rankCExpansion'],hoya:['MareHoyaData','hoya'],jiki:['MareJikiData','jiki'],doru:['MareDoruData','doru']};
 for(const [file,[global,key]]of Object.entries(mappings)){
  require('../'+file+'-data.js'); const d=globalThis[global],before=JSON.parse(JSON.stringify(d)); require(('../'+file+'-system.js').replace('expansion-system','expansion'));
  const effects=d.effects||d.animations;
  const mechanical=value=>JSON.parse(JSON.stringify(value,(key,val)=>key==='icon_path'?undefined:val));assert.deepEqual(mechanical(d.rules),mechanical(before.rules),'only icon paths may change in rules');
  assert.ok(Object.values(effects).some(f=>f.image.includes('/reworks/')),key+' has revised assets');
  for(const [k,v]of Object.entries(effects)){assert.deepEqual(v.frames,before.effects?.[k]?.frames||before.animations?.[k]?.frames,'logical frame timing retained');if(v.rework){assert.ok(fs.existsSync(path.join(__dirname,'..',v.image)));}}
  if(key==='rankA'){for(const k of ['bariPush','bariDome','bariCharge'])assert.deepEqual(effects[k],before.effects[k]);assert.deepEqual(d.rules.bari,before.rules.bari);}
  if(key==='doru')assert.deepEqual(d.rules,before.rules);
 }
});
test('rendered paramecia cells come from revised atlas, not legacy coordinates',()=>{
 globalThis.Image=class{constructor(){this.complete=true;this.naturalWidth=4096;}set src(v){this.url=v;}};
 const calls=[],ctx={save(){},restore(){},translate(){},rotate(){},scale(){},drawImage(...args){calls.push(args);}};
 const R=require('../rank-b-system.js');R.preload();R.draw(ctx,'punch',0,0,100,{width:96});assert.equal(calls.at(-1)[3],128);
 const D=require('../doru-system.js');D.preload();D.draw(ctx,{key:'1',phase:'flight',elapsed:100,x:0,y:0,dx:1,dy:0});assert.equal(calls.at(-1)[3],128);assert.equal(calls.at(-1)[7],80);
});
test('Ito overheat is anchored at hand and stays behind character',()=>{
 const R=globalThis.MareRankA,calls=[],ctx={save(){},restore(){},translate(...a){calls.push(['translate',...a]);},rotate(){},scale(){},drawImage(...a){calls.push(['image',...a]);}};
 const hero={x:100,y:100,direction:'right'},s={expansion:{jobs:[{kind:'overheat',started:0,direction:[1,0]}],dots:[],fields:[]}};
 const paint=()=>{},vfx=(...args)=>calls.push(['visual',...args]);
 globalThis.MareRankAExpansion.draw(ctx,s,.15,[],'back',paint,R.effects,hero,vfx);
 assert.ok(calls.some(a=>a[0]==='visual'&&a[3]==='overheat'),'new atlas used');
 calls.length=0;globalThis.MareRankAExpansion.draw(ctx,s,.15,[],'front',paint,R.effects,hero,vfx);assert.equal(calls.length,0);
});
test('Jiki draw shows assembling metal and can freeze a released mass',()=>{
 const J=require('../jiki-system.js');let calls=[];globalThis.MareJikiAssembly={drawAssembly(...args){calls.push(args);return 44;}};
 const ctx={save(){},restore(){},translate(){},rotate(){},drawImage(){}};assert.equal(J.draw(ctx,'charge',10,20,3000,{width:120,assembling:true}),true);assert.equal(calls.length,1);assert.equal(calls[0][1],3);
 calls=[];J.draw(ctx,'charge',10,20,400,{phase:'assembled',freezeAge:2});assert.equal(calls[0][5].flying,true);assert.equal(calls[0][5].freezeAge,2);
});
test('Supa revised sheets retain durations and Beri catalog keeps approved skill icon',()=>{
 const S=require('../supa-art.js');assert.ok(S.animations.slash.image.includes('/reworks/'));assert.equal(S.animations.slash.duration,472);assert.equal(S.animations.shield.duration,756);
 const helper=require('../paramecia-rework-data.js'),beri={id:'akuma_beri_beri',vfx_sprite_sheet:'old',skill_icon:'approved'},rules={skills:[{key:'1',icon_path:'old',cost:20}]};helper.applyCatalog([beri],rules);assert.equal(beri.vfx_sprite_sheet,'old');assert.ok(helper.auraSource(beri).includes('/reworks/'));assert.equal(beri.skill_icon,'approved');assert.equal(rules.skills[0].cost,20);
});
test('ROOM hold and Mero projectile preserve distinct visual phases',()=>{
 const R=require('../paramecia-rework-data.js'),A=globalThis.MareRankAData;
 const room=A.effects.room;assert.deepEqual([25,26,27,28].map(i=>R.frame(room,room.frames[i],0,'loop','room')),R.art.ope.effects.room.frames.slice(8));
 const kiss=A.effects.kiss;assert.equal(R.frame(kiss,kiss.frames[14],0,'loop','kiss'),R.art.mero.effects.kiss.frames[8]);
});
test('Mato mark progresses through lock, hold and existing expiry without changing lifetime',()=>{
 const R=require('../paramecia-rework-data.js');assert.equal(R.markVisual(0).key,'mark-lock');assert.equal(R.markVisual(315).key,'mark-hold');assert.equal(R.markVisual(9820).key,'mark-expire');assert.equal(R.markVisual(10000),null);
});
test('Doku hydra is drawn once behind victim with impact pose at 0.8s',()=>{
 const R=globalThis.MareRankA,calls=[],ctx={save(){},restore(){}},s={expansion:{jobs:[{kind:'hydra',started:0,targetId:1,direction:[1,0]}],dots:[],fields:[]}},m={id:1,x:100,y:100};
 const visual=(...args)=>calls.push(args);globalThis.MareRankAExpansion.draw(ctx,s,.8,[m],'back',()=>{},R.effects,{},visual);assert.equal(calls.length,1);assert.equal(calls[0][2],'hydra');assert.equal(calls[0][3],6);
 calls.length=0;globalThis.MareRankAExpansion.draw(ctx,s,.8,[m],'front',()=>{},R.effects,{},visual);assert.equal(calls.length,0);
});
test('Kobu feedback is visual and stops after the entrance',()=>{
 const R=require('../paramecia-rework-data.js');assert.equal(typeof R.flagFeedback,'function');let ellipses=0;const c={save(){},restore(){},beginPath(){},ellipse(){ellipses++},stroke(){},fill(){},fillRect(){}};R.flagFeedback(c,'revolution',800,0,0);assert.ok(ellipses>0);ellipses=0;R.flagFeedback(c,'revolution',2000,0,0);assert.equal(ellipses,0);
});

test('every visual crop and icon resolves to a valid PNG inside its atlas',()=>{
 const data=require('../paramecia-rework-manifest.js');for(const fruit of Object.values(data)){for(const fx of Object.values(fruit.effects)){const bytes=fs.readFileSync(path.join(__dirname,'..',fx.image)),w=bytes.readUInt32BE(16),h=bytes.readUInt32BE(20);assert.equal(bytes.toString('hex',0,8),'89504e470d0a1a0a');for(const f of fx.frames){assert.ok(f.x>=0&&f.y>=0&&f.w>0&&f.h>0&&f.x+f.w<=w&&f.y+f.h<=h,fx.image);}}for(const icon of Object.values(fruit.icons))assert.ok(fs.existsSync(path.join(__dirname,'..',icon)));}
});
