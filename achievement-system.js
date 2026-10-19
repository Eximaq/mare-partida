'use strict';
/* Milestones use observed progress and a persistent claim ledger, never a reusable currency grant. */
((root)=>{
  const VERSION=1,integer=n=>Number.isSafeInteger(n)&&n>=0?n:0;
  const Arch=root.MareArchipelago||(typeof require==='function'?require('./archipelago.js'):null);
  const travelIds=Arch.islands.map(island=>island.id);
  const features=Object.freeze({get prison(){return root.MarePrison?.available===true;},fruit:false,get haki(){return root.MareHaki?.available===true;},fastTravel:false,bounty:false});
  const categories=[['kills','Extermínio'],['prison','Desbravador'],['wealth','Riqueza'],['level','Jornada'],['power','Poder de Combate'],['fruit','Akuma no Mi'],['haki','Haki'],['exploration','Exploração']];
  const catalog=[];
  function add(category,metric,entries,feature=null){entries.forEach(([name,target,points],i)=>catalog.push({id:metric+'-'+i,category,metric,name,target,points,feature}));}
  add('kills','kills',[['Primeiros confrontos',100,1],['Caçador experiente',500,1],['Extermínio',2000,2],['Flagelo dos mares',10000,3]]);
  add('prison','floors',[['Primeira descida',10,1],['Nas profundezas',30,2],['Prisioneiro lendário',50,3],['Fuga impossível',100,5]],'prison');
  add('wealth','coins',[['Bolsa de dobrões',10000,1],['Tesouro do capitão',100000,1],['Fortuna dos mares',1000000,2]]);
  add('level','level',[['Novato',5,1],['Promissor',10,1],['Veterano',20,2],['Supernova',50,3],['Lenda do Novo Mundo',100,5]]);
  add('power','power',[['Força Desperta',1000,1],['Ameaça Local',5000,1],['Ameaça Global',20000,2],['Nível Shichibukai',50000,3],['Nível Yonkou',100000,5]]);
  add('fruit','fruits',[['O Gosto do Demônio',1,2],['Colecionador de Maldições',5,3]],'fruit');
  add('fruit','awakenings',[['Além do Limite',1,5]],'fruit');
  add('haki','observation',[['Sexto Sentido',1,1]],'haki');
  add('haki','armament',[['Vontade de Aço',1,1]],'haki');
  add('haki','conqueror',[['O Escolhido',1,3]],'haki');
  add('haki','hakiMastery',[['Domínio Supremo',3,5]],'haki');
  add('exploration','islands',[['Navegador Iniciante',5,1]]);
  add('exploration','fastTravel',[['Cartógrafo',travelIds.length,2]],'fastTravel');
  add('exploration','bounties',[['Caçador de Recompensas',10,3]],'bounty');
  const unique=a=>[...new Set(Array.isArray(a)?a.filter(v=>typeof v==='string'&&v.length>0&&v.length<=100):[])];
  function migrate(g){
    const old=g.achievements?.version===VERSION?g.achievements:{},r=old.records||{},earned=integer(g.stats?.goldEarned),observed=Number.isSafeInteger(r.observedGoldEarned)?integer(r.observedGoldEarned):earned;
    const records={peakPower:integer(r.peakPower),coins:Math.max(integer(r.coins)+Math.max(0,earned-observed),earned,integer(g.gold)),observedGoldEarned:Math.max(observed,earned),islands:unique(r.islands),fruits:unique(r.fruits),awakenings:unique(r.awakenings),haki:unique(r.haki).filter(id=>['observation','armament','conqueror'].includes(id)),hakiMaxed:unique(r.hakiMaxed).filter(id=>['observation','armament','conqueror'].includes(id)),fastTravel:unique(r.fastTravel).filter(id=>travelIds.includes(id)),bounties:unique(r.bounties)};
    return {...g,achievements:{version:VERSION,claimed:unique(old.claimed).filter(id=>catalog.some(a=>a.id===id)),records}};
  }
  function observe(g,{power=0}={}){const next=migrate(g);next.achievements.records.peakPower=Math.max(next.achievements.records.peakPower,Number.isFinite(power)?Math.max(0,Math.floor(power)):0);return next;}
  // These explicit domain events are the integration contract for future systems.
  function record(g,event,id){
    const next=migrate(g),r=next.achievements.records;
    const field={islandVisited:'islands',fruitUnlocked:'fruits',fruitAwakened:'awakenings',hakiUnlocked:'haki',hakiMaximized:'hakiMaxed',fastTravelUnlocked:'fastTravel',bountyCollected:'bounties'}[event];
    if(!field||typeof id!=='string'||!id||id.length>100)return next;
    if(['haki','hakiMaxed'].includes(field)&&!['observation','armament','conqueror'].includes(id))return next;
    if(field==='fastTravel'&&!travelIds.includes(id))return next;
    if(!r[field].includes(id))r[field].push(id);if(field==='awakenings'&&!r.fruits.includes(id))r.fruits.push(id);if(field==='hakiMaxed'&&!r.haki.includes(id))r.haki.push(id);return next;
  }
  function progress(g,a){
    const r=g.achievements?.records||{},metric=a.metric;
    const values={kills:integer(g.stats?.kills),floors:integer(g.impelDown?.cleared),coins:Math.max(integer(r.coins)+Math.max(0,integer(g.stats?.goldEarned)-(Number.isSafeInteger(r.observedGoldEarned)?integer(r.observedGoldEarned):integer(g.stats?.goldEarned))),integer(g.stats?.goldEarned),integer(g.gold)),level:integer(g.level),power:integer(r.peakPower),fruits:unique(r.fruits).length,awakenings:unique(r.awakenings).length,islands:unique(r.islands).length,fastTravel:travelIds.filter(id=>r.fastTravel?.includes(id)).length,bounties:unique(r.bounties).length,hakiMastery:['observation','armament','conqueror'].filter(id=>r.hakiMaxed?.includes(id)).length};
    if(['observation','armament','conqueror'].includes(metric))return r.haki?.includes(metric)?1:0;
    return values[metric]||0;
  }
  const enabled=(a,flags=features)=>!a.feature||flags[a.feature]===true;
  const bonus=g=>catalog.filter(a=>g.achievements?.claimed?.includes(a.id)).reduce((n,a)=>n+a.points,0);
  function list(g,flags=features){return catalog.map(a=>({...a,progress:Math.min(a.target,progress(g,a)),claimed:!!g.achievements?.claimed?.includes(a.id),enabled:enabled(a,flags),ready:enabled(a,flags)&&progress(g,a)>=a.target&&!g.achievements?.claimed?.includes(a.id)}));}
  function claim(g,id,context={},flags=features){
    const a=catalog.find(a=>a.id===id);if(!a||!enabled(a,flags))return {ok:false,message:'Esta conquista ainda está indisponível.'};
    const state=observe(g,context);if(state.achievements.claimed.includes(id))return {ok:false,message:'Recompensa já resgatada.'};
    if(progress(state,a)<a.target)return {ok:false,message:'A meta ainda não foi alcançada.'};
    state.achievements.claimed.push(id);state.talentSeq=integer(g.talentSeq)+1;return {ok:true,state,points:a.points};
  }
  const api={VERSION,catalog,categories,features,travelIds,migrate,observe,record,progress,bonus,list,claim};root.MareAchievements=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
