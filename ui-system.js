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
  const windowHTML=({id,title,body=''})=>`<section id="${escape(id)}" class="ui-window" role="dialog" aria-modal="true" aria-labelledby="${escape(id)}-title"><header class="ui-window-header"><h2 id="${escape(id)}-title">${escape(title)}</h2><button type="button" class="ui-close" data-ui-close aria-label="Fechar janela">×</button></header><div class="ui-window-body">${body}</div></section>`;
  const confirmation=({title,message,acceptLabel,cancelLabel,danger})=>`<section class="confirmation-card" role="alertdialog" aria-modal="true" aria-labelledby="confirmationTitle" aria-describedby="confirmationMessage"><h2 id="confirmationTitle">${escape(title)}</h2><p id="confirmationMessage">${escape(message)}</p><footer>${button({label:cancelLabel,attributes:{'data-confirm-cancel':''}})}${button({label:acceptLabel,variant:danger?'danger':'primary',attributes:{'data-confirm-accept':''}})}</footer></section>`;
  const modalBindings=new Map(),focusOrigins=new WeakMap();
  const visible=el=>el&&!el.classList.contains('hidden')&&!el.hidden&&el.getClientRects().length>0;
  const focusable=el=>[...el.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]')].filter(e=>visible(e)&&!e.closest('[inert]'));
  const topModal=()=>[...document.querySelectorAll('#startOverlay,#panelOverlay,.confirmation-overlay')].filter(visible).sort((a,b)=>Number(getComputedStyle(a).zIndex)-Number(getComputedStyle(b).zIndex)).at(-1);
  function rememberFocus(el){if(!visible(el)){let prior=document.activeElement;if(prior?.closest('#characterQuickMenu'))prior=document.getElementById('characterMenuTrigger');if(prior?.closest('#modesQuickMenu'))prior=document.getElementById('modesMenuTrigger');focusOrigins.set(el,prior);}}
  function restoreFocus(el){const prior=focusOrigins.get(el);if(prior?.isConnected&&!prior.closest('.hidden'))prior.focus({preventScroll:true});focusOrigins.delete(el);}
  function bindModal(el,onClose){modalBindings.set(el,onClose);el.setAttribute('aria-labelledby','dialogTitle');}
  function upgrade(el){
    for(const b of el.querySelectorAll('button'))if(!b.matches('.op-item,.op-equip-slot,.forge2-tile,.forge2-pearl,.forge2-material-slot,.talent-node,[data-talent-node],.voyage-ship,.island-card,.class-choice,.faction-choice,.close-button,.op-close'))b.classList.add('ui-button');
    for(const tab of el.querySelectorAll('.forge2-tabs,.op-tabs,.op-category-tabs,.voyage-region-tabs,.akuma-rank-tabs'))tab.classList.add('ui-tabs');
  }
  let observedTop=null;
  function syncModals(){
    const top=topModal(),app=document.getElementById('app');if(!app)return;
    app.inert=!!top?.classList.contains('confirmation-overlay');
    for(const child of app.children)child.inert=!!top&&child!==top;
    if(top&&top!==observedTop&&!top.contains(document.activeElement)){const target=focusable(top)[0];target?.focus({preventScroll:true});}
    observedTop=top;
  }
  function boot(){
    const panel=document.getElementById('panelOverlay');panel?.setAttribute('aria-labelledby','dialogTitle');
    const observer=new MutationObserver(records=>{for(const r of records)if(r.type==='childList')for(const n of r.addedNodes)if(n.nodeType===1&&n.closest('#panelOverlay,#startOverlay,.confirmation-overlay'))upgrade(n.parentElement||n);syncModals();});
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden']});
    upgrade(document.getElementById('startOverlay'));syncModals();
    document.addEventListener('keydown',e=>{const top=topModal();if(!top)return;if(e.key==='Tab'){const xs=focusable(top),first=xs[0],last=xs.at(-1);if(!xs.length){e.preventDefault();return;}if(e.shiftKey&&(document.activeElement===first||!top.contains(document.activeElement))){e.preventDefault();last.focus();}else if(!e.shiftKey&&(document.activeElement===last||!top.contains(document.activeElement))){e.preventDefault();first.focus();}e.stopPropagation();}
      if(e.key==='Escape'&&modalBindings.has(top)){e.preventDefault();e.stopImmediatePropagation();modalBindings.get(top)();}
    },true);
  }
  root.MareUI={escape,button,card,notice,empty,tabs,slot,window:windowHTML,confirmation,rememberFocus,restoreFocus,bindModal,upgrade};
  if(typeof document!=='undefined')document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
  if(typeof module!=='undefined')module.exports=root.MareUI;
})(globalThis);
