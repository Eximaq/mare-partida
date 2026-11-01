'use strict';
/* Impel Down progression and transactions shared by the live controller and UI. */
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
  function multiplier(floor){if(!validFloor(floor))throw Error('Andar inválido');return Math.pow(1.30,floor-1);}
  function scaleMonster(base,floor){
    const result={...base},factor=multiplier(floor);
    for(const key of ['hp','atk','def']){
      if(!Number.isFinite(base[key])||base[key]<0)throw Error('Atributo inválido');
      result[key]=base[key]===0?0:Math.max(1,Math.round(base[key]*factor));
    }
    return result;
  }
  const rewardFor=floor=>milestones.includes(floor)?{kind:'pearl-box',level:1,quantity:1}:null;
  const isBossFloor=floor=>validFloor(floor)&&floor%5===0;
  const unlockedThrough=save=>Math.min(FLOOR_COUNT,migrate(save).impelDown.cleared+1);
  const canInspect=(save,floor)=>validFloor(floor)&&floor<=unlockedThrough(save);
  // Presentation only describes a confirmed identity; it never rolls or guesses pool[0].
  function floorDetails(floor,catalog,identity=null){
    if(!validFloor(floor))throw Error('Andar inválido');
    const enemy=resolveEncounter(identity,catalog),monsters=enemy&&enemy.floor===floor?[{id:enemy.type,name:enemy.name,level:floor,quantity:1,hp:enemy.hp,attack:enemy.atk}]:[];
    return {floor,waves:1,monsters,total:monsters.length,boss:isBossFloor(floor)};
  }
  function resolveEncounter(identity,catalog){
    if(!identity||!validFloor(identity.floor)||typeof identity.token!=='string'||!/^impel-[a-z0-9-]{1,100}$/.test(identity.token))return null;
    const {floor,type,token}=identity;
    const base=isBossFloor(floor)?(type==='boss'?spawnImpelDownBoss(floor,catalog):null):commonPool(catalog).find(m=>m.type===type);
    return base?{...scaleMonster(base,floor),floor,token}:null;
  }
  function rollEncounter(floor,catalog,random=Math.random,spawnBoss=f=>spawnImpelDownBoss(f,catalog),serial=1){
    let base;
    if(isBossFloor(floor))base=spawnBoss(floor);else{
      const pool=commonPool(catalog),roll=random();
      if(!pool.length||!Number.isFinite(roll)||roll<0||roll>=1)throw Error('Pool ou sorteio inválido');
      base=pool[Math.floor(roll*pool.length)];
    }
    if(!base)throw Error('Encontro não configurado');
    return {...scaleMonster(base,floor),floor,token:'impel-'+floor+'-'+base.type+'-'+serial};
  }
  // A single next-floor identity is persisted. No stats, rewards or battle state are granted.
  function prepareEncounter(original,floor,catalog,random=Math.random){
    const save=migrate(original);
    if(!validFloor(floor)||floor!==save.impelDown.cleared+1)return {ok:false,message:'Somente o próximo andar pode ser preparado.'};
    const existing=resolveEncounter(save.impelDown.encounter,catalog);
    if(existing?.floor===floor)return {ok:true,state:save,enemy:existing,changed:false};
    try{
      const enemy=rollEncounter(floor,catalog,random);
      save.impelDown.encounter={floor,type:enemy.type,token:enemy.token};
      return {ok:true,state:save,enemy,changed:true};
    }catch{return {ok:false,message:'Encontro indisponível.'};}
  }
  function commonPool(catalog){return Object.entries(catalog).filter(([id,m])=>id!=='boss'&&!m.boss&&['hp','atk','def'].every(k=>Number.isFinite(m[k])&&m[k]>=0)&&m.hp>0).map(([type,m])=>({...m,type}));}
  function spawnImpelDownBoss(floor,catalog){
    if(!validFloor(floor))throw Error('Andar inválido');
    const pool=commonPool(catalog),base=catalog.boss||pool[0];if(!base)return null;
    return {...base,type:'boss',name:'Guardião Provisório de Impel Down',hp:Math.max(base.hp,...pool.map(m=>m.hp))*2,atk:Math.ceil(Math.max(base.atk,...pool.map(m=>m.atk))*1.5),def:Math.ceil(Math.max(base.def,...pool.map(m=>m.def))*1.5),placeholder:true};
  }
  function createRun({floor=1,catalog,random=Math.random,spawnBoss=f=>spawnImpelDownBoss(f,catalog),prepared=null}={}){
    if(!validFloor(floor))throw Error('Andar inválido');
    let currentFloor=floor,phase='idle',enemy=null,serial=0;
    const accept=identity=>{
      if(phase!=='idle')return false;
      const resolved=resolveEncounter(identity,catalog);
      if(!resolved||resolved.floor!==currentFloor)return false;
      enemy=resolved;return true;
    };
    if(prepared&&!accept(prepared))throw Error('Encontro preparado inválido');
    return {get currentFloor(){return currentFloor;},get phase(){return phase;},get enemy(){return enemy;},
      prepareFloor:accept,
      startFloor(){
        if(phase==='active')return enemy;
        if(phase!=='idle')throw Error('Andar ainda não pode iniciar');
        enemy ||=rollEncounter(currentFloor,catalog,random,spawnBoss,++serial);
        phase='active';return enemy;
      },
      defeat(token){if(phase!=='active'||token!==enemy.token)return false;phase='cleared';return true;},
      advance(){if(phase!=='cleared')return false;currentFloor++;enemy=null;phase=validFloor(currentFloor)?'idle':'complete';return true;}
    };
  }
  function migrate(original){
    const save=clone(original),old=save.impelDown||{};
    const cleared=Number.isInteger(old.cleared)?Math.min(100,Math.max(0,old.cleared)):0;
    save.impelDown={...old,version:VERSION,cleared,claimed:[...new Set((Array.isArray(old.claimed)?old.claimed:[]).filter(f=>milestones.includes(f)&&f<=cleared))],options:{autoAdvance:old.options?.autoAdvance===true,pauseBeforeBoss:old.options?.pauseBeforeBoss!==false}};
    return save;
  }
  // Existing pearls and fusion remain usable; only prison rewards create new supply.
  const canDrop=(kind,source)=>!['pearl','gem','pearl-box'].includes(kind)||source==='impel-down'||(kind==='pearl-box'&&source==='underworld');
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
      const save=migrate(original),pearl={id:newId,def:chosen.index,pearlId:chosen.pearlId,level:1,plus:0,locked:false,obtainedAt:now,origin:`${item.origin||'Impel Down'} · ${box.name}`};
      save.inventory.splice(save.inventory.findIndex(i=>i.id===id),1,pearl);
      return {ok:true,state:save,item:pearl,name:chosen.name};
    }catch{return fail('A caixa não foi aberta; nenhum item foi consumido.');}
  }
  function createSystem({available=false}={}){
    available=available===true;
    const canEnter=(save,floor)=>available&&validFloor(floor)&&floor===migrate(save).impelDown.cleared+1;
    function nextAction(save){
      const p=migrate(save).impelDown,floor=p.cleared+1;
      if(!canEnter(save,floor))return null;
      return {floor,autoEnter:p.options.autoAdvance&&!(p.options.pauseBeforeBoss&&isBossFloor(floor))};
    }
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
      if(save.impelDown.encounter?.floor===floor){
        save.impelDown.lastEncounter={...save.impelDown.encounter};delete save.impelDown.encounter;
      }
      if(rewardFor(floor)){
        const grant=claimMilestone(save,floor,defs);
        return grant.ok?{...grant,next:nextAction(grant.state)}:{ok:true,state:save,rewardPending:true,next:nextAction(save)};
      }
      return {ok:true,state:save,next:nextAction(save)};
    }
    return Object.freeze({available,canEnter,completeFloor,claimMilestone,nextAction});
  }
  const api={VERSION,FLOOR_COUNT,prepareEncounter,resolveEncounter,rollEncounter,commonPool,spawnImpelDownBoss,createRun,boxes,milestones,validFloor,multiplier,scaleMonster,rewardFor,isBossFloor,unlockedThrough,canInspect,floorDetails,migrate,canDrop,openBox,createSystem,...createSystem({available:true})};
  root.MarePrison=Object.freeze(api);if(typeof module!=='undefined')module.exports=root.MarePrison;
})(globalThis);
