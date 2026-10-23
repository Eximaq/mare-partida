'use strict';
/* World encounter/economy data. Enemy strength never reads the character level. */
((root)=>{
  const VERSION=1,clone=x=>JSON.parse(JSON.stringify(x)),int=n=>Number.isSafeInteger(n)&&n>=0?n:0;
  const newIslands=root.MareNewIslands||(typeof module!=='undefined'?(require('./new-islands-data.js'),require('./new-islands.js')):null);
  const monsterCatalog=root.MareMonsterCatalog||(typeof module!=='undefined'?require('./monster-catalog.js'):null);
  const pixelMaps=root.MarePixelWorldMaps||(typeof module!=='undefined'?(require('./pixellab-world-maps-data.js'),require('./pixellab-world-maps.js')):null);
  const regions={
    rare:{name:'Ilha dos Animais Raros',min:16,max:20,boss:null,bossLevel:null,firstGold:0,firstRarity:null,respawn:0,sectors:newIslands.rare.districts.map(d=>({...d,min:18,max:18,roles:['cocox']}))},
    syrup:{name:'Vila Syrup',min:21,max:25,boss:null,bossLevel:null,firstGold:0,firstRarity:null,respawn:0,sectors:newIslands.syrup.districts.map((d,i)=>({...d,min:23,max:23,roles:i%2?['buchi','sham']:['sham','buchi']}))},
    baratie:{name:'Baratie',min:26,max:30,boss:null,bossLevel:null,firstGold:0,firstRarity:null,respawn:0,sectors:newIslands.baratie.districts.map((d,i)=>({...d,min:28,max:28,roles:i%2?['gin','pearl']:['pearl','gin']}))},
    arlong:{name:'Parque Arlong',min:31,max:35,boss:null,bossLevel:null,firstGold:0,firstRarity:null,respawn:60,sectors:newIslands.arlong.districts.map((d,i)=>({...d,min:33,max:33,roles:i%2?['chew','kuroobi']:['kuroobi','chew']}))},
    beach:{name:'Ilha Dawn',min:1,max:5,boss:'César',bossLevel:5,firstGold:300,firstRarity:'rare',respawn:90,sectors:[
      {id:'cais',name:'Cais de Dawn',min:5,max:5,x:1128,y:1640,roles:['cesar']},
      {id:'corsarios',name:'Bosque dos Corsários',min:5,max:5,x:1352,y:1544,roles:['cesar']},
      {id:'estaleiro',name:'Praia dos Barqueiros',min:5,max:5,x:1656,y:1752,roles:['cesar']},
      {id:'mercado',name:'Enseada das Conchas',min:5,max:5,x:2152,y:1736,roles:['cesar']},
      {id:'ancoras',name:'Passarela das Âncoras',min:5,max:5,x:1672,y:1352,roles:['cesar']},
      {id:'farol',name:'Clareira dos Vigias',min:5,max:5,x:1832,y:1160,roles:['cesar']},
      {id:'caldeira',name:'Vila do Capitão',min:5,max:5,x:2152,y:1064,roles:['cesar']}
    ]},
    orange:{name:'Orange Town',min:11,max:15,boss:null,bossLevel:null,firstGold:0,firstRarity:null,respawn:0,sectors:pixelMaps.orange.districts.map(d=>({...d}))},
    loguetown:{name:'Loguetown',min:36,max:40,boss:null,bossLevel:null,firstGold:0,firstRarity:null,respawn:0,sectors:pixelMaps.loguetown.districts.map(d=>({...d}))},
    swamp:{name:'Cidade das Conchas',min:8,max:8,boss:null,bossLevel:null,firstGold:0,firstRarity:null,respawn:0,sectors:pixelMaps.conchas.districts.map(d=>({...d}))}
  };
  const archetypes={crab:{hp:1.25,attack:.8,defense:1.3,speed:36,reach:43,attackSec:2.8,aggro:220},bandit:{hp:1,attack:1,defense:1,speed:50,reach:51,attackSec:2.1,aggro:300},spirit:{hp:.82,attack:1.1,defense:.7,speed:30,reach:165,attackSec:3.1,aggro:330},boss:{hp:4.2,attack:1.5,defense:1.45,speed:30,reach:70,attackSec:2.7,aggro:390},...Object.fromEntries(Object.keys(monsterCatalog).map(id=>[id,{hp:1,attack:1,defense:1,speed:monsterCatalog[id].move_speed,reach:monsterCatalog[id].reach,attackSec:monsterCatalog[id].attack_seconds,aggro:monsterCatalog[id].aggro_radius}]))};
  const get=area=>regions[area]||null;
  function sectors(area,anchors=[]){return get(area)?.sectors.map(s=>({...s,...(anchors.find(a=>a.id===s.id)?{x:anchors.find(a=>a.id===s.id).x,y:anchors.find(a=>a.id===s.id).y}:{})}))||[];}
  function sectorAt(area,point,anchors=[]){return sectors(area,anchors).reduce((best,s)=>!best||Math.hypot(s.x-point.x,s.y-point.y)<Math.hypot(best.x-point.x,best.y-point.y)?s:best,null);}
  function profile(area,sectorId,type,roll=.5){
    const region=get(area),a=archetypes[type],s=region?.sectors.find(s=>s.id===sectorId);if(!s||!a)throw Error('Encontro desconhecido');
    const level=type==='boss'?region.bossLevel:s.min+Math.min(s.max-s.min,Math.floor(Math.max(0,Math.min(.999999,roll))*(s.max-s.min+1)));
    if(monsterCatalog[type]){const m=monsterCatalog[type];if(m.area!==area)throw Error('Monstro fora da ilha');return {level:m.level,maxHP:m.max_hp,attack:m.physical_attack,defense:m.physical_defense,magicDefense:m.magic_defense,speed:m.move_speed,reach:m.reach,attackSec:m.attack_seconds,aggro:m.aggro_radius,xp:Math.round(140*1.055**(m.level-18)),gold:[Math.round(45*1.055**(m.level-18)),Math.round(70*1.055**(m.level-18))]};}
    return {level,maxHP:Math.round((70+level*22)*(1+level*.035)*a.hp),attack:Math.round((6+level*2.2)*a.attack),defense:Math.round((2+level*1.15)*a.defense),speed:a.speed,reach:a.reach,attackSec:a.attackSec,aggro:a.aggro,xp:type==='boss'?level*35:Math.round((14+level*6)*(type==='crab'?1.1:type==='spirit'?1.12:1)),gold:type==='boss'?[level*12,level*17]:[4+level*2,8+level*3]};
  }
  function migrate(g){const old=g.hunts?.areas||{};return {...g,hunts:{version:VERSION,areas:Object.fromEntries(Object.keys(regions).map(id=>{const a=old[id]||{};return [id,{kills:int(a.kills),bosses:int(a.bosses),firstRewardClaimed:a.firstRewardClaimed===true,bossReadyAt:int(a.bossReadyAt)}];}))}};}
  function recordKill(g,area,type,now=Date.now()){const state=migrate(g),a=state.hunts.areas[area];if(!a)return {state,first:false};a.kills++;const first=type==='boss'&&a.bosses===0;if(type==='boss'){a.bosses++;a.bossReadyAt=now+get(area).respawn*1000;}return {state,first};}
  function bossReady(g,area,point,now=Date.now(),anchors=[]){const a=g.hunts?.areas?.[area],s=sectors(area,anchors).at(-1);return !!(get(area)?.boss&&a&&s&&a.kills>=12&&now>=a.bossReadyAt&&Math.hypot(point.x-s.x,point.y-s.y)<=340);}
  function rewards(area,m,playerLevel,roll=.5){
    const r=get(area),p=profile(area,m.district,m.type,0),level=m.level||p.level,over=Math.max(0,playerLevel-level-3),xpFactor=Math.max(.15,1-over*.07),boss=m.type==='boss'||monsterCatalog[m.type]?.boss===true;
    return {xp:Math.max(1,Math.round((m.xp||p.xp)*xpFactor)),gold:Math.round((m.gold||p.gold)[0]+Math.max(0,Math.min(1,roll))*((m.gold||p.gold)[1]-(m.gold||p.gold)[0])),gearLevel:Math.max(1,Math.ceil(level/5)),gearChance:boss?1:area==='rare'?.25:area==='orange'?.22:area==='swamp'?.18:.14,materialChance:boss?1:area==='rare'?.60:area==='orange'?.55:area==='swamp'?.45:.35,materials:boss?(area==='orange'?14:area==='swamp'?10:6):1,potionChance:boss?1:area==='rare'?.16:area==='orange'?.14:area==='swamp'?.12:.08,potions:boss?2:1};
  }
  function rarity(area,boss,roll,bonus=0){const n=Math.min(.999999,Math.max(0,roll)+Math.max(0,Math.min(.3,bonus))*.25);if(boss)return n<.3?'uncommon':n<.8?'rare':n<.99?'epic':'legendary';return n<(area==='rare'?.30:area==='orange'?.35:area==='swamp'?.45:.62)?'common':n<(area==='rare'?.77:area==='orange'?.8:area==='swamp'?.85:.92)?'uncommon':n<(area==='rare'?.96:area==='orange'?.97:area==='swamp'?.98:.995)?'rare':'epic';}
  function claimFirst(g,area,item,capacity=120){const state=migrate(g),r=get(area),a=state.hunts.areas[area];if(!r||!a?.bosses||a.firstRewardClaimed)return {ok:false,message:'Recompensa ainda não disponível ou já recebida.'};if(!item||state.inventory.length>=capacity)return {ok:false,message:'Libere um espaço na mochila para receber a arma.'};state.inventory=[...state.inventory,item];state.gold+=r.firstGold;state.stats={...state.stats,goldEarned:(state.stats.goldEarned||0)+r.firstGold};a.firstRewardClaimed=true;return {ok:true,state};}
  function beginWarning(m,hero){
    if(m.type!=='boss'&&m.type!=='spirit')return null;
    if(m.type==='boss'&&(m.attackCount||0)%3!==2)return null;
    const line=m.type==='boss'&&(m.attackCount||0)%6===5,total=m.type==='spirit'?.85:line?1.45:1.3,dx=hero.x-m.x,dy=hero.y-m.y,d=Math.hypot(dx,dy)||1;
    return {shape:line?'line':'circle',name:m.area==='orange'?(m.type==='spirit'?'Disparo de Pólvora':line?'Investida do Malho':'Impacto do Picadeiro'):m.type==='spirit'?'Selo da Névoa':line?'Ruptura da Âncora':'Impacto da Caldeira',x:m.type==='spirit'?hero.x:m.x,y:m.type==='spirit'?hero.y:m.y,to:line?{x:m.x+dx/d*280,y:m.y+dy/d*280}:null,radius:m.type==='spirit'?48:140,width:64,total,remaining:total,multiplier:m.type==='spirit'?1.15:line?2.1:1.8};
  }
  function danger(w,p,padding=10){if(!w)return false;if(w.shape==='circle')return Math.hypot(p.x-w.x,p.y-w.y)<=w.radius+padding;const dx=w.to.x-w.x,dy=w.to.y-w.y,t=Math.max(0,Math.min(1,((p.x-w.x)*dx+(p.y-w.y)*dy)/(dx*dx+dy*dy)));return Math.hypot(p.x-w.x-t*dx,p.y-w.y-t*dy)<=w.width/2+padding;}
  function stepWarning(m,dt,hero,{blocked=false,clear=true}={}){const w=m.telegraph;if(!w)return null;if(blocked){m.telegraph=null;return null;}w.remaining=Math.max(0,w.remaining-dt);if(w.remaining>0)return null;m.telegraph=null;return {hit:clear&&danger(w,hero),multiplier:w.multiplier,warning:w};}
  const api={VERSION,regions,archetypes,get,sectors,sectorAt,profile,migrate,recordKill,bossReady,rewards,rarity,claimFirst,beginWarning,danger,stepWarning};root.MareHunt=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
