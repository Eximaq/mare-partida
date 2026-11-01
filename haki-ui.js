'use strict';
((root)=>{
 const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const P=()=>root.MareHakiProgression;
 const icon=id=>`<img class="haki-icon" src="${id==='book'?'assets/ui/items-pixellab/book.png':'assets/haki/mastery/'+id+'.png'}" alt="" draggable="false">`;
 const labels={penetration:'Penetração física',defense:'Defesa',accuracy:'Precisão',evasion:'Esquiva',stun:'Atordoamento em comuns',bossReduction:'Redução ATQ/DEF de chefes',bossDuration:'Duração em chefes',radius:'Alcance'};
 const value=(key,n)=>key==='radius'?Math.round(n)+' px':['stun','bossDuration'].includes(key)?Number(n.toFixed(2))+' s':'+'+Number((n*100).toFixed(2))+(key==='defense'||key==='bossReduction'?'%':' pp');
 const effectRows=(node,rank)=>Object.entries(node.effects).map(([key,n])=>`<li><span>${labels[key]}</span><b>${value(key,n*rank/node.max)}</b></li>`).join('');
 function nodeButton(g,n,selected,defs){
  const rank=P().rank(g,n.id),error=P().error(g,n.id,defs),state=rank===n.max?'complete':rank?'partial':error?'locked':'ready';
  return `<button type="button" class="hm-node ${state} ${n.final?'hm-final':''}" data-haki-node="${n.id}" data-haki-order="${n.order}" aria-pressed="${selected===n.id}" aria-label="${E(n.name+' '+rank+'/'+n.max+' · '+(error||'Disponível'))}" title="${E(n.name+' · '+(error||'Selecione para inspecionar'))}">${icon(n.icon)}<span><strong>${E(n.final?'Domínio':n.name)}</strong><small>${rank}/${n.max}</small></span></button>`;
 }
 function branch(g,b,selected,defs){
  const pr=P().progress(g,b),f=P().fragments.find(f=>f.branch===b);
  // Catalogue dependencies stay unchanged. All branches read from foundations at
  // the bottom toward the final mastery at the top, like the Talent tree.
  return `<section class="hm-branch hm-${b}" aria-label="Árvore de ${P().names[b]}"><header><h2>${P().names[b]}</h2><small>${pr.current}/${pr.total} graduações</small><div class="hm-fragment" title="${E(f.name)}">${icon('fragment-'+b)}<b data-haki-balance="${b}">${P().quantity(g,b,defs,{includeLocked:true})}</b><span>fragmentos</span></div></header><div class="hm-nodes">${[...P().branches[b]].reverse().map(n=>nodeButton(g,n,selected,defs)).join('')}</div>${b==='conqueror'?`<div class="hm-gate" data-haki-gate><b>PORTÃO DE DESPERTAR · ${P().gate(g)?'LIBERADO':'BLOQUEADO'}</b><span>Armamento completo: ${P().complete(g,'armament')?'sim':'não'}</span><span>Observação completa: ${P().complete(g,'observation')?'sim':'não'}</span></div>`:'<p class="hm-foundation">↑ Dos fundamentos ao domínio</p>'}</section>`;
 }
 function detail(g,n,defs){
  const rank=P().rank(g,n.id),cost=P().cost(g,n),error=P().error(g,n.id,defs);
  const requirement=n.requires.length?n.requires.map(d=>E(P().byId[d.id].name)+' '+P().rank(g,d.id)+'/'+d.rank).join(' · '):'Acesso ao Haki';
  return `<section class="hm-detail" aria-label="Detalhes do nó selecionado"><header>${icon(n.icon)}<div><small>${P().names[n.branch]}</small><h3>${E(n.name)}</h3><b>${rank}/${n.max}</b></div></header><div class="hm-effect"><h3>Benefício atual do nó</h3><ul>${n.final?'<li>'+ (P().learned(g,n.branch)?'Habilidade desbloqueada':'Habilidade ainda bloqueada')+'</li>':effectRows(n,rank)}</ul></div>${rank<n.max?`<div class="hm-effect"><h3>Próxima graduação</h3><ul>${n.final?'<li>Desbloqueia o ativo final.</li>':effectRows(n,rank+1)}</ul></div><p class="hm-cost"><b>${cost} fragmentos</b><span>${E(P().names[n.branch])} · ${P().quantity(g,n.branch,defs)} disponíveis</span></p>`:'<p class="hm-max">Graduação máxima alcançada.</p>'}<div class="hm-requirements"><h3>Requisitos</h3><p>${requirement}</p>${n.branch==='conqueror'?'<p>Armamento e Observação integralmente completos.</p>':''}</div>${MareUI.button({label:rank===n.max?'NÓ CONCLUÍDO':'CONFIRMAR INVESTIMENTO',variant:'primary',disabled:!!error,attributes:{'data-haki-invest':n.id,'data-haki-seq':g.haki.mastery.seq,...(error?{disabled:true}:{})}})}<p class="hm-feedback" role="status">${E(error||'Confirme para consumir os materiais.')}</p><details class="hm-training-note"><summary>Sobre os efeitos e fragmentos</summary><p>Os benefícios dos nós atuam somente enquanto o Haki correspondente estiver ativo. Apenas um Haki contínuo por vez.</p><p>Custos de investimento provisórios. Quests, fases, quantidades e chances de obtenção dos fragmentos aguardam definição.</p></details></section>`;
 }
 function active(g,rt,b){
  const d=MareHaki.catalog.find(x=>x.id===b),king=b==='conqueror';
  return `<article data-haki-kind="${b}"><header>${icon(b)}<div><h3>${P().names[b]}</h3><small data-haki-learned="${b}"></small></div><details class="hm-control-info"><summary aria-label="Efeitos e custo de ${P().names[b]}">!</summary><div><b>Domínio ${b==='observation'?'da':'do'} ${P().names[b]}</b><p>${E(d.description)}</p><p>${E(d.cost)} · ${king?'K · recarga 8 s':b==='armament'?'H':'J'}</p><small>Aprender não significa ativar. O combate mantém suas regras atuais.</small></div></details></header><div class="hm-active-actions">${king?'<button type="button" data-haki-cast>Ativar</button>':`<button type="button" data-haki-toggle="${b}">Ativar</button><label><input type="checkbox" data-haki-auto="${b}" ${g.haki.auto===b?'checked':''} ${!P().learned(g,b)?'disabled':''}> Auto</label>`}</div><span class="hm-control-reason" data-haki-reason="${b}"></span></article>`;
 }
 function render(g,rt,options={}){
  const {defs=[],selected='coating'}=options,n=P().byId[selected]||P().nodes[0],held=P().held(g);
  return `<section class="haki-mastery"><section class="haki-disciplines" aria-label="Habilidades ativas finais">${P().ids.map(b=>active(g,rt,b)).join('')}<div class="haki-reserve" role="meter" aria-label="Vontade" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.floor(g.haki.current)}"><header><strong><img class="hm-will-icon" src="assets/ui/character-studio/attributes/spirit.png" alt="">Vontade</strong><b data-haki-current>${Math.floor(g.haki.current)} / 100</b></header><i><em data-haki-fill style="width:${g.haki.current}%"></em></i><small data-haki-status></small></div></section>${held?'<p class="hm-migration" role="status">Migração preparada. Compensação e tratamento do Rei aguardam definição do proprietário; acesso anterior preservado temporariamente.</p>':''}<div class="hm-layout"><div class="hm-tree" aria-label="Árvores de domínio de Haki">${branch(g,'armament',n.id,defs)}${branch(g,'conqueror',n.id,defs)}${branch(g,'observation',n.id,defs)}</div>${detail(g,n,defs)}</div></section>`;
 }

 let graph=null,observer=null;
 function unmount(){observer?.disconnect();observer=null;graph=null;}
 function connect(body){
  const tree=body.querySelector('.hm-tree');if(!tree||graph===tree)return;unmount();graph=tree;
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('hm-links');svg.setAttribute('aria-hidden','true');tree.prepend(svg);
  const draw=()=>{
   if(!tree.isConnected){unmount();return;}
   const box=tree.getBoundingClientRect(),point=e=>{const r=e.getBoundingClientRect();return {x:r.x-box.x,y:r.y-box.y,w:r.width,h:r.height};};
   svg.setAttribute('viewBox','0 0 '+box.width+' '+box.height);
   let paths='<defs><marker id="hm-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 10 5 0 10" fill="#d4a650"/></marker></defs>';
   for(const target of tree.querySelectorAll('[data-haki-node]')){
    const n=P().byId[target.dataset.hakiNode],to=point(target);
    for(const dep of n.requires){const source=tree.querySelector('[data-haki-node="'+dep.id+'"]');if(!source)continue;const from=point(source);
     paths+='<path class="'+(source.classList.contains('complete')?'complete':'')+'" d="M '+(from.x+from.w/2)+' '+from.y+' L '+(to.x+to.w/2)+' '+(to.y+to.h)+'" marker-end="url(#hm-arrow)"/>';
    }
   }
   const gate=point(tree.querySelector('[data-haki-gate]'));
   for(const [b,left] of [['armament',true],['observation',false]]){
    const end=tree.querySelector('[data-haki-node="'+b+'-final"]'),from=point(end),x=left?from.x+from.w:from.x,gx=left?gate.x:gate.x+gate.w,mid=(x+gx)/2,y=from.y+from.h/2,gy=gate.y+gate.h/2;
    paths+='<path class="'+(end.classList.contains('complete')?'complete':'')+'" d="M '+x+' '+y+' C '+mid+' '+y+', '+mid+' '+gy+', '+gx+' '+gy+'" marker-end="url(#hm-arrow)"/>';
   }
   const root=point(tree.querySelector('[data-haki-node=presence]'));paths+='<path d="M '+(gate.x+gate.w/2)+' '+gate.y+' L '+(root.x+root.w/2)+' '+(root.y+root.h)+'" marker-end="url(#hm-arrow)"/>';
   svg.innerHTML=paths;
  };
  observer=new ResizeObserver(draw);observer.observe(tree);
 }

 function refresh(body,g,rt,{inHunt=false,alive=true,defs=[]}={}){
  const el=body.querySelector('[data-haki-current]');if(!el)return;connect(body);
  el.textContent=Math.floor(g.haki.current)+' / 100';body.querySelector('[role=meter]').setAttribute('aria-valuenow',Math.floor(g.haki.current));body.querySelector('[data-haki-fill]').style.width=g.haki.current+'%';
  body.querySelector('[data-haki-status]').textContent=rt.active?P().names[rt.active]+' ativo · consumo de Vontade':rt.inCombat?'Em combate · sem recuperação':'Em descanso · recuperando Vontade';
  for(const id of P().ids){
   const king=id==='conqueror',on=king?rt.kingFX>0:rt.active===id,learned=P().learned(g,id),cd=king?MareHaki.cooldown(g):0;
   let reason=!learned?'Complete o ramo para desbloquear':!inHunt?'Ativação disponível na caçada':!alive?'Personagem incapacitado':cd>0?'Recarga: '+Math.ceil(cd)+' s':(king?g.haki.current<50:g.haki.current<=0)&&!on?'Vontade insuficiente':'';
   const control=body.querySelector(king?'[data-haki-cast]':'[data-haki-toggle="'+id+'"]'),article=control.closest('article');
   control.disabled=!!reason;control.textContent=cd>0?'Recarga · '+Math.ceil(cd)+' s':king?'Ativar':on?'Desativar':'Ativar';control.setAttribute('aria-pressed',String(on));control.title=reason||(on?'Desativar '+P().names[id]:'Ativar '+P().names[id]);
   article.classList.toggle('haki-active',on);
   body.querySelector('[data-haki-learned="'+id+'"]').textContent=!learned?'Bloqueado':cd>0?'Em recarga':on?'Ativo':(king?g.haki.current<50:g.haki.current<=0)?'Sem Vontade':'Inativo';
   body.querySelector('[data-haki-reason="'+id+'"]').textContent=reason;
  }
  for(const balance of body.querySelectorAll('[data-haki-balance]'))balance.textContent=P().quantity(g,balance.dataset.hakiBalance,defs,{includeLocked:true});
 }
 root.MareHakiUI={render,refresh,icon,unmount};
})(globalThis);
