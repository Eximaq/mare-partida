'use strict';
// Catalog domains use the same modules as the game and server.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const from=name=>require(path.join(__dirname,'..',name+'.js'));
const forge=from('forge-system'),akuma=from('akuma-system');
const catalog=from('item-catalog');
const {items,slotNames}=catalog.create({forge,akuma,prison:from('prison-system'),haki:from('haki-system'),hakiProgression:from('haki-progression')});
const {classes,factions}=from('character-catalog').create({characters:from('character-system')});
const {choices}=from('character-appearance');
const {islands,regions}=from('archipelago');
const itemArt=from('item-art');
const equipment=items.map((item,def)=>{
 const kind=item.kind??item.type??null;
 const equip=forge.isGear({def},items)||item.type==='akuma_no_mi'||item.kind==='visual-completo';
 const baseIcon=item.icon_path||(item.type==='akuma_no_mi'?null:'assets/ui/items-pixellab/'+(item.kind==='haki-book'?'book':item.kind==='pearl-box'?'pearl-box-'+item.boxLevel:item.pearlId||def)+'.png');
 return {def,name:item.name,slot:item.slot,kind,type:item.type,requiredClass:item.requiredClass,fruitId:item.fruitId,equip,icons:{inventory:itemArt.path(def,item)||baseIcon,base:baseIcon,animated:item.slotAnimation?.spriteSheet}};
});
const bySlot=(slot,allowed)=>equipment.filter(i=>i.equip&&i.slot===slot&&allowed(i));
const legal=(item,cls,online)=>(item.slot!=='weapon'||item.type===cls)&&(!(online||item.slot==='visual_completo')||!item.requiredClass||item.requiredClass===cls);
const itemsFor=(slot,cls,online)=>bySlot(slot,i=>legal(i,cls,online)).map(i=>i.def);
const palette=Object.fromEntries(Object.entries(choices).map(([key,v])=>[key,Object.keys(v)]));
const count=v=>BigInt(v.length);
const appearances=Object.values(palette).reduce((n,v)=>n*count(v),1n);
const fruitForms=Object.fromEntries(akuma.catalog.map(f=>[f.id,akuma.isZoan(f)?['human','transformed']:['human']]));
function matrix(online){
 const entries=Object.keys(classes).map(cls=>{
  const slots=Object.fromEntries(Object.keys(slotNames).map(s=>[s,[null,...itemsFor(s,cls,online)]]));
  const headgearOptions=1n+2n*BigInt(slots.head.length-1);
  const formOptions=slots.akuma_no_mi.reduce((n,id)=>n+(id===null?1n:count(fruitForms[equipment[id].fruitId])),0n);
  const total=Object.entries(slots).filter(([s])=>!['head','akuma_no_mi'].includes(s)).reduce((n,[,v])=>n*count(v),appearances*count(Object.keys(factions))*headgearOptions*formOptions);
  return {cls,total:total.toString(),slots};
 });
 return {entries,total:entries.reduce((n,e)=>n+BigInt(e.total),0n).toString()};
}
const data={equipment,slotNames,classes:Object.keys(classes),factions:Object.keys(factions),appearance:palette,fruitForms,
 maps:[{id:'lobby',name:'Porto das Correntes',active:true},{id:'impel-down',active:true},{id:'quest-dungeons',active:true},...islands.map(({id,area,name,region})=>({id,area,name,active:!!area&&!regions.find(r=>r.id===region)?.locked}))],
 potions:catalog.potions,scope:'All catalog equipment slots, including nonvisual slots; appearance picker values; class/faction; head visibility when equipped; human and each equipped Zoan form.',
 matrix:{offline:matrix(false),online:matrix(true)}};
const out=process.argv[2];
if(process.argv[3]!==undefined){
 let index=BigInt(process.argv[3]);
 const mode=process.argv[5]||'offline',limit=Number(process.argv[4]||1);
 if(!data.matrix[mode]||index<0n||!Number.isSafeInteger(limit)||limit<1||limit>10000)throw Error('Uso: node tools/audit_game_catalog.cjs catalog.json índice tamanho offline|online');
 const matrix=data.matrix[mode];
 const hash=crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
 const scenarioActions=['idle','walk','attack','skill','hurt','death','return'];
 const direction=['south','north','east','west'];
 const rows=[];
 while(index<BigInt(matrix.total)&&rows.length<limit){
  let offset=index;
  const entry=matrix.entries.find(row=>{const n=BigInt(row.total);if(offset<n)return true;offset-=n;return false;});
  const take=values=>{const size=count(values),value=values[Number(offset%size)];offset/=size;return value;};
  const appearance=Object.fromEntries(Object.entries(palette).map(([key,values])=>[key,take(values)]));
  const faction=take(data.factions);
  const [head,headHidden]=take(entry.slots.head.flatMap(id=>id===null?[[null,false]]:[[id,false],[id,true]]));
  const [fruit,form]=take(entry.slots.akuma_no_mi.flatMap(id=>id===null?[[null,'human']]:fruitForms[equipment[id].fruitId].map(form=>[id,form])));
  const slots=Object.fromEntries(Object.entries(entry.slots).map(([slot,values])=>[slot,slot==='head'?head:slot==='akuma_no_mi'?fruit:take(values)]));
  const id=mode+':'+index;
  rows.push({id,cls:entry.cls,faction,appearance,slots,headHidden,form,result:'NÃO TESTADO',scenarios:direction.flatMap(d=>scenarioActions.map(a=>({id:id+'/'+a+'/'+d,action:a,direction:d,result:'NÃO TESTADO'})))});
  index++;
 }
 console.log(JSON.stringify({mode,inventoryHash:hash,total:matrix.total,next:index.toString(),cases:rows},null,2));
}else if(out)fs.writeFileSync(out,JSON.stringify(data,null,2)+'\n');
else console.log(JSON.stringify(data,null,2));
