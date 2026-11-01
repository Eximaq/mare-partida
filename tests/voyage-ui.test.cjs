
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const U=require('../voyage-ui.js'),A=require('../archipelago.js'),P=require('../prison-system.js');
const root=path.join(__dirname,'..');
test('all canonical destinations have distinct art and unchanged identifiers, labels and levels',()=>{
 assert.equal(A.islands.length,14);const images=new Set();
 for(const r of A.regions){
  const islands=A.list(r.id),ui=U.voyage({region:r,regions:A.regions,islands,selected:null,game:{area:'beach'},scene:'lobby',canTravel:false});
  for(const i of islands){assert(ui.body.includes('data-island="'+i.id+'"'));assert(ui.body.includes(i.name));assert(fs.existsSync(path.join(root,'assets/ui/voyage-hd',i.id+'.png')));images.add(i.id);}
  assert(!ui.body.includes('Oásis Yuba'));assert(!ui.body.includes('data-travel-island='));
 }
 assert.equal(images.size,14);assert.equal(U.range([8,8]),'8');assert.equal(U.range([1,5]),'1–5');
});
test('selected details contain a current sprite key and guarded travel action',()=>{
 for(const i of A.islands){
  const region=A.regions.find(r=>r.id===i.region);
  const ui=U.voyage({region,regions:A.regions,islands:A.list(i.region),selected:i,game:{area:'beach'},canTravel:false});
  assert(ui.body.includes('data-travel-island="'+i.id+'" disabled')||/data-travel-island="[^"]+"[^>]* disabled/.test(ui.body));
  assert(ui.body.includes('data-expedition-monster='));
  assert(!ui.body.includes('src="assets/monsters/'));
  assert(ui.body.includes('Não estimada'));
  assert(ui.body.includes('voyage-detail-scroll'));
 }
});
test('prison art and identity belong to the supplied confirmed encounter',()=>{
 const game={impelDown:{cleared:4,claimed:[]}};
 const html=U.prison({system:P,game,floor:5,enemy:{floor:5,type:'boss',name:'Guardião Provisório',placeholder:true}});
 assert(html.includes('data-expedition-monster="boss"'));
 assert(html.includes('Guardião Provisório'));
 assert(html.includes('data-prison-floor="100"'));
 assert(html.includes('data-prison-milestone="50"'));
 assert(!html.includes('Bananawani'));
 assert(!/data-prison-milestone="(?:55|100)"/.test(html));
 assert(html.includes('Uma única vez'));
});
test('old cleared floors are inspection only; unknown encounters never pretend to be confirmed',()=>{
 const game={impelDown:{cleared:7,claimed:[5]}};
 const html=U.prison({system:P,game,floor:1,enemy:null});
 assert(html.includes('Adversário desconhecido'));assert(!html.includes('data-expedition-monster='));
 assert(/data-prison-enter disabled/.test(html));
 assert(html.includes('Este andar não concede caixa de marco.'));
 const milestone=U.prison({system:P,game,floor:5,enemy:null});
 assert(milestone.includes('Recebida'));assert(!milestone.includes('data-prison-claim="5"'));
 game.impelDown.claimed=[];
 assert(U.prison({system:P,game,floor:5,enemy:null}).includes('data-prison-claim="5"'));
});
test('new runtime entrypoints are packaged and versioned in the static build',()=>{
 for(const file of ['voyage-ui.js','voyage-hd.css']){
  assert(fs.readFileSync(path.join(root,'index.html'),'utf8').includes(file));
  assert(fs.readFileSync(path.join(root,'tools/build_pages.py'),'utf8').includes("'"+file+"'"));
 }
});
