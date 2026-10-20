'use strict';
/* World encounter/economy data. Enemy strength never reads the character level. */
((root)=>{
  const VERSION=1,clone=x=>JSON.parse(JSON.stringify(x)),int=n=>Number.isSafeInteger(n)&&n>=0?n:0;
  const regions={
    beach:{name:'Ilha Dawn',min:1,max:10,boss:'Capitão da Caldeira',bossLevel:10,firstGold:300,firstRarity:'rare',respawn:90,sectors:[
      {id:'cais',name:'Cais de Dawn',min:1,max:2,x:1128,y:1640,roles:['bandit','crab']},
      {id:'corsarios',name:'Bosque dos Corsários',min:3,max:4,x:1352,y:1544,roles:['bandit','bandit','crab']},
      {id:'estaleiro',name:'Praia dos Barqueiros',min:4,max:5,x:1656,y:1752,roles:['bandit','spirit']},
      {id:'mercado',name:'Enseada das Conchas',min:5,max:6,x:2152,y:1736,roles:['bandit','spirit','crab']},
      {id:'ancoras',name:'Passarela das Âncoras',min:7,max:8,x:1672,y:1352,roles:['crab','spirit']},
      {id:'farol',name:'Clareira dos Vigias',min:8,max:9,x:1832,y:1160,roles:['spirit','crab']},
      {id:'caldeira',name:'Vila do Capitão',min:9,max:10,x:2152,y:1064,roles:['crab','spirit']}
    ]},
    orange:{name:'Orange Town',min:21,max:30,boss:'Capitão Fagulha',bossLevel:30,firstGold:1800,firstRarity:'epic',respawn:90,sectors:[
      {id:'cais',name:'Cais das Laranjeiras',min:21,max:22,x:480,y:1632,roles:['bandit','crab']},
      {id:'rua',name:'Rua dos Navegantes',min:23,max:24,x:544,y:1056,roles:['bandit','bandit','spirit']},
      {id:'praca',name:'Praça dos Toldos',min:25,max:26,x:1056,y:1056,roles:['bandit','spirit']},
      {id:'armazens',name:'Armazéns da Enseada',min:27,max:28,x:1568,y:1376,roles:['crab','spirit']},
      {id:'picadeiro',name:'Pátio do Capitão',min:29,max:30,x:1568,y:544,roles:['crab','bandit','spirit']}
    ]},
    swamp:{name:'Cidade das Conchas',min:11,max:20,boss:'Guardião das Conchas',bossLevel:20,firstGold:900,firstRarity:'epic',respawn:90,sectors:[
      {id:'vigilia',name:'Pátio da Vigília',min:11,max:13,x:736,y:1312,roles:['bandit','crab']},
      {id:'docas',name:'Docas Veladas',min:14,max:16,x:1440,y:1504,roles:['bandit','spirit']},
      {id:'catacumbas',name:'Catacumbas da Névoa',min:17,max:19,x:1504,y:928,roles:['spirit','crab']},
      {id:'bastiao',name:'Bastião das Conchas',min:19,max:20,x:1120,y:544,roles:['crab','spirit']}
    ]}
  };
  const archetypes={crab:{hp:1.25,attack:.8,defense:1.3,speed:36,reach:43,attackSec:2.8,aggro:220},bandit:{hp:1,attack:1,defense:1,speed:50,reach:51,attackSec:2.1,aggro:300},spirit:{hp:.82,attack:1.1,defense:.7,speed:30,reach:165,attackSec:3.1,aggro:330},boss:{hp:4.2,attack:1.5,defense:1.45,speed:30,reach:70,attackSec:2.7,aggro:390}};
  const get=area=>regions[area]||null;
  function sectors(area,anchors=[]){return get(area)?.sectors.map(s=>({...s,...(anchors.find(a=>a.id===s.id)?{x:anchors.find(a=>a.id===s.id).x,y:anchors.find(a=>a.id===s.id).y}:{})}))||[];}
  function sectorAt(area,point,anchors=[]){return sectors(area,anchors).reduce((best,s)=>!best||Math.hypot(s.x-point.x,s.y-point.y)<Math.hypot(best.x-point.x,best.y-point.y)?s:best,null);}
  function profile(area,sectorId,type,roll=.5){
    const region=get(area),a=archetypes[type],s=region?.sectors.find(s=>s.id===sectorId);if(!s||!a)throw Error('Encontro desconhecido');
    const level=type==='boss'?region.bossLevel:s.min+Math.min(s.max-s.min,Math.floor(Math.max(0,Math.min(.999999,roll))*(s.max-s.min+1)));
    return {level,maxHP:Math.round((70+level*22)*(1+level*.035)*a.hp),attack:Math.round((6+level*2.2)*a.attack),defense:Math.round((2+level*1.15)*a.defense),speed:a.speed,reach:a.reach,attackSec:a.attackSec,aggro:a.aggro,xp:type==='boss'?level*35:Math.round((14+level*6)*(type==='crab'?1.1:type==='spirit'?1.12:1)),gold:type==='boss'?[level*12,level*17]:[4+level*2,8+level*3]};
  }
  function migrate(g){const old=g.hunts?.areas||{};return {...g,hunts:{version:VERSION,areas:Object.fromEntries(Object.keys(regions).map(id=>{const a=old[id]||{};return [id,{kills:int(a.kills),bosses:int(a.bosses),firstRewardClaimed:a.firstRewardClaimed===true,bossReadyAt:int(a.bossReadyAt)}];}))}};}
  function recordKill(g,area,type,now=Date.now()){const state=migrate(g),a=state.hunts.areas[area];if(!a)return {state,first:false};a.kills++;const first=type==='boss'&&a.bosses===0;if(type==='boss'){a.bosses++;a.bossReadyAt=now+get(area).respawn*1000;}return {state,first};}
  function bossReady(g,area,point,now=Date.now(),anchors=[]){const a=g.hunts?.areas?.[area],s=sectors(area,anchors).at(-1);return !!(a&&s&&a.kills>=12&&now>=a.bossReadyAt&&Math.hypot(point.x-s.x,point.y-s.y)<=340);}
  function rewards(area,m,playerLevel,roll=.5){
    const r=get(area),p=profile(area,m.district,m.type,0),level=m.level||p.level,over=Math.max(0,playerLevel-level-3),xpFactor=Math.max(.15,1-over*.07),boss=m.type==='boss';
    return {xp:Math.max(1,Math.round((m.xp||p.xp)*xpFactor)),gold:Math.round((m.gold||p.gold)[0]+Math.max(0,Math.min(1,roll))*((m.gold||p.gold)[1]-(m.gold||p.gold)[0])),gearLevel:Math.max(1,Math.ceil(level/5)),gearChance:boss?1:area==='orange'?.22:area==='swamp'?.18:.14,materialChance:boss?1:area==='orange'?.55:area==='swamp'?.45:.35,materials:boss?(area==='orange'?14:area==='swamp'?10:6):1,potionChance:boss?1:area==='orange'?.14:area==='swamp'?.12:.08,potions:boss?2:1};
  }
  function rarity(area,boss,roll,bonus=0){const n=Math.min(.999999,Math.max(0,roll)+Math.max(0,Math.min(.3,bonus))*.25);if(boss)return n<.3?'uncommon':n<.8?'rare':n<.99?'epic':'legendary';return n<(area==='orange'?.35:area==='swamp'?.45:.62)?'common':n<(area==='orange'?.8:area==='swamp'?.85:.92)?'uncommon':n<(area==='orange'?.97:area==='swamp'?.98:.995)?'rare':'epic';}
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
