/* The authenticated server owns availability, entry and rewards. */
(function(root) {
 'use strict';

 const arenaMap='arena-espadachins';
 const timeZone='America/Sao_Paulo';
 const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const number=new Intl.NumberFormat('pt-BR');
 const time=new Intl.DateTimeFormat('pt-BR',{timeZone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 const date=new Intl.DateTimeFormat('pt-BR',{timeZone,day:'2-digit',month:'2-digit'});
 const weekday=new Intl.DateTimeFormat('pt-BR',{timeZone,weekday:'short'});
 const toTime=value=>time.format(new Date(value)).replace(':00','h');
 const stamp=value=>Date.parse(value??'');
 const span=(from,until)=>[from,until].filter(value=>Number.isFinite(stamp(value))).map(toTime).join(' – ');
 const days=Object.freeze({Mon:'Segunda-feira',Tue:'Terça-feira',Wed:'Quarta-feira',Thu:'Quinta-feira',Fri:'Sexta-feira',Sat:'Sábado',Sun:'Domingo'});
 const admirals=Object.freeze([
  {id:'akainu',name:'Akainu',accent:'red',art:'assets/ui/weekly-boss/akainu.webp'},
  {id:'aokiji',name:'Aokiji',accent:'blue',art:'assets/ui/weekly-boss/aokiji.webp'},
  {id:'kizaru',name:'Kizaru',accent:'gold',art:'assets/ui/weekly-boss/kizaru.webp'}
 ]);
 const swordPortrait=id=>'assets/ui/sword-event/'+id+'.webp';
 const art={
  akuma:'assets/quest-dungeons/akuma-fragment.png',
  armament:'assets/haki/mastery/fragment-armament.png',
  observation:'assets/haki/mastery/fragment-observation.png',
  fragment:'assets/ui/sword-compendium/yoru-fragment.webp'
 };
 const knownAdmiral=e=>admirals.find(b=>b.name===e?.boss?.name)?.id
  ??admirals.find(b=>b.id===e?.bossId)?.id??(e?.mode==='official'?'akainu':null);
 const admiralName=e=>e.boss?.name||admirals.find(b=>b.id===knownAdmiral(e))?.name||'Almirante';
 const eventLive=(e,now)=>e?.status==='active'&&stamp(e.endsAt)>now;
 const official=e=>e.mode==='official'&&e.mapId!==arenaMap;
 const isReady=state=>state.available===true&&state.controlled===true&&!state.busy&&!state.pending;

 function adminModel(data={},state={},selected) {
  data=data||{};
  const events=Array.isArray(data.events)?data.events:[];
  const ready=isReady(state),admin=data.canManage===true;
  const boss=admirals.find(b=>b.id===selected)||admirals[0];
  const config=data.profiles?.[boss.id]??(!data.profiles&&boss.id==='akainu'?data.config:null);
  return {ready,admin,events,boss,config,current:data.current||null,canConfigure:ready&&admin,
   canTest:ready&&admin&&!data.current&&(!data.profiles||config?.balanceApproved===true),
   canActivate:ready&&admin&&data.marinefordReady===true&&config?.balanceApproved===true&&!events.some(official)};
 }

 function permission(state,{current,maxPlayers,members,minLevel,open}) {
  if(!state.available)return 'Conecte-se ao servidor.';
  if(!state.controlled)return 'Retome o controle do personagem.';
  if(!open)return '';
  if(current)return 'Saia do encontro atual antes de entrar.';
  if(state.mapId&&state.mapId!=='lobby')return 'Volte ao Porto das Correntes para entrar.';
  if(state.hp<=0)return 'Aguarde o renascimento para entrar.';
  if(Number.isInteger(minLevel)&&state.level<minLevel)return 'Requer nível '+number.format(minLevel)+'.';
  if(Number.isInteger(maxPlayers)&&members>=maxPlayers)return 'Arena lotada.';
  return '';
 }

 function weeklyModel(data={},state={},selected,now=Date.now()) {
  data=data||{};
  const current=data.current?.mapId!==arenaMap?data.current:null;
  const events=(data.events||[]).filter(official);
  const cards=admirals.map(card=>{
   const event=events.find(e=>knownAdmiral(e)===card.id);
   const recent=knownAdmiral(data.recentOfficial)===card.id?data.recentOfficial:null;
   const configuredLevel=data.admiralMinLevels?.[card.id]??(card.id==='akainu'?data.akainuMinLevel:null);
   const occurrence=event||recent;
   const active=eventLive(event,now);
   const yours=current?.mode==='official'&&knownAdmiral(current)===card.id;
   const ended=!!occurrence&&!active;
   const manual=card.id==='akainu'||configuredLevel!=null;
   const schedule=occurrence?.openedAt?weekday.format(new Date(occurrence.openedAt))+' · '+span(occurrence.openedAt,occurrence.endsAt):manual?'Abertura manual':'Sem programação';
   return {...card,event,occurrence,active,ended,yours,schedule,
    label:active?'Disponível agora':ended?'Encerrado':manual?'Aguardando abertura':'Sem data definida',
    status:active?'open':ended?'closed':'waiting',
    minLevel:event?.minLevel??recent?.minLevel??configuredLevel};
  });
  const card=cards.find(c=>c.id===selected)||cards.find(c=>c.yours)||cards.find(c=>c.active)||cards[0];
  const canLeave=card.yours;
  const reason=permission(state,{current:data.current,maxPlayers:card.event?.maxPlayers,members:card.event?.members,minLevel:card.minLevel,open:card.active});
  return {cards,card,canLeave,reason,ready:isReady(state),canJoin:card.active&&!reason&&isReady(state)};
 }

 function dailyModel(data={},state={},selected,now=Date.now(),rules=root.MareSwordCompendium) {
  data=data||{};
  const daily=data.daily;
  const roster=Object.entries(rules?.rotation??{});
  const todayIndex=roster.findIndex(([,id])=>id===daily?.boss);
  const today=roster[todayIndex]?.[1];
  const bounds=Number.isFinite(stamp(daily?.opensAt))?span(daily.opensAt,daily.endsAt):rules?.openingHour!=null?rules.openingHour+'h – '+rules.closingHour+'h':'';
  const cards=roster.map(([day,id],i)=>{
   const isToday=id===today;
   const status=isToday?(daily.status==='open'&&stamp(daily.endsAt)>now?'open':daily.status==='waiting'?'waiting':'closed'):'other-day';
   const countdown=Number.isFinite(stamp(daily?.opensAt))&&todayIndex>=0;
   let distance=(i-todayIndex+roster.length)%roster.length;
   if(!distance&&status==='closed')distance=roster.length;
   const next=countdown?date.format(stamp(daily.opensAt)+distance*86400000):'';
   const opens=Number.isFinite(stamp(daily?.opensAt))?toTime(daily.opensAt):rules?.openingHour+'h';
   return {id,name:rules.bossNames[id],art:swordPortrait(id),accent:'gold',isToday,status,active:status==='open',
    label:status==='open'?'Disponível agora':status==='waiting'?'Libera às '+opens:status==='closed'?'Encerrado':'Próxima abertura',
    schedule:(isToday?'Hoje':days[day])+' · '+bounds,
    next:status==='closed'||status==='other-day'?next?days[day]+' ('+next+') às '+opens:'' :''};
  });
  const card=cards.find(c=>c.id===selected)||cards.find(c=>c.isToday)||cards[0];
  const inside=data.current?.mapId===arenaMap;
  const canLeave=inside&&card?.id===(data.current?.bossId??today);
  const reason=permission(state,{current:data.current,maxPlayers:daily?.maxPlayers,members:daily?.members,minLevel:daily?.minLevel,open:card?.active});
  return {cards,card,canLeave,reason,ready:isReady(state),canJoin:!!card?.active&&!reason&&isReady(state)};
 }

 function header(title,id,close,icon) {
  return '<header class="event-header"><h2 id="'+id+'">'+(icon?'<img src="'+icon+'" alt="">':'')+title+'</h2><button class="event-close" type="button" '+close+' aria-label="Fechar">×</button></header>';
 }
 function status(card) {
  return '<span class="event-state" data-status="'+card.status+'">'+escape(card.label)+'</span>';
 }
 function cardsMarkup(cards,selected,selector) {
  return '<div class="event-roster" aria-label="Chefes">'+cards.map(card=>
   '<button type="button" class="event-card" '+selector+'="'+escape(card.id)+'" data-accent="'+card.accent+'" data-status="'+card.status+'" aria-pressed="'+(card.id===selected)+'"'+(card.isToday?' aria-current="date"':'')+'>'
   +'<img src="'+card.art+'" alt="" decoding="async"><span class="event-card-content"><strong>'+escape(card.name)+'</strong><small>'+escape(card.next&&card.isToday?'Hoje · '+card.next:card.next||card.schedule)+'</small></span>'+status(card)+'</button>'
  ).join('')+'</div>';
 }
 function lootRow(image,label,odds) {
  return '<li><img src="'+image+'" alt="" loading="lazy" decoding="async"><span>'+escape(label)+'</span>'+(odds?'<strong>'+escape(odds)+'</strong>':'')+'</li>';
 }
 function weeklyLoot(r) {
  if(!r)return '';
  const items=[r.rankBChance>0&&lootRow(art.akuma,'Fragmento de Akuma no Mi · Rank B'),
   r.hakiChance*r.armamentShare>0&&lootRow(art.armament,'Fragmento de Haki do Armamento'),
   r.hakiChance*(1-r.armamentShare)>0&&lootRow(art.observation,'Fragmento de Haki da Observação')].filter(Boolean);
  return items.length?'<section class="event-rewards"><h3>Recompensas possíveis</h3><ul>'+items.join('')
   +'</ul><p>Sorteio individual por participante elegível. Entrega pelo Correio.</p></section>':'';
 }
 function swordLoot(rules) {
  const ranks=Object.entries(rules?.ranks??{});
  if(!ranks.length)return '';
  return '<section class="event-rewards"><h3>Fragmentos do Compêndio</h3><ul>'
   +lootRow(art.fragment,'Fragmentos de Espada','Ranks '+ranks[0][0]+'–'+ranks.at(-1)[0])
   +'</ul><p>Cause dano ou cure um aliado. Após a vitória, resgate os fragmentos pelo Correio.</p></section>';
 }
 function hero(card,location) {
  return '<div class="event-hero"><img src="'+card.art+'" alt="" decoding="async"><div class="event-hero-text"><h3>'+escape(card.name)+'</h3>'+(location?'<span>'+location+'</span>':'')+'</div></div>';
 }
 function info(card,minLevel,members,maxPlayers) {
  return '<div class="event-info">'+status(card)
   +(Number.isInteger(minLevel)?'<span>Nível '+number.format(minLevel)+'+</span>':'')
   +(Number.isInteger(maxPlayers)?'<span>'+number.format(members??0)+' / '+number.format(maxPlayers)+' vagas</span>':'')
   +'</div>';
 }
 function action(canLeave,canJoin,ready,joinAttr,leaveAttr,reason,label) {
  return '<div class="event-action"><p role="status" class="event-message" data-event-message>'+escape(reason)+'</p>'
   +'<button type="button" class="event-enter" '+(canLeave?leaveAttr:joinAttr)+' '+(canLeave&&ready||canJoin?'':'disabled')+'>'+label+'</button></div>';
 }
 function render(data,state,selected,now=Date.now()) {
  const m=weeklyModel(data,state,selected,now),c=m.card;
  const facts=c.occurrence?.openedAt?escape(c.schedule)+' · Brasília':escape(c.schedule);
  return header('BOSS SEMANAL','weeklyBossTitle','data-weekly-close','assets/ui/modes/weekly-boss.svg')
   +'<div class="event-layout">'+cardsMarkup(m.cards,c.id,'data-weekly-preview')
   +'<section class="event-details" data-accent="'+c.accent+'">'+hero(c,c.id==='akainu'?'Marineford':'')
   +'<div class="event-details-content"><div class="event-summary">'+info(c,c.minLevel,c.event?.members,c.event?.maxPlayers)
   +'<p class="event-schedule">'+facts+(c.active?' <span data-weekly-countdown="'+escape(c.event.endsAt)+'"></span>':'')+'</p></div>'
   +(c.id==='akainu'?weeklyLoot(data?.lootRules):'')
   +action(m.canLeave,m.canJoin,m.ready,'data-weekly-op="join" data-event="'+escape(c.event?.id)+'"','data-weekly-op="leave"',m.reason,m.canLeave?'Voltar ao porto':'Entrar no encontro')
   +'</div></section></div>';
 }
 function renderDaily(data,state,selected,now=Date.now(),rules=root.MareSwordCompendium) {
  const m=dailyModel(data,state,selected,now,rules),c=m.card;
  const title=header('Desafio das Sete Lâminas','swordEventTitle','data-sword-event-close','assets/ui/modes/seven-blades.svg');
  if(!c)return title+'<p class="event-empty">A agenda está indisponível.</p>';
  const daily=data?.daily;
  const schedule=(c.next||c.schedule)+' · Brasília';
  return title+'<div class="event-layout">'+cardsMarkup(m.cards,c.id,'data-sword-preview')
   +'<section class="event-details" data-accent="'+c.accent+'">'+hero(c,'Arena dos Espadachins')
   +'<div class="event-details-content">'+info(c,daily?.minLevel,c.isToday?daily?.members:null,c.isToday?daily?.maxPlayers:null)
   +'<p class="event-schedule">'+escape(schedule)+(c.active?' <span data-sword-event-countdown="'+escape(daily.endsAt)+'"></span>':'')+'</p>'
   +swordLoot(rules)+action(m.canLeave,m.canJoin,m.ready,'data-sword-event-join','data-sword-event-join data-event-leave',m.reason,m.canLeave?'Voltar ao porto':'Entrar na arena')
   +'</div></section></div>';
 }
 const fields=[['spawn.x','Nascimento X',0,100000],['spawn.y','Nascimento Y',0,100000],['entry.x','Entrada X',0,100000],['entry.y','Entrada Y',0,100000],['maxPlayers','Lotação',1,16],['minLevel','Nível mínimo',1,1000],['durationMinutes','Duração (minutos)',1,180],['profile.speed','Velocidade',1,240],['profile.reach','Alcance do soco',24,160],['profile.attackSec','Intervalo do soco (s)',1,30],['profile.aoeCooldown','Recarga da área (s)',4,120],['profile.aoeWindup','Aviso da área (s)',.8,5],['profile.level','Nível do chefe',1,1000],['profile.leash','Limite de perseguição',240,1200]];
 const get=(o,key)=>key.split('.').reduce((v,k)=>v?.[k],o);
 function renderAdmin(data,state,selected) {
  const m=adminModel(data,state,selected);
  if(!m.admin)return '';
  const d=m.ready?'':' disabled';
  let html=header('Operação de eventos','weeklyBossAdminTitle','data-weekly-admin-close')
   +'<div class="event-admin-content"><p role="status" data-event-message></p><label>Almirante <select data-weekly-admiral'+d+'>'
   +admirals.map(b=>'<option value="'+escape(b.id)+'"'+(b.id===m.boss.id?' selected':'')+'>'+escape(b.name)+'</option>').join('')
   +'</select></label><div class="event-admin-actions">'
   +'<button type="button" data-weekly-op="test"'+(m.canTest?'':' disabled')+'>Teste privado</button>'
   +'<button type="button" data-weekly-op="activate"'+(m.canActivate?'':' disabled')+'>Abrir '+escape(m.boss.name)+' em Marineford</button></div>';
  if(!data.marinefordReady)html+='<p>Marineford indisponível.</p>';
  if(!m.config?.balanceApproved)html+='<p>Salve a configuração de '+escape(m.boss.name)+' antes de testar ou abrir.</p>';
  const balance=data.balance;
  if(balance)html+='<p>Vida '+number.format(balance.hp)+' · Defesa física '+number.format(balance.defense)
   +' · Defesa mágica '+number.format(balance.magicDefense)+' · Ataque-base '+number.format(100*balance.attackFraction)+'% da vida máxima do alvo.</p>';

  for(const e of m.events) {
   html+='<div class="event-admin-actions"><strong>'+(e.mode==='test'?'Ensaio privado · ':'')+escape(admiralName(e))+'</strong>';
   if(e.id===m.current?.id)html+='<button type="button" data-weekly-op="leave"'+d+'>Voltar ao porto</button>';
   else if(e.mode==='test')html+='<button type="button" data-weekly-op="join" data-event="'+escape(e.id)+'"'+d+'>Entrar no ensaio</button>';
   html+='<button type="button" data-weekly-op="cancel" data-event="'+escape(e.id)+'" data-version="'+escape(e.version)+'"'+d+'>Encerrar encontro</button></div>';
  }
  html+='<details><summary>Configuração do próximo evento</summary><form id="weeklyBossConfig" data-revision="'+escape(data.revision||1)+'"><fieldset'+(m.canConfigure?'':' disabled')+'><div class="weekly-fields">';
  for(const [key,label,min,max] of fields)
   html+='<label>'+label+'<input name="'+key+'" type="number" min="'+min+'" max="'+max+'" step="'+(['maxPlayers','minLevel','durationMinutes','profile.level'].includes(key)?'1':'any')+'" required value="'+escape(get(m.config??data.defaults?.[m.boss.id],key)??'')+'"></label>';
  return html+'</div><label class="weekly-confirm"><input type="checkbox" name="balanceApproved" required'+(m.config?.balanceApproved?' checked':'')+'>Confirmo que o balanceamento foi revisado.</label><button type="submit" data-weekly-op="configure">Salvar configuração</button></fieldset></form></details></div>';
 }
 const API={model:weeklyModel,render,dailyModel,renderDaily,renderAdmin};
 root.MareWeeklyBossUI=API;
 if(typeof module==='object')module.exports=API;
 if(!root.document)return;

 function boot() {
  const doc=root.document,menu=doc.getElementById('modesQuickMenu');
  const weeklyButton=doc.getElementById('weeklyBossMenu'),swordButton=doc.getElementById('swordEventMenu');
  if(!menu||!weeklyButton||!swordButton)return;
  const makeDialog=(id,label)=>{
   const dialog=doc.createElement('dialog');
   dialog.id=id;
   dialog.className='event-dialog';
   dialog.setAttribute('aria-labelledby',label);
   doc.body.append(dialog);
   return dialog;
  };
  const weekly=makeDialog('weeklyBossDialog','weeklyBossTitle');
  const swords=makeDialog('swordEventDialog','swordEventTitle');
  const admin=makeDialog('weeklyBossAdminDialog','weeklyBossAdminTitle');
  const captain=doc.getElementById('captainQuickMenu');
  const adminButton=doc.createElement('button');
  adminButton.id='weeklyBossAdminMenu';
  adminButton.type='button';
  adminButton.hidden=true;
  adminButton.setAttribute('role','menuitem');
  adminButton.innerHTML='<span class="character-section-glyph" aria-hidden="true">⚓</span><span>Operação de eventos</span>';
  captain?.append(adminButton);
  const hud=doc.createElement('aside');
  hud.id='weeklyBossHUD';
  hud.hidden=true;
  hud.setAttribute('aria-label','Vida do chefe');
  doc.body.append(hud);
  const dialogs=[weekly,swords,admin];
  const selection=new Map(),signatures=new Map(),messages=new Map();
  let session=null,unsubscribe,locked=false,dirty=false,timer=null,nextRead=0,clock=0,clockAt=0,clockStamp=null;
  const data=()=>session?.data?.online?.weeklyBoss??null;
  const state=()=>{
   const online=session?.data?.online;
   return {available:session?.available===true,controlled:session?.controlled===true,
    busy:locked||session?.busy,pending:!!session?.pending,
    mapId:online?.world?.mapId,hp:online?.battle?.hp,level:online?.state?.level};
  };
  const now=()=>clock?clock+performance.now()-clockAt:Date.now();
  function renderDialog(dialog,html) {
   const template=doc.createElement('template');
   template.innerHTML=html;
   const content=doc.importNode(template.content,true);
   const key=img=>{
    const role=img.closest('.event-card')?'card':img.closest('.event-hero')?'hero':'detail';
    return role+'\0'+img.getAttribute('src');
   };
   const existing=new Map([...dialog.querySelectorAll('img')].map(img=>[key(img),img]));
   for(const img of content.querySelectorAll('img')) {
    const reused=existing.get(key(img));
    if(reused){existing.delete(key(img));img.replaceWith(reused);}
   }
   dialog.replaceChildren(content);
  }
  function refresh() {
   const d=data(),s=state();
   const serverStamp=d?.serverNow??d?.daily?.serverNow;
   if(serverStamp!==clockStamp&&Number.isFinite(stamp(serverStamp))){
    clockStamp=serverStamp;clock=stamp(serverStamp);clockAt=performance.now();
   }
   weeklyButton.hidden=!d;
   swordButton.hidden=!d?.daily;
   adminButton.hidden=!d?.canManage;
   if(admin.open&&!d?.canManage)admin.close();
   const active=d?.current,inside=active?.mapId===arenaMap;
   hud.hidden=!active;
   hud.classList.toggle('sword-event-combat-hud',inside);
   if(active){
    const b=active.boss||{},hp=Math.max(0,Number(b.hp)||0),max=Math.max(1,Number(b.maxHp)||1);
    const portrait=inside&&Object.hasOwn(root.MareSwordCompendium?.bossNames??{},d.daily?.boss)?'<img class="sword-event-combat-portrait" src="'+swordPortrait(d.daily.boss)+'" alt="">':'';
    const title='<strong>'+escape(b.name)+' <small>'+(inside?'SETE LÂMINAS':active.mode==='test'?'TESTE PRIVADO':'BOSS SEMANAL')+'</small></strong>';
    const life='<div class="weekly-life"><i style="width:'+Math.min(100,hp/max*100)+'%"></i></div><span>'+number.format(hp)+' / '+number.format(max)+'</span>';
    const html=portrait?portrait+'<div class="sword-event-combat-life">'+title+life+'</div>':title+life;
    if(html!==signatures.get(hud)){hud.innerHTML=html;signatures.set(hud,html);}
   }
   for(const dialog of dialogs) {
    if(!dialog.open)continue;
    const html=dialog===weekly?render(d,s,selection.get(dialog),now())
     :dialog===swords?renderDaily(d,s,selection.get(dialog),now()):renderAdmin(d,s,selection.get(admin));
    if(dialog===admin&&dirty) {
     const fieldset=admin.querySelector('fieldset');
     if(fieldset)fieldset.disabled=!adminModel(d,s,selection.get(admin)).canConfigure;
    } else if(signatures.get(dialog)!==html) {
     const focus=doc.activeElement?.dataset;
     const selectedKey=focus?.weeklyPreview??focus?.swordPreview;
     const editOpen=dialog===admin&&dialog.querySelector('details')?.open;
     const focusAdmiral=dialog===admin&&doc.activeElement?.matches('[data-weekly-admiral]');
     const roster=dialog.querySelector('.event-roster'),x=roster?.scrollLeft||0,y=roster?.scrollTop||0;
     renderDialog(dialog,html);
     signatures.set(dialog,html);
     if(editOpen)dialog.querySelector('details')?.setAttribute('open','');
     if(focusAdmiral)dialog.querySelector('[data-weekly-admiral]')?.focus({preventScroll:true});
     dialog.querySelector('.event-roster')?.scrollTo(x,y);
     if(selectedKey)[...dialog.querySelectorAll('[data-weekly-preview],[data-sword-preview]')]
      .find(e=>e.dataset.weeklyPreview===selectedKey||e.dataset.swordPreview===selectedKey)?.focus({preventScroll:true});
    }
    const message=dialog.querySelector('[data-event-message]');
    if(message&&messages.get(dialog))message.textContent=messages.get(dialog);
   }
   tickCountdowns();
  }
  function connect() {
   if(session===root.MareGameSession)return;
   unsubscribe?.();
   session=root.MareGameSession??null;
   clock=0;clockStamp=null;
   unsubscribe=session?.subscribe(refresh);
   refresh();
  }
  function tickCountdowns() {
   for(const el of doc.querySelectorAll('dialog[open] [data-weekly-countdown],dialog[open] [data-sword-event-countdown]')) {
    const seconds=Math.max(0,Math.ceil((stamp(el.dataset.weeklyCountdown??el.dataset.swordEventCountdown)-now())/1000));
    el.textContent='· Encerra em '+Math.floor(seconds/60)+' min '+String(seconds%60).padStart(2,'0')+' s';
   }
  }
  function tick() {
   refresh();
   const d=data(),daily=d?.daily;
   const weeklyExpired=(d?.events??[]).some(e=>official(e)&&stamp(e.endsAt)<=now());
   const boundary=daily?.status==='waiting'?daily.opensAt:daily?.endsAt;
   const crossed=swords.open&&['open','waiting'].includes(daily?.status)&&stamp(boundary)<=now();
   if(!session||locked||session.busy||doc.hidden)return;
   if(!dialogs.some(dialog=>dialog.open))return;
   if(performance.now()<nextRead)return;
   nextRead=performance.now()+((weeklyExpired||crossed)?3500:15000);
   read();
  }
  function read() {
   return session?.read().catch(()=>{});
  }
  function open(dialog,quick,trigger) {
   connect();
   quick?.classList.add('hidden');
   trigger?.setAttribute('aria-expanded','false');
   messages.delete(dialog);selection.delete(dialog);signatures.delete(dialog);
   if(dialog===admin)dirty=false;
   dialog.showModal();
   refresh();
   nextRead=performance.now()+2500;
   if(timer===null)timer=root.setInterval(tick,500);
   read();
  }
  const modesTrigger=doc.getElementById('modesMenuTrigger');
  const captainTrigger=doc.getElementById('captainMenuTrigger');
  weeklyButton.addEventListener('click',()=>open(weekly,menu,modesTrigger));
  swordButton.addEventListener('click',()=>open(swords,menu,modesTrigger));
  adminButton.addEventListener('click',()=>{if(data()?.canManage)open(admin,captain,captainTrigger);});
  for(const dialog of dialogs)dialog.addEventListener('close',()=>{
   if(dialog===admin)dirty=false;
   if(!dialogs.some(d=>d.open)&&timer!==null){root.clearInterval(timer);timer=null;}
   (dialog===admin?captainTrigger:modesTrigger)?.focus();
  });
  const errors={sword_event_closed:'A arena está encerrada ou ainda não abriu.',weekly_boss_event_unavailable:'Este encontro não está mais disponível.',
   weekly_boss_level_required:'O personagem ainda não atingiu o nível exigido.',weekly_boss_return_to_port:'Volte ao Porto das Correntes para entrar.',
   weekly_boss_full:'A arena está lotada.',weekly_boss_operator_required:'Esta conta não administra eventos.',
   weekly_boss_map_unavailable:'Marineford indisponível.',weekly_boss_balance_required:'Revise o balanceamento antes da abertura.',
   weekly_boss_config_required:'Salve a configuração do almirante selecionado.',weekly_boss_config_invalid:'Confira a configuração.',weekly_boss_spawn_blocked:'Local ou alcance inválido.',
   weekly_boss_revision_conflict:'A configuração mudou. Atualize o painel.',
   control_required:'Retome o controle do personagem.',pending_command:'Aguarde a confirmação da operação.',weekly_boss_busy:'O evento está ocupado. Tente novamente.'};
  function publicEntry(dialog,payload) {
   if(payload.op==='leave')return true;
   const available={...state(),busy:false},d=data(),selected=selection.get(dialog);
   if(dialog===weekly) {
    const m=weeklyModel(d,available,selected,now());
    return m.canJoin&&m.card.event.id===payload.eventId;
   }
   return dailyModel(d,available,selected,now()).canJoin;
  }
  async function send(dialog,payload,{close=false,revalidate=false}={}) {
   if(!isReady(state()))return;
   const activeSession=session;
   locked=true;
   dirty=false;
   messages.delete(dialog);
   refresh();
   try {
    if(revalidate){
     await activeSession.read();
     if(session!==activeSession)return;
     if(!publicEntry(dialog,payload))throw {code:payload.op==='join-swords'?'sword_event_closed':'weekly_boss_event_unavailable'};
    }
    await activeSession.command('weeklyBoss.execute',payload);
    if(close)dialog.close();
    read();
   } catch(err) {
    messages.set(dialog,errors[err.code]||'Não foi possível concluir. Confira a conexão e tente novamente.');
    read();
   } finally {
    locked=false;signatures.delete(dialog);refresh();
   }
  }
  weekly.addEventListener('click',e=>{
   const button=e.target.closest('button');
   if(!button||button.disabled)return;
   if(button.hasAttribute('data-weekly-close'))return weekly.close();
   if(button.dataset.weeklyPreview){
    selection.set(weekly,button.dataset.weeklyPreview);messages.delete(weekly);refresh();return;
   }
   const op=button.dataset.weeklyOp;
   if(op==='join')void send(weekly,{op,eventId:button.dataset.event},{close:true,revalidate:true});
   if(op==='leave')void send(weekly,{op},{close:true});
  });
  swords.addEventListener('click',e=>{
   const button=e.target.closest('button');
   if(!button||button.disabled)return;
   if(button.hasAttribute('data-sword-event-close'))return swords.close();
   if(button.dataset.swordPreview){
    selection.set(swords,button.dataset.swordPreview);messages.delete(swords);refresh();return;
   }
   if(button.hasAttribute('data-sword-event-join')) {
    const op=button.hasAttribute('data-event-leave')?'leave':'join-swords';
    void send(swords,{op},{close:true,revalidate:op==='join-swords'});
   }
  });
  admin.addEventListener('input',e=>{if(e.target.closest('#weeklyBossConfig'))dirty=true;});
  admin.addEventListener('change',e=>{
   if(!e.target.matches('[data-weekly-admiral]')||!admirals.some(b=>b.id===e.target.value))return;
   selection.set(admin,e.target.value);
   dirty=false;
   messages.delete(admin);
   refresh();
  });
  admin.addEventListener('click',e=>{
   const button=e.target.closest('button');
   if(!button||button.disabled)return;
   if(button.hasAttribute('data-weekly-admin-close'))return admin.close();
   const op=button.dataset.weeklyOp,m=adminModel(data(),state(),selection.get(admin));
   if(!m.admin||!m.ready)return;
   if(op==='activate'&&m.canActivate&&root.confirm('Abrir '+m.boss.name+' em Marineford?'))
    void send(admin,{op,bossId:m.boss.id,revision:data().revision});
   if(op==='test'&&m.canTest)void send(admin,{op,bossId:m.boss.id},{close:true});
   if(op==='join')void send(admin,{op,eventId:button.dataset.event},{close:true});
   if(op==='leave')void send(admin,{op},{close:true});
   if(op==='cancel'&&root.confirm('Encerrar este encontro e retornar os participantes ao porto?'))
    void send(admin,{op,eventId:button.dataset.event,version:Number(button.dataset.version)});
  });
  admin.addEventListener('submit',e=>{
   if(e.target.id!=='weeklyBossConfig')return;
   e.preventDefault();
   const m=adminModel(data(),state(),selection.get(admin));
   if(!m.canConfigure||!e.target.reportValidity())return;
   const form=new FormData(e.target),config={mapId:'marineford',spawn:{},entry:{},profile:{},balanceApproved:form.get('balanceApproved')==='on'};
   for(const [name] of fields) {
    const [group,field]=name.split('.'),n=Number(form.get(name));
    if(field)config[group][field]=n;else config[group]=n;
   }
   void send(admin,{op:'configure',bossId:m.boss.id,revision:Number(e.target.dataset.revision),config});
  });
  doc.addEventListener('visibilitychange',()=>{if(!doc.hidden&&dialogs.some(d=>d.open))read();});
  doc.getElementById('modesMenuTrigger')?.addEventListener('click',connect);
  captainTrigger?.addEventListener('click',connect);
  root.addEventListener('pagehide',()=>{
   if(timer!==null)root.clearInterval(timer);
   timer=null;
   unsubscribe?.();
   unsubscribe=null;
   session=null;
  });
  root.addEventListener('pageshow',()=>{
   connect();
   if(timer===null&&dialogs.some(d=>d.open)){timer=root.setInterval(tick,500);read();}
  });
  connect();
  root.queueMicrotask(connect);
 }
 if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})(globalThis);
