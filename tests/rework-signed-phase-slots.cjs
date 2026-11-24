'use strict';
const a=require('node:assert/strict');
const {composeSignedPhaseSlots:compose}=require('../player-rework-modular-outfits-hd.js');
const mk=(h)=>h.repeat(64);
const authority={depths:{boots:{rear:-10,front:10},pants:{front:20},gloves:{front:30}},slots:{
 boots:{9:[{rear:[mk('a')],front:[mk('b')]}],8:[{rear:[mk('c')],front:[mk('d')]}]},
 pants:{21:[{rear:[],front:[mk('e')]}],22:[{rear:[],front:[mk('f')]}]},
 gloves:{25:[{rear:[],front:[mk('0')]}]}
}};
const v=(item)=>({item});
const row=(...front)=>[{rear:[mk('a')],front:front.map(mk)}];
a.deepEqual(compose(authority,{pants:v(21),boots:v(9)},1),row('b','e'));
a.deepEqual(compose(authority,{boots:v(9),pants:v(22)},1),row('b','f'));
a.deepEqual(compose(authority,{boots:v(8),pants:v(22)},1),[{rear:[mk('c')],front:[mk('d'),mk('f')]}]);
a.deepEqual(compose(authority,{gloves:v(25),pants:v(22),boots:v(9)},1),row('b','f','0'));
a.deepEqual(compose(authority,{pants:v(22)},1),[{rear:[],front:[mk('f')]}]);
a.equal(compose(authority,{pants:v(22),boots:v(999)},1),null);
a.equal(compose(authority,{pants:v(22),head:v(1)},1),null);
a.equal(compose(authority,{pants:v(22)},2),null);
a.equal(compose({...authority,depths:{...authority.depths,pants:{front:10}}},{pants:v(21),boots:v(9)},1),null);
a.equal(compose({...authority,depths:{...authority.depths,pants:{front:-10}}},{pants:v(21),boots:v(9)},1),null);
a.equal(compose({...authority,slots:{...authority.slots,pants:{22:[{rear:[],front:['oops']}]}}},{pants:v(22)},1),null);
console.log('PASS signed phase slot composition with independent swaps, declared depth, and malformed-data rejection');
const {planSignedPhaseSlots:plan}=require('../player-rework-modular-outfits-hd.js');
const r=plan(authority,{weapon:v(114),boots:v(9),pants:v(22),head:v(1)},1);
a.deepEqual(r.phases,row('b','f'));
a.deepEqual(r.accepted,['boots','pants']);
a.deepEqual(r.missing,['head']);
const bad=plan({...authority,depths:{...authority.depths,pants:{front:10}}},
 {boots:v(9),pants:v(22),gloves:v(25)},1);
a.deepEqual(bad.phases,[{rear:[],front:[mk('0')]}]);
a.deepEqual(bad.accepted,['gloves']);a.deepEqual(bad.missing,['boots','pants']);
