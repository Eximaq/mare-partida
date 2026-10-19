'use strict';
/* Persistent unlock/resource, ephemeral combat state. No offline regeneration or auto re-arm at zero. */
((root)=>{
  const ids=['armament','observation','conqueror'];
  const rules=Object.freeze({level:50,maxWillpower:100,drain:5,regen:5,kingCost:50,stun:3,bossDuration:8,radius:360,bookChance:.05,minBossLevel:30});
  const catalog=[
    {id:'armament',name:'Haki do Armamento',subtitle:'Busoshoku',description:'+15 pontos percentuais de penetração física e +10% de defesa.',cost:'5 Vontade/s'},
    {id:'observation',name:'Haki da Observação',subtitle:'Kenbunshoku',description:'+15 pontos percentuais de esquiva e precisão.',cost:'5 Vontade/s'},
    {id:'conqueror',name:'Haki do Rei',subtitle:'Haoshoku',description:'Atordoa monstros comuns por 3s. Chefes perdem 15% de ataque e defesa por 8s. Alcance: 360.',cost:'50 Vontade por uso'}
  ];
  const book={id:'will-book',name:'Livro da Vontade',kind:'haki-book',slot:'consumable',rarity:'epic',attack:0,defense:0,hp:0,symbol:'▤'};
  const clamp=n=>Math.min(100,Math.max(0,Number.isFinite(n)?n:100));
  function migrate(g){
    const h=g.haki||{},unlocked=g.has_haki_unlocked===true||h.unlocked===true;
    return {...g,has_haki_unlocked:unlocked,haki:{version:1,unlocked,current:clamp(h.current),auto:['armament','observation'].includes(h.auto)?h.auto:null,equipped:['armament','observation'].includes(h.equipped)?h.equipped:'armament'}};
  }
  const start=()=>({active:null,inCombat:false,remaining:0,exhausted:false,kingFX:0,eyeFX:0});
  function touch(g,rt){
    if(!g.has_haki_unlocked)return;
    const first=!rt.inCombat;rt.inCombat=true;rt.remaining=6;
    if(first&&!rt.active&&g.haki.auto&&g.haki.current>0&&!rt.exhausted)rt.active=g.haki.auto;
  }
  function stop(rt){rt.active=null;rt.inCombat=false;rt.remaining=0;rt.exhausted=false;rt.kingFX=0;rt.eyeFX=0;}
  function tick(g,rt,dt,{alive=true,inHunt=true}={}){
    dt=Math.max(0,Number.isFinite(dt)?dt:0);
    rt.kingFX=Math.max(0,rt.kingFX-dt);rt.eyeFX=Math.max(0,rt.eyeFX-dt);
    if(!g.has_haki_unlocked)return;
    if(!alive||!inHunt){stop(rt);if(alive)g.haki.current=clamp(g.haki.current+dt*rules.regen);return;}
    const wasCombat=rt.inCombat,combatTime=wasCombat?Math.min(dt,rt.remaining):0;rt.remaining=Math.max(0,rt.remaining-dt);
    const activeWindow=rt.active?(wasCombat?combatTime:dt):0,activeTime=Math.min(activeWindow,g.haki.current/rules.drain);
    if(rt.active){g.haki.current=clamp(g.haki.current-activeTime*rules.drain);if(g.haki.current<=1e-8){g.haki.current=0;rt.active=null;rt.exhausted=wasCombat;}}
    if(rt.inCombat&&rt.remaining<=0){rt.active=null;rt.inCombat=false;rt.exhausted=false;}
    const rest=wasCombat?dt-combatTime:rt.active?0:dt-activeTime;
    if(!rt.inCombat&&!rt.active){g.haki.current=clamp(g.haki.current+rest*rules.regen);rt.exhausted=false;}
  }
  function toggle(g,rt,id,{alive=true,inHunt=true}={}){
    if(!g.has_haki_unlocked||!alive||!inHunt||!['armament','observation'].includes(id))return {ok:false,message:'Ative este Haki durante uma expedição, com o personagem vivo.'};
    if(rt.active===id){rt.active=null;return {ok:true};}
    if(g.haki.current<=0)return {ok:false,message:'Vontade esgotada. Descanse fora de combate.'};
    g.haki.equipped=id;rt.active=id;return {ok:true};
  }
  function configure(g,id,enabled){
    if(!g.has_haki_unlocked||!['armament','observation'].includes(id))return null;
    const next=migrate(g);next.haki.auto=enabled?id:(next.haki.auto===id?null:next.haki.auto);if(enabled)next.haki.equipped=id;return next;
  }
  function stats(s,g,rt){
    if(!g.has_haki_unlocked||!rt?.active||g.haki.current<=0)return s;
    if(rt.active==='armament')return {...s,penetration:Math.min(.95,(s.penetration||0)+.15),defense:s.defense*1.10};
    return {...s,evasion:Math.min(.75,(s.evasion||0)+.15),accuracy:Math.min(1,(s.accuracy||0)+.15)};
  }
  function unlock(g,itemId,defs){
    const next=migrate(g),item=next.inventory?.find(i=>i.id===itemId);
    if(next.has_haki_unlocked)return {ok:false,message:'Seu Haki já foi despertado. O livro foi preservado.'};
    if(g.level<rules.level)return {ok:false,message:'Alcance o nível 50 antes de consumir o Livro da Vontade.'};
    if(!item||item.locked||defs[item.def]?.kind!=='haki-book')return {ok:false,message:'Tenha um Livro da Vontade desbloqueado na mochila.'};
    next.inventory=next.inventory.filter(i=>i.id!==itemId);next.has_haki_unlocked=true;next.haki.unlocked=true;next.haki.current=100;
    return {ok:true,state:next};
  }
  function eligibleBoss(m){return !!m&&(m.boss===true||m.type==='boss')&&['world','daily'].includes(m.source)&&Number.isFinite(m.level)&&m.level>=rules.minBossLevel;}
  function drop(m,random=Math.random){return eligibleBoss(m)&&random()<rules.bookChance;}
  function cast(g,rt,hero,enemies,{alive=true,inHunt=true,clear=()=>true}={}){
    if(!g.has_haki_unlocked||!alive||!inHunt)return {ok:false,message:'Use o Haki do Rei durante uma expedição, com o personagem vivo.'};
    if(g.haki.current<rules.kingCost)return {ok:false,message:'O Haki do Rei exige 50 de Vontade.'};
    g.haki.current-=rules.kingCost;if(g.haki.current===0){rt.active=null;rt.exhausted=true;}
    rt.kingFX=.8;touch(g,rt);
    const targets=enemies.filter(m=>m.alive&&Math.hypot(m.x-hero.x,m.y-hero.y)<=rules.radius&&clear(hero,m));
    for(const m of targets){if(m.type==='boss'||m.boss)m.hakiDebuff=rules.bossDuration;else m.talentControl={type:'stun',remaining:Math.max(rules.stun,m.talentControl?.remaining||0)};}
    return {ok:true,targets:targets.length};
  }
  const api={available:true,rules,catalog,book,migrate,start,touch,stop,tick,toggle,configure,stats,unlock,eligibleBoss,drop,cast,ids};root.MareHaki=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
