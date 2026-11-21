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
  gear:'assets/ui/inventory-final/icons/equipment.png',eye:'assets/ui/character-studio/controls/eyeStyle.png?v=alpha-native-v1',
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
 function metricValues(g,s){return {level:fmt(g.level),className:ctx.className||g.classId,power:fmt(s.power),play:ctx.online&&!g.onlineMetrics?'Não registrado':clock(g.totalPlay),created:date(g.created),title:title(g),bounty:ctx.bounty!=null?fmt(ctx.bounty)+' Berry':'—',kills:fmt(g.stats?.kills),damage:ctx.online&&!g.onlineMetrics?'Não registrado':fmt(g.stats?.damage),berry:fmt(g.stats?.goldEarned)};}
 function profileHTML(){
  const g=ctx.game,s=ctx.stats||{},m=metricValues(g,s),hidden=!!g.preferences?.hideItems;
  let body='<section class="captain-profile"><header class="captain-profile-banner"><div class="captain-profile-avatar"><canvas id="captainProfilePortrait" width="256" height="256" aria-label="Aparência atual do personagem'+(hidden?', equipamentos ocultos':'')+'"></canvas><small id="captainPortraitState" role="status">Carregando retrato…</small></div><div class="captain-profile-name"><small>'+E(title(g))+' · '+E(ctx.factionName||'')+'</small><h2>'+(root.MareCrewUI?.identity(ctx.crewIdentity,g.name)??E(g.name))+'</h2><span>'+(ctx.classIcon?'<img src="'+E(ctx.classIcon)+'" alt="" class="captain-class-icon">':'')+E(m.className)+' · Nv. <b data-profile-value="level">'+m.level+'</b></span><small>'+(ctx.online?'Personagem salvo no servidor':'Save local neste navegador')+'</small></div><div class="captain-profile-power">'+(ctx.factionIcon?'<img class="captain-faction-seal" src="'+E(ctx.factionIcon)+'" alt="'+E(ctx.factionName)+'">':'')+'<small>PODER</small><strong data-profile-value="power">'+m.power+'</strong></div></header>'+
   '<nav class="captain-tabs" aria-label="Seções do perfil">'+[['overview','Visão geral','compass'],['gear','Equipamentos','gear'],['wall','Mural','bubble'],['custom','Personalizar','shirt']].map(([id,name,i])=>button(name,id,profileTab,i).replace('data-captain-tab','data-profile-tab')).join('')+'</nav>';
  if(profileTab==='overview')body+='<section class="captain-section">'+sectionHead('Perfil do Aventureiro','Principais informações da sua jornada pelos mares.','compass')+'<div class="captain-facts">'+field('Nível',m.level,'crown','level')+field('Classe',m.className,'swords','className')+field('Poder',m.power,'strength','power')+field('Tempo de jogo',m.play,'hourglass','play')+field('Aventureiro desde',m.created,'calendar','created')+field('Título',m.title,'star','title')+field('Bounty',m.bounty,'bag','bounty')+'</div></section>'+
   '<section class="captain-section captain-rank-section">'+sectionHead('Posição nos rankings','Posições globais por nível e poder ainda indisponíveis.','crown')+'<div class="captain-rank-facts">'+field('Ranking de nível','Indisponível','compass')+field('Ranking de poder','Indisponível','power')+'<p class="captain-muted">A Hierarquia dos Mares possui seu próprio Top 10 por cargo, nível e poder.</p></div></section>'+
   '<section class="captain-section">'+sectionHead('Combate e progresso','Seu desempenho nas batalhas e avanços.','swords')+'<div class="captain-combat-facts">'+field('Monstros derrotados',m.kills,'flag','kills')+field('Dano causado',m.damage,'attack','damage')+field('Berry recebidos',m.berry,'bag','berry')+field('Duelos PvP','Indisponível','swords')+'</div></section>';
  if(profileTab==='gear')body+='<section class="captain-section">'+sectionHead('Equipamentos atuais','Seus equipamentos, forjados em mares perigosos.','anchor')+(hidden?'<div class="captain-empty captain-private">'+icon('eye')+'<h3>Equipamentos ocultos</h3><p>A exibição está desativada nas preferências do inventário.</p></div>':'<div class="captain-equipment-grid">'+(ctx.equipment?.length?ctx.equipment.map(x=>'<'+(x.item?'button type="button"':'div')+' class="captain-equipment-card '+(x.item?'rarity-'+E(x.rarity):'is-empty')+'"'+(x.item?' data-profile-slot="'+E(x.key)+'" aria-label="'+E(x.slot+' · '+x.name)+'"':'')+'><span class="captain-equipment-art">'+(x.icon?'<img src="'+E(x.icon)+'" alt="" loading="lazy" decoding="async" draggable="false">':icon('gear'))+'</span><span class="captain-equipment-copy"><small>'+E(x.slot)+'</small><strong>'+E(x.name||'Vazio')+'</strong>'+(x.item?'<span>'+E(x.rarityName||'')+(x.gear?'':' · Nv. '+fmt(x.level))+(Number.isFinite(x.plus)?' · '+(x.plus>=0?'+':'')+x.plus:'')+'</span>':'<span>Nenhum item equipado</span>')+'</span></'+(x.item?'button':'div')+'>').join(''):'<p class="captain-muted">Nenhum equipamento selecionado.</p>')+'</div>')+'</section>';
  if(profileTab==='custom'&&ctx.online)body+='<section class="captain-section"><h3>Seu personagem</h3><p>Edite nome, facção, classe e aparência no porto. A progressão e os talentos de cada classe são preservados.</p><button type="button" data-profile-identity>Editar personagem</button></section>';
  if(profileTab==='wall'||profileTab==='custom'&&!ctx.online)body+='<div class="captain-empty">'+icon(profileTab==='wall'?'bubble':'shirt')+'<h3>'+(profileTab==='wall'?'Mural público':'Personalização pública')+'</h3><p>'+(profileTab==='wall'?'Mural público em desenvolvimento.':'Personalização pública do perfil em desenvolvimento.')+'</p></div>';
  return body+'</section>';
 }
 // Original vector line icons, scoped to Settings; gameplay and item artwork stay unchanged.
 const settingPaths={
  general:'<circle cx="12" cy="12" r="9"/><path d="m16 8-2.5 5.5L8 16l2.5-5.5Z"/>',
  audio:'<path d="M4 9h4l4-4v14l-4-4H4Z"/><path d="M16 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  graphics:'<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4m-6-8 4-4 3 3 3-4 2 3"/>',
  interface:'<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 15h10"/>',
  accessibility:'<circle cx="12" cy="4" r="2"/><path d="M4 8c5 2 11 2 16 0m-8 2v5m-4 6 4-6 4 6"/>',
  discord:'<path d="M20 15a3 3 0 0 1-3 3H9l-5 3V6a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3Z"/><path d="M8 8h8m-8 5h5"/>',
  language:'<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
  connection:'<path d="M3 9a15 15 0 0 1 18 0M6 12a10 10 0 0 1 12 0m-9 3a5 5 0 0 1 6 0"/><circle cx="12" cy="19" r="1"/>',
  account:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>'
 };
 function settingIcon(id){return '<svg class="settings-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+(settingPaths[id]||settingPaths.general)+'</svg>';}
 function settingFact(label,value,id){return '<div class="captain-fact">'+settingIcon(id)+'<div><small>'+E(label)+'</small><strong>'+E(value)+'</strong></div></div>';}
 const settingCards=[['general','Geral','Idioma, conexão e conta.'],['audio','Áudio','Música e efeitos independentes.'],['graphics','Gráficos','Ajuste os efeitos visuais do jogo.'],['interface','Interface e controles','Densidade da HUD e atalhos.'],['accessibility','Acessibilidade','Legibilidade e movimento.']];
 const settingLabels={quality:'Efeitos visuais',density:'Densidade da HUD',motion:'Animações de interface'};
 const select=(id,options,current)=>'<select data-captain-setting="'+id+'" aria-label="'+E(settingLabels[id]||id)+'">'+options.map(([value,label])=>'<option value="'+value+'" '+(current===value?'selected':'')+'>'+E(label)+'</option>').join('')+'</select>';
 const audioState=()=>({muted:true,volume:0,effectsMuted:true,effectsVolume:0,...root.MareAudio?.getState?.()});
 const audioControls=[
  {label:'Música',summary:'Música',off:'desligada',toggle:'Ativar música',slider:'Volume da música',mute:'mute',range:'music-volume',output:'captainMusicValue',muted:'muted',volume:'volume',setMute:'setMuted',setVolume:'setVolume'},
  {label:'Efeitos do jogo',summary:'Efeitos',off:'desligados',toggle:'Ativar efeitos do jogo',slider:'Volume dos efeitos',mute:'effects-mute',range:'effects-volume',output:'captainEffectsValue',muted:'effectsMuted',volume:'effectsVolume',setMute:'setEffectsMuted',setVolume:'setEffectsVolume'}
 ];
 const audioPercent=(a,c)=>Math.round(a[c.volume]*100);
 const audioOn=(a,c)=>!a[c.muted]&&a[c.volume]>0;
 const audioSummary=a=>audioControls.map(c=>c.summary+': '+(audioOn(a,c)?audioPercent(a,c)+'%':c.off)).join(' · ');
 const audioMarkup=(a,c)=>'<label class="captain-setting-line"><span>'+c.label+'</span><input type="checkbox" data-captain-'+c.mute+' aria-label="'+c.toggle+'" '+(audioOn(a,c)?'checked':'')+'></label>'+
  '<label class="captain-setting-line"><span>'+c.slider+': <output id="'+c.output+'">'+audioPercent(a,c)+'%</output></span><input type="range" min="0" max="100" value="'+audioPercent(a,c)+'" data-captain-'+c.range+' aria-label="'+c.slider+'"></label>';
 function syncAudio(a){
  const summary=document.querySelector('[data-settings-card="audio"] em');
  if(summary)summary.textContent=audioSummary(a);
  for(const c of audioControls){
   const toggle=document.querySelector('[data-captain-'+c.mute+']'),slider=document.querySelector('[data-captain-'+c.range+']'),output=document.getElementById(c.output);
   if(toggle)toggle.checked=audioOn(a,c);
   if(slider&&slider.value!==String(audioPercent(a,c)))slider.value=audioPercent(a,c);
   if(output)output.textContent=audioPercent(a,c)+'%';
  }
 }
 function settingDetail(id,a){
  if(id==='general')return '<div class="captain-settings-detail">'+settingFact('Idioma','Português (Brasil)','language')+settingFact('Conexão',ctx.online?'Online · sessão autenticada':'Jogo local · navegador','connection')+settingFact('Conta',ctx.online?'Autenticada':'Não disponível nesta versão','account')+(ctx.online?'<button type="button" data-online-action="logout">Sair da conta</button>':'')+'<p>'+(ctx.online?'Personagem persistido no servidor. Áudio e exibição são preferências deste navegador.':'Os saves continuam locais e independentes das preferências de interface.')+'</p></div>';
  if(id==='audio')return '<div class="captain-settings-detail">'+audioControls.map(c=>'<section class="settings-audio-channel">'+audioMarkup(a,c)+'</section>').join('')+'<p>Ajuste a trilha sem mudar o volume de passos, golpes e habilidades.</p></div>';
  if(id==='graphics')return '<div class="captain-settings-detail"><label class="captain-setting-line"><span>Efeitos visuais</span>'+select('quality',[['high','Alta qualidade'],['low','Reduzidos']],prefs.quality)+'</label><p>Reduzir efeitos preserva a jogabilidade e simplifica efeitos ambientais.</p></div>';
  if(id==='interface')return '<div class="captain-settings-detail"><label class="captain-setting-line"><span>Densidade da HUD</span>'+select('density',[['standard','Padrão'],['compact','Compacta']],prefs.density)+'</label><p>Atalhos: I inventário · F forja · P personagem · M modos · C contratos.</p></div>';
  if(id==='accessibility')return '<div class="captain-settings-detail"><label class="captain-setting-line"><span>Animações de interface</span>'+select('motion',[['normal','Normais'],['reduced','Reduzidas']],prefs.motion)+'</label><label class="captain-setting-line"><span>Textos maiores nos painéis</span><input type="checkbox" data-captain-larger '+(prefs.largerText?'checked':'')+'></label></div>';
  return '';
 }
 function settingsHTML(){
  const a=audioState(),active=settingsTab==='discord'?'discord':settingsExpanded||'general';
  const summaries={general:ctx.online?'Sessão online':'Neste navegador',audio:audioSummary(a),graphics:prefs.quality==='high'?'Qualidade alta':'Efeitos reduzidos',interface:prefs.density==='compact'?'HUD compacta':'HUD padrão',accessibility:prefs.largerText?'Textos ampliados':'Visualização padrão'};
  const current=settingCards.find(([id])=>id===active)||['discord','Comunidade','Encontre outros capitães e acompanhe as novidades.'];
  const nav=settingCards.map(([id,title])=>'<button type="button" class="settings-category" data-settings-card="'+id+'"'+(id==='general'?' data-settings-tab="geral"':'')+' aria-pressed="'+(active===id)+'" aria-expanded="'+(active===id)+'" aria-controls="settings-content">'+settingIcon(id)+'<span><strong>'+title+'</strong><em>'+E(summaries[id])+'</em></span></button>').join('')+
   '<button type="button" class="settings-category" data-settings-tab="discord" aria-pressed="'+(active==='discord')+'" aria-controls="settings-content">'+settingIcon('discord')+'<span><strong>Discord</strong><em>Comunidade do jogo</em></span></button>';
  return '<section class="captain-settings settings-glass"><nav class="settings-nav" aria-label="Categorias de configurações">'+nav+'</nav><section class="settings-content" id="settings-content" aria-labelledby="settings-category-title"><header class="settings-intro">'+settingIcon(active)+'<div><h3 id="settings-category-title">'+current[1]+'</h3><p>'+current[2]+'</p></div></header>'+
   (active==='discord'?'<div class="captain-discord">'+settingIcon('discord')+'<div><h3>Comunidade Discord</h3><p>Converse com outros jogadores e fique por dentro do Kaizoku Idle.</p><a href="https://discord.gg/uRnP79cp7h" target="_blank" rel="noopener noreferrer">Entrar no Discord<span aria-hidden="true"> ↗</span></a></div></div>':'<div id="captain-detail-'+active+'">'+settingDetail(active,a)+'</div><p class="settings-storage-note">Preferências de áudio e exibição salvas neste navegador.</p>')+'</section></section>';
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
 function refresh(game,stats,bounty){
  if(!document.querySelector('#dialogBody .captain-profile'))return;
  ctx={...ctx,game,stats,bounty};
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
  const card=e.target.closest('[data-settings-card]');if(card){settingsTab='geral';settingsExpanded=card.dataset.settingsCard;focusedRedraw('[data-settings-card="'+card.dataset.settingsCard+'"]');}
 });
 document.addEventListener('change',e=>{
  const setting=e.target.closest('[data-captain-setting]');if(setting){const id=setting.dataset.captainSetting;if(values[id]?.includes(setting.value)){prefs[id]=setting.value;store();focusedRedraw('[data-captain-setting="'+id+'"]');}return;}
  const channel=audioControls.find(c=>e.target.matches('[data-captain-'+c.mute+']'));
  if(channel){root.MareAudio?.[channel.setMute]?.(!e.target.checked);return;}
  if(e.target.matches('[data-captain-larger]')){prefs.largerText=e.target.checked;store();focusedRedraw('[data-captain-larger]');}
 });
 document.addEventListener('input',e=>{
  const channel=audioControls.find(c=>e.target.matches('[data-captain-'+c.range+']'));
  if(channel)root.MareAudio?.[channel.setVolume]?.(Number(e.target.value)/100);
 });
 document.addEventListener('mare-audio-change',e=>syncAudio(e.detail));
 root.MarePlayerHub=Object.freeze({configure,render,hydrate,refresh,unmount,getPreferences:()=>({...prefs})});
})(globalThis);
