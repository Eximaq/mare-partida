/* Presentation only. The authenticated server owns activation, combat and rewards. */
(function(root){
 'use strict';
 const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const number=value=>Math.max(0,Math.round(Number(value)||0)).toLocaleString('pt-BR');
 function model(data={},state={}){
  data=data||{};const events=Array.isArray(data.events)?data.events:[],ready=state.available===true&&state.controlled===true&&!state.busy&&!state.pending,admin=data.canManage===true;
  return {visible:admin||events.length>0||!!data.current||!!data.rewardPendingCycle,ready,admin,events,current:data.current||null,canConfigure:ready&&admin,canTest:ready&&admin&&!data.current,canActivate:ready&&admin&&data.marinefordReady===true&&data.config?.balanceApproved===true&&!events.some(e=>e.mode==='official'&&e.status==='active')};
 }
 const fields=[['spawn.x','Nascimento X',0,100000],['spawn.y','Nascimento Y',0,100000],['entry.x','Entrada X',0,100000],['entry.y','Entrada Y',0,100000],['maxPlayers','Lotação',1,16],['minLevel','Nível mínimo',1,1000],['durationMinutes','Duração (minutos)',1,180],['profile.hp','Vida',1,1000000000],['profile.attack','Ataque',1,1000000],['profile.defense','Defesa física',0,1000000],['profile.magicDefense','Defesa mágica',0,1000000],['profile.speed','Velocidade',1,240],['profile.reach','Alcance do soco',24,160],['profile.attackSec','Intervalo do soco (s)',1,30],['profile.aoeCooldown','Recarga da área (s)',4,120],['profile.aoeRadius','Raio da área',48,240],['profile.aoeWindup','Aviso da área (s)',.8,5],['profile.aoeMultiplier','Multiplicador da área',.1,10],['profile.level','Nível do chefe',1,1000],['profile.leash','Limite de perseguição',240,1200]];
 const get=(o,key)=>key.split('.').reduce((v,k)=>v?.[k],o);
 function render(data={},state={}){
  data=data||{};const m=model(data,state),disabled=m.ready?'':' disabled';
  let html='<header class="weekly-heading"><div><small>EVENTO SEMANAL</small><h2 id="weeklyBossTitle">Akainu</h2><p>Marineford · vida compartilhada</p></div><button type="button" data-weekly-close aria-label="Fechar evento">×</button></header><p class="weekly-message" role="status" data-weekly-message></p>';
  if(!state.available)html+='<p>Conecte-se ao servidor para consultar o evento.</p>';
  else if(!m.events.length&&!m.current)html+='<p class="weekly-closed">Evento fechado. Nenhum chefe está disponível nos mapas.</p>';
  for(const e of m.events){const isCurrent=m.current?.id===e.id;html+='<article class="weekly-event"><h3>'+(e.mode==='test'?'Ensaio privado · sem recompensas':'Akainu · Boss semanal')+'</h3><p>'+number(e.members)+' / '+number(e.maxPlayers)+' participantes · nível '+number(e.minLevel)+'+</p><p data-weekly-countdown="'+escape(e.endsAt)+'">Horário informado pelo servidor</p><p>Recompensas sem configuração; nenhum prêmio é criado pelo navegador.</p><button type="button" data-weekly-op="'+(isCurrent?'leave':'join')+'" data-event="'+escape(e.id)+'"'+disabled+(m.current&&!isCurrent?' disabled':'')+'>'+(isCurrent?'Sair do encontro':'Entrar no encontro')+'</button>'+(m.admin?'<button type="button" class="weekly-danger" data-weekly-op="cancel" data-event="'+escape(e.id)+'" data-version="'+number(e.version).replace(/\./g,'')+'"'+disabled+'>Encerrar encontro</button>':'')+'</article>';}
  if(m.current&&!m.events.some(e=>e.id===m.current.id))html+='<p>Encontro '+(m.current.status==='won'?'concluído':'encerrado')+'.</p><button type="button" data-weekly-op="leave"'+disabled+'>Voltar ao porto</button>';
  if(data.rewardPendingCycle)html+='<p class="weekly-note">Participação elegível registrada no ciclo '+escape(data.rewardPendingCycle)+'. A definição das recompensas continua pendente.</p>';
  if(m.admin){
   html+='<section class="weekly-admin"><h3>Controle do evento</h3><p>'+(data.marinefordReady?'Marineford disponível no servidor.':'Marineford ainda não está disponível. A abertura oficial está bloqueada.')+'</p><div class="weekly-actions"><button type="button" data-weekly-op="test"'+(m.canTest?'':' disabled')+'>Teste privado</button><button type="button" data-weekly-op="activate"'+(m.canActivate?'':' disabled')+'>Abrir evento em Marineford</button></div><details><summary>Configuração do próximo evento</summary><p>Salvar a configuração não abre o evento. O servidor valida posição, alcance e permissões.</p><form id="weeklyBossConfig" data-revision="'+escape(data.revision||1)+'"><fieldset'+(m.canConfigure?'':' disabled')+'><div class="weekly-fields">';
   for(const [key,label,min,max] of fields)html+='<label>'+label+'<input name="'+key+'" type="number" min="'+min+'" max="'+max+'" step="'+(['profile.aoeWindup','profile.aoeMultiplier','profile.attackSec'].includes(key)?'0.1':'1')+'" required value="'+escape(get(data.config,key)??'')+'"></label>';
   html+='</div><label class="weekly-confirm"><input type="checkbox" name="balanceApproved" required'+(data.config?.balanceApproved?' checked':'')+'>Confirmo que o balanceamento foi revisado.</label><button type="submit" data-weekly-op="configure">Salvar configuração</button></fieldset></form></details></section>';
  }
  return html;
 }
 const API={model,render};root.MareWeeklyBossUI=API;if(typeof module==='object')module.exports=API;
 if(!root.document)return;
 function boot(){
  const doc=root.document,menu=doc.getElementById('modesQuickMenu');if(!menu)return;
  const button=doc.createElement('button');button.id='weeklyBossMenu';button.type='button';button.setAttribute('role','menuitem');button.textContent='Boss semanal · Akainu';button.hidden=true;menu.append(button);
  const dialog=doc.createElement('dialog');dialog.id='weeklyBossDialog';dialog.setAttribute('aria-labelledby','weeklyBossTitle');doc.body.append(dialog);
  const hud=doc.createElement('aside');hud.id='weeklyBossHUD';hud.hidden=true;hud.setAttribute('aria-label','Vida compartilhada de Akainu');doc.body.append(hud);
  let session=null,unsubscribe=null,dirty=false,locked=false,key='',clock=0,clockAt=0,lastNotice='',message='';
  const data=()=>session?.data?.online?.weeklyBoss||null,state=()=>({available:session?.available===true,controlled:session?.controlled===true,busy:locked||session?.busy,pending:!!session?.pending});
  const close=()=>{dialog.close();dirty=false;button.focus();};
  function refresh(force=false){
   const d=data(),v=model(d,state());button.hidden=!v.visible;
   if(d?.serverNow){clock=Date.parse(d.serverNow);clockAt=performance.now();}
   const active=d?.current;hud.hidden=!active;
   if(active){const b=active.boss||{},percent=Math.min(100,Math.max(0,b.hp/Math.max(1,b.maxHp)*100));hud.innerHTML='<strong>Akainu <small>'+(active.mode==='test'?'TESTE PRIVADO':'BOSS SEMANAL')+'</small></strong><div class="weekly-life"><i style="width:'+percent+'%"></i></div><span>'+number(b.hp)+' / '+number(b.maxHp)+'</span>';}
   if(!v.visible&&dialog.open){dialog.close();dirty=false;return;}
   const signature=JSON.stringify([d?.canManage,d?.revision,d?.config,d?.marinefordReady,d?.rewardPendingCycle,d?.current?.id,d?.current?.status,(d?.events||[]).map(e=>[e.id,e.version,e.status,e.members]),v.ready]);
   if(dialog.open&&(force||signature!==key)&&!dirty){dialog.innerHTML=render(d,state());key=signature;const status=dialog.querySelector('[data-weekly-message]');if(status)status.textContent=message;}
   const live=v.events.find(e=>e.mode==='official');if(live&&live.id!==lastNotice){lastNotice=live.id;button.setAttribute('aria-label','Evento Akainu disponível em Marineford');}
   if(dirty){const fieldset=dialog.querySelector('fieldset');if(fieldset)fieldset.disabled=!v.canConfigure;}
  }
  button.addEventListener('click',()=>{menu.classList.add('hidden');doc.getElementById('modesMenuTrigger')?.setAttribute('aria-expanded','false');dirty=false;message='';dialog.showModal();refresh(true);});
  dialog.addEventListener('cancel',()=>{dirty=false;});dialog.addEventListener('close',()=>{dirty=false;});
  dialog.addEventListener('input',e=>{if(e.target.closest('#weeklyBossConfig'))dirty=true;});
  const errors={weekly_boss_operator_required:'Esta conta não administra eventos.',weekly_boss_map_unavailable:'Marineford não está disponível.',weekly_boss_balance_required:'Revise o balanceamento antes da abertura.',weekly_boss_config_invalid:'Confira os valores da configuração.',weekly_boss_spawn_blocked:'O local ou o alcance informado não é válido no mapa.',weekly_boss_revision_conflict:'Outro administrador alterou o evento. Reabra o painel.',weekly_boss_event_unavailable:'Este encontro já foi encerrado ou não está disponível.',control_required:'Retome o controle do personagem.',pending_command:'Há uma operação pendente. Aguarde sua confirmação.',weekly_boss_busy:'O evento está ocupado. Tente novamente.'};
  async function send(payload){
   if(!model(data(),state()).ready)return;locked=true;dirty=false;message='Enviando ao servidor…';refresh(true);
   try{await session.command('weeklyBoss.execute',payload);await session.read();message='Operação confirmada pelo servidor.';}
   catch(e){message=errors[e.code]||'Não foi possível concluir a operação. Confira a conexão e o estado do evento.';}
   finally{locked=false;refresh(true);}
  }
  dialog.addEventListener('click',e=>{
   const target=e.target.closest('button');if(!target||target.disabled)return;if(target.hasAttribute('data-weekly-close'))return close();
   const op=target.dataset.weeklyOp;if(!op||op==='configure')return;const v=model(data(),state());if(!v.ready)return;
   let payload={op};if(op==='join')payload.eventId=target.dataset.event;
   if(op==='activate'){if(!v.canActivate||!root.confirm('Abrir o evento oficial do Akainu para os jogadores?'))return;payload.revision=data().revision;}
   if(op==='test'&&!v.canTest)return;
   if(op==='cancel'){if(!v.admin||!root.confirm('Encerrar este encontro e retornar os participantes ao porto?'))return;payload.eventId=target.dataset.event;payload.version=Number(target.dataset.version);}
   void send(payload).then(()=>{if(['test','join','leave','cancel'].includes(op)&&!message.startsWith('Não')&&data()?.current?.id)close();});
  });
  dialog.addEventListener('submit',e=>{if(e.target.id!=='weeklyBossConfig')return;e.preventDefault();if(!model(data(),state()).canConfigure||!e.target.reportValidity())return;const form=new FormData(e.target),config={mapId:'marineford',spawn:{},entry:{},profile:{},balanceApproved:form.get('balanceApproved')==='on'};for(const [name] of fields){const parts=name.split('.'),n=Number(form.get(name));if(parts.length===1)config[name]=n;else config[parts[0]][parts[1]]=n;}void send({op:'configure',revision:Number(e.target.dataset.revision),config});});
  const timer=root.setInterval(()=>{
   if(session!==root.MareGameSession){unsubscribe?.();session=root.MareGameSession;unsubscribe=session?.subscribe(()=>refresh());refresh(true);}
   if(dialog.open&&clock)for(const element of dialog.querySelectorAll('[data-weekly-countdown]')){const seconds=Math.max(0,Math.ceil((Date.parse(element.dataset.weeklyCountdown)-clock-(performance.now()-clockAt))/1000));element.textContent='Encerra em '+Math.floor(seconds/60)+' min '+seconds%60+' s';}
  },500);
  root.addEventListener('pagehide',()=>{root.clearInterval(timer);unsubscribe?.();},{once:true});
 }
 if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})(globalThis);
