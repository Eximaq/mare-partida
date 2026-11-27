((root)=>{
 'use strict';
 const S=root.MareSwordCompendium;
 const percent=units=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:3}).format(units/1000)+'%';
 function render(collection,rank,{available=false,ready=false}={}){
  const active=S.catalog.filter(s=>collection[s.id]?.active).length;
  const ranks=Object.keys(S.ranks).map(r=>'<button type="button" data-sword-rank="'+r+'" aria-pressed="'+(r===rank)+'">Rank '+r+'</button>').join('');
  const loot=S.ranks[rank];
  const cards=S.byRank[rank].map(s=>{
   const record=collection[s.id],unlocked=record?.active===true,count=unlocked?s.required:record?.fragments??0;
   const enough=count>=s.required;
   return '<article class="sword-card" data-state="'+(unlocked?'active':enough?'ready':count?'progress':'empty')+'"><img loading="lazy" src="'+s.image+'" alt=""><div><h3>'+s.name+'</h3><p>Bônus permanente de '+percent(s.bonus)+' em cada atributo</p><progress max="'+s.required+'" value="'+Math.min(count,s.required)+'" aria-label="Fragmentos de '+s.name+'"></progress><p>'+ (unlocked?'Ativada':count+' / '+s.required+' fragmentos')+'</p><button type="button" data-sword-activate="'+s.id+'"'+(!unlocked&&enough&&ready?'':' disabled')+'>'+(unlocked?'Ativada':'Ativar espada')+'</button></div></article>';
  }).join('');
  return '<section class="sword-compendium"><p>'+active+' / '+S.catalog.length+' espadas ativadas · Bônus total de '+percent(S.bonusUnits(collection))+' em cada atributo.</p><p>Resgate fragmentos pelo Correio. Ao ativar uma espada, os excedentes ficam disponíveis para negociação na mochila ou no Correio.</p>'+(available?'':'<p>Entre no jogo online para ativar espadas.</p>')+'<div class="sword-ranks" role="group" aria-label="Ranks">'+ranks+'</div><p>Chance de '+new Intl.NumberFormat('pt-BR',{style:'percent',maximumFractionDigits:1}).format(loot.chance)+' de receber '+(loot.min===loot.max?loot.max:loot.min+' a '+loot.max)+' fragmento(s) deste rank por vitória elegível.</p><div class="sword-grid">'+cards+'</div></section>';
 }
 root.MareSwordCompendiumUI={render};
})(globalThis);
