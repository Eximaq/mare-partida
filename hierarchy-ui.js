'use strict';
/* HTML confiável da Hierarquia dos Mares; os dados do jogador são escapados. */
const MareHierarchyUI=(()=>{
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function render({game,factionName,accent,board,backend,message,power}){
    const faction=game.factionId,tier=game.hierarchyTier,up=MareHierarchy.next(tier,game.level);
    const nextTitle=up.target<=8?MareHierarchy.title(faction,up.target):'Patamar máximo';
    const pct=Math.round(MareHierarchy.progress(tier,game.level)*100);
    const rows=board.map((p,i)=>`<li ${p.player_id===game.hierarchyPlayerId?'class="is-self"':''}><span class="hierarchy-place">${i+1}º</span><div><strong>${esc(p.name)}</strong><small>${esc(MareHierarchy.title(faction,p.tier))}</small></div><span class="hierarchy-scores">Nv. ${p.level}<small>Poder ${Math.round(p.power).toLocaleString('pt-BR')}</small></span></li>`).join('');
    return `<section class="hierarchy-panel" style="--hierarchy-accent:${esc(accent)}">
      <header class="hierarchy-heading"><img class="hierarchy-flag" src="${MareHierarchy.flag(faction)}" alt="Símbolo de ${esc(factionName)}"><div><small>HIERARQUIA DOS MARES · ${esc(factionName)}</small><h2>${esc(MareHierarchy.title(faction,tier))}</h2><span>Patamar ${tier} · Nível ${game.level}</span></div><img class="hierarchy-current-art" src="${MareHierarchy.asset(faction,tier)}" alt="Arte do cargo atual"></header>
      <div class="hierarchy-layout"><section class="hierarchy-player"><h3>Avançar de cargo</h3><div class="hierarchy-next"><div><small>ATUAL · PATAMAR ${tier}</small><img src="${MareHierarchy.asset(faction,tier)}" alt="${esc(MareHierarchy.title(faction,tier))}"></div><span aria-hidden="true">➜</span><div><small>PRÓXIMO · PATAMAR ${Math.min(up.target,8)}</small><img src="${MareHierarchy.asset(faction,Math.min(up.target,8))}" alt="${esc(nextTitle)}"></div></div>
        <p class="hierarchy-requirement">${up.state==='max'?'Patamar máximo alcançado':`Requisito: nível ${MareHierarchy.levels[up.target-1]} · Seu nível: ${game.level}`}</p><div class="hierarchy-progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Progresso até o próximo cargo"><span style="width:${pct}%"></span></div>
        ${up.state==='locked'?`<p class="hierarchy-locked">${MareHierarchy.lockedMessage}</p>`:''}
        <button type="button" class="dialog-button" data-hierarchy-promote ${up.state==='ready'?'':'disabled'}>AVANÇAR DE CARGO</button>
        ${message?`<p class="hierarchy-feedback" role="status">${esc(message)}</p>`:''}</section>
      <section class="hierarchy-board"><h3>Top 10 · ${esc(factionName)}</h3><ol class="hierarchy-ranking">${rows}</ol>${!backend?'<small>Preview local: o ranking completo requer o servidor Python.</small>':''}</section></div></section>`;
  }
  function transition(faction,oldTier,newTier){return `<div class="hierarchy-transition"><figure><img src="${MareHierarchy.asset(faction,oldTier)}" alt="${esc(MareHierarchy.title(faction,oldTier))}"></figure><span aria-hidden="true">➜</span><figure><img src="${MareHierarchy.asset(faction,newTier)}" alt="${esc(MareHierarchy.title(faction,newTier))}"></figure></div>`;}
  return {render,transition};
})();
if(typeof module!=='undefined')module.exports=MareHierarchyUI;
