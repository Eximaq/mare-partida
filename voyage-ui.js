
'use strict';
/* Presentation only: destinations/progression are supplied by their canonical systems. */
((root)=>{
 const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const art=id=>'assets/ui/voyage-hd/'+id+'.png';
 const dropIcon=n=>n===0?'<span class="berry-coin" aria-hidden="true"></span>':'<img src="'+(n===1?'assets/ui/inventory-final/icons/bag.png':'assets/ui/items-hd/material.png')+'" alt="">';
 const icon=(id,cls='')=>`<img class="expedition-icon ${cls}" src="assets/ui/inventory-final/icons/${id}.png" alt="">`;
 const range=r=>r[0]===r[1]?String(r[0]):r.join('–');
 const coords={
  'east-blue':[[24,27],[70,27],[29,47],[74,47],[24,67],[69,67],[31,87],[75,87]],
  alabasta:[[25,28],[69,28],[33,54],[75,54],[27,80],[69,80]]
 };
 const names={'east-blue':'Mares infinitos, grandes aventuras.',alabasta:'Areias, intrigas e um reino em crise.',skypiea:'Além das nuvens, novos horizontes.'};
 function monster(type,label,cls=''){
  return `<div class="expedition-monster ${cls}" data-state="loading"><canvas width="480" height="320" data-expedition-monster="${E(type)}" role="img" aria-label="${E(label)}"></canvas><span class="expedition-art-status" role="status">Carregando adversário…</span></div>`;
 }
 function location(i,cls=''){
  return `<img class="voyage-location ${cls}" src="${art(i.id)}" alt="Paisagem de ${E(i.name)}" data-location-art>`;
 }
 function voyage({region,regions,islands,selected,game,canTravel,scene}){
  const points=coords[region.id]||[],type=selected?.monster?.src?.match(/sprites-combat-v2\/([^/]+)\//)?.[1]||(selected?.id==='dawn'?'cesar':null);
  const tabs=`<nav id="voyageRegionTabs" class="voyage-region-tabs" role="tablist" aria-label="Regiões do arquipélago">${regions.map(r=>`<button type="button" role="tab" id="voyage-tab-${r.id}" data-voyage-region="${r.id}" data-status="${r.locked?'locked':'available'}" aria-selected="${r.id===region.id}" aria-controls="voyageRegionContent" ${r.locked?'disabled':''}><span class="voyage-region-icon" data-icon="${r.id}" aria-hidden="true"></span>${E(r.name)}${r.locked?'<small>Bloqueado</small>':''}</button>`).join('')}</nav>`;
  const routes=points.length?`<svg class="voyage-routes" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points="${points.map(p=>p.join(',')).join(' ')}" class="route-shadow"/><polyline points="${points.map(p=>p.join(',')).join(' ')}"/>${points.map(([x,y])=>`<circle cx="${x}" cy="${y}" r=".8"/>`).join('')}</svg>`:'';
  const cards=islands.map((i,n)=>{
   const [x,y]=points[n]||[50,50];
   return `<button type="button" class="archipelago-island" style="--map-x:${x}%;--map-y:${y}%" data-island="${E(i.id)}" data-current="${scene==='hunt'&&game.area===i.area}" aria-pressed="${i.id===selected?.id}"><b class="voyage-order" aria-hidden="true">${n+1}</b>${location(i)}<span class="archipelago-island-copy"><strong>${E(i.name)}</strong><span class="voyage-level">Nv. ${range(i.recommended)}</span></span>${!i.area?'<small class="voyage-card-state">Em desenvolvimento</small>':scene==='hunt'&&game.area===i.area?'<small class="voyage-card-state">Você está aqui</small>':''}</button>`;
  }).join('');
  const details=selected?`<section class="dungeon-details expedition-panel" aria-labelledby="dungeonName"><div class="voyage-detail-scroll"><button type="button" class="dungeon-back" data-voyage-back>← Voltar às ilhas</button><small class="dungeon-region-name">${E(region.name)} · ${selected.area?'Mapa disponível':'Em desenvolvimento'}</small><h3 id="dungeonName" tabindex="-1">${E(selected.name)}</h3>${location(selected,'voyage-detail-location')}<div class="dungeon-range">Nível recomendado <strong>${range(selected.recommended)}</strong></div><div class="voyage-adversary">${type?monster(type,selected.monster.name):'<p>Adversário indisponível</p>'}<div><small>${E(selected.monster?.role||'')}</small><strong>${E(selected.monster?.name||'Não configurado')}</strong></div></div><p class="dungeon-description">${E(selected.description)}</p><dl class="dungeon-facts"><div><dt>Entrada</dt><dd>${selected.area?'Personagem Nv. '+selected.minLevel+'+':'Área em desenvolvimento'}</dd></div><div><dt>Taxa de sucesso</dt><dd>Não estimada</dd></div></dl><h4>Drops possíveis</h4><ul class="dungeon-drops">${(selected.drops||[]).map((d,n)=>`<li>${dropIcon(n)}${E(d)}</li>`).join('')}</ul></div><button type="button" class="dungeon-travel expedition-primary" data-travel-island="${selected.id}" ${selected.area?`data-travel-area="${selected.area}" data-area="${selected.area}"`:''} ${canTravel?'':'disabled'}>${icon('anchor')}${!selected.area?'Área em desenvolvimento':!canTravel?'Requer personagem Nv. '+selected.minLevel:'Viajar para esta ilha'}</button></section>`:`<aside class="dungeon-placeholder expedition-panel"><img src="assets/ui/contracts-hd/monthly.png" alt=""><h3>${islands.length?'Escolha sua próxima ilha':'Skypiea'}</h3><p>${islands.length?'Selecione um destino no mapa para conhecer o local, seus adversários e os preparativos da viagem.':'Novas ilhas em breve. Esta região ainda não possui destinos disponíveis.'}</p><small>${islands.length?islands.length+' destinos · '+E(region.name):'Nenhum destino cadastrado'}</small></aside>`;
  return {tabs,body:`<section id="voyageRegionContent" role="tabpanel" aria-labelledby="voyage-tab-${region.id}" class="voyage-window archipelago-window ${selected?'has-selection':''}" data-region="${region.id}"><div class="voyage-overview voyage-map"><header class="voyage-region-plaque"><small>Mapa do Arquipélago</small><h3>${E(region.name)}</h3><p>${names[region.id]||''}</p></header>${routes}<div class="archipelago-islands">${cards||'<div class="voyage-empty"><span aria-hidden="true">✦</span><h3>Além das nuvens</h3><p>Novas rotas em breve.</p></div>'}</div><small class="voyage-map-legend">${islands.length?'Selecione uma ilha · Confirme a viagem nos detalhes':'Região futura · Sem viagens disponíveis'}</small></div>${details}</section>`};
 }
 function prison({system:P,game,floor,enemy,activeFloor=null,pending=false,preparationFailed=false,active=false}){
  const p=game.impelDown,max=P.unlockedThrough(game),boss=P.isBossFloor(floor),reward=P.rewardFor(floor),completed=p.cleared>=floor;
  const known=enemy?.floor===floor,unlocked=P.canInspect(game,floor),enter=P.canEnter(game,floor)&&!active&&!preparationFailed&&known;
  const status=!unlocked?'Bloqueado':completed?'Concluído · somente inspeção':activeFloor===floor?'Tentativa em andamento':'Próximo andar liberado';
  const portrait=known?monster(enemy.type,enemy.name,'prison-hero-monster'):'<div class="prison-unknown"><strong>?</strong><p>'+(!unlocked?'Conclua os andares anteriores.':'Adversário não registrado para este andar.')+'</p></div>';
  const action=pending?'<button type="button" class="expedition-primary" data-prison-retry>Salvar conclusão</button>':preparationFailed?'<button type="button" class="expedition-primary" data-prison-prepare>Tentar salvar encontro</button>':active&&activeFloor===floor&&!completed?`<button type="button" class="expedition-primary" data-prison-continue>Continuar no andar ${floor}</button>`:`<button type="button" class="expedition-primary prison-enter" data-prison-enter ${enter?'':'disabled'}>${icon('anchor')}${completed?'Andar concluído':active?'Expedição em andamento':!unlocked?'Andar bloqueado':'Entrar no andar '+floor}</button>`;
  return `<section class="prison-window">
   <nav class="prison-floor-list expedition-panel" aria-label="Andares de Impel Down"><h3>Andares</h3><small>Concluídos: ${p.cleared} / ${P.FLOOR_COUNT}</small><div class="prison-floor-scroll">${Array.from({length:P.FLOOR_COUNT},(_,n)=>{const f=n+1,done=f<=p.cleared,locked=!P.canInspect(game,f);return `<button type="button" data-prison-floor="${f}" data-status="${done?'completed':locked?'locked':'available'}" data-boss="${P.isBossFloor(f)}" aria-pressed="${f===floor}" ${locked?'disabled':''}><span>Andar ${f}</span><span aria-hidden="true">${done?'✓':locked?icon('lock'):P.isBossFloor(f)?'♛':'➜'}</span><small>${P.isBossFloor(f)?'Chefe':done?'Concluído':locked?'Bloqueado':'Disponível'}</small></button>`;}).join('')}</div></nav>
   <section class="prison-stage-panel"><header class="prison-floor-selector"><button type="button" data-prison-step="-1" aria-label="Andar anterior" ${floor<=1?'disabled':''}>◀</button><div aria-live="polite"><h3 id="prisonFloorTitle">Andar ${floor}</h3><small>${boss?'Andar de chefe':'Andar normal'}</small></div><button type="button" data-prison-step="1" aria-label="Próximo andar" ${floor>=max?'disabled':''}>▶</button></header><div class="prison-cell">${portrait}<div class="prison-enemy-caption"><strong>${known?E(enemy.name):'Adversário desconhecido'}</strong><small>${known?'Nv. '+floor+(enemy.placeholder?' · Guardião provisório':''):'Encontro ainda não definido'}</small></div></div></section>
   <aside class="prison-information expedition-panel"><div class="prison-info-scroll"><h3>Informações do andar</h3><dl><div><dt>Andar selecionado</dt><dd>${floor}</dd></div><div><dt>Tipo</dt><dd>${boss?'Chefe':'Normal'}</dd></div><div><dt>Condição de vitória</dt><dd>Derrote o inimigo</dd></div><div><dt>Estado</dt><dd>${status}</dd></div>${activeFloor?`<div><dt>Tentativa atual</dt><dd>Andar ${activeFloor}</dd></div>`:''}</dl><p>${known?enemy.placeholder?'Guardião provisório. Os chefes específicos serão definidos futuramente.':'Adversário preparado. A entrada preserva este mesmo encontro.':completed?'A conclusão foi preservada. Este encontro antigo não possui registro de adversário.':'O encontro será apresentado quando este andar estiver liberado.'}</p></div><div class="prison-entry">${action}<small>${preparationFailed?'Não foi possível salvar. Nenhuma batalha foi iniciada.':completed?'Apenas inspeção.':status}</small></div>${active?'<button type="button" class="dungeon-back" data-prison-exit>Voltar ao porto</button>':''}</aside>
   <div class="prison-bottom-panels">
    <section class="expedition-panel prison-enemy-summary"><h3>Inimigo do andar</h3>${known?monster(enemy.type,enemy.name,'prison-small-monster'):'<span class="prison-question">?</span>'}<strong>${known?E(enemy.name):'Não registrado'}</strong><p>${known?'Um adversário · Nv. '+floor:completed?'Inspeção de andar concluído.':'Avance para descobrir o adversário.'}</p></section>
    <section class="expedition-panel prison-first-clear"><h3>Primeira conquista</h3>${reward?`<img src="assets/ui/items-hd/pearl-box-1.png" alt="Caixa de Pérolas Nível 1"><strong>1× Caixa de Pérolas Nível 1</strong><p>${p.claimed.includes(floor)?'Recebida':completed?'Pendente · Libere espaço e resgate nos marcos.':'Uma única vez ao concluir este marco.'}</p>`:`<img src="assets/ui/inventory-final/icons/unlock.png" alt=""><strong>${floor<P.FLOOR_COUNT?'Abre o próximo portão':'Último andar'}</strong><p>${floor>50?'Recompensas acima do andar 50 ainda serão definidas.':'Este andar não concede caixa de marco.'}</p>`}</section>
    <section class="expedition-panel prison-rules"><h3>Regras da prisão</h3><ul><li>Um adversário por andar. Subida automática após a vitória.</li><li>Vida restaurada ao iniciar. Energia e recargas são mantidas.</li><li>Derrota: nova tentativa no mesmo andar, contra o mesmo inimigo.</li></ul><details><summary>Recompensas e progressão</summary><p>Marcos de 5 a 50 entregam uma caixa uma única vez. Mochila cheia mantém o prêmio pendente. Recompensas acima do 50 ainda serão definidas.</p></details></section>
    <section class="expedition-panel prison-milestones"><h3>Marcos de progressão</h3><div>${P.milestones.map(f=>`<article data-prison-milestone="${f}" data-status="${p.claimed.includes(f)?'claimed':p.cleared>=f?'pending':'future'}"><b>Andar ${f}</b><img src="assets/ui/items-hd/pearl-box-1.png" alt=""><span>1× Caixa de Pérolas Nível 1<small>${p.claimed.includes(f)?'Recebido':p.cleared>=f?'Pendente':'A conquistar'}</small></span>${p.cleared>=f&&!p.claimed.includes(f)?`<button type="button" data-prison-claim="${f}">Resgatar</button>`:''}</article>`).join('')}</div></section>
   </div></section>`;
 }
 let revision=0,timer=null;
 function unmount(){revision++;clearTimeout(timer);timer=null;}
 function hydrate(container,draw){
  unmount();const own=revision,started=Date.now();
  for(const img of container.querySelectorAll('[data-location-art]'))img.addEventListener('error',()=>{img.hidden=true;img.parentElement.dataset.artError='true';img.insertAdjacentHTML('afterend','<span class="voyage-image-error">Ilustração indisponível</span>');},{once:true});
  const canvases=[...container.querySelectorAll('[data-expedition-monster]')];
  function paint(){
   if(own!==revision||!container.isConnected)return;
   let waiting=false;
   for(const c of canvases){
    if(!c.isConnected||c.dataset.ready)continue;
    const state=draw(c.getContext('2d'),c.dataset.expeditionMonster,c.width,c.height),frame=c.parentElement;
    if(state==='ready'){c.dataset.ready='true';frame.dataset.state='available';frame.querySelector('.expedition-art-status').textContent='';}
    else if(state==='unavailable'||Date.now()-started>8000){frame.dataset.state='unavailable';frame.querySelector('.expedition-art-status').textContent='Arte do adversário indisponível';}
    else waiting=true;
   }
   if(waiting)timer=setTimeout(paint,80);
  }paint();
 }
 root.MareVoyageUI={voyage,prison,hydrate,unmount,range,coords};
 if(typeof module!=='undefined')module.exports=root.MareVoyageUI;
})(globalThis);
