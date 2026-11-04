'use strict';
/* Local pure transitions. Commit the entire resulting save once, before UI effects. */
((root)=>{
 const VERSION=3,CAPACITY=120,MAX_STACK=9999,clone=x=>JSON.parse(JSON.stringify(x));
 const recipes=Object.freeze({E:Object.freeze({rank:'E',quantity:10,resultRank:'E',random:true,binding:'character'})});
 const ranks=['E','D','C','B','A','S'],rarities={E:'rare',D:'epic',C:'epic',B:'legendary',A:'legendary',S:'supreme'};
 const fragments=Object.freeze(ranks.map(rank=>Object.freeze({id:'akuma_fragment_'+rank.toLowerCase(),materialId:'akuma_fragment_'+rank.toLowerCase(),rank,name:'Fragmento de Akuma no Mi · Rank '+rank,kind:'akuma-fragment',slot:'material',rarity:rarities[rank],fixedRarity:true,attack:0,defense:0,hp:0,symbol:'?',icon_path:'assets/quest-dungeons/akuma-fragment.png',description:'Fragmento de fruta misteriosa. Rank '+rank+'. Dez fragmentos Rank E formam uma Akuma aleatória Rank E. Outros ranks ainda não possuem receita.'})));
 // Berry is snapshotted from lifetime earned currency when an attempt starts.
 const catalog=Object.freeze([{"id":"alvida","name":"Alvida","level":10,"location":"Capitã Pirata","monster":"dungeon-alvida","portrait":"assets/ui/boss-dungeons/alvida-hd.png","rewardConfigured":true,"normalCombat":{"level":10,"maxHP":392,"attack":28,"defense":14,"speed":50,"reach":51,"attackSec":2.1,"aggro":300,"xp":74,"gold":[24,38]}},{"id":"morgan","name":"Morgan","level":20,"location":"Quartel da Marinha","monster":"dungeon-morgan","portrait":"assets/ui/boss-dungeons/morgan-hd.png","rewardConfigured":true,"normalCombat":{"level":20,"maxHP":867,"attack":50,"defense":25,"speed":50,"reach":51,"attackSec":2.1,"aggro":300,"xp":134,"gold":[44,68]}},{"id":"buggy","name":"Buggy","level":30,"location":"Capitão do Bando Buggy","monster":"dungeon-buggy","portrait":"assets/ui/boss-dungeons/portraits/buggy.jpg","rewardConfigured":false,"normalCombat":{"level":30,"maxHP":1496,"attack":72,"defense":37,"speed":50,"reach":51,"attackSec":2.1,"aggro":300,"xp":194,"gold":[64,98]}},{"id":"kuro","name":"Kuro","level":40,"location":"Capitão dos Gatos Negros","monster":"dungeon-kuro","portrait":"assets/ui/boss-dungeons/portraits/kuro.png","rewardConfigured":false,"normalCombat":{"level":40,"maxHP":2280,"attack":94,"defense":48,"speed":50,"reach":51,"attackSec":2.1,"aggro":300,"xp":254,"gold":[84,128]}},{"id":"krieg","name":"Don Krieg","level":50,"location":"Almirante da Frota Krieg","monster":"dungeon-krieg","portrait":"assets/ui/boss-dungeons/portraits/krieg.png","rewardConfigured":false,"normalCombat":{"level":50,"maxHP":3218,"attack":116,"defense":59,"speed":50,"reach":51,"attackSec":2.1,"aggro":300,"xp":314,"gold":[104,158]}},{"id":"arlong","name":"Arlong","level":60,"location":"Capitão dos Homens-Peixe","monster":"dungeon-arlong","portrait":"assets/ui/boss-dungeons/portraits/arlong.png","rewardConfigured":false,"normalCombat":{"level":60,"maxHP":4309,"attack":138,"defense":71,"speed":50,"reach":51,"attackSec":2.1,"aggro":300,"xp":374,"gold":[124,188]}},{"id":"smoker","name":"Smoker","level":70,"location":"Oficial da Marinha","monster":"dungeon-smoker","portrait":"assets/ui/boss-dungeons/portraits/smoker.png","rewardConfigured":false,"family":"logia","naturalProtection":null,"normalCombat":{"level":70,"maxHP":5555,"attack":160,"defense":83,"speed":50,"reach":51,"attackSec":2.1,"aggro":300,"xp":434,"gold":[144,218]}},{"id":"wapol","name":"Wapol","level":80,"location":"Rei de Drum","monster":"dungeon-wapol","portrait":"assets/ui/boss-dungeons/portraits/wapol.png","rewardConfigured":false,"normalCombat":{"level":80,"maxHP":6954,"attack":182,"defense":94,"speed":50,"reach":51,"attackSec":2.1,"aggro":300,"xp":494,"gold":[164,248]}},{"id":"crocodile","name":"Crocodile","level":90,"location":"Líder da Baroque Works","monster":"dungeon-crocodile","portrait":"assets/ui/boss-dungeons/portraits/crocodile.png","rewardConfigured":false,"family":"logia","naturalProtection":null,"normalCombat":{"level":90,"maxHP":8508,"attack":204,"defense":105,"speed":50,"reach":51,"attackSec":2.1,"aggro":300,"xp":554,"gold":[184,278]}}].map(d=>Object.freeze({...d,rewardConfigured:d.rewardConfigured||['buggy','kuro','krieg'].includes(d.id)})));
 const weaponChestRewards=Object.freeze({buggy:10,kuro:10});
 const byId=Object.fromEntries(catalog.map(d=>[d.id,d])),quantity=i=>Number.isSafeInteger(i?.quantity)&&i.quantity>0?i.quantity:1;
 const owner=(item,save)=>!item?.boundToCharacter||item.boundToCharacter===save.characterId;
 const bound=item=>typeof item?.boundToCharacter==='string'&&!!item.boundToCharacter;
 function migrate(original,newId){const s=clone(original);s.characterId ||=newId||root.crypto?.randomUUID?.();if(!s.characterId)throw Error('Identidade persistente necessária');const old=s.bossDungeons||{};s.bossDungeons={version:VERSION,seq:Number.isSafeInteger(old.seq)?old.seq:0,records:{...(old.records||{})},reveal:old.reveal||null};for(const id of Object.keys(weaponChestRewards).concat('krieg')){const r=s.bossDungeons.records[id];if(r?.phase==='pending'&&!r.reward)r.reward=reward(s,id);}return s;}
 function status(save,id){const d=byId[id];if(!d)return 'unavailable';const r=save.bossDungeons?.records[id];if(r?.phase==='claimed')return 'claimed';if(r?.phase==='pending')return 'pending';if(save.level<d.level)return 'locked';return r?.phase==='running'?'running':'available';}
 const fail=message=>({ok:false,message});
 function begin(original,id,runId,now=Date.now()){
  const d=byId[id];if(!d||!original.characterId||!runId)return fail('Masmorra inválida.');const state=status(original,id);if(state==='locked'||state==='claimed')return fail(state==='locked'?'Requer nível '+d.level+'.':'Esta masmorra já foi concluída.');
  const s=migrate(original);if(state==='pending')return {ok:true,state:s,record:s.bossDungeons.records[id],resume:true};
  const record={phase:'running',runId,encounterId:runId+':enemy',ownerId:s.characterId,startedAt:now,berryReward:Math.floor(Math.max(0,Number(s.stats?.goldEarned)||0)/100)};s.bossDungeons.records[id]=record;s.bossDungeons.seq++;return {ok:true,state:s,record};
 }
 function reward(save,id,xpNeeded){if(id==='krieg')return {xp:0,berry:0,itemId:'will-book',quantity:1,boundToCharacter:save.characterId};if(weaponChestRewards[id])return {xp:0,berry:0,materialId:'epic_weapon_fragment',quantity:weaponChestRewards[id],boundToCharacter:save.characterId};const d=byId[id];return d?.rewardConfigured?{xp:Math.round(xpNeeded(d.level)*(save.level<=d.level?.2:.1)),berry:Number.isSafeInteger(save.bossDungeons?.records[id]?.berryReward)?save.bossDungeons.records[id].berryReward:Math.floor(Math.max(0,Number(save.stats?.goldEarned)||0)/100),materialId:fragments[0].materialId,quantity:5,boundToCharacter:save.characterId}:null;}
 function defeat(original,id,identity,xpNeeded,now=Date.now()){
  const r=original.bossDungeons?.records[id];if(!r||r.phase!=='running'||r.ownerId!==original.characterId||r.runId!==identity?.runId||r.encounterId!==identity?.encounterId)return fail('O adversário não pertence a esta instância.');
  const s=migrate(original),next=s.bossDungeons.records[id];next.phase='pending';next.reward=reward(s,id,xpNeeded);next.defeatedAt=now;s.bossDungeons.seq++;return {ok:true,state:s,record:next};
 }
 function combatProfile(id){
  const d=byId[id];if(!d)throw Error('Chefe desconhecido');
  const base=d.normalCombat;
  return {...base,maxHP:Math.round(base.maxHP*2.5),attack:Math.round(base.attack*2.5),defense:Math.round(base.defense*2.5),magicDefense:Math.round((base.magicDefense??base.defense)*2.5),...(base.elementalAttack!==undefined?{elementalAttack:Math.round(base.elementalAttack*2.5)}:{}),xp:0,gold:[0,0]};
 }
 function materialDef(defs,id){return defs.findIndex(d=>['akuma-fragment','weapon-fragment'].includes(d.kind)&&d.materialId===id);}
 function claim(original,id,{runId,position,chest,defs,applyXP,commit,now=Date.now()}={}){
  original=migrate(original);const r=original.bossDungeons?.records[id];if(!r||r.phase!=='pending'||r.runId!==runId||r.ownerId!==original.characterId)return fail('Recompensa indisponível ou já recebida.');
  if(!position||!chest||Math.hypot(position.x-chest.x,position.y-chest.y)>chest.radius)return fail('Aproxime-se do baú no mapa.');
  if(!r.reward)return fail('Vitória preservada. As recompensas desta masmorra ainda estão em definição.');
  const book=r.reward.itemId==='will-book',def=book?defs.findIndex(d=>d.id==='will-book'&&d.kind==='haki-book'):materialDef(defs,r.reward.materialId);if(def<0)return fail('Material indisponível no catálogo.');
  const stack=!book&&original.inventory.find(i=>i.materialId===r.reward.materialId&&i.boundToCharacter===original.characterId&&!i.locked&&quantity(i)+r.reward.quantity<=MAX_STACK);
  if(!stack&&original.inventory.length>=CAPACITY)return fail('Recompensa pendente: libere um espaço na mochila.');
  const s=migrate(original),receipt='dungeon:'+s.characterId+':'+id;
  if(stack){const target=s.inventory.find(i=>i.id===stack.id);target.quantity=quantity(target)+r.reward.quantity;target.sources=[...new Set([...(target.sources||[]),receipt])];}
  else s.inventory.push({id:receipt,def,...(book?{}:{materialId:r.reward.materialId,quantity:r.reward.quantity}),...(r.reward.materialId==='akuma_fragment_e'?{rank:'E',rarity:'rare'}:{rarity:'epic'}),level:1,plus:0,locked:false,binding:'character',boundToCharacter:s.characterId,origin:'Masmorra de Chefes · '+byId[id].name,sources:[receipt],obtainedAt:now});
  s.gold+=r.reward.berry;s.stats||={};s.stats.goldEarned=(s.stats.goldEarned||0)+r.reward.berry;applyXP(s,r.reward.xp);
  Object.assign(s.bossDungeons.records[id],{phase:'claimed',claimedAt:now,receipt});s.bossDungeons.seq++;
  try{if(commit(s)!==true)return fail('Não foi possível salvar. A recompensa continua pendente.');}catch{return fail('Não foi possível salvar. A recompensa continua pendente.');}
  return {ok:true,state:s,reward:r.reward,returnToPort:true};
 }
 function ownedFragments(save,rank='E'){return save.inventory.filter(i=>i.materialId==='akuma_fragment_'+rank.toLowerCase()&&i.boundToCharacter===save.characterId&&!i.locked);}
 const count=(s,rank='E')=>ownedFragments(s,rank).reduce((n,i)=>n+quantity(i),0);
 function craft(original,{expectedSeq,defs,catalog:fruits,random=Math.random,commit,now=Date.now(),chosenId=null}={}){
  if(!original.characterId||expectedSeq!==original.bossDungeons?.seq)return fail('A seleção mudou. Atualize o inventário.');if(original.bossDungeons.reveal)return fail('Confira primeiro a fruta formada.');if(count(original)<recipes.E.quantity)return fail('São necessários 10 fragmentos Rank E desbloqueados deste personagem.');
  const eligible=fruits.filter(f=>f.rank==='E'&&f.available!==false&&defs.some(d=>d.fruitId===f.id));if(!eligible.length)return fail('Não há frutas Rank E elegíveis.');
  const stacks=ownedFragments(original);let needed=recipes.E.quantity,removed=0;for(const i of stacks){if(needed<=0)break;const used=Math.min(needed,quantity(i));needed-=used;if(used===quantity(i))removed++;}
  if(original.inventory.length-removed+1>CAPACITY)return fail('Libere espaço para a fruta antes de formar.');
  let chosen;try{if(chosenId)chosen=eligible.find(f=>f.id===chosenId);else{const roll=random();if(!Number.isFinite(roll)||roll<0||roll>=1)throw Error();chosen=eligible[Math.floor(roll*eligible.length)];}if(!chosen)return fail('Fruta elegível inválida.');}catch{return fail('Não foi possível sortear. Nada foi consumido.');}
  const s=migrate(original);needed=recipes.E.quantity;
  for(const i of ownedFragments(s)){if(needed<=0)break;const used=Math.min(needed,quantity(i));needed-=used;i.quantity=quantity(i)-used;}
  s.inventory=s.inventory.filter(i=>i.quantity!==0);const id='formed-akuma:'+s.characterId+':'+expectedSeq,def=defs.findIndex(d=>d.fruitId===chosen.id);
  const item={id,def,type:'akuma_no_mi',fruitId:chosen.id,rank:'E',rarity:'rare',level:1,plus:0,locked:false,binding:'character',boundToCharacter:s.characterId,origin:'Formada com fragmentos vinculados Rank E',obtainedAt:now};
  s.inventory.push(item);s.bossDungeons.seq++;s.bossDungeons.reveal={itemId:id,fruitId:chosen.id,rank:'E',boundToCharacter:s.characterId,createdAt:now};
  try{if(commit(s)!==true)return {...fail('Não foi possível salvar. Nada foi consumido.'),chosenId:chosen.id};}catch{return {...fail('Não foi possível salvar. Nada foi consumido.'),chosenId:chosen.id};}
  return {ok:true,state:s,item,fruit:chosen};
 }
 function acknowledge(original,itemId,commit){if(original.bossDungeons?.reveal?.itemId!==itemId)return fail('Revelação já encerrada.');const s=migrate(original);s.bossDungeons.reveal=null;try{if(commit(s)!==true)return fail('Não foi possível salvar.');}catch{return fail('Não foi possível salvar.');}return {ok:true,state:s};}
 root.MareBossDungeons={weaponChestRewards,VERSION,CAPACITY,MAX_STACK,catalog,byId,fragments,recipes,rarities,quantity,bound,owner,migrate,status,begin,combatProfile,reward,defeat,claim,count,craft,acknowledge};if(typeof module!=='undefined')module.exports=root.MareBossDungeons;
})(globalThis);
