/* Shared configuration and pure transitions for the sword collection. */
((root)=>{
 'use strict';
 const ranks=Object.freeze({
  E:Object.freeze({chance:1,min:6,max:10,required:20,bonus:50,rarity:'common'}),
  D:Object.freeze({chance:.85,min:2,max:5,required:20,bonus:75,rarity:'uncommon'}),
  C:Object.freeze({chance:.30,min:1,max:2,required:15,bonus:100,rarity:'rare'}),
  B:Object.freeze({chance:.10,min:1,max:1,required:10,bonus:150,rarity:'epic'}),
  A:Object.freeze({chance:.02,min:1,max:1,required:10,bonus:200,rarity:'legendary'}),
  S:Object.freeze({chance:.005,min:1,max:1,required:10,bonus:250,rarity:'supreme'})
 });
 const rows=[
  ["S","yoru","Yoru"],
  ["S","ace","Ace"],
  ["S","shodai-kitetsu","Shodai Kitetsu"],
  ["S","yakuza-kasen","Yakuza Kasen"],
  ["A","gryphon","Gryphon"],
  ["A","enma","Enma"],
  ["A","shusui","Shusui"],
  ["A","ame-no-habakiri","Ame no Habakiri"],
  ["A","wado-ichimonji","Wado Ichimonji"],
  ["A","nidai-kitetsu","Nidai Kitetsu"],
  ["A","eclipse","Eclipse"],
  ["A","napoleon","Napoleon"],
  ["A","cerberus","Cerberus"],
  ["B","kikoku","Kikoku"],
  ["B","raiu","Raiu"],
  ["B","oto","Oto"],
  ["B","kogarashi","Kogarashi"],
  ["B","durandal","Durandal"],
  ["B","soul-solid","Soul Solid"],
  ["B","pretzel","Pretzel"],
  ["C","konpira","Konpira"],
  ["C","yubashiri","Yubashiri"],
  ["C","soto-muso","Soto Muso"],
  ["C","warabide","Warabide"],
  ["C","shirauo","Shirauo"],
  ["C","kashu","Kashu"],
  ["C","sandai-kitetsu","Sandai Kitetsu"],
  ["C","yamaoroshi","Yamaoroshi"],
  ["D","kakusan","Kakusan"],
  ["D","franken","Franken"],
  ["D","eisen-whip","Eisen Whip"],
  ["D","funkfreed","Funkfreed"],
  ["D","sukesan","Sukesan"],
  ["D","shigure","Shigure"],
  ["D","terry-sword","Terry Sword"],
  ["E","bamboo","Bamboo"],
  ["E","nakiri","Nakiri"],
  ["E","nakiri-sword-yosaku","Nakiri Sword Yosaku"],
  ["E","same-kiri","Same-Kiri"],
  ["E","kibarachi","Kibarachi"]
 ];
 const catalog=Object.freeze(rows.map(([rank,id,name])=>Object.freeze({
  id,rank,name,required:ranks[rank].required,bonus:ranks[rank].bonus,
  image:'assets/ui/sword-compendium/'+id+'.webp'
 })));
 const byId=Object.freeze(Object.fromEntries(catalog.map(sword=>[sword.id,sword])));
 const byRank=Object.freeze(Object.fromEntries(Object.keys(ranks).map(rank=>[rank,Object.freeze(catalog.filter(sword=>sword.rank===rank))])));
 const fragmentKind='sword-fragment';
 const definitions=Object.freeze(catalog.map(sword=>Object.freeze({
  id:'sword-fragment-'+sword.id,swordId:sword.id,name:'Fragmento de '+sword.name,
  kind:fragmentKind,slot:'material',rank:sword.rank,rarity:ranks[sword.rank].rarity,fixedRarity:true,
  attack:0,defense:0,hp:0,symbol:'◈',icon_path:'assets/ui/sword-compendium/'+sword.id+'-fragment.webp',stackLimit:99999,
  description:'Fragmento negociável. Se a espada ainda estiver inativa, a aquisição alimenta o contador do compêndio.'
 })));
 const bonusUnits=collection=>catalog.reduce((sum,sword)=>sum+(collection?.[sword.id]?.active===true?sword.bonus:0),0);
 const multiplier=collection=>1+bonusUnits(collection)/100000;
 function receive(before,fragments){
  const collection={...before},excess={};
  for(const [id,count] of Object.entries(fragments)){
   if(!Object.hasOwn(byId,id)||!Number.isSafeInteger(count)||count<=0)throw RangeError('Fragmento de espada inválido');
   const record=collection[id];
   if(record?.active===true){excess[id]=count;continue;}
   const total=(record?.fragments??0)+count;
   if(!Number.isSafeInteger(total))throw RangeError('Contador de fragmentos excedido');
   collection[id]={active:false,fragments:total};
  }
  return {collection,excess};
 }
 function activate(before,id){
  if(!Object.hasOwn(byId,id))return null;
  const record=before?.[id],required=byId[id].required;
  if(!record||record.active||record.fragments<required)return null;
  const extra=record.fragments-required;
  return {collection:{...before,[id]:{active:true,fragments:0}},excess:extra?{[id]:extra}:{}};
 }
 function roll(random){
  const loot={};
  for(const [rank,rules] of Object.entries(ranks)){
   if(random()>=rules.chance)continue;
   const count=rules.min+Math.floor(random()*(rules.max-rules.min+1)),pool=byRank[rank];
   for(let n=0;n<count;n++){
    const {id}=pool[Math.floor(random()*pool.length)];
    loot[id]=(loot[id]||0)+1;
   }
  }
  return loot;
 }
 const rotation=Object.freeze({Mon:'daily-mihawk',Tue:'daily-shanks',Wed:'daily-ryuma-alive',Thu:'daily-oden',Fri:'daily-rayleigh',Sat:'daily-zoro',Sun:'daily-shiki'});
 const bossNames=Object.freeze({'daily-mihawk':'Mihawk','daily-shanks':'Shanks','daily-ryuma-alive':'Ryuma em vida','daily-oden':'Oden','daily-rayleigh':'Rayleigh','daily-zoro':'Zoro','daily-shiki':'Shiki'});
 const timeZone='America/Sao_Paulo',openingHour=20,closingHour=21;
 const clock=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',weekday:'short',hour:'2-digit',hourCycle:'h23'});
 function day(now){
  const fields=Object.fromEntries(clock.formatToParts(now).map(({type,value})=>[type,value]));
  const hour=Number(fields.hour);
  return {key:[fields.year,fields.month,fields.day].join('-'),boss:rotation[fields.weekday],
   status:hour<openingHour?'waiting':hour<closingHour?'open':'closed'};
 }
 const api=Object.freeze({ranks,catalog,byId,byRank,fragmentKind,definitions,bonusUnits,multiplier,receive,activate,roll,rotation,bossNames,timeZone,openingHour,closingHour,day});
 root.MareSwordCompendium=api;
 if(typeof module!=='undefined')module.exports=api;
})(globalThis);
