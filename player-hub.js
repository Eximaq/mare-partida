'use strict';
/* Central do Navegante: presentation only. Game rules, appearance and item data stay shared. */
((root)=>{
 const E=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const KEY='mare-partida-player-ui-v1',defaults={quality:'high',density:'standard',motion:'normal',largerText:false};
 const values={quality:['high','low'],density:['standard','compact'],motion:['normal','reduced']};
 let prefs={...defaults},journal=[],journalState='idle',ctx=null,redraw=()=>{},setReducedFX=()=>{},drawPortrait=()=>false;
 let selectedJournal='all',settingsTab='geral',settingsExpanded='',profileTab='overview',portraitFrame=0;
 try{const raw=JSON.parse(localStorage.getItem(KEY)||'null');if(raw&&typeof raw==='object')for(const k of Object.keys(defaults))if(k==='largerText'?typeof raw[k]==='boolean':values[k]?.includes(raw[k]))prefs[k]=raw[k];}catch(_){}
 const fmt=n=>n!==null&&n!==undefined&&Number.isFinite(Number(n))?Math.round(Number(n)).toLocaleString('pt-BR'):'Não registrado';
 const date=n=>Number(n)>0&&Number.isFinite(new Date(Number(n)).getTime())?new Date(Number(n)).toLocaleDateString('pt-BR'):'Não registrado';
 const clock=s=>s!==null&&s!==undefined&&Number.isFinite(Number(s))?Math.floor(Math.max(0,s)/3600)+' h '+Math.floor(Math.max(0,s)%3600/60)+' min':'Não registrado';
 const art={
  compass:'assets/ui/contracts-hd/monthly.png',calendar:'assets/ui/contracts-hd/weekly.png',
  gear:'assets/ui/inventory-final/icons/equipment.png',eye:'assets/ui/inventory-final/icons/eye.png',
  power:'assets/ui/inventory-final/icons/power.png',attack:'assets/ui/inventory-final/icons/attack.png',
  shirt:'assets/ui/inventory-final/icons/shirt.png',anchor:'assets/ui/inventory-final/icons/anchor.png',
  bag:'assets/ui/inventory-final/icons/bag.png',strength:'assets/ui/character-studio/attributes/strength.png'
 };
 const cell={flag:0,music:1,star:2,swords:3,news:4,hourglass:5,crown:6,bubble:7};
 function icon(name){return art[name]?'<img class="captain-icon" src="'+art[name]+'" alt="" draggable="false">':'<span class="captain-icon captain-gold-icon" style="--ci-x:'+((cell[name]||0)%4)+';--ci-y:'+Math.floor((cell[name]||0)/4)+'" aria-hidden="true"></span>';}
 const button=(name,key,active,ico)=>'<button type="button" data-captain-tab="'+key+'" aria-pressed="'+(active===key)+'">'+(ico?icon(ico):'')+'<span>'+E(name)+'</span></button>';
 function apply(){document.documentElement.dataset.mareDensity=prefs.density;document.documentElement.dataset.mareMotion=prefs.motion;document.documentElement.dataset.mareText=prefs.largerText?'large':'regular';setReducedFX(prefs.quality==='low');}
 function store(){try{localStorage.setItem(KEY,JSON.stringify(prefs));}catch(_){}apply();}
 function getJournal(){
  if(journalState!=='idle')return;journalState='loading';
  fetch(new URL('journal-feed.json',document.baseURI).href,{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('journal-http');return r.json();}).then(data=>{
   journal=Array.isArray(data)?data.filter(x=>x&&typeof x.title==='string'&&['event','update','notice'].includes(x.type)).slice(0,60):[];journalState='ready';
  }).catch(()=>{journal=[];journalState='error';}).finally(()=>{if(document.querySelector('#dialogBody [data-captain-journal]'))redraw();});
 }
 function journalHTML(){
  getJournal();const tabs=[['all','Tudo','news'],['event','Eventos','calendar'],['update','Atualizações','gear'],['notice','Avisos','flag']],items=journal.filter(x=>selectedJournal==='all'||x.type===selectedJournal);
  return '<section class="captain-journal" data-captain-journal><header class="captain-editorial"><div class="captain-editorial-copy"><small>NOTÍCIAS OFICIAIS DO KAIZOKU IDLE</small><h2>Jornal do <b>Morgan</b></h2><p>Eventos · Atualizações · Avisos</p></div><img src="assets/ui/captain-hd/morgan-approved.png" alt="Morgan trazendo o jornal a bordo de um navio" class="captain-morgan" draggable="false"></header>'+
   '<nav class="captain-tabs" aria-label="Categorias do jornal">'+tabs.map(([id,name,i])=>button(name,id,selectedJournal,i).replace('data-captain-tab','data-journal-tab')).join('')+'</nav>'+
   '<div class="captain-news">'+(items.length?items.map(x=>'<article class="captain-news-item"><div class="captain-news-meta"><span class="captain-tag">'+E(({event:'EVENTO',update:'ATUALIZAÇÃO',notice:'AVISO'})[x.type])+'</span><time>'+E(x.date||'')+'</time></div><h3>'+E(x.title)+'</h3><p>'+E(x.summary||'')+'</p></article>').join(''):'<div class="captain-empty">'+icon('news')+'<h3>'+(journalState==='loading'?'Carregando o jornal…':journalState==='error'?'Jornal indisponível no momento':'Nenhuma publicação nesta categoria')+'</h3><p>'+(journalState==='error'?'Não foi possível consultar as publicações.':'Os avisos publicados aparecerão aqui.')+'</p></div>')+'</div></section>';
 }
 function field(label,value,i='',key=''){return '<div class="captain-fact">'+(i?icon(i):'')+'<div><small>'+E(label)+'</small><strong'+(key?' data-profile-value="'+key+'"':'')+'>'+E(value)+'</strong></div></div>';}
 const sectionHead=(title,note,i)=>'<header class="captain-section-head">'+icon(i)+'<h3>'+E(title)+'</h3>'+(note?'<p>'+E(note)+'</p>':'')+'</header>';
 function title(g){return ctx.title||root.MareHierarchy?.title?.(g.factionId,g.hierarchyTier)||'Aventureiro';}
 function metricValues(g,s){return {level:fmt(g.level),className:ctx.className||g.classId,power:fmt(s.power),play:clock(g.totalPlay),created:date(g.created),title:title(g),kills:fmt(g.stats?.kills),damage:fmt(g.stats?.damage),berry:fmt(g.stats?.goldEarned)};}
 function profileHTML(){
  const g=ctx.game,s=ctx.stats||{},m=metricValues(g,s),hidden=!!g.preferences?.hideItems;
  let body='<section class="captain-profile"><header class="captain-profile-banner"><div class="captain-profile-avatar"><canvas id="captainProfilePortrait" width="256" height="256" aria-label="Aparência atual do personagem'+(hidden?', equipamentos ocultos':'')+'"></canvas><small id="captainPortraitState" role="status">Carregando retrato…</small></div><div class="captain-profile-name"><small>'+E(title(g))+' · '+E(ctx.factionName||'')+'</small><h2>'+E(g.name)+'</h2><span>'+(ctx.classIcon?'<img src="'+E(ctx.classIcon)+'" alt="" class="captain-class-icon">':'')+E(m.className)+' · Nv. <b data-profile-value="level">'+m.level+'</b></span><small>Save local neste navegador</small></div><div class="captain-profile-power">'+(ctx.factionIcon?'<img class="captain-faction-seal" src="'+E(ctx.factionIcon)+'" alt="'+E(ctx.factionName)+'">':'')+'<small>PODER</small><strong data-profile-value="power">'+m.power+'</strong></div></header>'+
   '<nav class="captain-tabs" aria-label="Seções do perfil">'+[['overview','Visão geral','compass'],['gear','Equipamentos','gear'],['wall','Mural','bubble'],['custom','Personalizar','shirt']].map(([id,name,i])=>button(name,id,profileTab,i).replace('data-captain-tab','data-profile-tab')).join('')+'</nav>';
  if(profileTab==='overview')body+='<section class="captain-section">'+sectionHead('Perfil do Aventureiro','Principais informações da sua jornada pelos mares.','compass')+'<div class="captain-facts">'+field('Nível',m.level,'crown','level')+field('Classe',m.className,'swords','className')+field('Poder',m.power,'strength','power')+field('Tempo de jogo',m.play,'hourglass','play')+field('Aventureiro desde',m.created,'calendar','created')+field('Título',m.title,'star','title')+'</div></section>'+
   '<section class="captain-section captain-rank-section">'+sectionHead('Posição nos rankings','Posições globais por nível e poder ainda indisponíveis.','crown')+'<div class="captain-rank-facts">'+field('Ranking de nível','Indisponível','compass')+field('Ranking de poder','Indisponível','power')+'<p class="captain-muted">A Hierarquia dos Mares possui seu próprio Top 10 por cargo, nível e poder.</p></div></section>'+
   '<section class="captain-section">'+sectionHead('Combate e progresso','Seu desempenho nas batalhas e avanços.','swords')+'<div class="captain-combat-facts">'+field('Monstros derrotados',m.kills,'flag','kills')+field('Dano causado',m.damage,'attack','damage')+field('Berry recebidos',m.berry,'bag','berry')+field('Duelos PvP','Indisponível','swords')+'</div></section>';
  if(profileTab==='gear')body+='<section class="captain-section">'+sectionHead('Equipamentos atuais','Seus equipamentos, forjados em mares perigosos.','anchor')+(hidden?'<div class="captain-empty captain-private">'+icon('eye')+'<h3>Equipamentos ocultos</h3><p>A exibição está desativada nas preferências do inventário.</p></div>':'<div class="captain-equipment-grid">'+(ctx.equipment?.length?ctx.equipment.map(x=>'<'+(x.item?'button type="button"':'div')+' class="captain-equipment-card '+(x.item?'rarity-'+E(x.rarity):'is-empty')+'"'+(x.item?' data-profile-slot="'+E(x.key)+'" aria-label="'+E(x.slot+' · '+x.name)+'"':'')+'><span class="captain-equipment-art">'+(x.icon?'<img src="'+E(x.icon)+'" alt="" loading="lazy" decoding="async" draggable="false">':icon('gear'))+'</span><span class="captain-equipment-copy"><small>'+E(x.slot)+'</small><strong>'+E(x.name||'Vazio')+'</strong>'+(x.item?'<span>'+E(x.rarityName||'')+' · Nv. '+fmt(x.level)+(Number.isFinite(x.plus)?' · '+(x.plus>=0?'+':'')+x.plus:'')+'</span>':'<span>Nenhum item equipado</span>')+'</span></'+(x.item?'button':'div')+'>').join(''):'<p class="captain-muted">Nenhum equipamento selecionado.</p>')+'</div>')+'</section>';
  if(profileTab==='wall'||profileTab==='custom')body+='<div class="captain-empty">'+icon(profileTab==='wall'?'bubble':'shirt')+'<h3>'+(profileTab==='wall'?'Mural público':'Personalização pública')+'</h3><p>'+(profileTab==='wall'?'Mural público em desenvolvimento.':'Personalização pública do perfil em desenvolvimento.')+'</p></div>';
  return body+'</section>';
 }
 const settingCards=[['general','GERAL','Idioma, conexão e conta.','flag'],['audio','ÁUDIO','Música e volume.','music'],['graphics','GRÁFICOS','Qualidade e quantidade de efeitos.','star'],['interface','INTERFACE E CONTROLES','Organização e atalhos.','swords'],['accessibility','ACESSIBILIDADE','Legibilidade e movimento.','eye']];
 const settingLabels={quality:'Efeitos visuais',density:'Densidade da HUD',motion:'Animações de interface'};
 const select=(id,options,current)=>'<select data-captain-setting="'+id+'" aria-label="'+E(settingLabels[id]||id)+'">'+options.map(([value,label])=>'<option value="'+value+'" '+(current===value?'selected':'')+'>'+E(label)+'</option>').join('')+'</select>';
 function settingDetail(id){
  const a=root.MareAudio?.getState?.()||{muted:true,volume:0};
  if(id==='general')return '<div class="captain-settings-detail">'+field('Idioma','Português (Brasil)','flag')+field('Conexão','Jogo local · navegador','anchor')+field('Conta','Não disponível nesta versão','gear')+'<p>Os saves continuam locais e independentes das preferências de interface.</p></div>';
  if(id==='audio')return '<div class="captain-settings-detail"><label class="captain-setting-line"><span>Trilha sonora</span><input type="checkbox" data-captain-mute aria-label="Ativar música" '+(a.muted?'':'checked')+'></label><label class="captain-setting-line"><span>Volume da música: <output id="captainMusicValue">'+Math.round(a.volume*100)+'%</output></span><input type="range" min="0" max="100" value="'+Math.round(a.volume*100)+'" data-captain-music-volume aria-label="Volume da música"></label><p>Porto e caçadas trocam de faixa automaticamente. Áudio de efeitos separado ainda não está disponível.</p></div>';
  if(id==='graphics')return '<div class="captain-settings-detail"><label class="captain-setting-line"><span>Efeitos visuais</span>'+select('quality',[['high','Alta qualidade'],['low','Reduzidos']],prefs.quality)+'</label><p>Reduzir efeitos preserva a jogabilidade e simplifica efeitos ambientais.</p></div>';
  if(id==='interface')return '<div class="captain-settings-detail"><label class="captain-setting-line"><span>Densidade da HUD</span>'+select('density',[['standard','Padrão'],['compact','Compacta']],prefs.density)+'</label><p>Atalhos: I inventário · F forja · P personagem · M modos · C contratos.</p></div>';
  if(id==='accessibility')return '<div class="captain-settings-detail"><label class="captain-setting-line"><span>Animações de interface</span>'+select('motion',[['normal','Normais'],['reduced','Reduzidas']],prefs.motion)+'</label><label class="captain-setting-line"><span>Textos maiores nos painéis</span><input type="checkbox" data-captain-larger '+(prefs.largerText?'checked':'')+'></label></div>';
  return '';
 }
 function settingsHTML(){
  const a=root.MareAudio?.getState?.()||{muted:true,volume:0};
  return '<section class="captain-settings"><nav class="captain-tabs" aria-label="Configurações">'+[['geral','GERAL','compass'],['discord','DISCORD','bubble']].map(([id,label,i])=>button(label,id,settingsTab,i).replace('data-captain-tab','data-settings-tab')).join('')+'</nav>'+
   (settingsTab==='discord'?'<div class="captain-empty">'+icon('bubble')+'<h3>Comunidade Discord</h3><p>Servidor oficial ainda não informado. Quando houver um convite verificado, ele aparecerá aqui.</p></div>':
   '<div class="captain-setting-cards">'+settingCards.map(([id,title,desc,i])=>'<section class="captain-setting-card" data-setting-section="'+id+'"><button type="button" class="captain-setting-heading" data-settings-card="'+id+'" aria-expanded="'+(settingsExpanded===id)+'" aria-controls="captain-detail-'+id+'"><span class="captain-setting-icon">'+icon(i)+'</span><span class="captain-setting-copy"><strong>'+title+'</strong><small>'+desc+'</small><em>'+E(({general:'Português · Salvo localmente',audio:a.muted?'Música silenciada':'Música ligada · '+Math.round(a.volume*100)+'%',graphics:prefs.quality==='high'?'Qualidade: Alta':'Efeitos reduzidos',interface:prefs.density==='compact'?'HUD compacta':'HUD padrão',accessibility:prefs.largerText?'Textos ampliados':'Visualização padrão'})[id])+'</em></span><span class="captain-chevron" aria-hidden="true">'+(settingsExpanded===id?'−':'›')+'</span></button>'+(settingsExpanded===id?'<div id="captain-detail-'+id+'">'+settingDetail(id)+'</div>':'')+'</section>').join('')+'</div>')+'</section>';
 }
 function unmount(){if(portraitFrame&&root.cancelAnimationFrame)root.cancelAnimationFrame(portraitFrame);portraitFrame=0;}
 function render(panel,snapshot){unmount();ctx={...snapshot,stamp:JSON.stringify([snapshot.game.equipment,snapshot.game.preferences?.hideItems,snapshot.game.appearance96,snapshot.game.paperDollLook,snapshot.game.zoanTransformed,snapshot.game.name,snapshot.game.classId,snapshot.game.factionId,snapshot.game.hierarchyTier])};if(panel==='journal')return journalHTML();if(panel==='myprofile')return profileHTML();if(panel==='settings')return settingsHTML();return '';}
 function hydrate(panel){
  if(panel!=='myprofile')return;
  const target=document.getElementById('captainProfilePortrait');if(!target)return;
  const started=Date.now();function paint(){portraitFrame=0;if(!target.isConnected)return;const ok=drawPortrait(target,!!ctx.game.preferences?.hideItems),state=document.getElementById('captainPortraitState');if(state){state.textContent=ok?'':'Carregando retrato…';state.hidden=!!ok;}
   if(!ok&&Date.now()-started<15000&&root.requestAnimationFrame)portraitFrame=root.requestAnimationFrame(paint);else if(!ok&&state)state.textContent='Retrato temporariamente indisponível.';
  }paint();
 }
 function refresh(game,stats){
  if(!document.querySelector('#dialogBody .captain-profile'))return;
  ctx={...ctx,game,stats};
  // Equipment/privacy/cosmetic changes rebuild via the game's existing panel, never persist this display.
  const stamp=JSON.stringify([game.equipment,game.preferences?.hideItems,game.appearance96,game.paperDollLook,game.zoanTransformed,game.name,game.classId,game.factionId,game.hierarchyTier]);
  if(ctx.stamp!==undefined&&ctx.stamp!==stamp){redraw();return;}ctx.stamp=stamp;
  const m=metricValues(game,stats);for(const el of document.querySelectorAll('[data-profile-value]')){const v=m[el.dataset.profileValue];if(el.textContent!==v)el.textContent=v;}
 }
 function configure(options={}){redraw=options.redraw||redraw;setReducedFX=options.setReducedFX||setReducedFX;drawPortrait=options.drawPortrait||drawPortrait;apply();}
 function focusedRedraw(selector){const body=document.getElementById('dialogBody'),scroll=body?.scrollTop;redraw();if(body)body.scrollTop=scroll||0;document.querySelector(selector)?.focus({preventScroll:true});}
 document.addEventListener('click',e=>{
  const journalTab=e.target.closest('[data-journal-tab]');if(journalTab){selectedJournal=journalTab.dataset.journalTab;focusedRedraw('[data-journal-tab="'+selectedJournal+'"]');return;}
  const profile=e.target.closest('[data-profile-tab]');if(profile){profileTab=profile.dataset.profileTab;focusedRedraw('[data-profile-tab="'+profileTab+'"]');return;}
  const settings=e.target.closest('[data-settings-tab]');if(settings){settingsTab=settings.dataset.settingsTab;settingsExpanded='';focusedRedraw('[data-settings-tab="'+settingsTab+'"]');return;}
  const card=e.target.closest('[data-settings-card]');if(card){settingsExpanded=settingsExpanded===card.dataset.settingsCard?'':card.dataset.settingsCard;focusedRedraw('[data-settings-card="'+card.dataset.settingsCard+'"]');}
 });
 document.addEventListener('change',e=>{
  const setting=e.target.closest('[data-captain-setting]');if(setting){const id=setting.dataset.captainSetting;if(values[id]?.includes(setting.value)){prefs[id]=setting.value;store();focusedRedraw('[data-captain-setting="'+id+'"]');}return;}
  if(e.target.matches('[data-captain-mute]')){root.MareAudio?.setMuted?.(!e.target.checked);focusedRedraw('[data-captain-mute]');}
  if(e.target.matches('[data-captain-larger]')){prefs.largerText=e.target.checked;store();focusedRedraw('[data-captain-larger]');}
 });
 document.addEventListener('input',e=>{if(e.target.matches('[data-captain-music-volume]')){const vol=Math.max(0,Math.min(1,Number(e.target.value)/100));root.MareAudio?.setVolume?.(vol);const output=document.getElementById('captainMusicValue');if(output)output.textContent=Math.round(vol*100)+'%';}});
 root.MarePlayerHub=Object.freeze({configure,render,hydrate,refresh,unmount,getPreferences:()=>({...prefs})});
})(globalThis);
