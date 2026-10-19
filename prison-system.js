'use strict';
/* Pure prison progression and inventory transactions. Live rules stay unavailable. */
((root)=>{
  const FLOOR_COUNT=100,VERSION=1,CAPACITY=120;
  const clone=value=>JSON.parse(JSON.stringify(value));
  const validFloor=floor=>Number.isInteger(floor)&&floor>=1&&floor<=FLOOR_COUNT;
  const milestones=Object.freeze(Array.from({length:10},(_,i)=>(i+1)*5));
  const boxes=Object.freeze([1,2,3].map(level=>Object.freeze({
    name:`Caixa de Pérolas Nível ${level}`,kind:'pearl-box',boxLevel:level,
    slot:'consumable',rarity:['common','uncommon','rare'][level-1],
    attack:0,defense:0,hp:0,symbol:'▣'
  })));
  function multiplier(floor){if(!validFloor(floor))throw Error('Andar inválido');return floor<=10?.5:Math.ceil(floor/10);}
  function scaleMonster(base,floor){
    const result={...base},factor=multiplier(floor);
    for(const key of ['hp','atk','def']){
      if(!Number.isFinite(base[key])||base[key]<0)throw Error('Atributo inválido');
      result[key]=base[key]===0?0:Math.max(1,Math.round(base[key]*factor));
    }
    return result;
  }
  const rewardFor=floor=>milestones.includes(floor)?{kind:'pearl-box',level:1,quantity:1}:null;
  function migrate(original){
    const save=clone(original),old=save.impelDown||{};
    const cleared=Number.isInteger(old.cleared)?Math.min(100,Math.max(0,old.cleared)):0;
    save.impelDown={...old,version:VERSION,cleared,claimed:[...new Set((Array.isArray(old.claimed)?old.claimed:[]).filter(f=>milestones.includes(f)&&f<=cleared))]};
    return save;
  }
  // Existing pearls and fusion remain usable; only prison rewards create new supply.
  const canDrop=(kind,source)=>!['pearl','gem','pearl-box'].includes(kind)||source==='impel-down';
  const allItems=save=>[...(save.inventory||[]),...Object.values(save.equipment||{}).filter(Boolean)];
  const unique=save=>new Set(allItems(save).map(i=>i.id)).size===allItems(save).length;
  function openBox(original,id,defs,random=Math.random,now=Date.now()){
    const fail=message=>({ok:false,message});
    if(!original||!Array.isArray(original.inventory)||original.inventory.length>CAPACITY||!unique(original))return fail('Inventário inválido.');
    const item=original.inventory.find(i=>i.id===id),box=defs[item?.def];
    if(!item||box?.kind!=='pearl-box'||!boxes.some(b=>b.boxLevel===box.boxLevel))return fail('Caixa não encontrada.');
    if(item.locked)return fail('Desbloqueie a caixa antes de abrir.');
    const candidates=defs.map((d,index)=>({...d,index})).filter(d=>d.kind==='pearl'&&Number(d.pearlId?.split('_').at(-1))===box.boxLevel);
    if(candidates.length!==5)return fail('Catálogo de pérolas incompleto.');
    try{
      const roll=random();if(!Number.isFinite(roll)||roll<0||roll>=1)throw Error('RNG inválido');
      const chosen=candidates[Math.floor(roll*candidates.length)],newId='pearl-from-'+id;
      if(allItems(original).some(i=>i.id===newId))return fail('Identidade de recompensa duplicada.');
      const save=migrate(original),pearl={id:newId,def:chosen.index,pearlId:chosen.pearlId,level:1,plus:0,locked:false,obtainedAt:now,origin:`Impel Down · ${box.name}`};
      save.inventory.splice(save.inventory.findIndex(i=>i.id===id),1,pearl);
      return {ok:true,state:save,item:pearl,name:chosen.name};
    }catch{return fail('A caixa não foi aberta; nenhum item foi consumido.');}
  }
  function createSystem({available=false}={}){
    available=available===true;
    const canEnter=(save,floor)=>available&&validFloor(floor)&&floor===migrate(save).impelDown.cleared+1;
    function claimMilestone(original,floor,defs){
      if(!available)return {ok:false,message:'Impel Down está temporariamente indisponível.'};
      const save=migrate(original),p=save.impelDown,reward=rewardFor(floor);
      if(!reward||floor>p.cleared||p.claimed.includes(floor))return {ok:false,message:'Marco indisponível ou já recebido.'};
      const def=defs.findIndex(d=>d.kind==='pearl-box'&&d.boxLevel===reward.level),id=`impel-milestone-${floor}`;
      if(def<0||!Array.isArray(save.inventory)||save.inventory.length>=CAPACITY||!unique(save)||allItems(save).some(i=>i.id===id))return {ok:false,message:'Recompensa pendente. Confira o catálogo e o espaço na mochila.'};
      save.inventory.push({id,def,level:1,plus:0,locked:false,rarity:defs[def].rarity,origin:`Impel Down · Andar ${floor}`});p.claimed.push(floor);
      return {ok:true,state:save,reward};
    }
    function completeFloor(original,floor,victory,defs){
      if(!canEnter(original,floor)||victory!==true)return {ok:false,message:'Vitória sequencial necessária; sistema pode estar indisponível.'};
      const save=migrate(original);save.impelDown.cleared=floor;
      if(rewardFor(floor)){
        const grant=claimMilestone(save,floor,defs);
        return grant.ok?grant:{ok:true,state:save,rewardPending:true};
      }
      return {ok:true,state:save};
    }
    return Object.freeze({available,canEnter,completeFloor,claimMilestone});
  }
  const api={VERSION,FLOOR_COUNT,boxes,milestones,validFloor,multiplier,scaleMonster,rewardFor,migrate,canDrop,openBox,createSystem,...createSystem()};
  root.MarePrison=Object.freeze(api);if(typeof module!=='undefined')module.exports=root.MarePrison;
})(globalThis);
