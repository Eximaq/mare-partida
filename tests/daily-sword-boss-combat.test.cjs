'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const G=require('../daily-sword-boss-combat.js'),{actors}=require('../daily-sword-boss-specials.json');
function cast(id,options={}){return G.create(actors['daily-'+id],{castId:'one-cast',origin:{x:0,y:0},target:{x:120,y:0},now:1000,...options});}
const t=(id,x,y)=>({id,x,y});
test('all seven preserve the approved visual release frame and one stable clock',()=>{
 for(const key of Object.keys(actors)){
  const c=cast(key.slice(6));assert.ok(c);assert.equal(c.releaseAt,1800);
  assert.equal(G.sample(c,1799).phase,'warning');
  assert.equal(G.sample(c,c.impactAt).phase,'impact');
  assert.equal(G.sample(c,c.endAt),null);
 }
});
test('projectile sweeps its path without hitting distant targets early or repeating hits',()=>{
 const c=cast('mihawk');const a=[t('near',43,0),t('far',192,1),t('safe',52,39)];
 assert.deepEqual(G.contact(c,1799,1890,a),['near']);
 assert.deepEqual(G.contact(c,1890,1900,a),[]);
 assert.deepEqual(G.contact(c,1900,2180,a),['far']);
});
test('dash may be shortened by navigation and ignores targets beyond its landing',()=>{
 const c=cast('shanks',{legalPoint:p=>({...p,x:80})});
 assert.equal(c.to.x,80);
 assert.deepEqual(G.contact(c,1799,1980,[t('near',60,4),t('far',170,0)]),['near']);
});
test('instant geometries honor exits, line of sight and duplicate overlaps',()=>{
 const ry=cast('ryuma-alive');assert.deepEqual(G.contact(ry,1799,1800,[t('safe',65,80),t('hit',65,1),t('blocked',70,0)],{clear:(_,p)=>p.id!=='blocked'}),['hit']);
 const od=cast('oden');assert.deepEqual(G.contact(od,1799,1800,[t('x',96,0),t('outside',96,57)]),['x']);
 assert.deepEqual(G.contact(od,1799,1801,[t('x',96,0)]),[]);
 const zo=cast('zoro');assert.deepEqual(G.contact(zo,1799,1800,[t('edge',70,56),t('gap',70,21)]),['edge']);
 const ra=cast('rayleigh');assert.deepEqual(G.contact(ra,1799,1800,[t('inside',100,12),t('out',155,40)]),['inside']);
});
test('Shiki warns while falling, hits current positions in marked circles once, can cancel',()=>{
 const c=cast('shiki');
 assert.equal(G.sample(c,1980).phase,'travel');
 assert.deepEqual(G.contact(c,1800,2259,[t('first',120,0)]),[]);
 assert.deepEqual(G.contact(c,2259,2260,[t('first',137,25),t('second',168,-55),t('escaped',30,0)]),['first','second']);
 assert.deepEqual(G.contact(c,2259,2261,[t('first',137,25)]),[]);
 G.cancel(c);assert.equal(G.sample(c,2260),null);
 assert.deepEqual(G.contact(c,2259,2261,[t('later',120,0)]),[]);
});
