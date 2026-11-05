'use strict';
/* DOM-only presentation primitives. Never reads/writes game state or storage. */
((root)=>{
  const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const attrs=o=>Object.entries(o||{}).filter(([k])=>/^(data-[\w-]+|aria-[\w-]+|id|title|type|role|tabindex)$/.test(k)).map(([k,v])=>`${k}="${escape(v)}"`).join(' ');
  const button=({label,variant='secondary',disabled=false,attributes={}})=>`<button type="button" class="ui-button" data-variant="${escape(variant)}" ${disabled?'disabled':''} ${attrs(attributes)}>${escape(label)}</button>`;
  const card=({title,body=''})=>`<section class="ui-card"><h3>${escape(title)}</h3>${body}</section>`;
  const notice=({text,tone='info'})=>`<p class="ui-notice" data-tone="${escape(tone)}" role="${tone==='error'?'alert':'status'}">${escape(text)}</p>`;
  const empty=({title,description=''})=>`<div class="ui-empty"><strong>${escape(title)}</strong><p>${escape(description)}</p></div>`;
  const tabs=({label,items,selected,attribute='data-ui-tab'})=>`<nav class="ui-tabs" aria-label="${escape(label)}">${items.map(i=>button({label:i.label,disabled:i.disabled,attributes:{[attribute]:i.id,'aria-pressed':String(i.id===selected)}})).join('')}</nav>`;
  const slot=({label,image,selected=false,attributes={}})=>`<button type="button" class="ui-slot" aria-label="${escape(label)}" aria-pressed="${selected}" ${attrs(attributes)}><img src="${escape(image)}" alt="" draggable="false"></button>`;
  const windowHTML=({id,title,body=''})=>`<div id="${escape(id)}" class="overlay ui-modal hidden" data-ui-modal role="dialog" aria-modal="true" aria-labelledby="${escape(id)}-title"><section class="ui-window"><header class="ui-window-header"><h2 id="${escape(id)}-title">${escape(title)}</h2><button type="button" class="ui-close" data-ui-close aria-label="Fechar janela">×</button></header><div class="ui-window-body">${body}</div></section></div>`;
  const number=n=>Number.isFinite(n)?new Intl.NumberFormat('pt-BR',{maximumFractionDigits:2}).format(n):'—';
  const art=({icon,name=''})=>icon?'<span class="ui-art" data-art-status="loading"><img data-ui-art src="'+escape(icon)+'" alt="'+escape(name)+'" decoding="async" draggable="false"><span class="ui-art-fallback" aria-hidden="true">?</span></span>':'';
  const confirmation=({title,message,acceptLabel,cancelLabel,danger,model})=>{
    const m=model||{},costs=m.costs||[],changes=m.changes||[];
    return '<section class="confirmation-card" role="alertdialog" aria-modal="true" aria-labelledby="confirmationTitle" aria-describedby="confirmationMessage"><header><small>KAIZOKU IDLE · CONFIRMAÇÃO</small><h2 id="confirmationTitle">'+escape(m.title||title)+'</h2></header><div class="confirmation-content" role="region" aria-label="Resumo da operação" tabindex="0"><p id="confirmationMessage">'+escape(message||'Confira a seleção e os recursos antes de continuar.')+'</p>'+(m.subject?'<div class="confirmation-subject">'+art(m.subject)+'<div><strong>'+escape(m.subject.name)+'</strong><small>'+escape(m.subject.detail||'')+'</small></div></div>':'')+(costs.length?'<section class="confirmation-costs"><h3>'+(m.transfer?'SERÁ TRANSFERIDO':'SERÁ CONSUMIDO')+'</h3><div class="confirmation-cost-labels"><span>Recurso</span><span>Necessário</span><span>Disponível</span><span>Após</span></div>'+costs.map(c=>'<div class="confirmation-cost" '+(c.available<c.needed?'data-insufficient':'')+'>'+art(c)+'<div class="confirmation-resource"><strong>'+escape(c.name)+'</strong>'+(c.detail?'<small>'+escape(c.detail)+'</small>':'')+'</div><b>'+number(c.needed)+'</b><span>'+number(c.available)+'</span><span>'+number(c.remaining)+'</span></div>').join('')+'</section>':'')+(changes.length?'<section class="confirmation-changes"><h3>ALTERAÇÕES</h3>'+changes.map(x=>'<div><span>'+escape(x.name)+'</span><b>'+escape(x.before)+' → '+escape(x.after)+'</b></div>').join('')+'</section>':'')+(m.result?'<section class="confirmation-result"><h3>RESULTADO'+(m.chance!==undefined&&m.chance<1?' POSSÍVEL':'')+'</h3><strong>'+escape(m.result)+'</strong>'+(m.chance!==undefined?'<p class="confirmation-chance">Chance de sucesso <b>'+number(m.chance*100)+'%</b></p>':'')+(m.success?'<p>'+escape(m.success)+'</p>':'')+'</section>':'')+(m.failure?'<section class="confirmation-risk"><h3>EM CASO DE FALHA</h3><p>'+escape(m.failure)+'</p></section>':'')+(m.notice?'<p class="confirmation-note">'+escape(m.notice)+'</p>':'')+(m.error?notice({text:m.error,tone:'error'}):'')+'</div><footer>'+button({label:cancelLabel||'CANCELAR',attributes:{'data-confirm-cancel':''}})+button({label:m.acceptLabel||acceptLabel||'CONTINUAR',disabled:!!m.error,variant:danger?'danger':'primary',attributes:{'data-confirm-accept':''}})+'</footer></section>';
  };
  const inspectedImages=new WeakSet(),missingImages=new Set();
  function inspectImages(el){for(const im of el.querySelectorAll('img.item-icon,img[data-ui-art]')){
    if(inspectedImages.has(im))continue;inspectedImages.add(im);
    let settled=false;const state=ok=>{if(settled)return;settled=true;const wrapper=im.closest('.ui-art');if(wrapper){wrapper.dataset.artStatus=ok?'ready':'error';if(!ok){wrapper.setAttribute('role','img');wrapper.setAttribute('aria-label','Imagem indisponível: '+im.alt);}}else if(!ok){im.dataset.artStatus='error';const fallback=document.createElement('span');fallback.className='item-art-missing';fallback.setAttribute('role','img');fallback.setAttribute('aria-label','Imagem indisponível: '+im.alt);fallback.textContent='?';im.after(fallback);}if(!ok&&!missingImages.has(im.src)){missingImages.add(im.src);console.warn('Asset de interface indisponível:',im.getAttribute('src'));}};
    im.addEventListener('load',()=>state(true),{once:true});im.addEventListener('error',()=>state(false),{once:true});if(im.complete)state(im.naturalWidth>0);
  }}
  const selectBindings=new WeakMap();let activeSelect=null,selectSerial=0,swallowSelectClick=false;
  function closeSelect(restore=false){if(!activeSelect)return;const a=activeSelect;activeSelect=null;a.list.remove();a.trigger.setAttribute('aria-expanded','false');a.trigger.removeAttribute('aria-activedescendant');if(restore&&a.trigger.isConnected)a.trigger.focus({preventScroll:true});}
  function enhanceSelects(el){for(const select of el.querySelectorAll('select:not([multiple])')){
    if(selectBindings.has(select)){selectBindings.get(select).sync?.();continue;}if(select.size>1)continue;
    const wrap=document.createElement('span'),trigger=document.createElement('button'),id='ui-options-'+(++selectSerial),priorTab=select.getAttribute('tabindex');wrap.className='ui-select';trigger.type='button';trigger.className='ui-select-trigger';trigger.setAttribute('role','combobox');trigger.setAttribute('aria-haspopup','listbox');trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls',id);selectBindings.set(select,{trigger,wrap});select.before(wrap);wrap.append(select,trigger);select.classList.add('ui-select-native');select.setAttribute('tabindex','-1');select.setAttribute('aria-hidden','true');
    const label=()=>select.getAttribute('aria-label')||select.labels?.[0]?.textContent.trim()||select.title||'Selecionar opção';
    const sync=()=>{trigger.textContent=select.selectedOptions[0]?.textContent||'Selecionar';trigger.disabled=select.disabled||select.options.length===0;trigger.title=trigger.textContent;trigger.setAttribute('aria-label',label()+': '+trigger.textContent);if(priorTab!==null)trigger.tabIndex=Number(priorTab);};selectBindings.get(select).sync=sync;sync();select.addEventListener('change',()=>{sync();if(activeSelect?.select===select)closeSelect(true);});select.addEventListener('focus',()=>trigger.focus());
    function show(){
      closeSelect();if(select.disabled)return;const list=document.createElement('div');list.className='ui-select-list';list.id=id;list.setAttribute('role','listbox');list.setAttribute('aria-label',label());
      const options=Array.from(select.options);let current=Math.max(0,select.selectedIndex),search='',searchAt=0;
      const disabled=i=>options[i].disabled||options[i].parentElement?.disabled;
      options.forEach((o,i)=>{const row=document.createElement('div');row.id=id+'-'+i;row.className='ui-select-option';row.setAttribute('role','option');row.setAttribute('aria-selected',String(i===select.selectedIndex));row.setAttribute('aria-disabled',String(!!disabled(i)));row.textContent=o.textContent;row.title=o.textContent;row.addEventListener('pointerdown',e=>e.preventDefault());row.addEventListener('click',e=>{e.stopPropagation();choose(i);});list.append(row);});
      function highlight(i){current=i;Array.from(list.children).forEach((r,n)=>r.classList.toggle('is-focused',n===i));trigger.setAttribute('aria-activedescendant',id+'-'+i);list.children[i]?.scrollIntoView({block:'nearest'});}
      function choose(i){if(select.disabled){closeSelect(true);return;}if(disabled(i))return;select.selectedIndex=i;closeSelect(true);sync();const scope=select.closest('#dialogBody,#startOverlay,[data-ui-modal]')||document.body,position=Array.from(scope.querySelectorAll('select')).indexOf(select),identity=Array.from(select.attributes).filter(a=>a.name==='name'||a.name.startsWith('data-')).map(a=>[a.name,a.value]);select.dispatchEvent(new Event('input',{bubbles:true}));select.dispatchEvent(new Event('change',{bubbles:true}));queueMicrotask(()=>{if(trigger.isConnected){trigger.focus({preventScroll:true});return;}const choices=Array.from((scope.isConnected?scope:document.body).querySelectorAll('select')),replacement=select.id?document.getElementById(select.id):identity.length?choices.find(x=>identity.every(([k,v])=>x.getAttribute(k)===v)):choices[position];selectBindings.get(replacement)?.trigger.focus({preventScroll:true});});}
      const top=topModal(),z=top?Number(getComputedStyle(top).zIndex)||100:40;list.style.zIndex=String(z+2);(top||document.body).append(list);const r=trigger.getBoundingClientRect(),margin=8,spaceBelow=innerHeight-r.bottom-margin,spaceAbove=r.top-margin,above=spaceBelow<Math.min(list.scrollHeight,180)&&spaceAbove>spaceBelow,max=Math.max(48,Math.min(300,above?spaceAbove:spaceBelow));list.style.width=Math.min(Math.max(r.width,170),innerWidth-margin*2)+'px';list.style.maxHeight=max+'px';list.style.left=Math.max(margin,Math.min(r.left,innerWidth-list.offsetWidth-margin))+'px';list.style.top=(above?Math.max(margin,r.top-Math.min(list.scrollHeight,max)):r.bottom)+'px';
      activeSelect={select,trigger,list,key(e){if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();closeSelect(true);return;}if(e.key==='Tab'){closeSelect();return;}if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();e.stopImmediatePropagation();let next=e.key==='Home'?0:e.key==='End'?options.length-1:current+(e.key==='ArrowDown'?1:-1),step=e.key==='ArrowUp'||e.key==='End'?-1:1;while(next>=0&&next<options.length&&disabled(next))next+=step;if(next>=0&&next<options.length)highlight(next);return;}if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopImmediatePropagation();choose(current);return;}if(e.key.length===1&&!e.ctrlKey&&!e.metaKey){e.preventDefault();e.stopImmediatePropagation();const now=Date.now();search=now-searchAt>700?e.key:search+e.key;searchAt=now;const prefix=search.toLocaleLowerCase('pt-BR'),index=options.findIndex((o,i)=>!disabled(i)&&o.textContent.trim().toLocaleLowerCase('pt-BR').startsWith(prefix));if(index>=0)highlight(index);}}};trigger.setAttribute('aria-expanded','true');trigger.focus({preventScroll:true});highlight(current);
    }
    trigger.addEventListener('click',e=>{e.stopPropagation();if(activeSelect?.select===select)closeSelect();else show();});trigger.addEventListener('keydown',e=>{if(!activeSelect&&['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();e.stopPropagation();show();}});
  }}
  const modalBindings=new Map(),focusOrigins=new WeakMap();
  const visible=el=>el&&!el.classList.contains('hidden')&&!el.hidden&&el.getClientRects().length>0;
  const focusable=el=>[...el.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled):not([aria-hidden=true]),textarea:not(:disabled),a[href],[tabindex="0"]')].filter(e=>visible(e)&&!e.closest('[inert]'));
  const topModal=()=>[...document.querySelectorAll('#startOverlay,#panelOverlay,.confirmation-overlay,[data-ui-modal]')].filter(visible).sort((a,b)=>(Number(getComputedStyle(a).zIndex)||0)-(Number(getComputedStyle(b).zIndex)||0)).at(-1);
  function rememberFocus(el){if(!visible(el)){let prior=document.activeElement;if(prior?.closest('#characterQuickMenu'))prior=document.getElementById('characterMenuTrigger');if(prior?.closest('#modesQuickMenu'))prior=document.getElementById('modesMenuTrigger');if(prior?.closest('#captainQuickMenu'))prior=document.getElementById('captainMenuTrigger');focusOrigins.set(el,prior);}}
  function restoreFocus(el){syncModals();const prior=focusOrigins.get(el);if(prior?.isConnected&&!prior.closest('.hidden'))prior.focus({preventScroll:true});focusOrigins.delete(el);}
  function bindModal(el,onClose){
    if(!modalBindings.has(el)&&el.classList.contains('ui-modal'))el.addEventListener('click',e=>{if(e.target===el||e.target.closest('[data-ui-close]'))modalBindings.get(el)?.();});
    modalBindings.set(el,onClose);if(el.id==='panelOverlay')el.setAttribute('aria-labelledby','dialogTitle');
  }
  function open(el){rememberFocus(el);el.classList.remove('hidden');upgrade(el);syncModals();}
  function close(el){el.classList.add('hidden');restoreFocus(el);}
  function createWindow(options){
    if(!/^[a-zA-Z][\w-]*$/.test(options.id)||document.getElementById(options.id))throw Error('Use um id de janela válido e único.');
    const container=document.createElement('div');container.innerHTML=windowHTML(options);const el=container.firstElementChild;document.body.append(el);
    bindModal(el,()=>{close(el);options.onClose?.();});return el;
  }
  function destroy(el){close(el);modalBindings.delete(el);el.remove();}
  function upgrade(el){
    if(!el)return;inspectImages(el);enhanceSelects(el);
    if(el.closest?.('.ui-hd'))for(const b of el.querySelectorAll('.op-action,.op-best-btn,.op-pagination button'))b.classList.add('hd-control');
    for(const b of el.querySelectorAll('button'))if(!b.matches('.op-item,.op-equip-slot,.forge2-tile,.forge2-pearl,.forge2-material-slot,.talent-node,.constellation-node,[data-talent-node],.voyage-ship,.island-card,.class-choice,.faction-choice,.close-button,.op-close,.ui-close'))b.classList.add('ui-button');
    for(const tab of el.querySelectorAll('.forge2-tabs,.op-tabs,.op-category-tabs,.voyage-region-tabs,.akuma-rank-tabs'))tab.classList.add('ui-tabs');
  }
  function mountHUD(){
    const app=document.getElementById('app'),action=document.querySelector('.action-row'),journey=document.getElementById('journeyHud');
    if(!app||!action||!journey||document.getElementById('hudUtilities'))return;
    const utilities=document.createElement('div');utilities.id='hudUtilities';app.append(utilities);
    // All fixed HUD surfaces share one stacking context, independent of canvas wrappers.
    for(const el of [document.getElementById('mainMenu'),document.querySelector('.action-panel'),document.getElementById('floatingChat'),journey,document.querySelector('.world-command'),document.getElementById('targetHud'),document.getElementById('floatingExpedition'),document.getElementById('floatingStatus')])if(el)app.append(el);
    const location=document.querySelector('.location-heading');if(location)app.append(location);
    const powerLabel=document.querySelector('.profile-power>span');powerLabel.textContent='Poder';powerLabel.title='Poder de combate';
    action.append(document.getElementById('hakiQuickCast'));
    const controls=document.createElement('div');controls.className='journey-controls';
    controls.append(document.getElementById('autoToggle'));
    const expedition=document.getElementById('floatingExpedition'),summary=journey.querySelector('.journey-content'),entry=document.getElementById('expeditionMini');
    summary.classList.add('journey-summary');expedition.querySelector('.floating-title').after(summary);
    expedition.setAttribute('role','dialog');expedition.setAttribute('aria-modal','false');
    const expeditionTitle=expedition.querySelector('.floating-title>span');expeditionTitle.id='expeditionWindowTitle';expeditionTitle.textContent='Expedição';expedition.setAttribute('aria-labelledby',expeditionTitle.id);
    entry.classList.remove('hidden');entry.setAttribute('role','menuitem');entry.setAttribute('aria-controls','floatingExpedition');
    entry.querySelector('.mini-dot').outerHTML='<img src="assets/ui/hud-expedition/contract.png" width="24" height="24" alt="">';
    document.getElementById('modesQuickMenu').append(entry);
    journey.querySelector('.journey-heading').after(controls);
    expedition.querySelector('.journey-footer').append(document.getElementById('huntRoute'));
    document.getElementById('journeyToggle').firstChild.textContent='';
    document.getElementById('journeyToggle').querySelector('span:not(.journey-chevron)').textContent='Expedição';
    const launcher=document.getElementById('journeyToggle');launcher.setAttribute('aria-keyshortcuts','O');launcher.setAttribute('aria-controls','floatingExpedition');launcher.setAttribute('aria-expanded','false');launcher.querySelector('.journey-chevron').textContent='O';
    const reward=document.createElement('span');reward.className='journey-reward';reward.textContent='◆';reward.hidden=true;reward.setAttribute('aria-hidden','true');launcher.append(reward);
    const rewardObserver=new MutationObserver(()=>{
      const ready=document.getElementById('journeyAction').hasAttribute('data-claim')||document.getElementById('journeyProgress').textContent==='Baú disponível';
      reward.hidden=!ready;launcher.setAttribute('aria-label',ready?'Expedição: recompensa disponível (O)':'Expedição (O)');
    });
    rewardObserver.observe(summary,{childList:true,subtree:true,attributes:true,attributeFilter:['data-claim']});
    const chat=document.getElementById('floatingChat'),log=document.getElementById('gameLog');
    chat.querySelector('.floating-title>span').textContent='Canal do Porto';
    const xpHeading=document.querySelector('#huntXpTracker .hunt-xp-top span');
    if(xpHeading){xpHeading.textContent='XP/h';xpHeading.title='Experiência por hora';}
    const tabBar=document.createElement('nav');tabBar.className='chat-tabs';tabBar.setAttribute('aria-label','Mensagens locais');
    tabBar.innerHTML='<button type="button" data-chat-channel="all" aria-pressed="true">Geral</button><button type="button" data-chat-channel="system" aria-pressed="false">Sistema</button><button type="button" data-chat-channel="notes" aria-pressed="false">Anotações</button>';
    chat.querySelector('.floating-title').after(tabBar);
    let channel='all',unread=0;
    function filter(){
      for(const line of log.children){
        const note=line.classList.contains('local-note');
        line.hidden=(channel==='notes' && !note) || (channel==='system' && note);
      }
    }
    document.getElementById('chatForm').addEventListener('submit',()=>{
      if(channel==='system' && document.getElementById('chatInput').value.trim()){
        tabBar.querySelector('[data-chat-channel="notes"]').click();
      }
    },true);
    tabBar.addEventListener('click',e=>{const b=e.target.closest('[data-chat-channel]');if(!b)return;channel=b.dataset.chatChannel;tabBar.querySelectorAll('button').forEach(t=>t.setAttribute('aria-pressed',String(t===b)));filter();});
    const chatToggle=document.getElementById('chatCornerToggle');
    function measure(){
      const r=document.querySelector('.topbar').getBoundingClientRect(),a=document.querySelector('.action-panel').getBoundingClientRect(),m=document.getElementById('mainMenu').getBoundingClientRect();
      const style=document.documentElement.style;style.setProperty('--profile-bottom',Math.ceil(r.bottom)+'px');style.setProperty('--rpg-action-height',Math.ceil(a.height)+'px');style.setProperty('--menu-bottom',Math.ceil(m.bottom)+'px');style.setProperty('--journey-height',Math.ceil(journey.getBoundingClientRect().height)+'px');style.setProperty('--utilities-bottom',Math.ceil(utilities.getBoundingClientRect().bottom)+'px');style.setProperty('--target-height',Math.ceil(document.getElementById('targetHud').getBoundingClientRect().height)+'px');
      // Anchor the map to whichever port channel control is on screen.
      const channel=(chat.classList.contains('hud-open')?chat:chatToggle).getBoundingClientRect();
      style.setProperty('--channel-top',channel.top+'px');
      style.setProperty('--channel-left',channel.left+'px');
      style.setProperty('--profile-right',Math.ceil(r.right)+'px');style.setProperty('--menu-left',Math.floor(m.left)+'px');style.setProperty('--journey-reserved-bottom',Math.ceil(innerHeight-journey.getBoundingClientRect().top)+'px');
    }
    const resize=new ResizeObserver(measure);for(const el of [document.querySelector('.topbar'),document.querySelector('.action-panel'),document.getElementById('mainMenu'),journey,utilities,chat,chatToggle,document.getElementById('targetHud')])resize.observe(el);
    addEventListener('resize',measure,{passive:true});
    const observer=new MutationObserver(records=>{
      const dock=document.getElementById('mareMusicDock');if(dock&&dock.parentElement!==utilities)utilities.append(dock);
      let changed=false;for(const r of records){if(r.target===log&&r.addedNodes.length){changed=true;if(!chat.classList.contains('hud-open'))unread+=r.addedNodes.length;}}
      if(changed)filter();if(chat.classList.contains('hud-open'))unread=0;
      const chatButton=document.getElementById('chatCornerToggle');if(chatButton.dataset.unread!==String(Math.min(99,unread)))chatButton.dataset.unread=String(Math.min(99,unread));
      const auto=document.getElementById('autoToggle'),pressed=String(auto.classList.contains('active'));if(auto.getAttribute('aria-pressed')!==pressed)auto.setAttribute('aria-pressed',pressed);
    });
    observer.observe(app,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});measure();
  }
  let observedTop=null,noticeRoot=null;
  function syncModals(){
    if(activeSelect&&!activeSelect.select.isConnected)closeSelect();
    const top=topModal(),app=document.getElementById('app');if(!app)return;
    const chat=document.getElementById('floatingChat'),fallback=innerWidth<=760&&chat?.classList.contains('hud-open')?chat:app;
    const notices=document.getElementById('toastContainer')||noticeRoot,destination=top?.querySelector('.confirmation-card,.dialog,.ui-window')||fallback;
    if(notices)noticeRoot=notices;
    if(notices&&notices.parentElement!==destination)destination.append(notices);
    app.inert=!!top&&(top.classList.contains('confirmation-overlay')||!app.contains(top));
    for(const child of app.children)child.inert=!!top&&child!==top;
    for(const el of document.querySelectorAll('.ui-modal'))el.inert=!!top&&el!==top;
    if(top&&top!==observedTop&&!top.contains(document.activeElement)){const target=focusable(top)[0];target?.focus({preventScroll:true});}
    observedTop=top;
  }
  function boot(){
    const panel=document.getElementById('panelOverlay');panel?.setAttribute('aria-labelledby','dialogTitle');
    const observer=new MutationObserver(records=>{for(const r of records){if(r.type==='attributes'){const select=r.target.closest?.('select');if(select){selectBindings.get(select)?.sync?.();if(select.disabled&&activeSelect?.select===select)closeSelect();}}}for(const r of records)if(r.type==='childList'){const select=r.target.closest?.('select');if(select&&activeSelect?.select===select)closeSelect();}for(const r of records)if(r.type==='childList')for(const n of r.addedNodes)if(n.nodeType===1&&n.closest('#panelOverlay,#startOverlay,.confirmation-overlay,.ui-modal'))upgrade(n.parentElement||n);syncModals();});
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden','disabled','selected']});
    upgrade(document.getElementById('startOverlay'));syncModals();
    document.addEventListener('pointerdown',e=>{if(activeSelect&&!activeSelect.list.contains(e.target)&&!activeSelect.trigger.contains(e.target)){e.preventDefault();e.stopImmediatePropagation();swallowSelectClick=true;closeSelect(true);}},true);
    document.addEventListener('click',e=>{if(swallowSelectClick){swallowSelectClick=false;e.preventDefault();e.stopImmediatePropagation();}},true);
    addEventListener('resize',()=>closeSelect());document.addEventListener('scroll',e=>{if(activeSelect&&!activeSelect.list.contains(e.target))closeSelect();},true);
    document.addEventListener('keydown',e=>{if(activeSelect){activeSelect.key(e);if(e.defaultPrevented)return;}const top=topModal();if(!top)return;if(e.key==='Tab'){const xs=focusable(top),first=xs[0],last=xs.at(-1);if(!xs.length){e.preventDefault();return;}if(e.shiftKey&&(document.activeElement===first||!top.contains(document.activeElement))){e.preventDefault();last.focus();}else if(!e.shiftKey&&(document.activeElement===last||!top.contains(document.activeElement))){e.preventDefault();first.focus();}e.stopPropagation();}
      if(e.key==='Escape'&&modalBindings.has(top)){e.preventDefault();e.stopImmediatePropagation();modalBindings.get(top)();}
    },true);
  }
  // Inventory is a visual layout only: never modify the 120-item save capacity.
  const inventoryGrid=(viewportWidth)=>{
    const width=Number(viewportWidth)||0;
    const columns=width>1180?9:width>1024?8:width>760?7:width>=390?6:5;
    const rows=7;
    return {columns,rows,pageSize:columns*rows};
  };
  const inventoryPageAtResize=(page,oldPageSize,newPageSize)=>{
    const current=Math.max(0,Math.floor(Number(page)||0));
    return oldPageSize>0&&newPageSize>0?Math.floor(current*oldPageSize/newPageSize):current;
  };
  // Presentation only: callers supply the canonical power results.
  const inventoryNumericRows=rows=>rows.filter(row=>row.value!==0);
  const inventoryPowerState=({equipped=false,compatible=true,hasReference=false,beforePower,afterPower}={})=>{
    if(equipped)return {state:'equipped',delta:null};
    if(!compatible)return {state:'incompatible',delta:null};
    if(!hasReference)return {state:'empty',delta:null};
    if(!Number.isFinite(beforePower)||!Number.isFinite(afterPower))return {state:'unavailable',delta:null};
    const delta=afterPower-beforePower;
    return {state:delta>0?'better':delta<0?'worse':'equal',delta};
  };
  root.MareUI={escape,button,card,notice,empty,tabs,slot,window:windowHTML,createWindow,open,close,destroy,confirmation,art,inspectImages,rememberFocus,restoreFocus,bindModal,upgrade,mountHUD,syncModals,inventoryGrid,inventoryPageAtResize,inventoryNumericRows,inventoryPowerState};
  if(typeof document!=='undefined')document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
  if(typeof module!=='undefined')module.exports=root.MareUI;
})(globalThis);
