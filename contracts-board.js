'use strict';
((root)=>{
  const periodConfig={
    daily:{label:'Diários',heading:'DIÁRIAS',ids:['crab','bandit','boss','dawn-patrol','dawn-clear','conchas-patrol','conchas-clear','orange-patrol','orange-clear','rare-patrol'],recurrence:'once',resetPolicy:null,finalReward:{itemId:null,quantity:null},icon:'daily'},
    weekly:{label:'Semanais',heading:'SEMANAIS',ids:[],recurrence:null,resetPolicy:null,finalReward:{itemId:null,quantity:null},icon:'weekly'},
    monthly:{label:'Mensais',heading:'MENSAIS',ids:[],recurrence:null,resetPolicy:null,finalReward:{itemId:null,quantity:null},icon:'monthly'}
  };
  const missionIcons={crab:'crab',bandit:'corsair',boss:'boss','dawn-clear':'boss'};
  const artPath='assets/ui/contracts-hd/';
  const E=value=>root.MareUI.escape(value),number=value=>Number(value).toLocaleString('pt-BR');
  const image=(key,cls='')=>'<img class="contract-icon '+cls+'" src="'+artPath+key+'.png" alt="" draggable="false">';
  function snapshot({quests=[],period='daily',progress=()=>0,claimed=[]},config=periodConfig){
    const key=config[period]?period:'daily',category=config[key],ids=new Set(category.ids),received=new Set(claimed);
    const seen=new Set();
    const rows=quests.filter(q=>{if(!ids.has(q.id)||seen.has(q.id))return false;seen.add(q.id);return true;}).map(q=>{
      const target=Number.isFinite(q.target)&&q.target>0?q.target:0,raw=Number(progress(q)),current=Number.isFinite(raw)?Math.max(0,Math.min(target,raw)):0;
      const taken=received.has(q.id),complete=taken||(target>0&&current>=target);
      return {...q,target,current:taken?target:current,ratio:target?(taken?1:current/target):0,claimed:taken,complete,status:taken?'claimed':complete?'ready':'ongoing',icon:missionIcons[q.id]||'patrol'};
    });
    const total=rows.length,completed=rows.filter(q=>q.complete).length;
    return {period:key,category,rows,total,completed,ratio:total?completed/total:0,complete:total>0&&completed===total};
  }
  function stateLabel(status){return {claimed:'RECOMPENSA RECEBIDA',ready:'OBJETIVO CONCLUÍDO',ongoing:'EM ANDAMENTO'}[status];}
  function card(row){
    return '<article class="contract-card" data-contract-id="'+E(row.id)+'" data-state="'+row.status+'"><div class="contract-card-head"><div class="contract-emblem">'+image(row.icon)+'</div><div><h3>'+E(row.title)+'</h3><p>'+E(row.desc)+'</p></div></div><div class="contract-progress-row"><div class="contract-progress" role="progressbar" aria-label="Progresso de '+E(row.title)+'" aria-valuemin="0" aria-valuemax="'+row.target+'" aria-valuenow="'+row.current+'"><i style="width:'+(row.ratio*100)+'%"></i></div><b data-contract-count>'+number(row.current)+' / '+number(row.target)+'</b></div><div class="contract-card-foot"><div class="contract-rewards" aria-label="Recompensas">'+(Number.isFinite(row.gold)?'<span><img src="assets/ui/inventory-final/berry.png" alt="" draggable="false"><b>'+number(row.gold)+'</b> Berry</span>':'')+(Number.isFinite(row.xp)?'<span>'+image('xp')+'<b>'+number(row.xp)+'</b> XP</span>':'')+'</div><div class="contract-action">'+action(row)+'</div></div></article>';
  }
  function action(row){return row.status==='ready'?'<button type="button" class="contract-claim ui-button" data-claim="'+E(row.id)+'" aria-label="Resgatar recompensa de '+E(row.title)+'" title="Objetivo concluído · recompensa disponível">'+image('ready')+'<span>RESGATAR</span></button>':'<span class="contract-state">'+(row.claimed?image('received'):'')+stateLabel(row.status)+'</span>';}
  function listHTML(view){return view.rows.length?view.rows.map(card).join(''):'<div class="contracts-empty"><h3>Nenhum contrato '+(view.period==='weekly'?'semanal':view.period==='monthly'?'mensal':'diário')+' disponível</h3><p>Volte mais tarde para consultar novos contratos.</p></div>';}
  function render(data){
    const view=snapshot(data);
    return '<section class="contracts-board ui-hd" data-contract-board data-contract-period-view="'+view.period+'"><div class="contracts-main"><nav class="contracts-tabs" aria-label="Período dos contratos">'+Object.entries(periodConfig).map(([key,c])=>'<button type="button" class="contract-tab ui-button" data-contract-period="'+key+'" aria-pressed="'+(key===view.period)+'">'+image(c.icon)+'<span>'+c.heading+'</span></button>').join('')+'</nav><div class="contracts-list" aria-label="Contratos '+E(view.category.label.toLowerCase())+'">'+listHTML(view)+'</div><footer class="contracts-footer"><div class="contracts-total"><div class="contracts-total-heading">'+image('progress')+'<h3 data-contract-summary-title>PROGRESSO DE CONCLUSÃO — '+view.category.heading+'</h3></div><div class="contract-progress-row"><div class="contract-progress" data-contract-total-bar role="progressbar" aria-label="Contratos concluídos na categoria" aria-valuemin="0" aria-valuemax="'+view.total+'" aria-valuenow="'+view.completed+'"><i style="width:'+(view.ratio*100)+'%"></i></div><b data-contract-total>'+view.completed+' / '+view.total+'</b></div></div><div class="contracts-final" aria-label="Recompensa final ainda não definida"><div class="contracts-final-slot">'+image('mystery')+'</div><div><h3>RECOMPENSA FINAL</h3><strong>A DEFINIR</strong></div></div></footer></div><aside class="contracts-art" aria-hidden="true"><img src="'+artPath+'nami-approved.png" alt="" draggable="false"></aside></section>';
  }
  const cached=new WeakMap();
  function refresh(body,data){
    const board=body.querySelector('[data-contract-board]');if(!board)return;
    const view=snapshot(data),list=board.querySelector('.contracts-list');
    const layoutKey=JSON.stringify([view.period,view.rows.map(q=>[q.id,q.title,q.desc,q.target,q.gold,q.xp,q.icon])]);
    let state=cached.get(board);
    if(!state||state.key!==layoutKey){const sameInitial=!state&&board.dataset.contractPeriodView===view.period;
      if(!sameInitial)list.innerHTML=listHTML(view);
      state={key:layoutKey,rows:new Map([...list.querySelectorAll('[data-contract-id]')].map(el=>[el.dataset.contractId,el]))};cached.set(board,state);
      board.dataset.contractPeriodView=view.period;list.setAttribute('aria-label','Contratos '+view.category.label.toLowerCase());
    }
    for(const row of view.rows){
      const el=state.rows.get(row.id);if(!el)continue;
      const count=number(row.current)+' / '+number(row.target),counter=el.querySelector('[data-contract-count]'),bar=el.querySelector('[role=progressbar]');
      if(counter.textContent!==count)counter.textContent=count;
      if(bar.getAttribute('aria-valuenow')!==String(row.current)){bar.setAttribute('aria-valuenow',row.current);bar.firstElementChild.style.width=(row.ratio*100)+'%';}
      if(el.dataset.state!==row.status){el.dataset.state=row.status;el.querySelector('.contract-action').innerHTML=action(row);}
    }
    for(const tab of board.querySelectorAll('[data-contract-period]')){const pressed=String(tab.dataset.contractPeriod===view.period);if(tab.getAttribute('aria-pressed')!==pressed)tab.setAttribute('aria-pressed',pressed);}
    const title=board.querySelector('[data-contract-summary-title]'),heading='PROGRESSO DE CONCLUSÃO — '+view.category.heading;
    if(title.textContent!==heading)title.textContent=heading;
    const total=board.querySelector('[data-contract-total]'),count=view.completed+' / '+view.total;
    if(total.textContent!==count)total.textContent=count;
    const bar=board.querySelector('[data-contract-total-bar]');if(bar.getAttribute('aria-valuenow')!==String(view.completed)||bar.getAttribute('aria-valuemax')!==String(view.total)){bar.setAttribute('aria-valuenow',view.completed);bar.setAttribute('aria-valuemax',view.total);bar.firstElementChild.style.width=(view.ratio*100)+'%';}
  }
  root.MareContractsBoard={periodConfig,snapshot,render,refresh};
  if(typeof module!=='undefined')module.exports=root.MareContractsBoard;
})(globalThis);
