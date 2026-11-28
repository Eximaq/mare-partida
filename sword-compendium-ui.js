((root)=>{
 'use strict';
 const S=root.MareSwordCompendium;
 const percentage=new Intl.NumberFormat('pt-BR',{style:'percent',maximumFractionDigits:3});
 const bonus=units=>percentage.format(units/100000);
 const rankColors={E:'#c0c6ce',D:'#9abd87',C:'#80b8eb',B:'#ca9ef3',A:'#f3bd68',S:'#f19797'};

 function card(sword,record,ready,complete){
  const unlocked=record?.active===true;
  const count=unlocked?sword.required:record?.fragments??0;
  const enough=complete||count>=sword.required;
  const state=unlocked?'active':enough?'ready':count?'progress':'empty';
  return `<article class="sword-card" data-state="${state}">
    <div class="sword-card-art">
      <span class="sword-card-rank" title="Rank ${sword.rank}">${sword.rank}</span>
      <img loading="lazy" decoding="async" src="${sword.image}" alt="">
    </div>
    <div class="sword-card-body">
      <h3>${sword.name}</h3>
      <p class="sword-card-bonus">+${bonus(sword.bonus)} em cada atributo</p>
      <div class="sword-card-progress">
        <span>${unlocked?'Espada ativada':complete?'Espada completa disponível':`${count} / ${sword.required} fragmentos`}</span>
        <progress max="${sword.required}" value="${complete?sword.required:Math.min(count,sword.required)}" aria-label="Fragmentos de ${sword.name}"></progress>
      </div>
      ${unlocked?'':`<button type="button" data-sword-activate="${sword.id}"${enough&&ready?'':' disabled'}>Ativar espada</button>`}
    </div>
  </article>`;
 }

 function render(collection,rank,{available=false,ready=false,complete=new Set()}={}){
  const selectedRank=Object.hasOwn(S.ranks,rank)?rank:'E';
  const collected=swords=>swords.filter(sword=>collection[sword.id]?.active===true).length;
  const active=collected(S.catalog);
  const ranks=Object.keys(S.ranks).map(r=>`<button type="button" data-sword-rank="${r}" aria-pressed="${r===selectedRank}" style="--sword-rank:${rankColors[r]}">
    <span class="sword-rank-letter" aria-hidden="true">${r}</span><span>Rank ${r}</span>
    <small>${collected(S.byRank[r])} / ${S.byRank[r].length}</small>
  </button>`).join('');
  const loot=S.ranks[selectedRank];
  const quantity=loot.min===loot.max?loot.max:loot.min+' a '+loot.max;
  return `<section class="sword-compendium" aria-label="Compêndio de Espadas">
    <div class="sword-overview">
      <div class="sword-overview-stat"><strong>${active} / ${S.catalog.length}</strong><span>Espadas ativadas</span></div>
      <div class="sword-overview-stat"><strong>+${bonus(S.bonusUnits(collection))}</strong><span>Bônus em cada atributo</span></div>
      <p>${available?'Resgate fragmentos pelo Correio. Depois de ativar uma espada, seus excedentes podem ser negociados.':'Espadas completas obtidas em masmorras podem ser ativadas aqui.'}</p>
    </div>
    <div class="sword-workspace">
      <nav class="sword-ranks" aria-label="Filtrar por rank">
        <h3>Ranks</h3>
        <div class="sword-rank-list">${ranks}</div>
      </nav>
      <section class="sword-gallery" style="--sword-rank:${rankColors[selectedRank]}">
        <header class="sword-gallery-header">
          <h3>Espadas · Rank ${selectedRank}</h3>
          <p>${percentage.format(loot.chance)} de chance de receber ${quantity} ${loot.max===1?'fragmento':'fragmentos'} deste rank por vitória elegível.</p>
        </header>
        <div class="sword-grid">${S.byRank[selectedRank].map(sword=>card(sword,collection[sword.id],ready,complete.has(sword.id))).join('')}</div>
      </section>
    </div>
  </section>`;
 }
 root.MareSwordCompendiumUI={render};
})(globalThis);
