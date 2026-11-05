'use strict';
// Small shared decision rules. Native skill validators remain authoritative.
((root)=>{
 const live=m=>!!m&&m.alive!==false&&m.hp>0&&!m.returning,dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
 const punch={duration:.5,impact:.25};
 const cleansesControl=(id,key)=>id==='akuma_horu_horu'&&String(key)==='2';
 const fruitRules={
  akuma_kuku_kuku:{1:['food',0,0]},akuma_beri_beri:{2:['protection',130]},
  akuma_supa_supa:{1:['damage',128],2:['protection',0,'supa']},
  akuma_horu_horu:{1:['buff',0,'horu'],2:['healCleanse',0,'horuSpeed']},
  akuma_ushi_giraffe:{2:['buff',0,'ushi']},akuma_inu_wolf:{2:['buff',0,'wolf']},akuma_ushi_bison:{2:['protection',0,'bison']},
  akuma_kobu_kobu:{1:['buff',0,'revolution'],2:['damage',384,'deposition']},
  akuma_hoya_hoya:{1:['summon',0,'genie'],2:['buff',0,'genieBuff']},akuma_jiki_jiki:{1:['damage',256,'jikiCharge']},
  akuma_mero_mero:{1:['damage',192],2:['damage',256],3:['damage',256]},akuma_ope_ope:{1:['buff',320,'room']},akuma_bari_bari:{1:['damage',256],2:['protection',0,'dome'],3:['damage',256]},
  akuma_doku_doku:{3:['damage',192,'redPoison']},akuma_yami_yami:{1:['damage',153.6],2:['damage',115.2,'blackHole'],3:['damage',154]},
  akuma_mera_mera:{1:['damage',320],2:['damage',256],3:['damage',448,'pillar']},akuma_gura_gura:{1:['damage',256],2:['damage',192],3:['buff',0,'guraBuff']},akuma_hie_hie:{1:['damage',320],2:['damage',384],3:['damage',192]},akuma_tori_phoenix:{1:['damage',128],3:['damage',320],2:['heal',320,'phoenixTotem']}
 };
 function fruitMeta(id,key){const r=fruitRules[id]?.[key]||['damage',({akuma_hana_hana:128,akuma_doru_doru:256,akuma_neko_leopard:192,akuma_ushi_giraffe:192,akuma_inu_wolf:256,akuma_ryu_ryu:256,akuma_mato_mato:384})[id]||384];return {kind:r[0],range:r[1],active:r[2],cleansesControl:cleansesControl(id,key),selfOnly:id==='akuma_horu_horu',healRange:r[0]==='heal'?r[1]:180,shape:id==='akuma_gura_gura'&&String(key)==='1'?'cone':null};}
 function priority(meta,c){
  if(c.controlled&&meta.cleansesControl)return 0;
  if(c.active?.[meta.active])return null;
  const threatened=c.enemies?.some(m=>live(m)&&dist(c.hero,m)<=384&&c.clear(c.hero,m));
  const injured=!meta.selfOnly&&(c.allies||[]).some(a=>live(a)&&a.valid!==false&&a.hp<a.maxHP&&(!Number.isFinite(a.x)||dist(c.hero,a)<=(meta.healRange||180)&&c.clear(c.hero,a))),low=c.hp<c.maxHP*(c.healThreshold??.7);
  if(meta.kind==='heal'||meta.kind==='healCleanse')return low||injured||meta.kind==='healCleanse'&&c.controlled?0:meta.kind==='healCleanse'&&threatened&&!c.active?.horuSpeed?3:meta.hybrid&&threatened&&!c.active?.holyShield?1:null;
  if(meta.kind==='food')return low&&c.foodAvailable?0:null;
  if(meta.kind==='protection')return c.hp<c.maxHP*.8&&threatened?1:null;
  if(meta.kind==='summon')return threatened?2:null;
  if(meta.kind==='buff')return threatened?3:null;
  return 4;
 }
 function useful(meta,c){
  if(meta.active&&c.active?.[meta.active]&&!(c.controlled&&meta.cleansesControl))return false;
  if(meta.kind!=='damage')return priority(meta,c)!==null;
  const t=c.target;if(!live(t)||!c.clear(c.hero,t)||dist(c.hero,t)>meta.range)return false;
  if(meta.shape==='circle')return c.enemies.filter(m=>live(m)&&dist(t,m)<=meta.radius&&c.clear(t,m)).length>=(meta.minTargets||1);
  if(meta.shape==='cone'){const dx=(t.x-c.hero.x)/(dist(c.hero,t)||1),dy=(t.y-c.hero.y)/(dist(c.hero,t)||1);return c.enemies.some(m=>{const x=m.x-c.hero.x,y=m.y-c.hero.y,along=x*dx+y*dy,side=Math.abs(x*dy-y*dx);return live(m)&&along>=side&&dist(c.hero,m)<=meta.range&&c.clear(c.hero,m);});}
  return true;
 }
 function choose(candidates,c){return candidates.map((v,i)=>({...v,order:i,priority:priority(v.meta,c)})).filter(v=>v.priority!==null&&v.ready&&(!c.controlled||v.meta.cleansesControl)&&useful(v.meta,c)).sort((a,b)=>a.priority-b.priority||a.order-b.order);}
 function classBlocked({transformed,genie,charging,controlled}){return controlled?'Aguarde o fim do controle.':transformed?'Indisponível nesta transformação.':genie?'Aguarde o término da invocação.':charging?'Conclua a habilidade em preparação.':'';}
 const api={cleansesControl,punch,live,dist,fruitMeta,priority,useful,choose,classBlocked};root.MareCombatPolicy=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
