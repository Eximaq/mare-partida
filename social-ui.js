/* The existing Social menu, modal and port chat host all four online views. */
(function (root) {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const tabs = {friends:'Amigos',messages:'Mensagens',mail:'Correio',trade:'Trocas'};
  const icons = {friends:'assets/ui/social/party.png',messages:'assets/ui/port-chat/send.png',mail:'assets/ui/hud-expedition/contract.png',trade:'assets/ui/inventory-final/icons/equipment.png'};
  const badgeKey = {friends:'friendRequests',mail:'pending',trade:'tradeInvites'};
  const reasons = {
    social_unavailable:'O servidor ainda não disponibiliza o Social.', social_contact_blocked:'Contato bloqueado.',
    contact_blocked:'Contato bloqueado.', friend_exists:'A amizade já existe.', friend_request_pending:'Já existe uma solicitação.',
    friend_already_added:'A amizade já existe.', friend_request_received:'Há uma solicitação desse jogador para aceitar.', friend_rate_limited:'Limite de solicitações atingido. Aguarde antes de tentar novamente.', message_friend_required:'Adicione este jogador como amigo para começar uma conversa.', friend_request_not_found:'A solicitação não está mais disponível.', social_rate_limited:'Aguarde um pouco antes de enviar novamente.',
    message_rate_limited:'Você enviou mensagens muito rápido. Aguarde um pouco.', friend_required:'Envie uma solicitação de amizade primeiro.',
    party_not_joined:'Crie ou entre em um grupo primeiro.', party_leader_required:'Somente o líder pode convidar.', party_already_joined:'Este jogador já tem um grupo.', party_activity_active:'Encerre a atividade do grupo para convidar.', party_player_unavailable:'Jogador offline ou em atividade individual.', party_invite_pending:'Convite já enviado.', crew_invite_pending:'Convite já enviado.', crew_already_joined:'Já pertence a uma tripulação.', party_full:'O grupo já tem quatro jogadores.', party_not_leader:'Somente o líder pode convidar.', party_target_busy:'Este jogador já tem um grupo.',
    crew_full:'A tripulação atingiu a capacidade.', crew_forbidden:'Sem permissão para convidar.', crew_level_required:'O nível não atende aos requisitos.',
    crew_entry_blocked:'O prazo para entrar em outra tripulação ainda não terminou.', crew_already_member:'Já pertence a uma tripulação.',
    trade_offer_changed:'A oferta mudou. Revise a nova versão.', trade_stale_offer:'A oferta mudou. Revise a nova versão.',
    trade_inventory_full:'Não há espaço para concluir a troca. Nenhum item mudou de dono.', trade_busy:'Já existe uma negociação em andamento.',
    trade_peer_busy:'O outro jogador está concluindo uma ação. Tente novamente.', trade_peer_offline:'O outro jogador precisa estar online.', trade_empty:'Inclua pelo menos um item antes de confirmar.', trade_offers_unlocked:'Os dois jogadores precisam travar as ofertas antes de confirmar.', trade_item_ineligible:'Este item não pode ser negociado.', trade_already_active:'Um dos jogadores já está em uma troca.', trade_closed:'A sessão foi encerrada. Confira o histórico.', trade_target_missing:'Jogador não encontrado ou nome ambíguo.', mail_reward_pending:'Resgate os anexos antes de arquivar.', trade_expired:'O prazo da negociação terminou.', trade_target_offline:'Este jogador não está online.', trade_target_not_found:'Jogador não encontrado.',
    trade_unavailable:'Trocas estão indisponíveis no momento.', trade_item_reserved:'Este item está reservado em uma negociação.',
    inventory_full:'A mochila está cheia. As entregas continuam no Correio.', state_version_conflict:'O personagem foi atualizado. Revise e tente novamente.',
    control_required:'Assuma o controle do personagem nesta aba.', control_conflict:'O personagem está sob controle de outra sessão.',
    pending_command:'Há uma ação aguardando reconciliação com o servidor.',
  };
  const errorMessage = error => reasons[error?.code] || 'Não foi possível concluir a ação. Confira o estado atualizado e tente novamente.';
  const stamp = date => {
    const d=new Date(date??'');if(!Number.isFinite(+d))return '—';
    const time=d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
    return (d.toDateString()===new Date().toDateString()?'Hoje':d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}))+', '+time;
  };
  const status=p=>p.online?'Online':p.lastActivity?'Última atividade: '+stamp(p.lastActivity):'Presença indisponível';
  const attr=(key,value)=>' '+key+'="'+esc(value)+'"';
  // Original inline vectors for negotiation controls; item artwork remains canonical.
  const tradeIcons={
    exchange:'<path d="M4 7h15m-4-4 4 4-4 4M20 17H5m4-4-4 4 4 4"/>',
    edit:'<path d="m14 5 5 5M4 20l5-1L20 8a2 2 0 0 0-5-5L4 14Z"/>',
    lock:'<rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/>',
    check:'<path d="m5 12 4 4L19 6"/>',
    close:'<path d="m6 6 12 12M18 6 6 18"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    bag:'<rect x="4" y="7" width="16" height="14" rx="3"/><path d="M8 7V5a4 4 0 0 1 8 0v2M4 12h16m-9-2v4h2v-4"/>'
  };
  const tradeIcon=name=>'<svg class="trade-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+tradeIcons[name]+'</svg>';
  const tradeActionIcon={'trade-lock':'lock','trade-confirm':'check','trade-accept':'check','trade-cancel':'close','trade-decline':'close','offer-close':'close'};
  const button=(label,action,id='',opts={})=>'<button type="button" class="social-button'+(opts.primary?' social-primary':'')+'"'+attr('data-social-action',action)+attr('data-social-id',id)+(opts.disabled?' disabled':'')+(opts.title?attr('title',opts.title):'')+(opts.label?attr('aria-label',opts.label):'')+'>'+(tradeActionIcon[action]?tradeIcon(tradeActionIcon[action]):'')+esc(label)+'</button>';
  const blank=text=>'<p class="social-empty">'+esc(text)+'</p>';
  const sections = [
    ['friends','Amigos','Solicitações e lista de amigos.'],
    ['mail','Correio','Entregas e recompensas oficiais.'],
    ['trade','Trocas','Negocie itens com outro jogador.'],
  ];
  const menu=()=>sections.map(([id,label,hint])=>'<button type="button" role="menuitem" data-social-open="'+id+'"><img src="'+icons[id]+'" alt="" draggable="false"><span><b>'+label.toUpperCase()+'</b><small>'+hint+'</small></span><span class="social-badge" data-social-badge="'+id+'" hidden></span></button>').join('');
  function create(o) {
    let view='',viewEpoch=0,model=null,signature='',panelPending=false,badgePending=false,threadPending=false,mutating=false,badges={},statusText='',failed=false;
    let search='',friendsFilter='',mailTab='pending',mailPages=[],target=null,thread=null,privateOn=false,oldestAvailable=false,threadEpoch=0,readThrough=null,readWaitUntil=0;
    let tradeTarget=null,tradeHistory=[],tradeOutcome=null,profile=null,slotEdit=null,inventorySearch='',inventoryCategory='all',inventoryRarity='all',inventorySort='recent',tradeName='';
    const people=new Map(),tileItems=new Map(),dismissedTabs=new Set();
    const chat=o.chat,bar=chat.querySelector('.chat-tabs'),log=chat.querySelector('#gameLog'),input=chat.querySelector('#chatInput');
    const threadNode=document.createElement('section');threadNode.className='social-thread';threadNode.hidden=true;log.before(threadNode);
    const localInput={placeholder:input.placeholder,maxLength:input.maxLength};
    const online=()=>o.available();
    const canWrite=()=>o.canWrite()&&!mutating;
    const self=()=>o.selfId();
    function remember(data){
      for(const p of [...(data?.friends||[]),...(data?.matches||[]),...(data?.blocked||[]),...(data?.incoming||[]).map(r=>r.character),...(data?.outgoing||[]).map(r=>r.character),...(data?.conversations||[]).map(r=>r.character)])if(p?.id)people.set(p.id,p);
    }
    let inbox=[];
    function setBadges(next){
      const was=Number(badges.unreadMessages)||0;
      badges=next;
      for(const [key,name] of Object.entries(badgeKey)){
        const b=document.querySelector('[data-social-badge="'+key+'"]'),n=Number(next[name])||0;
        if(b){b.hidden=n===0;b.textContent=n>99?'99+':String(n);b.setAttribute('aria-label',n+' pendências');}
      }
      o.marketBadge?.(Number(next.marketPending)||0);
      const unread=Number(next.unreadMessages)||0;
      const launcher=document.getElementById('chatCornerToggle');
      if(launcher){
        if(unread)launcher.dataset.privateUnread=unread>99?'99+':String(unread);
        else delete launcher.dataset.privateUnread;
        launcher.setAttribute('aria-label',unread?'Canal do Porto · '+unread+' mensagens privadas não lidas':'Canal do Porto');
      }
      const notice=document.querySelector('[data-social-attention]'),has=[...Object.values(badgeKey),'marketPending'].some(k=>Number(next[k])>0);
      if(notice)notice.hidden=!has;
      if(was!==Number(next.unreadMessages)&&chat.classList.contains('hud-open')&&view!=='messages')void refreshInbox();
    }
    async function pollBadge(){
      if(!online()||badgePending||document.hidden)return;
      badgePending=true;
      try{setBadges(await o.read({view:'badge'}));}catch{}finally{badgePending=false;}
    }
    async function refreshInbox(){
      if(!online())return;
      try{const data=await o.read({view:'contacts'});remember(data);inbox=data.conversations||[];updateChatTabs();}catch{}
    }
    function person(p,{large=false}={}){
      if(!p)return '';
      const faction=o.faction(p.factionId);
      return '<div class="social-person'+(large?' social-person-large':'')+'"><canvas width="48" height="52" class="social-portrait"'+attr('data-social-portrait',p.id)+' aria-hidden="true"></canvas><span class="social-person-meta"><b>'+(p.crew?.tag?o.identity(p.crew,p.name):esc(p.name))+'</b><small>'+(faction?'<img src="assets/ui/faction-emblems/'+esc(p.factionId)+'.png"'+attr('alt',faction)+'>':'')+'Nv. '+esc(p.level)+' · '+esc(o.className(p.classId))+'</small><small'+(p.online?' class="social-online"':'')+'>'+esc(status(p))+'</small></span></div>';
    }
    const explain=value=>reasons[value]||'Indisponível para este contato.';
    function contactActions(p,{friend=false,trade=true}={}){
      const why=p.actions||{},crew=why.crew;
      return '<div class="social-actions">'+button('✉','private',p.id,{label:'Mensagem privada',title:why.message?explain(why.message):'Mensagem privada',disabled:!!why.message})+
        button('◈','profile',p.id,{label:'Ver perfil',title:'Ver perfil'})+
        button('♟','party',p.id,{label:'Convidar para Party',title:why.party?explain(why.party):'Convidar para Party',disabled:!!why.party||!canWrite()})+
        (['crew_forbidden','crew_not_joined','crew_officer_required','contact_blocked'].includes(crew)?'':button('⚓','crew',p.id,{label:'Convidar para Tripulação',title:crew?explain(crew):'Convidar para Tripulação',disabled:!!crew||!canWrite()}))+
        (trade?button('⇄','trade-person',p.id,{label:'Convidar para troca',title:p.online?'Convidar para troca':'Jogador offline',disabled:!p.online||p.blockedByYou||!canWrite()}):'')+
        (friend?button('−','remove',p.id,{label:'Remover amigo',title:'Remover amigo',disabled:!canWrite()}):'')+
        button(p.blockedByYou?'Desbloquear':'Bloquear','block',p.id,{disabled:!canWrite()})+'</div>';
    }
    const line=(p,content)=>'<article class="social-line">'+person(p)+content+'</article>';
    const group=(title,content)=>'<section class="social-group"><h3>'+esc(title)+'</h3>'+content+'</section>';
    function friends(data){
      const f=friendsFilter.toLocaleLowerCase('pt-BR'),list=data.friends.filter(p=>p.name.toLocaleLowerCase('pt-BR').includes(f));
      const matches=search?group('Resultados da busca',data.matches.map(p=>line(p,p.friendState==='none'?button('Adicionar amigo','add',p.id,{disabled:!canWrite()}):'<small>'+esc({accepted:'Já é seu amigo',incoming:'Solicitação recebida',outgoing:'Solicitação enviada'}[p.friendState])+'</small>')).join('')||blank('Nenhum personagem encontrado.')):'';
      const incoming=data.incoming.map(r=>line(r.character,'<div class="social-actions">'+button('Aceitar','friend-accept',r.id,{primary:true,disabled:!canWrite()})+button('Recusar','friend-decline',r.id,{disabled:!canWrite()})+'</div>'));
      const outgoing=data.outgoing.map(r=>line(r.character,button('Cancelar','friend-cancel',r.id,{disabled:!canWrite()})));
      return '<form class="social-tools" data-social-form="friends"><label for="socialFriendSearch">Adicionar amigo</label><input id="socialFriendSearch" name="q" placeholder="Nome público do personagem" maxlength="40" required value="'+esc(search)+'"><button class="social-button social-primary">Buscar</button></form>'+matches+
        group('Solicitações',incoming.concat(outgoing).join('')||blank('Nenhuma solicitação pendente.'))+
        group('Lista de amigos · '+data.onlineCount+' de '+data.friends.length+' online','<label class="social-field">Filtrar amigos <input id="socialFriendsFilter" type="search" data-social-filter="friends" maxlength="40" value="'+esc(friendsFilter)+'"></label>'+
          (list.map(p=>line(p,contactActions(p,{friend:true}))).join('')||blank(data.friends.length?'Nenhum amigo corresponde ao filtro.':'Você ainda não adicionou amigos.')))+
        (data.blocked.length?group('Contatos bloqueados',data.blocked.map(p=>line(p,button('Desbloquear','block',p.id,{disabled:!canWrite()}))).join('')):'');
    }
    function messages(data){
      return group('Conversas privadas',data.conversations.map(({character:p,lastMessage,unread})=>line(p,'<div class="social-message-summary"><small>'+esc(stamp(lastMessage?.sentAt))+'</small><span>'+esc(lastMessage?.body||'')+'</span></div>'+
        button(unread?'Abrir · '+unread+' não lidas':'Abrir conversa','private',p.id,{primary:unread>0}))).join('')||blank('Nenhuma conversa. Abra uma mensagem privada pela lista de Amigos.'));
    }
    function tile(entry,action,scope){
      const item=entry.item||entry, qty=entry.quantity??item.qty??item.quantity??1, detail=o.item(item);
      if(!detail)return '';
      const key=scope+':'+item.id;tileItems.set(key,{item,qty});
      const title=detail.name+' · LV '+(detail.level||1)+(qty>1?' ×'+qty:'');
      return '<button type="button" class="social-tile rarity-'+esc(detail.rarity||'common')+'"'+attr('data-social-item',key)+(action?attr('data-social-action',action)+attr('data-social-id',item.id)+(action==='offer-add'?' draggable="true"':''):'')+attr('aria-label',title)+attr('title',title)+'>'+
        (detail.icon?'<img'+attr('src',detail.icon)+' alt="" draggable="false" loading="lazy">':'<span aria-hidden="true">✦</span>')+(qty>1?'<small>×'+qty+'</small>':'')+(detail.binding?'<i aria-label="Vinculado">◆</i>':'')+'</button>';
    }
    function mail(data){
      const current=mailTab==='pending';
      return '<div class="social-tools social-tools-wrap">'+button('A resgatar · '+data.pending,'mail-tab','pending',{primary:current})+
        button('Resgatadas','mail-tab','claimed',{primary:!current})+
        (current?button('Resgatar tudo','mail-claim-all','',{primary:true,disabled:!canWrite()||!data.pending}):button('Arquivar resgatadas','mail-archive-claimed','',{disabled:!canWrite()||!data.letters.length}))+'</div>'+
        (data.letters.map(l=>'<article class="social-letter"><header><div><b>'+esc(l.title)+'</b><small>'+esc({dungeon:'Masmorra de Chefes',event:'Evento oficial',system:'Sistema',market:'Mercado dos Mares'}[l.source]||'Entrega oficial')+' · '+esc(stamp(l.createdAt))+'</small></div><span class="social-tag">'+(l.claimedAt?'Resgatada':l.readAt?'Pendente':'Nova · Pendente')+'</span></header><p>'+esc(l.message)+'</p><div class="social-actions"><div class="social-grid">'+l.attachments.map(item=>tile(item,null,'mail:'+l.id)).join('')+'</div>'+
          (!l.readAt&&!l.claimedAt?button('Marcar como lida','mail-read',l.id,{disabled:!canWrite()}):'')+
          (l.claimedAt?button('Arquivar','mail-archive',l.id,{disabled:!canWrite()}):button('Resgatar','mail-claim',l.id,{primary:true,disabled:!canWrite()}))+'</div></article>').join('')||blank(current?'Nenhuma recompensa pendente.':'Nenhuma recompensa resgatada.'))+
        (data.nextCursor?button('Carregar mais','mail-more',data.nextCursor):'');
    }
    function trade(data){
      const t=data.trade, active=t?.status==='active',history=data.history||[];
      const items=(data.eligibleItems||[]).filter(item=>{const i=o.item(item);return i&&(!inventorySearch||i.name.toLocaleLowerCase('pt-BR').includes(inventorySearch.toLocaleLowerCase('pt-BR')))&&(inventoryCategory==='all'||o.category(item)===inventoryCategory)&&(inventoryRarity==='all'||i.rarity===inventoryRarity);});
      if(inventorySort==='name')items.sort((a,b)=>o.item(a).name.localeCompare(o.item(b).name,'pt-BR'));
      else if(inventorySort==='rarity'){const order=['common','uncommon','rare','epic','legendary','supreme'];items.sort((a,b)=>order.indexOf(o.item(b).rarity)-order.indexOf(o.item(a).rarity));}
      else items.sort((a,b)=>(b.obtainedAt||0)-(a.obtainedAt||0));
      const summary=rows=>rows.map(({item,quantity})=>esc(o.item(item)?.name||'Item')+' ×'+quantity).join(', ')||'Nenhum item';
      const pill=(icon,label)=>'<span class="trade-pill">'+tradeIcon({'✓':'check','◆':'lock','✎':'edit','◷':'clock'}[icon]||'exchange')+label+'</span>';
      const offer=(title,who,rows,locked,confirmed,own)=>{
        const tone=confirmed?'confirmed':locked?'accepted':'proposed';
        const state=confirmed?pill('✓','Confirmada'):locked?pill('◆','Travada'):pill('✎','Em edição');
        const count=rows.reduce((total,row)=>total+(row.quantity??1),0);
        return '<section class="social-offer" data-trade-tone="'+tone+'"'+(own&&!locked?' data-social-drop':'')+
          '><header class="trade-offer-head"><div><h3>'+title+'</h3><p>'+esc(who)+'</p></div>'+state+'</header>'+
          '<div class="social-grid">'+(rows.map(row=>tile(row,own&&!locked?'offer-edit':null,own?'own':'peer')).join('')||
          blank(own&&!locked?'Selecione na mochila.':'Nenhum item nesta oferta.'))+'</div>'+
          '<small class="trade-offer-count">'+count+(count===1?' item':' itens')+'</small></section>';
      };
      const edit=slotEdit&&!t?.ownLocked?'<form class="social-tools trade-quantity" data-social-form="quantity">'+
        '<label for="socialTradeQuantity">Quantidade <strong>'+esc(o.item(slotEdit.item)?.name)+'</strong></label>'+
        '<input id="socialTradeQuantity" name="quantity" type="number" min="0" max="'+slotEdit.max+'" required value="'+slotEdit.value+'">'+
        '<button class="social-button social-primary"'+(!canWrite()?' disabled':'')+'>Aplicar</button>'+button('Fechar','offer-close')+
        (t.ownItems.some(row=>row.item.id===slotEdit.item.id)?'<small>Use 0 para retirar o item.</small>':'')+'</form>':'';
      const selects=(id,label,options,value)=>'<label class="social-field">'+esc(label)+' <select id="'+id+'" data-social-filter="'+id+'">'+options.map(([k,label])=>'<option value="'+k+'"'+(k===value?' selected':'')+'>'+esc(label)+'</option>').join('')+'</select></label>';
      const help='<details class="trade-help" data-trade-details="help"><summary>Como funciona</summary><ol class="social-help">'+
        '<li>Aceite o convite e escolha os itens que deseja oferecer.</li><li>Revise os dois lados e trave a sua oferta.</li>'+
        '<li>Os itens só mudam de dono depois que os dois jogadores confirmam. Destravar uma oferta invalida as confirmações.</li></ol></details>';
      const receipts='<details class="trade-history" data-trade-details="history"><summary>Histórico de trocas</summary>'+
        (history.map(r=>'<details class="social-receipt" data-trade-tone="confirmed"'+attr('data-trade-details','receipt-'+r.id)+'><summary>'+
          esc(r.partnerName)+' · '+esc(stamp(r.completedAt))+' '+pill('✓','Concluída')+'</summary><small>Comprovante '+esc(r.id)+'</small><p>Entregou: '+
          summary(r.sent)+'</p><p>Recebeu: '+summary(r.received)+'</p><div class="social-grid">'+
          [...r.sent,...r.received].map((row,n)=>tile(row,null,'receipt:'+r.id+':'+n)).join('')+'</div></details>').join('')||
          blank('Nenhuma troca concluída.'))+(data.nextHistory?button('Mais comprovantes','trade-more',data.nextHistory.id):'')+'</details>';

      if(!active){
        const inviteForm=(!t||t.initiatorId!==self())?'<form class="social-tools trade-invite-form" data-social-form="trade">'+
          '<label for="socialTradeName">Convidar jogador</label><input id="socialTradeName" name="name" maxlength="40" required placeholder="Nome público do personagem" value="'+esc(tradeName)+'">'+
          '<button class="social-button social-primary"'+(!canWrite()?' disabled':'')+'>Enviar convite</button></form>':'';
        const invites=[...(t?[t]:[]),...(data.invites||[]).filter(i=>i.id!==t?.id)].map(i=>{
          const sent=i.initiatorId===self();
          return '<article class="trade-invite" data-trade-tone="proposed"><div><b>'+esc(i.partnerName)+'</b><small>Válido até '+esc(stamp(i.expiresAt))+'</small></div>'+
            pill('◷',sent?'Aguardando aceite':'Convite recebido')+'<div class="social-actions">'+
            (sent?button('Cancelar','trade-cancel',i.id,{disabled:!canWrite()}):button('Aceitar','trade-accept',i.id,{primary:true,disabled:!canWrite()})+
            button('Recusar','trade-decline',i.id,{disabled:!canWrite()}))+'</div></article>';
        }).join('');
        const outcome=tradeOutcome?'<div class="trade-outcome" role="status" data-trade-tone="'+tradeOutcome.tone+'">'+
          '<strong>'+tradeOutcome.title+'</strong><p>'+tradeOutcome.text+'</p></div>':'';
        return '<div class="trade-desk">'+outcome+'<div class="trade-lobby"><div><h3>Mesa de negociação</h3>'+
          '<p>Combine uma troca de itens com outro jogador do porto.</p></div>'+help+'</div>'+inviteForm+
          '<section class="trade-invitations"><h3>Convites</h3>'+(invites||blank('Nenhum convite em aberto.'))+'</section>'+receipts+'</div>';
      }

      const review=t.ownLocked&&t.peerLocked;
      const hasItems=t.ownItems.length>0||t.peerItems.length>0;
      const current=review?2:t.ownLocked||t.peerLocked?1:0;
      let guidance='Selecione os itens da mochila e trave sua oferta quando estiver pronta.';
      if(t.ownConfirmed)guidance='Sua confirmação foi registrada. Aguardando a confirmação do outro jogador.';
      else if(review)guidance=hasItems?'Confira o que você entrega e recebe antes de confirmar.':'Destrave a oferta e inclua pelo menos um item.';
      else if(t.ownLocked)guidance='Aguardando o outro jogador travar a oferta.';
      else if(t.peerLocked)guidance='O outro jogador travou a oferta. Revise os itens e trave a sua.';
      const steps=['Propor itens','Travar ofertas','Confirmar troca'].map((label,n)=>'<li'+
        (n===current?' aria-current="step"':n<current?' class="trade-step-done"':'')+
        '><span class="trade-step-icon">'+tradeIcon(n<current?'check':['bag','lock','exchange'][n])+'</span>'+label+'</li>').join('');
      const inventory='<section class="social-inventory trade-stock"><header><h3>Seu inventário negociável</h3><small>'+
        items.length+(items.length===1?' opção':' opções')+'</small></header><div class="social-tools trade-filters">'+
        '<label class="social-field">Buscar <input id="socialInventorySearch" type="search" data-social-filter="inventory" maxlength="40" placeholder="Nome do item" value="'+esc(inventorySearch)+'"></label>'+
        selects('socialCategory','Tipo',[['all','Tudo'],['weapons','Armas'],['armor','Armaduras'],['fruits','Akuma no Mi'],['consumables','Consumíveis'],['materials','Materiais'],['pearls','Pérolas']],inventoryCategory)+
        selects('socialRarity','Raridade',[['all','Todas'],['common','Comum'],['uncommon','Incomum'],['rare','Raro'],['epic','Épico'],['legendary','Lendário'],['supreme','Supremo']],inventoryRarity)+
        selects('socialSort','Ordem',[['recent','Recentes'],['name','Nome'],['rarity','Raridade']],inventorySort)+'</div>'+edit+
        '<div class="social-grid social-bag-grid">'+(items.map(item=>tile(item,!t.ownLocked?'offer-add':null,'eligible')).join('')||
        blank('Nenhum item negociável para exibir.'))+'</div></section>';
      const reviewPanel='<section class="social-review trade-review"><div><b>Você entrega</b><p>'+summary(t.ownItems)+
        '</p></div><div><b>Você recebe</b><p>'+summary(t.peerItems)+'</p></div></section>';
      const editable=!t.ownLocked;
      return '<div class="trade-desk trade-desk-active"><div class="trade-workspace"><ol class="trade-steps" aria-label="Etapas da troca">'+steps+'</ol>'+
        '<p class="trade-guidance" role="status">'+guidance+'</p><div class="social-offers">'+
        offer('Sua oferta',o.selfName(),t.ownItems,t.ownLocked,t.ownConfirmed,true)+
        offer('Outra oferta',t.partnerName,t.peerItems,t.peerLocked,t.peerConfirmed,false)+'</div>'+
        (review?reviewPanel:inventory)+'</div><footer class="trade-actions">'+
        button('Cancelar troca','trade-cancel',t.id,{disabled:!canWrite()})+
        button(editable?'Travar minha oferta':'Destravar minha oferta','trade-lock',t.id,{disabled:!canWrite(),primary:editable})+
        button('Confirmar troca','trade-confirm',t.id,{disabled:!canWrite()||!review||!hasItems||t.ownConfirmed,primary:review&&!t.ownConfirmed})+
        '</footer><div class="trade-links">'+receipts+help+'</div></div>';
    }
    function refreshPortraits(rootNode){for(const c of rootNode.querySelectorAll('[data-social-portrait]')){const p=people.get(c.dataset.socialPortrait);if(p)o.draw(c,p);}}
    function replace(node,html){
      const focus=document.activeElement,focused=node.contains(focus);
      const list=[...node.querySelectorAll('.social-bag-grid, .social-content, .trade-workspace')],scrolls=list.map(el=>el.scrollTop);
      const controls='button,input,select,summary,[tabindex]';
      const locator=focused&&[...node.querySelectorAll(controls)].indexOf(focus);
      const tradeControl=focused&&focus.closest('.trade-desk')?
        [...focus.attributes].filter(({name})=>['id','data-social-action','data-social-id','data-social-item'].includes(name)).map(({name,value})=>[name,value]):null;
      const tradeDetails=focused&&focus.matches('summary')?focus.parentElement.dataset.tradeDetails:null;
      const edit=focused&&focus instanceof HTMLInputElement&&focus.id?{id:focus.id,value:focus.value,pos:focus.selectionStart,end:focus.selectionEnd}:null;
      const openDetails=new Set([...node.querySelectorAll('details[data-trade-details][open]')].map(el=>el.dataset.tradeDetails));
      node.innerHTML=html;
      for(const details of node.querySelectorAll('details[data-trade-details]'))details.open=openDetails.has(details.dataset.tradeDetails);
      const nextControls=[...node.querySelectorAll(controls)];
      const el=tradeDetails?nextControls.find(x=>x.matches('summary')&&x.parentElement.dataset.tradeDetails===tradeDetails):
        tradeControl?.length?nextControls.find(x=>tradeControl.every(([name,value])=>x.getAttribute(name)===value)):
        focused?nextControls[locator]:null;
      if(el&&focused){el.focus({preventScroll:true});if(edit&&el.id===edit.id){el.value=edit.value;if(edit.pos!=null)el.setSelectionRange(edit.pos,edit.end);}}
      [...node.querySelectorAll('.social-bag-grid, .social-content, .trade-workspace')].forEach((x,n)=>x.scrollTop=scrolls[n]||0);
      refreshPortraits(node);
    }
    function paint(){
      if(!view)return;
      tileItems.clear();
      const body=profile?group('Perfil do personagem',person(profile,{large:true})+contactActions(profile,{trade:true})+button('Voltar','profile-close')):
        !online()?blank('Entre no servidor para usar este recurso.'):
        failed&&!model?blank('Não foi possível carregar os dados.')+button('Tentar novamente','refresh'):
        !model?blank('Carregando…'):{friends,messages,mail,trade}[view](model);
      const html='<div class="social-content"><p class="social-notice" role="status"'+(!statusText?' hidden':'')+'>'+esc(statusText)+'</p>'+body+'</div>';
      if(signature!==html||!o.body.querySelector('.social-content')){signature=html;replace(o.body,html);}
    }
    async function refreshPanel(){
      if(!view||!online()||panelPending||document.hidden)return;
      const epoch=viewEpoch, selected=view;
      panelPending=true;
      try{
        const query=selected==='mail'?{view:'mail',tab:mailTab}:selected==='trade'?{view:'trade'}:{view:'contacts',q:selected==='friends'?search:''};
        const data=await o.read(query);if(epoch!==viewEpoch)return;
        if(selected==='mail'&&mailPages.length){const seen=new Set(data.letters.map(l=>l.id));data.letters.push(...mailPages.flatMap(p=>p.letters).filter(l=>!seen.has(l.id)));data.nextCursor=mailPages.at(-1).nextCursor;}
        if(selected==='friends'||selected==='messages'){remember(data);inbox=data.conversations||[];updateChatTabs();}
        if(selected==='trade'){
          const previous=model?.trade;
          if(data.trade?.ownLocked||previous?.id!==data.trade?.id||previous?.offerVersion!==data.trade?.offerVersion)slotEdit=null;
          if(data.trade?.status==='active')tradeOutcome=null;
          else if(previous&&![data.trade,...(data.invites||[])].some(invite=>invite?.id===previous.id)){
            const completed=(data.history||[]).some(receipt=>receipt.id===previous.id);
            tradeOutcome=completed?{tone:'confirmed',title:'Troca concluída',text:'Abra o histórico para consultar o comprovante.'}:
              {tone:'closed',title:'Negociação encerrada',text:'Envie um novo convite para voltar a negociar.'};
          }
          if(tradeHistory.length){const ids=new Set(data.history.map(r=>r.id));data.history.push(...tradeHistory.flatMap(p=>p.history).filter(r=>!ids.has(r.id)));data.nextHistory=tradeHistory.at(-1).nextHistory;}
        }
        if(profile&&people.has(profile.id))profile=people.get(profile.id);
        model=data;failed=false;paint();
      }catch{if(epoch===viewEpoch){failed=true;paint();}}finally{panelPending=false;if(epoch!==viewEpoch&&view)void refreshPanel();}
    }
    function open(id,personToTrade){
      if(view!==id){view=id;viewEpoch++;model=null;profile=null;statusText='';failed=false;mailPages=[];tradeHistory=[];tradeTarget=null;tradeOutcome=null;signature='';}
      if(personToTrade){tradeName=personToTrade.name;tradeTarget=personToTrade;}
      paint();void refreshPanel();
    }
    function close(){if(view){view='';viewEpoch++;model=null;profile=null;signature='';tileItems.clear();}}
    async function send(action,payload,{quiet=false}={}){
      if(!canWrite())return false;
      mutating=true;if(!quiet)statusText='';paint();
      try{
        const receipt=await o.command(action,payload);
        if(action==='mail.claim'||action==='mail.claim-all'){
          mailPages=[];
          statusText=(receipt?.mail?.claimed?.length||0)+' entrega(s) resgatada(s).'+(receipt?.mail?.reason==='inventory_full'?' Algumas continuam pendentes: mochila cheia.':'');
          o.mailReceived(receipt?.mail?.claimed||[]);
        }else if(!quiet){statusText=({ 'friend.request':'Solicitação enviada.', 'party.invite':'Convite de grupo enviado.', 'crew.invite':'Convite de tripulação enviado.', 'trade.invite':'Convite de troca enviado.'})[action]||'';}
        if(action==='mail.archive'||action==='mail.archive-claimed')mailPages=[];
        return true;
      }catch(error){
        if(quiet){if(action==='message.send')o.alert(errorMessage(error));}
        else {statusText=errorMessage(error);if(!view)o.alert(statusText);}
        return false;
      }finally{mutating=false;paint();void pollBadge();void refreshPanel();}
    }
    function updateChatTabs(){
      const current=new Map(inbox.filter(c=>c.character).map(c=>[c.character.id,c]));
      if(target&&!current.has(target.id))current.set(target.id,{character:target,unread:0});
      for(const existing of bar.querySelectorAll('[data-private-tab]')){
        if(!current.has(existing.dataset.privateTab)||(dismissedTabs.has(existing.dataset.privateTab)&&!current.get(existing.dataset.privateTab)?.unread))existing.remove();
      }
      for(const [id,{character,unread}] of current){
        if(dismissedTabs.has(id)&&!unread)continue;
        let b=[...bar.querySelectorAll('[data-private-tab]')].find(el=>el.dataset.privateTab===id);
        if(!b){b=document.createElement('button');b.type='button';b.dataset.privateTab=id;bar.append(b);}
        const title='Privado · '+character.name+(unread?' ('+unread+')':'');
        if(b.textContent!==title)b.textContent=title;
        b.setAttribute('aria-pressed',String(privateOn&&id===target?.id));
      }
    }
    function chatPaint({older=false,initial=false}={}){
      if(!privateOn||!target)return;
      const stream=threadNode.querySelector('.social-chat-log'),prevTop=stream?.scrollTop??0,prevHeight=stream?.scrollHeight??0;
      const atEnd=!stream||prevHeight-stream.clientHeight-prevTop<35;
      const last=thread?.messages||[];
      const html='<header>'+person(target)+'<details class="social-thread-menu"><summary>Ações</summary>'+contactActions(target,{trade:false})+'</details>'+button('×','private-close',target.id,{label:'Fechar conversa',title:'Fechar conversa'})+'</header>'+
        '<div class="social-chat-log" role="log" aria-live="polite">'+(oldestAvailable?button('Mensagens anteriores','private-more'):'')+
        (last.map(m=>'<article class="'+(m.senderId===self()?'social-self':'')+'"><b>'+esc(m.senderId===self()?o.selfName():target.name)+'</b> <time>'+esc(stamp(m.sentAt))+'</time><p>'+esc(m.body)+'</p></article>').join('')||blank(thread?'Nenhuma mensagem nesta conversa.':'Carregando conversa…'))+'</div>';
      if(threadNode.dataset.markup!==html){
        const actionsOpen=threadNode.querySelector('details')?.open;
        threadNode.dataset.markup=html;threadNode.innerHTML=html;refreshPortraits(threadNode);
        if(actionsOpen)threadNode.querySelector('details').open=true;
        const box=threadNode.querySelector('.social-chat-log');
        box.scrollTop=older?prevTop+box.scrollHeight-prevHeight:initial||atEnd?box.scrollHeight:prevTop;
      }
      updateChatTabs();
      const writable=!target.actions?.message&&!target.blockedByYou;
      input.placeholder=writable?'Mensagem privada para '+target.name+'…':explain(target.actions?.message);
      input.disabled=!writable;
      chat.querySelector('#chatForm button').disabled=!writable;
    }
    async function refreshThread({older=false,initial=false}={}){
      if(!online()||!privateOn||!target||document.hidden||!chat.classList.contains('hud-open')||threadPending)return;
      const epoch=threadEpoch, id=target.id;
      threadPending=true;
      try{
        const previous=thread?.messages||[],first=previous[0]?.id, last=previous.at(-1)?.id;
        const data=await o.read({view:'messages',target:id,...(older&&first?{before:first}:!initial&&last?{after:last}:{})});
        if(epoch!==threadEpoch)return;
        if(data.character){target=data.character;people.set(id,target);}
        const rows=older?[...data.messages,...previous]:initial?data.messages:[...previous,...data.messages];
        thread={...data,messages:[...new Map(rows.map(m=>[m.id,m])).values()]};
        if(initial||older||!last)oldestAvailable=data.hasMore;
        chatPaint({older,initial});
        await maybeRead();
      }catch(error){if(initial&&epoch===threadEpoch){thread={messages:[]};chatPaint();o.alert(errorMessage(error));}}
      finally{threadPending=false;if(epoch!==threadEpoch&&privateOn)void refreshThread({initial:true});}
    }
    async function maybeRead(){
      if(document.hidden||view||o.chatObscured()||!privateOn||!chat.classList.contains('hud-open')||!canWrite()||Date.now()<readWaitUntil)return;
      const box=threadNode.querySelector('.social-chat-log');
      if(!box||box.scrollHeight-box.clientHeight-box.scrollTop>35)return;
      const inbound=[...(thread?.messages||[])].reverse().find(m=>m.senderId!==self());
      if(!inbound||inbound.id===readThrough)return;
      const id=target.id,epoch=threadEpoch;readWaitUntil=Date.now()+1500;
      if(await send('message.read',{targetId:id,throughId:inbound.id},{quiet:true})){
        if(epoch===threadEpoch)readThrough=inbound.id;
        void refreshInbox();
      }
    }
    function privateOpen(p){
      if(!p)return;
      o.openChat();
      if(!privateOn||target?.id!==p.id){input.value='';target=p;thread=null;readThrough=null;threadEpoch++;oldestAvailable=false;}
      dismissedTabs.delete(p.id);privateOn=true;log.hidden=true;threadNode.hidden=false;input.maxLength=500;
      for(const b of bar.querySelectorAll('[data-chat-channel]'))b.setAttribute('aria-pressed','false');
      chatPaint();void refreshThread({initial:!thread});input.focus();
    }
    function localChannel(){
      if(!privateOn)return;
      privateOn=false;threadEpoch++;threadNode.hidden=true;log.hidden=false;input.value='';input.disabled=false;input.placeholder=localInput.placeholder;input.maxLength=localInput.maxLength;chat.querySelector('#chatForm button').disabled=false;updateChatTabs();
    }
    bar.addEventListener('click',e=>{
      const b=e.target.closest('[data-private-tab]');if(b){const p=people.get(b.dataset.privateTab);if(p)privateOpen(p);}
      else if(e.target.closest('[data-chat-channel]'))localChannel();
    });
    threadNode.addEventListener('scroll',()=>{void maybeRead();},true);
    function submitChat(){
      if(!privateOn)return false;
      const body=input.value.trim(),id=target?.id;
      if(body&&id){void send('message.send',{targetId:id,body},{quiet:true}).then(ok=>{if(ok&&privateOn&&id===target?.id){if(input.value.trim()===body)input.value='';void refreshThread();}});}
      return true;
    }
    async function action(e){
      const b=e.target.closest('[data-social-action]');if(!b||b.disabled)return;
      const key=b.dataset.socialAction,id=b.dataset.socialId,p=people.get(id);
      if(key==='private'){privateOpen(p);return;}
      if(key==='private-close'){dismissedTabs.add(id);target=null;thread=null;bar.querySelector('[data-chat-channel="all"]').click();return;}
      if(key==='private-more'){void refreshThread({older:true});return;}
      if(key==='profile'){if(!view)o.openPanel('friends');profile=p;paint();return;}
      if(key==='profile-close'){profile=null;paint();return;}
      if(key==='trade-person'){o.openPanel('trade');open('trade',p);return;}
      if(key==='refresh'){void refreshPanel();return;}
      if(key==='mail-tab'){mailTab=id;mailPages=[];model=null;viewEpoch++;paint();void refreshPanel();return;}
      if(key==='mail-more'){
        const epoch=viewEpoch;
        try{const more=await o.read({view:'mail',tab:mailTab,before:id});if(epoch!==viewEpoch||!model||model.nextCursor!==id)return;mailPages.push(more);model.letters.push(...more.letters);model.nextCursor=more.nextCursor;paint();}catch(error){statusText=errorMessage(error);paint();}
        return;
      }
      if(key==='trade-more'){
        const cursor=model?.nextHistory,epoch=viewEpoch;if(cursor?.id!==id)return;
        try{const page=await o.read({view:'trade',beforeAt:cursor.at,beforeId:cursor.id});if(epoch!==viewEpoch||!model||model.nextHistory?.id!==id)return;tradeHistory.push(page);model.history.push(...page.history);model.nextHistory=page.nextHistory;paint();}catch(error){statusText=errorMessage(error);paint();}
        return;
      }
      if(key==='offer-close'){slotEdit=null;paint();return;}
      const t=model?.trade;
      if(['offer-add','offer-edit'].includes(key)&&t&&!t.ownLocked){
        const item=tileItems.get((key==='offer-add'?'eligible':'own')+':'+id);if(!item)return;
        slotEdit={item:item.item,max:item.item.qty??item.item.quantity??1,value:key==='offer-edit'?item.qty:1,version:t.offerVersion};
        paint();document.getElementById('socialTradeQuantity')?.focus();return;
      }
      const commands={
        add:['friend.request',{targetId:id}],remove:['friend.remove',{targetId:id}],block:['contact.block',{targetId:id,blocked:!p?.blockedByYou}],
        'friend-accept':['friend.respond',{requestId:id,accept:true}], 'friend-decline':['friend.respond',{requestId:id,accept:false}], 'friend-cancel':['friend.cancel',{requestId:id}],
        party:['party.invite',{targetId:id}],crew:['crew.invite',{targetId:id}],
        'mail-read':['mail.read',{mailId:id}],'mail-claim':['mail.claim',{mailId:id}],'mail-claim-all':['mail.claim-all',{}],'mail-archive':['mail.archive',{mailId:id}],'mail-archive-claimed':['mail.archive-claimed',{}],
        'trade-accept':['trade.respond',{tradeId:id,accept:true}],'trade-decline':['trade.respond',{tradeId:id,accept:false}],'trade-cancel':['trade.cancel',{tradeId:id}],
        'trade-lock':['trade.lock',{tradeId:id,expectedOfferVersion:t?.offerVersion,locked:!t?.ownLocked}],
        'trade-confirm':['trade.confirm',{tradeId:id,expectedOfferVersion:t?.offerVersion}],
      }[key];
      if(commands)await send(...commands);
    }
    function submit(e){
      const form=e.target.closest('[data-social-form]');if(!form)return;
      e.preventDefault();const data=new FormData(form),name=String(data.get('name')||'').trim();
      if(form.dataset.socialForm==='friends'){search=String(data.get('q')||'').trim();viewEpoch++;void refreshPanel();return;}
      if(form.dataset.socialForm==='trade'&&name){tradeName=name;void send('trade.invite',tradeTarget?.name===name?{targetId:tradeTarget.id}:{name});return;}
      if(form.dataset.socialForm==='quantity'&&slotEdit&&model?.trade){const quantity=Number(data.get('quantity')),edit=slotEdit;if(Number.isSafeInteger(quantity)&&quantity>=0&&quantity<=edit.max){
        slotEdit=null;void send('trade.offer',{tradeId:model.trade.id,expectedOfferVersion:edit.version,itemId:edit.item.id,quantity});
      }}
    }
    function filter(e){
      const key=e.target.dataset.socialFilter;if(!key)return;
      if(key==='friends')friendsFilter=e.target.value;
      if(key==='inventory')inventorySearch=e.target.value;
      if(key==='socialCategory')inventoryCategory=e.target.value;
      if(key==='socialRarity')inventoryRarity=e.target.value;
      if(key==='socialSort')inventorySort=e.target.value;
      paint();
    }
    o.body.addEventListener('click',action);threadNode.addEventListener('click',action);
    o.body.addEventListener('submit',submit);
    o.body.addEventListener('input',e=>{if(e.target.matches('input[data-social-filter]'))filter(e);});
    o.body.addEventListener('change',e=>{if(e.target.matches('select[data-social-filter]'))filter(e);});
    o.body.addEventListener('dragstart',e=>{const item=e.target.closest('[data-social-action="offer-add"]');if(item)e.dataTransfer?.setData('application/x-kaizoku-trade',item.dataset.socialId);});
    o.body.addEventListener('dragover',e=>{if(e.target.closest('[data-social-drop]')&&e.dataTransfer?.types.includes('application/x-kaizoku-trade'))e.preventDefault();});
    o.body.addEventListener('drop',e=>{if(!e.target.closest('[data-social-drop]'))return;const id=e.dataTransfer?.getData('application/x-kaizoku-trade');if(!id)return;e.preventDefault();[...o.body.querySelectorAll('[data-social-action="offer-add"]')].find(b=>b.dataset.socialId===id)?.click();});
    let timer=null;
    function start(){
      if(timer||!online())return;
      void pollBadge();let ticks=0;
      timer=setInterval(()=>{
        if(!online()||document.hidden)return;
        if(++ticks%5===0)void pollBadge();
        if(view&&(view==='trade'||ticks%3===0))void refreshPanel();
        if(chat.classList.contains('hud-open')&&privateOn&&ticks%2===0)void refreshThread();
      },1800);
    }
    return {open,close,start,submitChat,refreshBadge:pollBadge,chatOpened(){if(online()){void refreshInbox();if(privateOn)void refreshThread();}},
      findItem:key=>tileItems.get(key),refreshPortraits(){refreshPortraits(o.body);refreshPortraits(threadNode);}};
  }
  root.MareSocialUI={menu,create,errorMessage,tabs};
})(globalThis);
