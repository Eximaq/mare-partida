'use strict';
/* Central do Navegante — jornal, perfil local e preferências.
   Estado somente de interface; nunca modifica atributos, inventário ou save. */
((root)=>{
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const KEY='mare-partida-player-ui-v1';
  const defaults={quality:'high',density:'standard',motion:'normal',largerText:false};
  let prefs={...defaults},journal=[],journalLoading=false,ctx=null,redraw=()=>{},setReducedFX=()=>{},selectedJournal='all',settingsTab='geral',settingsExpanded='',profileTab='overview';
  try{const raw=JSON.parse(localStorage.getItem(KEY)||'null');if(raw&&typeof raw==='object'){
    for(const k of Object.keys(defaults))if(typeof raw[k]===typeof defaults[k])prefs[k]=raw[k];
  }}catch(_){}
  const fmt=n=>Number.isFinite(Number(n))?Math.round(Number(n)).toLocaleString('pt-BR'):'—';
  const date=n=>Number(n)>0?new Date(Number(n)).toLocaleDateString('pt-BR'):'Não registrado';
  const clock=s=>{s=Math.max(0,Math.floor(Number(s)||0));return Math.floor(s/3600)+' h '+Math.floor((s%3600)/60)+' min';};
  const button=(name,key,active)=>'<button type="button" data-captain-tab="'+key+'" aria-pressed="'+(active===key)+'">'+escape(name)+'</button>';
  function apply(){
    document.documentElement.dataset.mareDensity=prefs.density;
    document.documentElement.dataset.mareMotion=prefs.motion;
    document.documentElement.dataset.mareText=prefs.largerText?'large':'regular';
    setReducedFX(prefs.quality==='low');
  }
  function store(){try{localStorage.setItem(KEY,JSON.stringify(prefs));}catch(_){}apply();}
  function getJournal(){if(journalLoading||journal.length)return;journalLoading=true;fetch(new URL('journal-feed.json',document.baseURI).href,{cache:'no-cache'}).then(r=>r.ok?r.json():[]).then(data=>{
    journal=Array.isArray(data)?data.filter(x=>x&&typeof x.title==='string'&&['event','update','notice'].includes(x.type)).slice(0,60):[];
    if(document.querySelector('#dialogBody [data-captain-journal]'))redraw();
  }).catch(()=>{journal=[];}).finally(()=>journalLoading=false);}
  function journalHTML(){
    getJournal();
    const tabs=[['all','Tudo'],['event','Eventos'],['update','Atualizações'],['notice','Avisos']];
    const items=journal.filter(x=>selectedJournal==='all'||x.type===selectedJournal);
    return '<section class="captain-journal" data-captain-journal><p class="captain-lead">Avisos oficiais do Maré Partida, eventos e novidades do desenvolvimento.</p>'+
      '<nav class="captain-tabs" aria-label="Categorias do jornal">'+tabs.map(([id,name])=>button(name,id,selectedJournal).replace('data-captain-tab','data-journal-tab')).join('')+'</nav>'+
      '<div class="captain-news">'+(items.length?items.map(x=>'<article class="captain-news-item"><div class="captain-news-meta"><span class="captain-tag">'+escape(({event:'EVENTO',update:'ATUALIZAÇÃO',notice:'AVISO'})[x.type])+'</span><time>'+escape(x.date||'')+'</time></div><h3>'+escape(x.title)+'</h3><p>'+escape(x.summary||'')+'</p></article>').join(''):'<div class="captain-empty">'+(journalLoading?'Carregando avisos...':'Nenhuma publicação nesta categoria.')+'</div>')+'</div></section>';
  }
  function field(label,value){return '<div class="captain-fact"><small>'+escape(label)+'</small><strong>'+escape(value)+'</strong></div>';}
  function profileHTML(){
    const g=ctx.game,s=ctx.stats||{},className=ctx.className||g.classId;
    let body='<section class="captain-profile"><div class="captain-profile-banner"><div class="captain-profile-avatar"><canvas id="captainProfilePortrait" width="64" height="64" aria-label="Retrato do aventureiro"></canvas></div><div class="captain-profile-name"><small>AVENTUREIRO · '+escape(ctx.factionName||'')+'</small><h2>'+escape(g.name)+'</h2><span>'+escape(className)+' · Nv. '+fmt(g.level)+'</span><small>Save local neste navegador</small></div><div class="captain-profile-power"><small>PODER</small><strong>'+fmt(s.power)+'</strong></div></div>';
    body+='<nav class="captain-tabs" aria-label="Seções do perfil">'+[['overview','Visão geral'],['gear','Equipamentos'],['wall','Mural'],['custom','Personalizar']].map(([id,name])=>button(name,id,profileTab).replace('data-captain-tab','data-profile-tab')).join('')+'</nav>';
    if(profileTab==='overview')body+='<h3>CAÇADOR</h3><div class="captain-facts">'+field('Nível',g.level)+field('Classe',className)+field('Poder',fmt(s.power))+field('Tempo de jogo',clock(g.totalPlay))+field('Aventureiro desde',date(g.created))+field('Título','Aventureiro')+'</div>'+
      '<h3>POSIÇÃO NOS RANKINGS</h3><div class="captain-facts">'+field('Ranking de nível','Indisponível')+field('Ranking de poder','Indisponível')+'</div>'+
      '<p class="captain-muted">Os rankings requerem servidor e contas online, ainda não implementados.</p>'+
      '<h3>COMBATE E PROGRESSO</h3><div class="captain-facts">'+field('Monstros derrotados',fmt(g.stats?.kills))+field('Dano causado',fmt(g.stats?.damage))+field('Berry recebidos',fmt(g.stats?.goldEarned))+field('Duelos PvP','Indisponível')+'</div>';
    if(profileTab==='gear')body+='<h3>EQUIPAMENTOS ATUAIS</h3><div class="captain-facts">'+(ctx.equipment?.length?ctx.equipment.map(x=>field(x.slot,x.name)).join(''):'<p>Nenhum equipamento selecionado.</p>')+'</div>';
    if(profileTab==='wall'||profileTab==='custom')body+='<div class="captain-empty">'+(profileTab==='wall'?'Mural público em desenvolvimento.':'Personalização pública do perfil em desenvolvimento.')+'</div>';
    return body+'</section>';
  }
  const settingCards=[['general','GERAL','Idioma, conexão e conta.','⚑'],['audio','ÁUDIO','Música e volume.','♫'],['graphics','GRÁFICOS','Qualidade e quantidade de efeitos.','✧'],['interface','INTERFACE E CONTROLES','Organização e atalhos.','✥'],['accessibility','ACESSIBILIDADE','Legibilidade e movimento.','◎']];
  const settingLabels={quality:'Efeitos visuais',density:'Densidade da HUD',motion:'Animações de interface'};
  const select=(id,options,current)=>'<select data-captain-setting="'+id+'" aria-label="'+escape(settingLabels[id]||id)+'">'+options.map(([value,label])=>'<option value="'+value+'" '+(current===value?'selected':'')+'>'+escape(label)+'</option>').join('')+'</select>';
  function settingDetail(id){
    const a=root.MareAudio?.getState?.()||{muted:true,volume:0};
    if(id==='general')return '<div class="captain-settings-detail">'+field('Idioma','Português (Brasil)')+field('Conexão','Jogo local · navegador')+field('Conta','Não disponível nesta versão')+'<p>Os saves continuam locais e independentes das preferências de interface.</p></div>';
    if(id==='audio')return '<div class="captain-settings-detail"><label class="captain-setting-line"><span>Trilha sonora</span><input type="checkbox" data-captain-mute aria-label="Ativar música" '+(a.muted?'':'checked')+'></label><label class="captain-setting-line"><span>Volume da música: <output id="captainMusicValue">'+Math.round(a.volume*100)+'%</output></span><input type="range" min="0" max="100" value="'+Math.round(a.volume*100)+'" data-captain-music-volume aria-label="Volume da música"></label><p>Porto e caçadas trocam de faixa automaticamente. Áudio de efeitos separado ainda não está disponível.</p></div>';
    if(id==='graphics')return '<div class="captain-settings-detail"><label class="captain-setting-line"><span>Efeitos visuais</span>'+select('quality',[['high','Alta qualidade'],['low','Reduzidos'] ],prefs.quality)+'</label><p>Reduzir efeitos preserva a jogabilidade e simplifica efeitos ambientais.</p></div>';
    if(id==='interface')return '<div class="captain-settings-detail"><label class="captain-setting-line"><span>Densidade da HUD</span>'+select('density',[['standard','Padrão'],['compact','Compacta']],prefs.density)+'</label><p>Atalhos: I inventário · F forja · P personagem · M modos · C contratos.</p></div>';
    if(id==='accessibility')return '<div class="captain-settings-detail"><label class="captain-setting-line"><span>Animações de interface</span>'+select('motion',[['normal','Normais'],['reduced','Reduzidas']],prefs.motion)+'</label><label class="captain-setting-line"><span>Textos maiores nos painéis</span><input type="checkbox" data-captain-larger '+(prefs.largerText?'checked':'')+'></label></div>';
    return '';
  }
  function settingsHTML(){
    const a=root.MareAudio?.getState?.()||{muted:true,volume:0};
    return '<section class="captain-settings"><nav class="captain-tabs" aria-label="Configurações">'+[['geral','GERAL'],['discord','DISCORD']].map(([id,label])=>button(label,id,settingsTab).replace('data-captain-tab','data-settings-tab')).join('')+'</nav>'+
      (settingsTab==='discord'?'<div class="captain-empty"><h3>Comunidade Discord</h3><p>Servidor oficial ainda não informado. Quando houver um convite verificado, ele aparecerá aqui.</p></div>':
      '<div class="captain-setting-cards">'+settingCards.map(([id,title,desc,icon])=>
      '<section class="captain-setting-card"><button type="button" class="captain-setting-heading" data-settings-card="'+id+'" aria-expanded="'+(settingsExpanded===id)+'"><span class="captain-setting-icon" aria-hidden="true">'+icon+'</span><span><strong>'+title+'</strong><small>'+desc+'</small><em>'+({general:'Português · Save local',audio:a.muted?'Música silenciada':'Música ligada · '+Math.round(a.volume*100)+'%',graphics:prefs.quality==='high'?'Qualidade: Alta':'Efeitos reduzidos',interface:prefs.density==='compact'?'HUD compacta':'HUD padrão',accessibility:prefs.largerText?'Textos ampliados':'Visualização padrão'})[id]+'</em></span><span class="captain-chevron" aria-hidden="true">'+(settingsExpanded===id?'⌄':'›')+'</span></button>'+(settingsExpanded===id?settingDetail(id):'')+'</section>').join('')+'</div>')+'</section>';
  }
  function render(panel,snapshot){ctx=snapshot;if(panel==='journal')return journalHTML();if(panel==='myprofile')return profileHTML();if(panel==='settings')return settingsHTML();return '';}
  function hydrate(panel){
    if(panel==='myprofile'){
      const src=document.getElementById('portrait'),target=document.getElementById('captainProfilePortrait');
      if(src&&target){const c=target.getContext('2d');c.imageSmoothingEnabled=false;c.clearRect(0,0,64,64);c.drawImage(src,0,0,64,64);}
    }
  }
  function configure(options={}){redraw=options.redraw||redraw;setReducedFX=options.setReducedFX||setReducedFX;apply();}
  document.addEventListener('click',e=>{
    const journalTab=e.target.closest('[data-journal-tab]');if(journalTab){selectedJournal=journalTab.dataset.journalTab;redraw();return;}
    const profile=e.target.closest('[data-profile-tab]');if(profile){profileTab=profile.dataset.profileTab;redraw();return;}
    const settings=e.target.closest('[data-settings-tab]');if(settings){settingsTab=settings.dataset.settingsTab;settingsExpanded='';redraw();return;}
    const card=e.target.closest('[data-settings-card]');if(card){settingsExpanded=settingsExpanded===card.dataset.settingsCard?'':card.dataset.settingsCard;redraw();}
  });
  document.addEventListener('change',e=>{
    const setting=e.target.closest('[data-captain-setting]');if(setting){
      if(['quality','density','motion'].includes(setting.dataset.captainSetting)){prefs[setting.dataset.captainSetting]=setting.value;store();redraw();}return;
    }
    if(e.target.matches('[data-captain-mute]')){root.MareAudio?.setMuted?.(!e.target.checked);redraw();}
    if(e.target.matches('[data-captain-larger]')){prefs.largerText=e.target.checked;store();redraw();}
  });
  document.addEventListener('input',e=>{
    if(e.target.matches('[data-captain-music-volume]')){
      const vol=Number(e.target.value)/100;
      root.MareAudio?.setVolume?.(vol);
      const output=document.getElementById('captainMusicValue');if(output)output.textContent=Math.round(vol*100)+'%';
    }
  });
  root.MarePlayerHub=Object.freeze({configure,render,hydrate,getPreferences:()=>({...prefs})});
})(globalThis);
