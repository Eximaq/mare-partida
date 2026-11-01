'use strict';
/* Selection presentation only. The existing creator owns choices, confirmation and persistence. */
((root)=>{
 const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const art='assets/ui/creation-hd/';
 const copy={
  sword:'Cortes rápidos e golpes de lâmina.',brawler:'Combate próximo e resistência.',gunner:'Precisão e ataques à distância.',
  rogue:'Golpes ágeis e evasão.',cyborg:'Blindagem, vitalidade e provocação.',strategist:'Dano elemental e ataques em área.',healer:'Cura, proteção e ataques de água.'
 };
 function talents(id){
  const t=root.MareTalents.getTree(id);if(!t)return [];
  return [...t.keystones.map(n=>({...n,kind:'Intermediário',requirement:'Requer '+root.MareTalents.KEYSTONE_GATE+' PT comuns. Escolha um intermediário por build; investimento de '+root.MareTalents.spent({nodes:{},keystone:n.id})+' PT.'})),
   ...t.ultimates.map(n=>({...n,kind:'Final',requirement:'Requer '+root.MareTalents.ULTIMATE_GATE+' PT comuns, um intermediário e 5 pontos em um nó do último tier. Escolha um final por build; investimento de '+root.MareTalents.ULTIMATE_COST+' PT.'}))];
 }
 function compact(text,max=116){if(text.length<=max)return text;const sentence=text.match(/^(.{30,}?[.!?])(?:\s|$)/)?.[1];if(sentence&&sentence.length<=max)return sentence;return text.slice(0,max).replace(/\s+\S*$/,'')+'…';}
 function list(classes,icons,selected){return Object.entries(classes).map(([id,c])=>'<button type="button" class="class-choice '+(id===selected?'chosen':'')+'" data-class="'+E(id)+'" aria-pressed="'+(id===selected)+'"><span class="class-art"><img src="'+E(icons[id])+'" alt="" draggable="false"></span><span class="creation-class-label"><strong>'+E(c.name)+'</strong><small>'+E(copy[id]||root.MareCharacters.roles[id]?.role||'')+'</small></span><span class="selection-chevron" aria-hidden="true">›</span></button>').join('');}
 function detail(id,classes,icons){
  const c=classes[id];if(!c)return '';const role=root.MareCharacters.roles[id],birth=root.MareCharacters.birth[id],items=talents(id),attrs=root.MareCharacters.attributes;
  const chips=[role?.role,(c.range<=80?'Corpo a corpo':'À distância'),attrs[role?.primary]?.name+' / '+attrs[role?.secondary]?.name];
  return '<section class="creation-class-detail" data-selected-class="'+E(id)+'" aria-label="Apresentação da classe selecionada"><div class="creation-class-intro"><div class="creation-class-copy"><h2 tabindex="-1"><img src="'+E(icons[id])+'" alt="">'+E(c.name)+'</h2><p class="creation-class-lead">'+E(copy[id]||role?.role)+'</p><p>'+E(c.skills.map(s=>s.name).join(' · '))+'</p><div class="creation-class-chips">'+chips.map(x=>'<span>'+E(x)+'</span>').join('')+'</div></div><figure class="creation-class-illustration"><img src="'+art+'class-'+E(id)+'.png" alt="Ilustração temática da classe '+E(c.name)+'" decoding="async"><figcaption>Ilustração de classe · sua aparência é escolhida na próxima etapa.</figcaption></figure></div>'+
   '<section class="creation-birth"><h3>Atributos de nascimento <small>'+Object.values(birth).reduce((a,b)=>a+b,0)+' pontos iniciais</small></h3><div>'+Object.entries(birth).map(([key,n])=>'<div><img src="assets/ui/character-studio/attributes/'+key+'.png?v=alpha-native-v1" alt=""><span>'+E(attrs[key].short)+'</span><b data-birth-attribute="'+E(key)+'">'+n+'</b></div>').join('')+'</div></section>'+
   '<section class="creation-specials"><header><h3>Talentos especiais</h3><small>Possibilidades de progressão · não concedidos na criação</small></header><div class="creation-special-grid">'+items.map(n=>'<button type="button" class="creation-special" data-creation-talent="'+E(n.id)+'" data-studio-help data-help-title="'+E(n.name)+'" data-help-text="'+E(n.description+' '+n.requirement)+'" aria-label="'+E(n.name+' — '+n.kind+' — ver requisitos')+'"><img src="assets/ui/talents/special/'+E(n.id)+'.png" alt="" decoding="async"><span><small>'+E(n.kind)+'</small><strong>'+E(n.name)+'</strong><span>'+E(compact(n.description))+'</span></span></button>').join('')+'</div>'+(items.length!==6?'<p>Talentos cadastrados: '+items.length+'.</p>':'')+'</section></section>';
 }
 function factionCard(id,f){return '<span class="faction-art"><img class="creation-faction-scene" src="'+art+'faction-'+E(id)+'.png" alt="" decoding="async"><img class="faction-emblem" src="assets/ui/faction-emblems/'+E(id)+'.png" width="912" height="912" alt="Emblema '+E(f.name)+'"></span><span class="faction-details"><strong>'+E(f.name)+'</strong><small>'+E(f.desc)+'</small><em>'+E(f.bonus)+'</em></span>';}
 function factionSummary(id,f){return '<div class="creation-faction-identity"><img src="assets/ui/faction-emblems/'+E(id)+'.png" alt=""><div><small>Sua facção selecionada</small><h3>'+E(f.name)+'</h3><p>'+E(f.desc)+'</p></div></div><div class="creation-faction-benefit"><small>Bônus iniciais</small><strong>'+E(f.bonus)+'</strong><span>A classe e a aparência são escolhas independentes.</span></div><img class="creation-faction-summary-art" src="'+art+'faction-'+E(id)+'.png" alt="" decoding="async">';}
 root.MareCreationSelection=Object.freeze({list,detail,talents,factionCard,factionSummary});
 if(typeof module!=='undefined')module.exports=root.MareCreationSelection;
})(globalThis);
