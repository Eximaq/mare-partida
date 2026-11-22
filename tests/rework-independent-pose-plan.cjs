'use strict';
const { test }=require('node:test'),a=require('node:assert/strict');
const { planIndependentPasses }=require('../player-rework-modular-outfits-hd.js');

test('each slot resolves against the same pose, not the items around it',()=>{
 const pose='female/attack-sword/north/rig-a',source='archive';
 const layer=(id,depth)=>({id,depth,frames:[id,id],binding:{kind:'fixed'}});
 const anatomy=layer('skin',0),shorts=layer('shorts',4),hands=layer('hands',10),hair=layer('hair',30);
 const rest=[anatomy,shorts,hands,hair],makePass=(item,owned,removed=[])=>({item,pose,source,layers:owned,removed});
 const p22=layer('pants22',4),p21=layer('pants21',4);
 const boot9=[layer('b9-rear',-1),layer('b9-front',4.1)],boot148=[layer('b148-rear',-1),layer('b148-front',4.1)];
 const lookup={pants:{21:makePass(21,[p21],['shorts']),22:makePass(22,[p22],['shorts'])},boots:{9:makePass(9,boot9),148:makePass(148,boot148)}};
 const select=(p,b,head)=>planIndependentPasses({pose,layers:rest,frames:2,
  requested:{pants:{key:'legs',item:p},...(b!=null?{boots:{key:'boots',item:b}}:{}),...(head?{head:{key:'head',item:18}}:{})},
  resolve:(slot,item,token)=>{a.equal(token,pose);return lookup[slot]?.[item];}});
 const orig=select(22,9),swapped=select(22,148),bare=select(22,null),pantSwap=select(21,9),partial=select(22,9,true);
 a.deepEqual(orig.layers,[anatomy,p22,hands,hair,...boot9]);
 a.deepEqual(swapped.layers,[anatomy,p22,hands,hair,...boot148]);
 a.deepEqual(bare.layers,[anatomy,p22,hands,hair]);
 a.deepEqual(pantSwap.layers,[anatomy,p21,hands,hair,...boot9]);
 a.deepEqual(partial.layers,orig.layers);
 a.deepEqual(partial.slotRoutes,{...orig.slotRoutes,head:{item:18,quality:'missing'}});
 a.deepEqual(partial.omitted,['head']);a.deepEqual(rest,[anatomy,shorts,hands,hair]);
});
test('wrong clock/pose or a conflicting claim is never marked HD',()=>{
 const run=resolve=>planIndependentPasses({pose:'exact',frames:2,layers:[{id:'hands',depth:8}],
  requested:{gloves:{key:'gloves',item:25},torso:{key:'coat',item:6}},resolve});
 const pass=(item,pose,frames)=>({item,pose,layers:[{id:'hands',depth:8,frames}],removed:['hands'],source:'archive'});
 for(const wrong of [pass(25,'other',['a','b']),pass(25,'exact',['a'])]){
  const r=run(s=>s==='gloves'?wrong:pass(6,'exact',['a','b']));
  a.equal(r.slotRoutes.gloves.quality,'missing');a.equal(r.slotRoutes.coat.quality,'hd');
 }
 const clash=run((_,item)=>pass(item,'exact',['a','b']));
 a.deepEqual(clash.omitted,['coat','gloves']);a.deepEqual(clash.layers,[{id:'hands',depth:8}]);
});
