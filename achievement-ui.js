'use strict';
/* Presentation for the permanent achievement ledger; no balances are stored here. */
((root)=>{
 const A=()=>root.MareAchievements,esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const n=v=>Number(v).toLocaleString('pt-BR');
 const iconIds=['kills','prison','wealth','level','power','fruit','haki','exploration'];
 function icon(id,extra=''){const i=Math.max(0,iconIds.indexOf(id));return `<span class="honors-icon ${extra}" style="--icon-x:${i%4*100/3}%;--icon-y:${i<4?0:100}%" aria-hidden="true"></span>`;}
 function goal(a){return {kills:'Derrote '+n(a.target)+' monstros.',floors:'Conclua o Andar '+a.target+' de Impel Down.',coins:'Acumule '+n(a.target)+' Berry ao longo da jornada.',level:'Alcance o nível '+a.target+'.',power:'Registre '+n(a.target)+' de Poder de Combate permanente.',fruits:'Registre '+a.target+' Akuma no Mi diferente(s).',awakenings:'Desperte uma Akuma no Mi.',observation:'Desbloqueie Haki da Observação.',armament:'Desbloqueie Haki do Armamento.',conqueror:'Desbloqueie Haki do Rei.',hakiMastery:'Maximize os três tipos de Haki.',islands:'Visite cinco ilhas diferentes.',fastTravel:'Desbloqueie os oito pontos do Arquipélago.',bounties:'Colete recompensas de dez chefes diferentes.'}[a.metric]||'';}
 function summary(game){const all=A().list(game).map(a=>a.claimed?{...a,progress:a.target}:a),eligible=all.filter(a=>a.enabled),done=eligible.filter(a=>a.progress>=a.target).length,ready=eligible.filter(a=>a.ready).length;
 const pending=eligible.filter(a=>!a.claimed);const featured=pending.find(a=>a.ready)||pending.filter(a=>a.progress<a.target).sort((a,b)=>b.progress/b.target-a.progress/a.target)[0]||null;
 return {all,done,total:eligible.length,ready,points:A().bonus(game),featured,percent:eligible.length?Math.round(done/eligible.length*100):0};}
 function progress(a){return `<div class="achievement-progress" role="progressbar" aria-label="${esc(a.name)}" aria-valuemin="0" aria-valuemax="${a.target}" aria-valuenow="${a.progress}"><i style="width:${a.progress/a.target*100}%"></i></div>`;}
 function status(a){return a.claimed?'claimed':!a.enabled?'unavailable':a.ready?'ready':'progress';}
 function action(a){return a.ready?`<button type="button" data-achievement-claim="${a.id}" class="honors-action claim">Resgatar</button>`:`<span class="achievement-state" data-state="${status(a)}">${a.claimed?'Resgatado':!a.enabled?'Indisponível':'Em progresso'}</span>`;}
 function featured(a){return a?`${icon(a.category,'featured-icon')}<div><small>${a.ready?'RECOMPENSA DISPONÍVEL':'PRÓXIMA CONQUISTA EM DESTAQUE'}</small><strong>${esc(a.name)}</strong><p>${esc(goal(a))}</p>${progress(a)}<span>${n(a.progress)} / ${n(a.target)} · +${a.points} PT</span></div>`:`${icon('exploration','featured-icon')}<div><small>FEITOS DOS MARES</small><strong>Todas as recompensas disponíveis foram resgatadas</strong><p>Seu progresso permanente está registrado no diário.</p></div>`;}
 function card(a){return `<article data-achievement-id="${a.id}" data-state="${status(a)}" class="achievement-entry ${a.claimed?'is-claimed':''}"><div class="achievement-emblem">${icon(a.category)}</div><div class="achievement-copy"><h3>${esc(a.name)}</h3><p>${esc(goal(a))}</p>${progress(a)}<strong class="achievement-count">${n(a.progress)} / ${n(a.target)}</strong></div><div class="achievement-reward"><strong class="achievement-pt">+${a.points} PT</strong><div class="achievement-action">${action(a)}</div></div></article>`;}
 function render({game,message='',category='all'}){
 const s=summary(game),shown=s.all.filter(a=>category==='all'||a.category===category);
 return `<section class="achievement-journal"><div class="achievement-summary"><section class="achievement-general honors-frame">${icon('exploration','summary-icon')}<div><h2>Progresso geral</h2><div class="achievement-progress summary-bar" role="progressbar" aria-label="Progresso geral das conquistas" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${s.percent}"><i style="width:${s.percent}%"></i><strong data-achievement-percent>${s.percent}%</strong></div><p><strong data-achievement-total>${s.done} / ${s.total}</strong> conquistas concluídas</p><small>Somente conquistas disponíveis</small></div></section><section class="achievement-budget"><strong data-achievement-points>${s.points} PT</strong><span>Resgatados nas conquistas</span><b data-achievement-ready>${s.ready} recompensa(s) disponível(is)</b><small>Pontos de talento</small></section><section class="achievement-featured honors-frame">${featured(s.featured)}</section></div>
 <nav class="achievement-categories" aria-label="Categorias de conquistas">${[['all','Todas'],...A().categories].map(([id,name])=>`<button type="button" data-achievement-category="${id}" aria-pressed="${id===category}">${id==='all'?'':icon(id)}<span>${esc(name)}</span></button>`).join('')}</nav>
 <p class="honors-message" role="status">${esc(message)}</p><div class="achievement-list" aria-label="Conquistas">${shown.map(card).join('')}</div></section>`;
 }
 function refresh(body,game,message){if(!body.querySelector('.achievement-journal'))return;const s=summary(game);
 const set=(q,v)=>{const e=body.querySelector(q);if(e&&e.textContent!==v)e.textContent=v;};
 set('[data-achievement-points]',s.points+' PT');set('[data-achievement-ready]',s.ready+' recompensa(s) disponível(is)');set('[data-achievement-total]',s.done+' / '+s.total);set('[data-achievement-percent]',s.percent+'%');
 const bar=body.querySelector('.summary-bar');if(bar.getAttribute('aria-valuenow')!==String(s.percent)){bar.setAttribute('aria-valuenow',s.percent);bar.firstElementChild.style.width=s.percent+'%';}
 if(message!==undefined)set('.honors-message',message);
 const box=body.querySelector('.achievement-featured'),stamp=JSON.stringify(s.featured&&[s.featured.id,s.featured.progress,s.featured.ready]);
 if(box.dataset.stamp!==stamp){box.dataset.stamp=stamp;box.innerHTML=featured(s.featured);}
 for(const a of s.all){const el=body.querySelector('[data-achievement-id="'+a.id+'"]');if(!el)continue;const st=status(a);
 if(el.dataset.state!==st){el.dataset.state=st;el.classList.toggle('is-claimed',a.claimed);el.querySelector('.achievement-action').innerHTML=action(a);}
 const count=n(a.progress)+' / '+n(a.target);if(el.querySelector('.achievement-count').textContent!==count){el.querySelector('.achievement-count').textContent=count;const meter=el.querySelector('[role=progressbar]');meter.setAttribute('aria-valuenow',a.progress);meter.firstElementChild.style.width=a.progress/a.target*100+'%';}}
 }
 const api={render,refresh,summary,goal,icon};root.MareAchievementUI=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
