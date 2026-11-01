'use strict';
/* Pure mastery catalogue and atomic material transitions. No drops or production grants. */
((root)=>{
 const VERSION=1,MAX_STACK=99999,clone=x=>JSON.parse(JSON.stringify(x));
 const limits=Object.freeze({penetration:.15,defense:.10,accuracy:.15,evasion:.15,stun:3,bossReduction:.15,bossDuration:8,radius:360});
 const ids=['armament','observation','conqueror'];
 const names={armament:'Armamento',observation:'Observação',conqueror:'Conquistador'};
 const fragments=ids.map(branch=>Object.freeze({id:'haki-fragment-'+branch,name:'Fragmento de Haki '+(branch==='observation'?'da ':'do ')+names[branch],kind:'haki-fragment',branch,slot:'material',rarity:'epic',fixedRarity:true,attack:0,defense:0,hp:0,stackLimit:MAX_STACK,icon_path:'assets/haki/mastery/fragment-'+branch+'.png',description:'Material de treinamento exclusivo do Haki '+(branch==='observation'?'da ':'do ')+names[branch]+'. Consumido somente ao confirmar uma graduação válida. Fontes de obtenção ainda serão definidas.'}));
 const node=(id,branch,name,effects,order,final=false)=>Object.freeze({id,branch,name,order,max:final?1:3,costs:final?[4]:[1+Math.floor(order/2),2+Math.floor(order/2),3+Math.floor(order/2)],requires:[],effects:Object.freeze(effects),final,icon:final?branch:id,provisional:true});
 const branches={
  armament:[node('coating','armament','Revestimento',{penetration:limits.penetration/3},0),node('hardening','armament','Endurecimento',{defense:limits.defense/2},1),node('guard','armament','Guarda Reforçada',{defense:limits.defense/2},2),node('imbuement','armament','Imbuimento',{penetration:limits.penetration/3},3),node('emission','armament','Emissão',{penetration:limits.penetration/3},4),node('armament-final','armament','Domínio do Armamento',{},5,true)],
  observation:[node('perception','observation','Percepção',{accuracy:.06},0),node('anticipation','observation','Antecipação',{evasion:.06},1),node('intent','observation','Leitura de Intenção',{accuracy:.09},2),node('serenity','observation','Serenidade',{evasion:.03},3),node('future','observation','Vislumbre do Futuro',{evasion:.06},4),node('observation-final','observation','Domínio da Observação',{},5,true)],
  conqueror:[node('presence','conqueror','Presença Dominante',{stun:limits.stun},0),node('resolve','conqueror','Vontade Inabalável',{bossReduction:limits.bossReduction,bossDuration:limits.bossDuration},1),node('pressure','conqueror','Pressão do Conquistador',{radius:limits.radius},2),node('conqueror-final','conqueror','Domínio do Conquistador',{},3,true)]
 };
 // Dependencies are explicit and sequential: every preceding graduation is required.
 for(const list of Object.values(branches))for(let i=0;i<list.length;i++)list[i]=Object.freeze({...list[i],requires:i?[{id:list[i-1].id,rank:list[i-1].max}]:[]});
 const nodes=Object.freeze(Object.values(branches).flat()),byId=Object.freeze(Object.fromEntries(nodes.map(n=>[n.id,n])));
 for(const b of ids)Object.freeze(branches[b]);Object.freeze(branches);Object.freeze(fragments);
 const int=(v,max=MAX_STACK)=>Number.isSafeInteger(v)&&v>=0?Math.min(max,v):0;
 const empty=()=>({version:VERSION,seq:0,ranks:{},completedVersions:{},migration:null});
 function normalize(h,unlocked=false){
  const raw=h?.mastery;
  if(!raw){const m=empty();if(unlocked)m.migration={status:'pending-owner-policy',legacy:clone({version:h?.version||1,unlocked:true,current:h?.current??100,auto:h?.auto??null,equipped:h?.equipped||'armament',kingReadyAt:h?.kingReadyAt||0})};return m;}
  const m={version:VERSION,seq:int(raw.seq,Number.MAX_SAFE_INTEGER),ranks:{},completedVersions:{},migration:raw.migration?.status==='pending-owner-policy'?clone(raw.migration):null};
  if(raw.version>VERSION)m.migration={status:'pending-owner-policy',reason:'future-version',legacy:clone(h)};
  for(const n of nodes){const rank=int(raw.ranks?.[n.id],n.max);if(rank)m.ranks[n.id]=rank;}
  for(const b of ids)if(Number.isSafeInteger(raw.completedVersions?.[b])&&raw.completedVersions[b]>0)m.completedVersions[b]=raw.completedVersions[b];
  return m;
 }
 const held=g=>g?.haki?.mastery?.migration?.status==='pending-owner-policy';
 const rank=(g,id)=>int(g?.haki?.mastery?.ranks?.[id],byId[id]?.max||0);
 const complete=(g,b)=>!!branches[b]&&(!!g?.haki?.mastery?.completedVersions?.[b]||branches[b].every(n=>rank(g,n.id)===n.max));
 const gate=g=>complete(g,'armament')&&complete(g,'observation');
 const learned=(g,b)=>g?.has_haki_unlocked===true&&ids.includes(b)&&(held(g)||rank(g,b+'-final')===1||!!g.haki.mastery?.completedVersions?.[b]);
 const qty=item=>item?.qty===undefined?1:int(item.qty);
 const quantity=(g,b,defs,{includeLocked=false}={})=>(g.inventory||[]).reduce((sum,item)=>sum+(defs[item.def]?.kind==='haki-fragment'&&defs[item.def].branch===b&&(includeLocked||!item.locked)?qty(item):0),0);
 const cost=(g,n)=>n.costs[rank(g,n.id)]??0;
 function error(g,id,defs){
  const n=byId[id];if(!n)return 'Nó de Haki inválido.';
  if(!g.has_haki_unlocked)return 'Alcance o nível 50 e use o Livro da Vontade.';
  if(held(g))return 'Migração aguardando a definição de compensação e do tratamento do Rei.';
  if(rank(g,id)>=n.max)return 'Graduação máxima alcançada.';
  if(n.branch==='conqueror'&&!gate(g))return 'Conclua integralmente Armamento e Observação.';
  for(const d of n.requires)if(rank(g,d.id)<d.rank)return 'Conclua '+byId[d.id].name+' ('+d.rank+'/'+d.rank+').';
  if(quantity(g,n.branch,defs)<cost(g,n))return 'Fragmentos de '+names[n.branch]+' insuficientes.';
  return null;
 }
 function invest(original,id,expectedSeq,defs,persist){
  const fail=message=>({ok:false,message}),n=byId[id];
  if(expectedSeq!==original.haki?.mastery?.seq)return fail('O progresso mudou. Revise o custo e confirme novamente.');
  const invalid=error(original,id,defs);if(invalid)return fail(invalid);
  const g=clone(original);let remaining=cost(g,n);
  for(const item of g.inventory){if(remaining<=0)break;if(item.locked||defs[item.def]?.kind!=='haki-fragment'||defs[item.def].branch!==n.branch)continue;const used=Math.min(qty(item),remaining);item.qty=qty(item)-used;remaining-=used;}
  if(remaining)return fail('Quantidade inválida; nenhum material foi consumido.');
  g.inventory=g.inventory.filter(i=>defs[i.def]?.kind!=='haki-fragment'||qty(i)>0);
  g.haki.mastery.ranks[id]=rank(g,id)+1;g.haki.mastery.seq++;
  if(branches[n.branch].every(x=>rank(g,x.id)===x.max))g.haki.mastery.completedVersions[n.branch]=VERSION;
  if(typeof persist!=='function')return fail('Persistência indisponível; nenhum material foi consumido.');
  try{if(persist(g)!==true)return fail('Não foi possível salvar. Materiais e progresso preservados.');}catch{return fail('Não foi possível salvar. Materiais e progresso preservados.');}
  return {ok:true,state:g,node:n,learned:learned(g,n.branch),message:n.name+' '+rank(g,id)+'/'+n.max+' aprendido.'};
 }
 function addFragments(original,b,count,defs,makeItem){
  if(!ids.includes(b)||!Number.isSafeInteger(count)||count<1||count>MAX_STACK)return null;
  const g=clone(original),index=defs.findIndex(d=>d.kind==='haki-fragment'&&d.branch===b);if(index<0)return null;
  let left=count;for(const i of g.inventory){if(i.def!==index||i.locked)continue;const add=Math.min(MAX_STACK-qty(i),left);i.qty=qty(i)+add;left-=add;if(!left)break;}
  if(left){if(g.inventory.length>=120)return null;const item=makeItem(defs[index]);item.qty=left;g.inventory.push(item);}return g;
 }
 function effects(g,b){
  const result={};if(!learned(g,b))return result;
  // Legacy access is temporarily preserved pending the owner's explicit migration policy.
  if(held(g)||g.haki.mastery.completedVersions[b])for(const n of branches[b])for(const[k,v]of Object.entries(n.effects))result[k]=(result[k]||0)+v;
  else for(const n of branches[b])for(const[k,v]of Object.entries(n.effects))result[k]=(result[k]||0)+v*rank(g,n.id)/n.max;
  for(const k of Object.keys(result))result[k]=Math.round(result[k]*1e9)/1e9;return result;
 }
 function progress(g,b){return {current:branches[b].reduce((s,n)=>s+rank(g,n.id),0),total:branches[b].reduce((s,n)=>s+n.max,0),complete:complete(g,b)};}
 const api={VERSION,MAX_STACK,limits,ids,names,branches,nodes,byId,fragments,empty,normalize,held,rank,complete,gate,learned,quantity,qty,cost,error,invest,addFragments,effects,progress};
 root.MareHakiProgression=Object.freeze(api);if(typeof module!=='undefined')module.exports=api;
})(globalThis);
