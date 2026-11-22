'use strict';
const test=require('node:test'),a=require('node:assert/strict');
const {trusted,probePairs,scoreProbe}=require('../tools/audit-hd-slot-independence.cjs');
const fixture=(slotRoutes,opts={})=>({body:'female',action:'attack-sword',direction:'north',slotRoutes,
 pack:{pivot:[256,490],density:4,directions:{north:{clip:{frames:8,fps:8}}}},...opts});
const hd=(item,source='approved')=>({item,quality:'hd',source});
test('mixed inspection distinguishes slot dropout, legacy neighbor and untrusted phase metadata',()=>{
 const pair=[['legs',22],['boots',9]];
 const pants=fixture({pants:hd(22)}),boot=fixture({boots:hd(9)});
 const mark=(p,b,m)=>scoreProbe(pair,{legs:new Map([[22,p]]),boots:new Map([[9,b]])},m).map(x=>x.mark);
 a.deepEqual(mark(pants,boot,undefined),['declaredDropWithTwoSoloAuthorities','declaredDropWithTwoSoloAuthorities']);
 a.deepEqual(mark(pants,boot,fixture({legs:hd(22)})),['declaredRetained','declaredDropWithTwoSoloAuthorities']);
 a.deepEqual(mark(pants,undefined,undefined),['declaredDropWithUnverifiedNeighbor','noSoloHDSelection']);
 a.deepEqual(mark(pants,fixture({}),undefined),['declaredDropWithUnverifiedNeighbor','unverifiedSolo']);
 a.deepEqual(mark(pants,{...boot,fps:5},undefined),['declaredDropPoseAuthorityUnresolved','declaredDropPoseAuthorityUnresolved']);
 a.deepEqual(mark(pants,undefined,fixture({legs:hd(22),boots:hd(9)})),['declaredRetained','declaredOnlyWithNeighbor']);
 a.equal(trusted({...pants,omitted:['legs']},'legs',22),false);
 a.equal(trusted({...pants,appearanceAdapted:true},'legs',22),false);
 a.equal(trusted(fixture({legs:hd(23)}),'legs',22),false);
});
test('linear deterministic probe set covers all explicit sources and each missing-neighbor slot',()=>{
 const N=20,range=(n,k)=>Array.from({length:n},(_,i)=>i+k),empty={hd:[],unverified:[]};
 const buckets={head:empty,coat:empty,gloves:empty,legs:{hd:range(N,20),unverified:[8,6]},boots:{hd:range(N-3,60),unverified:[9,10]}};
 const pairs=[...probePairs(buckets)];
 a.equal(pairs.length,3*N-3);
 a.equal(new Set(pairs.map(x=>JSON.stringify(x))).size,pairs.length);
 const known=pairs.filter(x=>x[0][1]!==8&&x[1][1]!==9);
 a.deepEqual([...new Set(known.map(x=>x[0][1]))],buckets.legs.hd);
 a.deepEqual([...new Set(known.map(x=>x[1][1]))],buckets.boots.hd);
 a.equal(pairs.filter(x=>x[0][1]===8).length,N-3);
 a.equal(pairs.filter(x=>x[1][1]===9).length,N);
 a.deepEqual([...probePairs(buckets)],pairs);
});
