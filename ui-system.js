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
  const confirmation=({title,message,acceptLabel,cancelLabel,danger})=>`<section class="confirmation-card" role="alertdialog" aria-modal="true" aria-labelledby="confirmationTitle" aria-describedby="confirmationMessage"><h2 id="confirmationTitle">${escape(title)}</h2><p id="confirmationMessage">${escape(message)}</p><footer>${button({label:cancelLabel,attributes:{'data-confirm-cancel':''}})}${button({label:acceptLabel,variant:danger?'danger':'primary',attributes:{'data-confirm-accept':''}})}</footer></section>`;
  const modalBindings=new Map(),focusOrigins=new WeakMap();
  const visible=el=>el&&!el.classList.contains('hidden')&&!el.hidden&&el.getClientRects().length>0;
  const focusable=el=>[...el.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]')].filter(e=>visible(e)&&!e.closest('[inert]'));
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
    if(el.closest?.('.ui-hd'))for(const b of el.querySelectorAll('.op-action,.op-best-btn,.op-pagination button'))b.classList.add('hd-control');
    for(const b of el.querySelectorAll('button'))if(!b.matches('.op-item,.op-equip-slot,.forge2-tile,.forge2-pearl,.forge2-material-slot,.talent-node,[data-talent-node],.voyage-ship,.island-card,.class-choice,.faction-choice,.close-button,.op-close,.ui-close'))b.classList.add('ui-button');
    for(const tab of el.querySelectorAll('.forge2-tabs,.op-tabs,.op-category-tabs,.voyage-region-tabs,.akuma-rank-tabs'))tab.classList.add('ui-tabs');
  }
  function mountHUD(){
    const app=document.getElementById('app'),action=document.querySelector('.action-row'),journey=document.getElementById('journeyHud');
    if(!app||!action||!journey||document.getElementById('hudUtilities'))return;
    const utilities=document.createElement('div');utilities.id='hudUtilities';app.append(utilities);
    // All fixed HUD surfaces share one stacking context, independent of canvas wrappers.
    for(const el of [document.getElementById('mainMenu'),document.querySelector('.action-panel'),document.getElementById('floatingChat'),journey,document.querySelector('.world-command'),document.getElementById('targetHud'),document.getElementById('floatingExpedition'),document.getElementById('floatingStatus')])if(el)app.append(el);
    const location=document.querySelector('.location-heading');if(location)utilities.append(location);
    const powerLabel=document.querySelector('.profile-power>span');powerLabel.textContent='Poder';powerLabel.title='Poder de combate';
    action.append(document.getElementById('hakiQuickCast'));
    const controls=document.createElement('div');controls.className='journey-controls';
    controls.append(document.getElementById('autoToggle'),document.getElementById('expeditionMini'));
    journey.querySelector('.journey-heading').after(controls);
    journey.querySelector('.journey-footer').append(document.getElementById('huntRoute'));
    document.querySelector('#usePotion .skill-icon').innerHTML='<img src="assets/ui/items-pixellab/potion.png?v=20261020" alt="" draggable="false">';
    document.getElementById('journeyToggle').querySelector('span:not(.journey-chevron)').textContent='Expedição';
    const chat=document.getElementById('floatingChat'),log=document.getElementById('gameLog');
    const tabBar=document.createElement('nav');tabBar.className='chat-tabs';tabBar.setAttribute('aria-label','Mensagens locais');
    tabBar.innerHTML='<button type="button" data-chat-channel="all" aria-pressed="true">Sistema</button><button type="button" data-chat-channel="notes" aria-pressed="false">Anotações</button>';
    chat.querySelector('.floating-title').after(tabBar);
    let channel='all',unread=0,wasMobile=null;
    function filter(){for(const line of log.children)line.hidden=channel==='notes'&&!line.textContent.includes('Anotação local:');}
    tabBar.addEventListener('click',e=>{const b=e.target.closest('[data-chat-channel]');if(!b)return;channel=b.dataset.chatChannel;tabBar.querySelectorAll('button').forEach(t=>t.setAttribute('aria-pressed',String(t===b)));filter();});
    function measure(){
      const r=document.querySelector('.topbar').getBoundingClientRect(),a=document.querySelector('.action-panel').getBoundingClientRect(),m=document.getElementById('mainMenu').getBoundingClientRect();
      const style=document.documentElement.style;style.setProperty('--profile-bottom',Math.ceil(r.bottom)+'px');style.setProperty('--rpg-action-height',Math.ceil(a.height)+'px');style.setProperty('--menu-bottom',Math.ceil(m.bottom)+'px');style.setProperty('--journey-height',Math.ceil(journey.getBoundingClientRect().height)+'px');style.setProperty('--utilities-bottom',Math.ceil(utilities.getBoundingClientRect().bottom)+'px');style.setProperty('--target-height',Math.ceil(document.getElementById('targetHud').getBoundingClientRect().height)+'px');
      style.setProperty('--profile-right',Math.ceil(r.right)+'px');style.setProperty('--menu-left',Math.floor(m.left)+'px');style.setProperty('--journey-reserved-bottom',Math.ceil(innerHeight-journey.getBoundingClientRect().top)+'px');
      const mobile=innerWidth<=760;if(mobile!==wasMobile){journey.classList.toggle('collapsed',mobile);document.getElementById('journeyToggle').setAttribute('aria-expanded',String(!mobile));journey.querySelector('.journey-chevron').textContent=mobile?'+':'−';wasMobile=mobile;}
    }
    const resize=new ResizeObserver(measure);for(const el of [document.querySelector('.topbar'),document.querySelector('.action-panel'),document.getElementById('mainMenu'),journey,utilities,document.getElementById('targetHud')])resize.observe(el);
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
    const observer=new MutationObserver(records=>{for(const r of records)if(r.type==='childList')for(const n of r.addedNodes)if(n.nodeType===1&&n.closest('#panelOverlay,#startOverlay,.confirmation-overlay,.ui-modal'))upgrade(n.parentElement||n);syncModals();});
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden']});
    upgrade(document.getElementById('startOverlay'));syncModals();
    document.addEventListener('keydown',e=>{const top=topModal();if(!top)return;if(e.key==='Tab'){const xs=focusable(top),first=xs[0],last=xs.at(-1);if(!xs.length){e.preventDefault();return;}if(e.shiftKey&&(document.activeElement===first||!top.contains(document.activeElement))){e.preventDefault();last.focus();}else if(!e.shiftKey&&(document.activeElement===last||!top.contains(document.activeElement))){e.preventDefault();first.focus();}e.stopPropagation();}
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
  root.MareUI={escape,button,card,notice,empty,tabs,slot,window:windowHTML,createWindow,open,close,destroy,confirmation,rememberFocus,restoreFocus,bindModal,upgrade,mountHUD,syncModals,inventoryGrid,inventoryPageAtResize};
  if(typeof document!=='undefined')document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
  if(typeof module!=='undefined')module.exports=root.MareUI;
})(globalThis);
