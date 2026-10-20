'use strict';
/* Pure, versioned forge transitions. RNG and expected revision are explicit inputs. */
((root)=>{
  const VERSION=3,CAPACITY=120,keys=['strength','dexterity','vitality','intelligence','spirit'];
  const rarity=Object.freeze({common:{name:'Comum',color:'#9b968b',extras:1,sockets:0,mult:1},uncommon:{name:'Incomum',color:'#62ac7c',extras:2,sockets:1,mult:1.3},rare:{name:'Raro',color:'#65a7d6',extras:3,sockets:2,mult:1.7},epic:{name:'Épico',color:'#b182db',extras:4,sockets:3,mult:2.4},legendary:{name:'Lendário',color:'#e7c64c',extras:5,sockets:4,mult:4},supreme:{name:'Supremo',color:'#e66c62',extras:6,sockets:5,mult:6}});
  const names={strength:'Força',dexterity:'Destreza',vitality:'Vitalidade',intelligence:'Inteligência',spirit:'Espírito',hp:'Vida',energy:'Energia',crit:'Crítico'};
  const short={strength:'for',dexterity:'des',vitality:'vit',intelligence:'int',spirit:'esp'};
  const pearls=Object.freeze(keys.flatMap(attribute=>Array.from({length:5},(_,i)=>Object.freeze({id:`pearl_${short[attribute]}_${i+1}`,name:`Pérola de ${names[attribute]} Nv.${i+1}`,attribute,level:i+1,percent:(i+1)*.02,multiplier:1+(i+1)*.02,rarity:['common','uncommon','rare','epic','legendary'][i]}))));
  const pearlById=Object.fromEntries(pearls.map(p=>[p.id,p]));
  const refinement=Object.freeze({max:20,guaranteed:5,chances:Object.freeze([1,1,1,1,1,.85,.80,.75,.70,.65,.60,.55,.50,.45,.40,.35,.30,.25,.20,.15])});
  const fusion=Object.freeze([{chance:.8,gold:40},{chance:.5,gold:160},{chance:.1,gold:650},{chance:.05,gold:2500}]);
  const int=n=>Number.isSafeInteger(n)&&n>=0?n:0,clone=v=>JSON.parse(JSON.stringify(v));
  function draw(random){const n=random();if(!Number.isFinite(n)||n<0||n>=1)throw Error('RNG inválido');return n;}
  function range(lo,hi,random){return lo+Math.floor(draw(random)*(hi-lo+1));}
  function rarityFromRoll(n){if(!Number.isInteger(n)||n<1||n>1000)throw Error('Roleta inválida');return n<=5?'legendary':n<=125?'epic':n<=275?'rare':n<=500?'uncommon':'common';}
  const rollRarity=(random=Math.random)=>rarityFromRoll(range(1,1000,random));
  function seeded(text){let n=2166136261;for(const c of String(text))n=Math.imul(n^c.charCodeAt(0),16777619);return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
  const isGear=(item,defs)=>!!item&&!!defs[item.def]&&!defs[item.def].kind&&defs[item.def].type!=='akuma_no_mi'&&item.type!=='akuma_no_mi'&&!item.pearlId;
  function isPearl(item,defs){return !!item&&(!!item.pearlId||defs[item.def]?.kind==='pearl');}
  function pearlOf(item,defs){return pearlById[item?.pearlId||defs[item?.def]?.pearlId]||null;}
  function extraRange(level,r){const f=Math.sqrt(rarity[r].mult);return {min:Math.ceil((.8+level*.14)*f),max:Math.ceil((2+level*.30)*f)};}
  function rollExtras(item,def,random){
    const r=rarity[item.rarity],bounds=extraRange(item.level,item.rarity);
    const pool=[...keys,'hp','energy','crit'].filter(k=>!(def.slot==='weapon'&&(def.type==='strategist'||def.type==='healer'?k==='strength':k==='intelligence')));
    return Array.from({length:r.extras},()=>{const stat=pool.splice(range(0,pool.length-1,random),1)[0];let value=range(bounds.min,bounds.max,random);if(stat==='hp')value*=8;if(stat==='energy')value*=4;if(stat==='crit')value=Math.min(.04,value*.0015);return {stat,value};});
  }
  function normalizeItem(original,defs,random=null){
    const item=clone(original),def=defs[item.def];if(!def)return item;
    if(def.type==='akuma_no_mi'||item.type==='akuma_no_mi')return item;
    if(['pearl-box','haki-book'].includes(def.kind))return item;
    if(isPearl(item,defs)){const p=pearlOf(item,defs);if(p)item.pearlId=p.id;item.forgeVersion=VERSION;return item;}
    item.level=Math.max(1,int(item.level));item.plus=int(item.plus);item.rarity=rarity[item.rarity]?item.rarity:(rarity[def.rarity]?def.rarity:'common');
    item.baseStats=item.baseStats&&['attack','defense','hp'].every(k=>Number.isFinite(item.baseStats[k])&&item.baseStats[k]>=0)?item.baseStats:{attack:def.attack||0,defense:def.defense||0,hp:def.hp||0};
    // Legacy extras are rolled once from a stable item identity, never from global RNG.
    if(!Array.isArray(item.extras))item.extras=rollExtras(item,def,random||seeded(`${item.id}|${item.def}|${item.level}|${item.rarity}`));
    if(!Array.isArray(item.sockets))item.sockets=Array(rarity[item.rarity].sockets).fill(null);
    // Never truncate saved sockets or reroll existing extras on load.
    while(item.sockets.length<rarity[item.rarity].sockets)item.sockets.push(null);
    item.reforgeAttempts=int(item.reforgeAttempts);item.forgeVersion=VERSION;return item;
  }
  function migrate(original,defs){
    const g=clone(original);g.inventory=(g.inventory||[]).map(item=>normalizeItem(item,defs));g.equipment=Object.fromEntries(Object.entries(g.equipment||{}).map(([slot,item])=>[slot,item?normalizeItem(item,defs):null]));
    g.forgeVersion=VERSION;g.forgeSeq=int(g.forgeSeq);g.forgeHistory=Array.isArray(g.forgeHistory)?g.forgeHistory.slice(-12):[];return g;
  }
  function itemStats(item,defs){
    const zero={attack:0,defense:0,hp:0,energy:0,crit:0,attributes:Object.fromEntries(keys.map(k=>[k,0]))};if(!isGear(item,defs))return zero;
    const d=defs[item.def]||{},r=rarity[item.rarity||d.rarity]||rarity.common,b=item.baseStats||d,m=1+Math.min(20,Math.max(0,(item.level||1)-1))*.09,plus=int(item.plus);
    const result={...zero,attack:Math.round(((b.attack||0)*r.mult+plus*3)*m),defense:Math.round(((b.defense||0)*r.mult+plus*2)*m),hp:Math.round(((b.hp||0)*r.mult+plus*10)*m)};
    for(const extra of item.extras||[]){if(!Number.isFinite(extra.value)||extra.value<0)continue;if(keys.includes(extra.stat))result.attributes[extra.stat]+=extra.value;else if(['hp','energy','crit'].includes(extra.stat))result[extra.stat]+=extra.value;}
    return result;
  }
  function aggregate(equipment,defs){
    const gear={attack:0,defense:0,hp:0,energy:0,crit:0,attributes:Object.fromEntries(keys.map(k=>[k,0])),pearlPercent:Object.fromEntries(keys.map(k=>[k,0]))};
    for(const item of Object.values(equipment||{})){if(!isGear(item,defs))continue;const s=itemStats(item,defs);for(const k of ['attack','defense','hp','energy','crit'])gear[k]+=s[k];for(const k of keys)gear.attributes[k]+=s.attributes[k];for(const id of item.sockets||[]){const p=pearlById[id];if(p)gear.pearlPercent[p.attribute]+=p.percent;}}
    return gear;
  }
  function upgradeCost(item){const levelFactor=1+(Math.max(1,item.level||1)-1)*.04;return {gold:Math.ceil(50*(int(item.plus)+1)**2*levelFactor),materials:Math.ceil((2+int(item.plus)*2)*(1+(Math.max(1,item.level||1)-1)*.015))};}
  const upgradeChance=item=>refinement.chances[int(item.plus)]||0;
  function removalCost(item,p){return Math.ceil((20+item.level*4)*rarity[item.rarity].mult*(1+p.level*.75));}
  function reforgeCost(item,line=false){const r=rarity[item.rarity],factor=1.3**int(item.reforgeAttempts),portion=line?.45:1;return {gold:Math.ceil((30+item.level*12)*r.mult*(1+r.extras*.35)*factor*portion),materials:Math.ceil(((1+item.level/8)*Math.sqrt(r.mult)+r.extras)*factor*portion)};}
  function equipmentFusion(g,ids,slot,defs){
    if(!Array.isArray(ids)||ids.length!==5||new Set(ids).size!==5)return {error:'Selecione cinco equipamentos diferentes.'};
    const items=ids.map(id=>g.inventory.find(i=>i.id===id));
    if(items.some(i=>!isGear(i,defs)||i.locked||i.sockets?.some(Boolean)))return {error:'Use somente equipamentos da mochila, desbloqueados e sem pérolas instaladas.'};
    const source=items[0].rarity,order=['common','uncommon','rare','epic','legendary'];
    if(items.some(i=>i.rarity!==source))return {error:'Os cinco equipamentos precisam ter a mesma raridade.'};
    const rank=order.indexOf(source);if(rank<0||rank>=4)return {error:'Lendário → Supremo exige receita especial e permanece desabilitado.'};
    const def=defs.map((d,i)=>({...d,index:i})).filter(d=>d.slot===slot&&!d.kind&&d.type!=='akuma_no_mi'&&(slot!=='weapon'||d.type===g.classId)).sort((a,b)=>((a.attack||0)+(a.defense||0)+(a.hp||0))-((b.attack||0)+(b.defense||0)+(b.hp||0))||a.index-b.index)[0];
    if(!def)return {error:'Escolha um tipo de equipamento compatível com sua classe.'};
    const level=Math.min(...items.map(i=>i.level)),target=order[rank+1],mult=rarity[target].mult;
    return {items,source,target,level,def:def.index,cost:{gold:Math.ceil((100+level*25)*mult),materials:Math.ceil((3+level/5)*Math.sqrt(mult))}};
  }
  function pearlFusion(g,ids,defs){
    if(!Array.isArray(ids)||ids.length!==5||new Set(ids).size!==5)return {error:'Preencha os cinco slots com unidades diferentes.'};
    const items=ids.map(id=>g.inventory.find(i=>i.id===id));
    if(items.some(i=>!i||i.locked||!pearlOf(i,defs)))return {error:'Use somente pérolas da mochila e desbloqueadas.'};
    const pearl=pearlOf(items[0],defs);
    if(items.some(i=>pearlOf(i,defs).id!==pearl.id))return {error:'As cinco pérolas precisam ter o mesmo atributo e nível.'};
    if(pearl.level>=5)return {error:'Nv.5 é o limite de fusão.'};
    return {items,pearl,next:pearls.find(p=>p.attribute===pearl.attribute&&p.level===pearl.level+1),...fusion[pearl.level-1]};
  }
  function rollLine(item,def,index,random){
    const occupied=new Set(item.extras.filter((_,i)=>i!==index).map(x=>x.stat));
    const pool=[...keys,'hp','energy','crit'].filter(k=>!occupied.has(k)&&!(def.slot==='weapon'&&(def.type==='strategist'||def.type==='healer'?k==='strength':k==='intelligence')));
    const stat=pool[range(0,pool.length-1,random)],bounds=extraRange(item.level,item.rarity);let value=range(bounds.min,bounds.max,random);
    if(stat==='hp')value*=8;if(stat==='energy')value*=4;if(stat==='crit')value=Math.min(.04,value*.0015);return {stat,value};
  }
  const allGear=g=>[...Object.values(g.equipment||{}).filter(Boolean),...(g.inventory||[])];
  function find(g,id){return allGear(g).find(item=>item.id===id);}
  function execute(original,command,defs,random=Math.random,now=Date.now()){
    const fail=message=>({ok:false,message});
    if(!original||typeof original!=='object'||!command||typeof command!=='object')return fail('Comando inválido.');
    if(!Number.isFinite(original.gold)||original.gold<0||!Number.isFinite(original.materials)||original.materials<0)return fail('Saldo inválido; nenhum recurso foi consumido.');
    if(command.expectedSeq!==int(original.forgeSeq))return fail('A operação está desatualizada. Confira os valores e tente novamente.');
    const g=migrate(original,defs),item=find(g,command.itemId),type=command.type;let result,cost;
    const requireItem=()=>isGear(item,defs)&&!item.locked;
    function pay(price){if(!Object.values(price).every(n=>Number.isSafeInteger(n)&&n>=0))return false;if(!Number.isFinite(g.gold)||g.gold<price.gold||!Number.isFinite(g.materials)||g.materials<(price.materials||0))return false;g.gold-=price.gold;g.materials-=price.materials||0;return true;}
    function pearlItem(id){const def=defs.findIndex(d=>d.pearlId===id);if(def<0)throw Error('Pérola ausente do catálogo');let suffix=0,newId;do{newId=`forge-${g.forgeSeq+1}-${suffix++}`;}while(find(g,newId));return {id:newId,def,pearlId:id,level:1,plus:0,locked:false,obtainedAt:int(now),forgeVersion:VERSION};}
    try{
      if(type==='upgrade'){
        if(!requireItem()||item.plus>=refinement.max)return fail('Selecione um equipamento desbloqueado abaixo de +20.');cost=upgradeCost(item);if(!pay(cost))return fail('Recursos insuficientes.');const before=item.plus,success=before<refinement.guaranteed||draw(random)<upgradeChance(item);if(success)item.plus++;
        result={type,success,before,after:item.plus,cost,message:success?`Aprimoramento concluído: +${item.plus}.`:`Falha: equipamento preservado em +${item.plus}.`};
      }else if(type==='imbue'){
        const pearl=g.inventory.find(i=>i.id===command.pearlItemId),p=pearlOf(pearl,defs),socket=command.socket;
        if(!requireItem()||!Number.isInteger(socket)||socket<0||socket>=rarity[item.rarity].sockets||item.sockets[socket]!==null)return fail('Escolha um socket livre.');
        if(!p||pearl.locked)return fail('Escolha uma pérola disponível e desbloqueada.');
        g.inventory=g.inventory.filter(i=>i.id!==pearl.id);item.sockets[socket]=p.id;result={type,success:true,message:`${p.name} instalada no socket ${socket+1}.`};
      }else if(type==='remove'){
        const socket=command.socket,p=pearlById[item?.sockets?.[socket]];
        if(!requireItem()||!Number.isInteger(socket)||socket<0||socket>=item.sockets.length||!p)return fail('Escolha um socket ocupado.');
        if(g.inventory.length>=CAPACITY)return fail('Libere um espaço na mochila antes de remover a pérola.');cost={gold:removalCost(item,p)};if(!pay(cost))return fail('Dobrões insuficientes.');
        g.inventory.push(pearlItem(p.id));item.sockets[socket]=null;result={type,success:true,cost,message:`${p.name} devolvida à mochila.`};
      }else if(type==='fuse'){
        const plan=pearlFusion(g,command.itemIds,defs);if(plan.error)return fail(plan.error);const p=plan.pearl;
        cost={gold:plan.gold};if(!pay(cost))return fail('Dobrões insuficientes.');const ids=new Set(command.itemIds);g.inventory=g.inventory.filter(i=>!ids.has(i.id));
        const success=draw(random)<plan.chance,next=pearls.find(q=>q.attribute===p.attribute&&q.level===p.level+1);if(success)g.inventory.push(pearlItem(next.id));result={type,success,cost,message:success?`Fusão concluída: ${next.name}.`:'Fusão falhou. As cinco pérolas e os dobrões foram consumidos.'};
      }else if(type==='fuseEquipment'){
        const plan=equipmentFusion(g,command.itemIds,command.slot,defs);if(plan.error)return fail(plan.error);cost=plan.cost;if(!pay(cost))return fail('Recursos insuficientes.');
        const ids=new Set(command.itemIds);g.inventory=g.inventory.filter(i=>!ids.has(i.id));let suffix=0,id;do{id=`forge-gear-${g.forgeSeq+1}-${suffix++}`;}while(find(g,id));
        const output=normalizeItem({id,def:plan.def,rarity:plan.target,level:plan.level,plus:0,locked:false,obtainedAt:int(now),origin:'Fusão de equipamentos'},defs,random);g.inventory.push(output);
        result={type,success:true,cost,itemId:output.id,message:`Fusão concluída: ${defs[output.def].name} · ${rarity[plan.target].name} · Nv.${output.level}.`};
      }else if(type==='reforge'||type==='reforgeLine'){
        if(!requireItem())return fail('Selecione um equipamento desbloqueado.');
        const line=type==='reforgeLine';if(line&&(!Number.isInteger(command.line)||command.line<0||command.line>=item.extras.length))return fail('Escolha uma linha de atributo válida.');
        cost=reforgeCost(item,line);if(!pay(cost))return fail('Recursos insuficientes.');const before=clone(item.extras);
        if(line)item.extras[command.line]=rollLine(item,defs[item.def],command.line,random);else item.extras=rollExtras(item,defs[item.def],random);
        item.reforgeAttempts=int(item.reforgeAttempts)+1;result={type,success:true,cost,before,after:clone(item.extras),message:line?'Atributo reforjado; demais linhas preservadas.':'Todos os atributos extras foram sorteados novamente.'};
      }else return fail('Operação desconhecida.');
      g.forgeSeq++;g.forgeHistory.push({seq:g.forgeSeq,at:int(now),itemId:item?.id||result.itemId||null,...clone(result)});g.forgeHistory=g.forgeHistory.slice(-12);assertBudget(g);return {ok:true,state:g,result};
    }catch(error){return fail('A operação não foi concluída; nenhum recurso foi consumido.');}
  }
  function assertBudget(g){if(!Number.isFinite(g.gold)||!Number.isFinite(g.materials)||g.gold<0||g.materials<0||g.inventory.length>CAPACITY)throw Error('Saldo inválido');const ids=allGear(g).map(i=>i.id);if(new Set(ids).size!==ids.length)throw Error('IDs duplicados');}
  const api={VERSION,CAPACITY,refinement,equipmentFusion,pearlFusion,rarity,names,keys,pearls,pearlById,fusion,isGear,isPearl,pearlOf,normalizeItem,migrate,itemStats,aggregate,rarityFromRoll,rollRarity,rollExtras,extraRange,upgradeCost,upgradeChance,removalCost,reforgeCost,execute};root.MareForge=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
