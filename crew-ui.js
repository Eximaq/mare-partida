(function(root){
  'use strict';

  const flags=root.MareCrewFlag|| (typeof module==='object'?require('./crew-flag.js'):null);
  const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const number=value=>{try{return BigInt(value??0).toLocaleString('pt-BR');}catch{return '0';}};
  const date=value=>value&&Number.isFinite(new Date(value).getTime())?new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short',timeZone:'America/Sao_Paulo'}).format(new Date(value)):'—';
  const icon='<img src="assets/ui/inventory-final/icons/anchor.png" alt="" draggable="false">';
  const roles={captain:'Capitão',officer:'Oficial',member:'Membro'};
  const classes={sword:'Espadachim',brawler:'Lutador',gunner:'Franco-atirador',rogue:'Gatuno',cyborg:'Ciborgue',strategist:'Estrategista',healer:'Suporte'};
  const professions={doctor:'Médico',command:'Oficial de Comando',commander:'Oficial de Comando',cook:'Cozinheiro',carpenter:'Carpinteiro',navigator:'Navegador'};
  const facilities={
    hull:['Casco e alojamentos','Capacidade de membros','⚓'],
    infirmary:['Enfermaria','Potência das poções de cura','✚','doctor'],
    galley:['Cozinha','Vitalidade da tripulação','♨','cook'],
    command:['Cabine de comando','Experiência de combate','⚑','command'],
    workshop:['Oficina','Desconto em obras','⚒','carpenter'],
    navigation:['Sala de navegação','Berry de monstros','✧','navigator'],
    warehouse:['Armazém comercial','Estrutura da loja','▣'],
  };
  const facilityLabels={hull:'Casco',infirmary:'Enfermaria',galley:'Cozinha',command:'Comando',workshop:'Oficina',navigation:'Navegação',warehouse:'Armazém'};
  const tabs=[
    ['overview','Visão geral','◈'],['members','Membros','♟'],['profession','Minha profissão','✚'],
    ['missions','Missões coletivas','⚔'],['contracts','Contratos profissionais','▤'],['ship','Navio e instalações','⚓'],
    ['treasury','Tesouraria','◉'],['store','Loja','▣'],['recruitment','Recrutamento','⚑'],
  ];
  const policyText=policy=>policy==='open'?'Entrada livre':'Por aprovação';
  const selected=(value,test)=>value===test?' selected':'';
  const disabled=blocked=>blocked?' disabled':'';
  const button=(action,label,value,blocked=false,style='')=>'<button type="button" class="crew-button '+style+'" data-crew-action="'+action+'"'+(value==null?'':' data-value="'+escape(value)+'"')+disabled(blocked)+'>'+escape(label)+'</button>';
  const section=(title,body,kind='')=>'<section class="crew-card '+kind+'"><h3>'+escape(title)+'</h3>'+body+'</section>';
  const empty=label=>'<p class="crew-muted">'+escape(label)+'</p>';
  const row=(title,sub,right='')=>'<div class="crew-row"><div><strong>'+escape(title)+'</strong><small>'+escape(sub)+'</small></div>'+right+'</div>';
  const asset=(path,alt='')=>'<img src="'+escape(path)+'" alt="'+escape(alt)+'" draggable="false">';

  function flag(value,name=''){
    const url=flags?.dataUrl(value);
    return url?'<img class="crew-flag" width="32" height="32" src="'+url+'" alt="'+escape(name)+'" draggable="false">':'<span class="crew-flag crew-flag-empty" aria-hidden="true">⚓</span>';
  }
  function identity(group,name){
    if(!group?.tag)return escape(name);
    return '<span class="crew-identity">'+flag(group.flag)+'<span class="crew-tag">['+escape(group.tag)+']</span><span>'+escape(name)+'</span></span>';
  }
  function progress(value,total,start=0){
    const current=Math.max(0,Number(value)-Number(start)),max=Math.max(0,Number(total)-Number(start));
    if(!max)return '';
    return '<div class="crew-progress"><progress aria-label="'+number(current)+' de '+number(max)+'" value="'+Math.min(current,max)+'" max="'+max+'"></progress><small>'+number(current)+' / '+number(max)+'</small></div>';
  }
  function contracts(data,{compact=false}={}){
    if(!data?.profession)return '<div class="crew-contracts">'+empty('Escolha uma profissão em Social → Tripulação para iniciar seus contratos.')+'</div>';
    const week=data.week,profession=data.choices?.find(choice=>choice.id===data.profession);
    const cards=(week?.objectives||[]).map(objective=>{
      const completed=objective.status==='complete';
      const detail=objective.available===false&&!completed?'<small class="crew-note">Disponível quando houver vínculo com uma tripulação.</small>':'';
      const material=objective.material||profession?.material;
      const quantity=objective.material?.quantity==null?'':'<small>Na coleta: '+number(objective.material.quantity)+' '+escape(material.name)+'</small>';
      const artwork=objective.id==='collection'&&material?.icon?.startsWith('assets/')?asset(material.icon):({
        donation:asset('assets/ui/inventory-final/berry.png'),
        hunt:asset('assets/ui/inventory-final/icons/attack.png'),
        prison:asset('assets/ui/modes/impel-down.svg'),
      })[objective.id]||'<span aria-hidden="true">▤</span>';
      return '<article class="crew-objective" data-completed="'+completed+'"><span class="crew-objective-icon">'+artwork+'</span><div><strong>'+escape(objective.title)+'</strong><p>'+escape(objective.description)+'</p>'+progress(objective.progress,objective.target)+quantity+detail+'</div><small class="crew-objective-xp">'+(completed?'Creditado':'+'+number(objective.xp)+' XP')+'</small></article>';
    }).join('');
    const history=compact?'':section('Histórico de XP',(data.history||[]).map(entry=>row(entry.title,date(entry.creditedAt),'<b>+'+number(entry.xp)+' XP</b>')).join('')||empty('Nenhum crédito registrado.'));
    return '<div class="crew-contracts">'+(week?'<p class="crew-cycle"><b>'+number(week.earnedXp)+' / '+number(week.limit)+' XP</b><span>Renova em '+escape(date(week.endAt))+'</span></p>':'')+(cards||empty('O próximo contrato aparecerá quando o ciclo for aberto.'))+
      (data.futureBoss?.title?'<div class="crew-future"><b>'+escape(data.futureBoss.title)+'</b><span>Boss Semanal · em breve</span></div>':'')+history+'</div>';
  }
  function ranking(list){
    if(!Array.isArray(list))return empty('Ranking de tripulações indisponível.');
    if(!list.length)return empty('Nenhuma tripulação classificada.');
    return '<ol class="crew-rank-list">'+list.map(group=>'<li class="crew-row"><b class="crew-rank-place">'+number(group.rank)+'º</b>'+flag(group.flag)+'<div><strong>['+escape(group.tag)+'] '+escape(group.name)+'</strong><small>Capitão '+escape(group.captain)+' · Nv. '+number(group.level)+' · Casco '+number(group.shipStage)+' · '+number(group.memberCount)+'/'+number(group.capacity)+' membros</small></div><b>'+number(group.power)+' poder</b></li>').join('')+'</ol>';
  }

  function vessel(group,art={},preview=false){
    const stage=Math.max(1,Math.min(5,Number(group.facilities.hull)||1));
    const sail=stage>2?'#ead4a1':'#d4bd8d';
    const cabins=Object.keys(facilities).filter(id=>id!=='hull');
    const cells=cabins.map((id,index)=>{
      const x=134+index*39,lvl=Number(group.facilities[id])||1;
      const color=['#573426','#6f412a','#825132','#94633a','#af804a'][Math.max(0,Math.min(4,lvl-1))];
      return '<g><rect x="'+x+'" y="132" width="34" height="33" rx="1" fill="'+color+'" stroke="#271616" stroke-width="2"/><path d="M'+(x+3)+' 135h28m-28 27h28" stroke="#d5a55b" opacity=".6"/><rect x="'+(x+8)+'" y="141" width="18" height="14" rx="2" fill="#30211c" stroke="#a5743e"/><rect x="'+(x+10)+'" y="143" width="14" height="10" rx="1" fill="'+(lvl>=4?'#ffdc84':lvl>=2?'#d2a45d':'#94704b')+'"/><path d="M'+(x+17)+' 142v12" stroke="#744924"/></g>';
    }).join('');
    const suffix=preview?'Next':'';
    const hullArt=art.hull?.[stage]||(stage===1?art.hull:null);
    const artLayer=hullArt?.src?'<div class="crew-vessel-scene"><img class="crew-vessel-art" data-crew-art="hull" src="'+escape(hullArt.src)+'" alt="Vista lateral do navio" hidden><span class="crew-vessel-flag crew-vessel-art-flag" style="--crew-flag-x:'+Number(hullArt.flagX??57.5)+'%;--crew-flag-y:'+Number(hullArt.flagY??11.1)+'%">'+flag(group.flag,'Bandeira da tripulação')+'</span></div>':'';
    return '<figure class="crew-vessel" data-stage="'+stage+'" aria-label="Navio da tripulação, casco nível '+stage+'">'+artLayer+'<svg viewBox="0 0 500 224" role="img" aria-label="Vista lateral do navio">'+
      '<defs><linearGradient id="crewSea'+suffix+'" x2="0" y2="1" gradientUnits="objectBoundingBox"><stop stop-color="#172e48"/><stop offset="1" stop-color="#0d4e67"/></linearGradient><linearGradient id="crewSail'+suffix+'" x2="1" y2="1" gradientUnits="objectBoundingBox"><stop stop-color="'+sail+'"/><stop offset="1" stop-color="#94744c"/></linearGradient></defs>'+
      '<rect width="500" height="224" fill="url(#crewSea'+suffix+')"/><circle cx="401" cy="48" r="31" fill="#f3ce8b" opacity=".75"/><path d="M0 109L39 82l26 27 35-14 39 13 25-5 41 11 26-9 58 6 25-7 45 4 52-26 33 20 34-13 22 7v115H0z" fill="#152c41"/><path d="M0 143l65 4 72-8 54 6 60-7 76 7 57-7 70 8 46-4v82H0z" fill="#225b6c"/>'+
      '<path d="M0 173q43-9 85 0t85 0 85 0 85 0 85 0 85 0m-510 20q42-6 84 0t84 0 84 0 84 0 84 0 84 0m-510 16q42-6 84 0t84 0 84 0 84 0 84 0 84 0" fill="none" stroke="#55899a" opacity=".64"/>'+
      '<path d="M113 137l30-75 59-23 39 98m-9 0 48-105 67 19 48 85" fill="none" stroke="#0d1623" stroke-width="2"/>'+
      '<path d="M196 37v109m82-124v126m71-96v94" stroke="#271b16" stroke-width="8"/><path d="M196 39v105m82-120v124m71-94v90" stroke="#a27546" stroke-width="3"/>'+
      '<path d="M149 62q33 6 73-9-6 25 11 49-46 17-91 0 13-19 7-40zM228 49q48 7 97-15-7 33 7 65-55 16-109 1 17-29 5-51zM325 71q33 7 64-9-6 27 12 51-42 7-79-5 11-17 3-37z" fill="url(#crewSail'+suffix+')" stroke="#574431" stroke-width="2"/>'+
      '<path d="M175 63q8 18 2 39m88-47q7 25-2 49m33-56q7 27 0 53m58-26q9 14 1 34" fill="none" stroke="#745633" stroke-width="2" opacity=".64"/>'+
      '<path d="M278 25h48l-8 9 8 8h-48z" fill="#322329" stroke="#b28a57"/>'+
      '<path d="M77 120l22 20 20 2 20-15 210-2 37-12 36 2 22 15-14 9-8 31-28 31H130l-30-17z" fill="#271916" stroke="#171013" stroke-width="4"/>'+
      '<path d="M82 124l23 21 38-14 209-2 37-12 35 4 14 10-24 13-10 37-22 12H139l-29-15z" fill="'+(stage>3?'#81502d':'#63432c')+'" stroke="#c69851" stroke-width="'+(stage>3?4:2)+'"/>'+
      '<path d="M119 177l285-5m-277 14 267-4m-261 12 247-4" stroke="#382219" stroke-width="3"/>'+cells+
      (stage>1?'<path d="M371 130l12-18h30l10 16zM121 144l-11-19 31-13h19l-13 18z" fill="#65422b" stroke="#d1a363" stroke-width="2"/>':'')+
      (stage>2?'<path d="M373 106h45v7h-45zm-254 10h33v7h-33z" fill="#b28a49"/><path d="M394 85v26m9-22v22" stroke="#251a17" stroke-width="4"/>':'')+
      (stage>3?'<path d="M114 176h292" stroke="#e8b968" stroke-width="3"/><circle cx="147" cy="183" r="3" fill="#d6a75d"/><circle cx="370" cy="181" r="3" fill="#d6a75d"/>':'')+
      (stage>4?'<path d="M91 137l-33-17-10 5 32 29m342-17 40-15 9 5-44 26" fill="#a6763e" stroke="#261913" stroke-width="3"/><path d="M107 158h20m259 1h28" stroke="#ffd078" stroke-width="3"/>':'')+
      '</svg><span class="crew-vessel-flag crew-vessel-fallback-flag">'+flag(group.flag,'Bandeira da tripulação')+'</span><figcaption>Casco · Estágio '+stage+'</figcaption></figure>';
  }
  function renderMissions(group,compact=false){
    const missions=(group.missions||[]).filter(mission=>!compact||!mission.completedAt).slice(0,compact?1:20);
    const tasks={kills:'Derrote monstros elegíveis',donations:'Contribua com Berry',bosses:'Vença chefes elegíveis'};
    const cards=missions.map(mission=>'<article class="crew-mission"><strong>'+escape(mission.title)+'</strong><small>'+escape(tasks[mission.type]||'Missão coletiva')+' · Meta fixada para '+number(mission.capacity)+' vagas</small>'+progress(mission.progress,mission.target)+'<span>'+number(mission.xp)+' XP da tripulação'+(mission.completedAt?' · Creditado':' · Até '+escape(date(mission.endsAt)))+'</span></article>').join('');
    const future=compact?'':(group.futureMissions||[]).map(mission=>'<div class="crew-future"><b>'+escape(mission.title)+'</b><span>Expansão futura · '+number(mission.xp)+' XP da tripulação</span></div>').join('');
    return (cards||empty('Nenhuma missão ativa neste momento.'))+future;
  }
  function renderShip(group,activeFacility,art,compact=false){
    const level=id=>group.facilities[id]??1;
    const roomArt=(id,atLevel)=>art?.[id==='hull'?'bunks':id]?.[Math.min(2,atLevel)];
    const facilityImage=(id,atLevel,fallback)=>roomArt(id,atLevel)?'<img src="'+escape(roomArt(id,atLevel))+'" data-crew-art="facility" alt="" hidden><span aria-hidden="true">'+fallback+'</span>':'<span aria-hidden="true">'+fallback+'</span>';
    const controls='<div class="crew-facilities" role="group" aria-label="Instalações">'+Object.entries(facilities).map(([id,[name,,symbol]])=>'<button class="crew-facility" type="button" data-crew-facility="'+id+'" data-level="'+level(id)+'" aria-label="'+escape(name)+' Nv. '+number(level(id))+'" aria-pressed="'+(!compact&&id===activeFacility)+'">'+facilityImage(id,level(id),symbol)+'<strong>'+escape(facilityLabels[id])+'</strong><small>Nv. '+number(level(id))+'</small></button>').join('')+'</div>';
    if(compact)return vessel(group,art)+controls;
    const [name,benefit,symbol,bonus]=facilities[activeFacility];
    const project=(group.projects||[]).find(entry=>entry.facility===activeFacility&&entry.nextLevel);
    const boost=bonus?'<p>Benefício atual: '+escape(new Intl.NumberFormat('pt-BR',{style:'percent',maximumFractionDigits:1}).format(group.benefits?.[bonus]||0))+' · Aproveita profissão até o nível '+Math.min(10,level(activeFacility)*2)+'.</p>':'';
    const cost=project?'<small>Nível '+number(project.nextLevel)+' · Exige tripulação Nv. '+number(project.requiredCrewLevel)+' · '+number(project.cost)+' Berry</small>':'<small>Nível máximo</small>';
    const allowed=group.role==='captain'&&project&&group.level>=project.requiredCrewLevel&&Number(group.treasury)>=Number(project.cost);
    const action=project&&group.role==='captain'?button('upgrade','Iniciar obra',activeFacility,!allowed,'crew-primary'):'';
    const roomComparison=project&&activeFacility!=='hull'&&roomArt(activeFacility,project.nextLevel);
    const preview=project&&!roomComparison?vessel({...group,facilities:{...group.facilities,[activeFacility]:project.nextLevel}},art,true):'';
    const room=(roomLevel,label)=>'<figure data-level="'+roomLevel+'"><img class="crew-next-cabin" data-crew-art="facility" src="'+escape(roomArt(activeFacility,roomLevel))+'" alt="" hidden><figcaption>'+label+' · Nv. '+number(roomLevel)+'</figcaption></figure>';
    const nextArt=roomComparison?'<div class="crew-cabin-comparison">'+room(project.level,'Atual')+room(project.nextLevel,'Após a obra')+'</div>':'';
    const detail='<div class="crew-facility-detail"><div><strong>'+symbol+' '+escape(name)+'</strong><p>'+escape(benefit)+'</p>'+boost+cost+'</div>'+action+'</div>';
    return vessel(group,art)+controls+detail+(project?'<details class="crew-ship-preview"><summary>Prévia · '+escape(name)+' Nv. '+number(project.nextLevel)+'</summary>'+nextArt+preview+'</details>':'');
  }
  function renderProfession(data){
    if(!data)return empty('A profissão está indisponível. Tente atualizar a janela.');
    if(!data.profession)return section('Escolha uma profissão permanente','<p class="crew-muted">Sua profissão continua com o personagem quando você muda de tripulação.</p><div class="crew-choices">'+(data.choices||[]).map(choice=>'<article><strong>'+escape(choice.name)+'</strong><p>'+escape(choice.benefit)+'</p>'+button('profession','Escolher',choice.id)+'</article>').join('')+'</div>');
    const choice=data.choices?.find(profession=>profession.id===data.profession);
    return section(choice?.name||professions[data.profession]||'Minha profissão','<p><b>Nível '+number(data.level)+'</b> · '+number(data.experience)+' XP profissional</p>'+progress(data.experience,data.nextLevelXp,data.levelStartXp)+'<p>'+escape(choice?.benefit)+'</p><small>Os benefícios coletivos dependem da instalação e do especialista elegível de maior nível.</small>')+section('Contratos da semana',contracts(data));
  }
  function roster(group,selfId){
    return '<div class="crew-member-list">'+(group.members||[]).map(member=>{
      const own=member.id===selfId,isCaptain=group.role==='captain';
      const profession=member.profession?professions[member.profession.id]+' · Nv. '+number(member.profession.level):'Sem profissão';
      const description=(classes[member.classId]||member.classId)+' · Nv. '+number(member.level)+' · '+profession;
      const actions=isCaptain&&!own&&member.role!=='captain'?'<div class="crew-row-actions">'+button('role',member.role==='officer'?'Remover cargo':'Nomear oficial',member.id)+button('transfer','Transferir liderança',member.id)+button('kick','Expulsar',member.id,false,'crew-danger')+'</div>':'';
      return '<article class="crew-member"><div><strong>'+identity(group,member.name)+'</strong><small>'+escape(roles[member.role])+' · '+escape(description)+'</small><small>'+number(member.power)+' poder · '+number(member.contribution)+' Berry de contribuição</small></div>'+actions+'</article>';
    }).join('')+'</div>';
  }
  function requests(items,kind,locked=false){
    return (items||[]).map(item=>{
      const actions=kind==='outgoing'?'<small>Aguardando resposta</small>':'<div class="crew-row-actions">'+button('accept','Aceitar',item.id,locked&&kind==='invites','crew-primary')+button('decline','Recusar',item.id)+'</div>';
      const name=kind==='applications'?item.characterName:'['+item.crewTag+'] '+item.crewName;
      return row(name,'Expira em '+date(item.expiresAt),actions);
    }).join('')||empty(kind==='invites'?'Nenhum convite pendente.':'Nenhuma candidatura pendente.');
  }
  function recruitment(crew,group){
    const canRecruit=group.role==='captain'||group.role==='officer';
    const form=group.role==='captain'?'<form class="crew-form crew-inline-form" data-crew-form="recruitment"><label>Entrada<select name="policy"><option value="open"'+selected('open',group.policy)+'>Entrada livre</option><option value="approval"'+selected('approval',group.policy)+'>Por aprovação</option></select></label><label>Nível mínimo<input type="number" name="minLevel" min="1" max="1000" value="'+Number(group.minLevel)+'" required></label><button class="crew-button crew-primary" type="submit">Salvar política</button></form>':'';
    const invite=canRecruit?'<form class="crew-form crew-inline-form" data-crew-form="invite"><label>Convidar personagem<input name="name" required maxlength="40" placeholder="Nome do personagem" autocomplete="off"></label><button class="crew-button" type="submit">Enviar convite</button></form>':'';
    const manage=group.role==='captain'?button('dissolve','Dissolver tripulação',null,false,'crew-danger'):button('leave','Sair da tripulação',null,false,'crew-danger');
    return section('Recrutamento','<p>'+policyText(group.policy)+' · Nível '+number(group.minLevel)+'+</p>'+form+invite+(canRecruit?'<h4>Candidaturas recebidas</h4>'+requests(crew.applications?.filter(request=>request.direction==='incoming'),'applications'):'')+manage);
  }
  function treasury(crew,group){
    const remaining=Math.max(0,Number(crew.donation?.limit||0)-Number(crew.donation?.used||0));
    return section('Tesouraria','<div class="crew-treasury-balance">'+asset('assets/ui/inventory-final/berry.png')+'<b>'+number(group.treasury)+' Berry</b></div><p>Você já contribuiu com <b>'+number(crew.contribution)+' Berry</b>.</p><p>Disponível hoje: <b>'+number(remaining)+' Berry</b> · Nova cota em '+escape(date(crew.donation?.resetsAt))+'</p><form class="crew-form crew-inline-form" data-crew-form="donate"><label>Quantidade de Berry<input name="amount" type="number" min="1" max="'+remaining+'" required '+disabled(!remaining)+'></label><button type="submit" class="crew-button crew-primary"'+disabled(!remaining)+'>Doar Berry</button></form>')+
      section('Histórico da tesouraria',(group.history||[]).map(event=>row(event.kind==='upgrade'?'Obra · '+(facilities[event.facility]?.[0]||'Instalação'):'Doação',event.characterName+' · '+date(event.createdAt),'<b>'+(event.kind==='upgrade'?'−':'+')+number(Math.abs(Number(event.amount)))+' Berry</b>')).join('')||empty('A tesouraria ainda não tem movimentações.'));
  }
  function unbound(crew,profession,editor,view,draft,query){
    if(view==='profession')return '<div class="crew-panel-inner">'+button('back','Voltar ao recrutamento')+renderProfession(profession)+'</div>';
    const remainingMinutes=crew.blockedUntil?Math.max(0,Math.ceil((new Date(crew.blockedUntil)-new Date(crew.serverNow))/60000)):0;
    const locked=remainingMinutes>0;
    if(view==='create'&&!locked){
      return '<div class="crew-panel-inner">'+button('back','Voltar ao recrutamento')+section('Criar tripulação','<p class="crew-note">Nome, sigla e bandeira ficam permanentes após a criação.</p><form data-crew-form="create" class="crew-form"><div class="crew-create-fields"><label>Nome<input name="name" maxlength="32" minlength="3" required value="'+escape(draft.name)+'" autocomplete="off"></label><label>Sigla<input name="tag" maxlength="6" minlength="2" required pattern="[A-Za-z0-9]{2,6}" value="'+escape(draft.tag)+'" autocomplete="off"></label><label>Recrutamento<select name="policy"><option value="open"'+selected('open',draft.policy)+'>Entrada livre</option><option value="approval"'+selected('approval',draft.policy)+'>Por aprovação</option></select></label><label>Nível mínimo<input name="minLevel" type="number" min="1" max="1000" value="'+Number(draft.minLevel)+'" required></label></div>'+editor.markup+'<button class="crew-button crew-primary" type="submit">Revisar criação</button></form>')+'</div>';
    }
    const outgoing=(crew.applications||[]).filter(request=>request.direction==='own');
    const directory=(crew.listing||[]).map(group=>{
      const atCap=group.memberCount>=group.capacity;
      const description=policyText(group.policy)+' · '+group.memberCount+'/'+group.capacity+' vagas · Nv. '+group.minLevel+'+';
      const applied=outgoing.some(request=>request.crewId===group.id);
      return '<article class="crew-directory-card">'+flag(group.flag)+'<div><strong>['+escape(group.tag)+'] '+escape(group.name)+'</strong><small>'+escape(description)+'</small></div>'+button(group.policy==='open'?'join':'apply',applied?'Pendente':atCap?'Lotada':group.policy==='open'?'Entrar':'Candidatar-se',group.id,applied||atCap||locked&&group.policy==='open','crew-primary')+'</article>';
    }).join('');
    const block=locked?'<p class="crew-note" role="status">Novo vínculo disponível em '+Math.floor(remainingMinutes/60)+'h '+remainingMinutes%60+'min · '+escape(date(crew.blockedUntil))+'.</p>':'';
    return '<div class="crew-panel-inner">'+section('Sem tripulação',block+'<p class="crew-muted">Encontre uma tripulação ou reúna seus companheiros sob uma nova bandeira.</p><div class="crew-row-actions">'+button('create-view','Criar tripulação',null,locked,'crew-primary')+button('profession-view','Minha profissão')+'</div>')+
      section('Encontrar tripulação','<form class="crew-form crew-inline-form" data-crew-form="search"><label>Buscar por nome ou sigla<input name="query" maxlength="32" value="'+escape(query)+'" autocomplete="off"></label><button type="submit" class="crew-button">Buscar</button></form><div class="crew-directory">'+(directory||empty('Nenhuma tripulação encontrada.'))+'</div>')+
      section('Convites recebidos',requests(crew.invites,'invites',locked))+(outgoing.length?section('Minhas candidaturas',requests(outgoing,'outgoing')):'')+'</div>';
  }
  function bound(crew,profession,view,activeFacility,selfId,art){
    const group=crew.group;
    const header='<header class="crew-banner">'+flag(group.flag,'Bandeira da tripulação')+'<div><small>SUA TRIPULAÇÃO · '+escape(roles[group.role])+'</small><h2>['+escape(group.tag)+'] '+escape(group.name)+'</h2><p>Nv. '+number(group.level)+'</p>'+progress(group.xp,group.nextLevelXp,group.levelStartXp)+'</div><b>'+number(group.memberCount)+' / '+number(group.capacity)+'<small>membros</small></b></header>';
    let content;
    switch(view){
      case 'members':content=section('Membros',roster(group,selfId));break;
      case 'profession':content=renderProfession(profession);break;
      case 'missions':content=section('Missões coletivas',renderMissions(group));break;
      case 'contracts':content=section('Contratos profissionais',contracts(profession));break;
      case 'ship':content=section('Navio e instalações',renderShip(group,activeFacility,art));break;
      case 'treasury':content=treasury(crew,group);break;
      case 'store':content=section('Armazém comercial','<p>Instalação Nv. '+number(group.facilities.warehouse)+'</p>'+empty('O catálogo da loja da tripulação ainda não está disponível.'));break;
      case 'recruitment':content=recruitment(crew,group);break;
      default:content=section('Navio da tripulação',renderShip(group,activeFacility,art,true))+section('Missão coletiva atual',renderMissions(group,true));
    }
    const sidebar=view==='overview'?'<aside class="crew-overview-side">'+section('Tesouraria','<strong>'+number(group.treasury)+' Berry</strong>'+button('treasury-view','Ver tesouraria'))+section('Contratos profissionais',contracts(profession,{compact:true}))+'</aside>':'';
    return '<div class="crew-layout" data-overview="'+(view==='overview')+'"><nav class="crew-nav" aria-label="Áreas da tripulação">'+tabs.map(([id,label,symbol])=>'<button type="button" data-crew-view="'+id+'" aria-pressed="'+(view===id)+'"><span aria-hidden="true">'+symbol+'</span>'+escape(label)+'</button>').join('')+'</nav><div class="crew-panel-inner">'+header+content+'</div>'+sidebar+'</div>';
  }

  function create({body,read,command,confirm,onData,onError,selfId=()=>null,available=()=>true,art={}}){
    let active=false,phase='loading',data=null,query='',view='overview',facility='hull',busy=false;
    let timer=null,revision=0,pending=null,lastPaint='',error='',draft,editor;
    const resetDraft=()=>{draft={name:'',tag:'',policy:'open',minLevel:1};editor=flags.create();};
    resetDraft();
    const block=()=>body.querySelector('.crew-window');
    function paint(force=false){
      if(!active)return;
      if(!force&&(view==='create'||body.contains(document.activeElement)&&document.activeElement.matches('input,select,canvas')))return;
      const isOnline=available();
      const markup=!isOnline?section('Tripulações online',empty('Conecte seu personagem ao servidor para consultar a tripulação.')):
        phase==='loading'?section('Consultando o servidor','<p role="status">Verificando seu vínculo…</p>'):
        phase==='error'?section('Tripulações indisponíveis',empty('Não foi possível consultar o vínculo.')+button('retry','Tentar novamente')):
        data.crew.group?bound(data.crew,data.profession,view,facility,selfId(),art):unbound(data.crew,data.profession,editor,view,draft,query);
      const html='<div class="crew-window" aria-busy="'+busy+'">'+(error?'<p class="crew-note" role="alert">'+escape(error)+'</p>':'')+markup+'</div>';
      if(!force&&html===lastPaint&&block())return;
      lastPaint=html;
      const previous=body.querySelector('.crew-window'),scroll=previous?.scrollTop||0;
      const focused=previous?.contains(document.activeElement)?document.activeElement:null;
      const key=focused?.dataset.crewView||focused?.dataset.crewFacility;
      body.innerHTML=html;
      for(const artwork of body.querySelectorAll('[data-crew-art]')){
        if(artwork.complete&&artwork.naturalWidth)artwork.hidden=false;
        else artwork.addEventListener('load',()=>{artwork.hidden=false;},{once:true});
      }
      block().scrollTop=scroll;
      if(key)Array.from(body.querySelectorAll('[data-crew-view],[data-crew-facility]')).find(node=>(node.dataset.crewView||node.dataset.crewFacility)===key)?.focus({preventScroll:true});
      if(view==='create'&&phase==='ready')editor.mount(body);
    }
    async function refresh({showLoading=false}={}){
      if(!active||!available()){if(active)paint(true);return;}
      if(pending&&!showLoading)return pending;
      const request=++revision;
      if(showLoading){phase='loading';paint(true);}
      const operation=(async()=>{
        try{
          const fresh=await read(query);
          if(!active||request!==revision)return;
          if(!fresh?.crew||!Object.hasOwn(fresh.crew,'group'))throw new Error('crew_missing');
          if(data?.crew?.group?.id!==fresh.crew.group?.id){view='overview';facility='hull';}
          data=fresh;
          phase='ready';
          onData?.(data);
          paint();
        }catch(cause){
          if(!active||request!==revision)return;
          phase='error';
          paint(true);
          if(showLoading)onError?.(cause);
        }finally{
          if(request===revision)pending=null;
        }
      })();
      pending=operation;
      return operation;
    }
    async function send(action,payload){
      if(busy||!active||!available())return false;
      const frame=block();
      busy=true;
      error='';
      frame?.setAttribute('aria-busy','true');
      try{
        await command('crew.'+action,payload);
        if(active){
          if(action==='create'){resetDraft();view='overview';}
          await refresh({showLoading:true});
        }
        return true;
      }catch(cause){
        error=onError?.(cause)||'Não foi possível concluir a ação. Tente novamente.';
        if(active)paint(true);
        return false;
      }finally{
        busy=false;
        block()?.setAttribute('aria-busy','false');
      }
    }
    function review(title,message,action,payload,label,risky=false){
      confirm(title,message,()=>send(action,payload),label,risky);
    }
    function updateDraft(form){
      const fields=new FormData(form);
      draft={name:String(fields.get('name')||''),tag:String(fields.get('tag')||''),policy:String(fields.get('policy')||'open'),minLevel:Number(fields.get('minLevel')||1)};
    }
    body.addEventListener('input',event=>{
      if(active&&event.target.closest('[data-crew-form="create"]'))updateDraft(event.target.form);
    });
    body.addEventListener('submit',event=>{
      const form=event.target,action=form.dataset.crewForm;
      if(!active||!action)return;
      event.preventDefault();
      if(busy||!form.reportValidity())return;
      error='';
      const fields=new FormData(form);
      if(action==='search'){query=String(fields.get('query')||'').trim();void refresh({showLoading:true});return;}
      if(action==='create'){
        updateDraft(form);
        if(editor.value===flags.empty){
          error='Desenhe pelo menos um pixel para criar a bandeira.';
          paint(true);
          body.querySelector('[data-crew-draw]')?.focus();
          return;
        }
        const name=draft.name.trim().replace(/\s+/g,' '),tag=draft.tag.toUpperCase();
        review('Fundar ['+tag+'] '+name+'?','Revise o nome, a sigla e o desenho da bandeira. Eles ficarão permanentes após a criação.','create',{...draft,name,tag,flag:editor.value},'Criar tripulação');
        return;
      }
      if(action==='donate'){
        const amount=Number(fields.get('amount'));
        review('Confirmar doação?','Sua carteira enviará '+number(amount)+' Berry para a tesouraria.','donate',{amount},'Doar Berry');
      }else if(action==='recruitment')void send(action,{policy:fields.get('policy'),minLevel:Number(fields.get('minLevel'))});
      else if(action==='invite')void send(action,{name:String(fields.get('name')).trim()});
    });
    body.addEventListener('click',event=>{
      const node=event.target.closest('[data-crew-action],[data-crew-view],[data-crew-facility]');
      if(!active||!node||busy||node.disabled)return;
      const {crewAction:action,value,crewView,crewFacility}=node.dataset;
      if(crewView||crewFacility){
        if(crewView)view=crewView;
        if(crewFacility){facility=crewFacility;if(view==='overview')view='ship';}
        error='';
        paint(true);
        if(crewView)block().scrollTop=0;
        return;
      }
      if(action==='retry'){void refresh({showLoading:true});return;}
      if(['back','create-view','profession-view','treasury-view'].includes(action)){
        view={back:'overview','create-view':'create','profession-view':'profession','treasury-view':'treasury'}[action];
        error='';
        paint(true);
        block().scrollTop=0;
        return;
      }
      const group=data?.crew.group,member=group?.members.find(person=>person.id===value);
      const project=group?.projects?.find(entry=>entry.facility===value);
      switch(action){
        case 'join':case 'apply':void send(action,{crewId:value});break;
        case 'accept':case 'decline':void send('respond',{requestId:value,accept:action==='accept'});break;
        case 'role':if(member)void send('role',{memberId:value,role:member.role==='officer'?'member':'officer'});break;
        case 'transfer':if(member)review('Transferir liderança?','O novo capitão será '+member.name+'.','transfer',{memberId:value},'Transferir liderança',true);break;
        case 'kick':if(member)review('Expulsar membro?','Remover '+member.name+' da tripulação?','kick',{memberId:value},'Expulsar',true);break;
        case 'leave':review('Sair da tripulação?','Novos vínculos ficarão bloqueados por 12 horas.','leave',{},'Sair da tripulação',true);break;
        case 'dissolve':review('Dissolver tripulação?','Os membros perderão o vínculo. A tesouraria será encerrada e você só poderá entrar ou criar outra tripulação após 24 horas.','dissolve',{confirmed:true},'Dissolver tripulação',true);break;
        case 'upgrade':if(project)review('Confirmar obra?','Melhore '+facilities[value][0]+' para o nível '+project.nextLevel+' por '+number(project.cost)+' Berry da tesouraria.','upgrade',{facility:value,expectedLevel:project.level},'Iniciar obra');break;
        case 'profession':review('Escolher profissão permanente?',professions[value]+' será a profissão deste personagem.','profession',{profession:value},'Confirmar profissão');break;
      }
    });
    function open(){
      if(active){if(!block())paint(true);return;}
      active=true;
      error='';
      view='overview';
      facility='hull';
      void refresh({showLoading:true});
      timer=setInterval(()=>{if(!busy&&document.visibilityState!=='hidden')void refresh();},12000);
    }
    function close(){
      if(!active)return;
      active=false;
      ++revision;
      pending=null;
      data=null;
      query='';
      lastPaint='';
      clearInterval(timer);
      timer=null;
      resetDraft();
    }
    return {open,close,refresh};
  }

  root.MareCrewUI={create,icon,identity,flag,contracts,ranking};
  if(typeof module==='object')module.exports=root.MareCrewUI;
})(globalThis);
