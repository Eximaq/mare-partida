'use strict';
// Run on one fingerprint's sample directory. A missing pose or a truncated shard is an error.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {gear,slots,weapons}=require('./audit-hd-wardrobe-product.cjs');
const folder=process.argv[2];
assert(folder,'Provide the sample directory from a single exported build');
const items=new Map(gear.flatMap((group,i)=>group.map(id=>[id,{id,slot:slots[i],
 masculino:0,feminino:0,bare:0,pairs:0,mixed:0}])));
const total={armed:{},bare:{}},contexts=new Set();
const detailFile=process.argv[4];
const detailRows=detailFile?['ID\tSlot\tCorpo\tArma\tClasse\tAcao\tDirecao\tSelecao\tPoseResolvida\tFonteDoSlot\tEtapa\tMotivoDoSlot']:null;
const queue=[];
for(const name of fs.readdirSync(folder).filter(n=>n.endsWith('.json')).sort()){
 const row=JSON.parse(fs.readFileSync(path.join(folder,name)));
 assert.equal(row.mode,'sample');assert.equal(row.full.tested,100);
 assert.equal(Object.keys(row.solo).length,50);assert.equal(row.pairs.length,10);
 const key=[row.weapon??'bare',row.role,row.body,row.direction,row.action].join('_');
 assert.equal(name,key+'.json');assert(!contexts.has(key));contexts.add(key);
 const armed=row.weapon!==null,bucket=armed?total.armed:total.bare;
 const counts=bucket[row.body]??={contexts:0,emptyRoute:0,wardrobeComplete:0,solo:0,pairs:0,mixed:0};
 const groups={};
 for(const [item,v] of Object.entries(row.solo))if(!v.selected){
  const cause=v.reason||row.empty.reason||'unclassified';(groups[cause]??=[]).push(Number(item));
 }
 const conflicts=row.pairs.flatMap(p=>p.conflicts||p.failed.filter(pair=>pair.every(id=>row.solo[id].selected)));
 if(Object.keys(groups).length||conflicts.length||row.full.selected!==row.full.tested)queue.push({context:key,
  receiver:row.empty,itemsByCause:groups,conflicts,sampledSets:{selected:row.full.selected,tested:row.full.tested}});
 counts.contexts++;if(row.empty.selected)counts.emptyRoute++;let whole=true;
 for(const [id,item] of items){
  const single=row.solo[id],full=row.full.perItem[id];
  assert(single&&single.slot===item.slot);assert.equal(full.tested,10);
  if(single.selected){counts.solo++;item[armed?row.body:'bare']++;}
  if(armed)item.mixed+=full.selected;
  if(!single.selected)whole=false;
  if(detailRows){
   const columns=[id,item.slot,row.body,row.weapon??'desarmado',row.role,row.action,row.direction,
    single.selected?'completa':'pendente',single.pose??'',single.source??'',single.stage??'',single.reason??''];
   detailRows.push(columns.map(value=>String(value).replace(/[\t\r\n]/g,' ')).join('\t'));
  }
 }
 for(const p of row.pairs){
  assert.equal(p.tested,100);counts.pairs+=100-p.failed.length;
  if(armed){
   for(const slot of p.slots)for(const id of gear[slots.indexOf(slot)])items.get(id).pairs+=10;
   for(const pair of p.failed)for(const id of pair)items.get(id).pairs--;
  }
  if(p.failed.length)whole=false;
 }
 counts.mixed+=row.full.selected;
 if(whole&&row.full.selected===100)counts.wardrobeComplete++;
}
const roles=new Set(weapons.map(w=>w.role)),perWeapon=2*4*3;
assert.equal(contexts.size,(weapons.length+roles.size)*perWeapon);
for(const body of ['masculino','feminino']){
 assert.equal(total.armed[body].contexts,weapons.length*perWeapon/2);
 assert.equal(total.bare[body].contexts,roles.size*perWeapon/2);
}
const report={fingerprint:path.basename(path.dirname(folder)),contexts:contexts.size,total,items:[...items.values()]};
if(process.argv[3])fs.writeFileSync(process.argv[3],JSON.stringify(report,null,2)+'\n');
function save(file,data){
 fs.writeFileSync(file,file.endsWith('.gz')?require('node:zlib').gzipSync(data,{level:9}):data);
}
if(detailRows)save(detailFile,detailRows.join('\n')+'\n');
if(process.argv[5])save(process.argv[5],JSON.stringify({fingerprint:report.fingerprint,queue})+'\n');
console.log(JSON.stringify(total));
