'use strict';
/* Shared, DOM-only tooltip presentation. Item rules and skill data stay with their owners. */
((root) => {
  const labels={attack:'Ataque',defense:'Defesa',hp:'Vida',energy:'Energia',crit:'Crítico',strength:'Força',dexterity:'Destreza',vitality:'Vitalidade',intelligence:'Inteligência',spirit:'Espírito',bonus_attack:'Ataque',bonus_defense:'Defesa',bonus_hp:'Vida',bonus_max_hp:'Vida máxima',bonus_energy:'Energia',bonus_crit:'Crítico',bonus_strength:'Força',bonus_dexterity:'Destreza',bonus_vitality:'Vitalidade',bonus_intelligence:'Inteligência',bonus_spirit:'Espírito',healing_received_percent:'Cura recebida',max_hp_percent:'Vida máxima',impact_resistance_percent:'Resistência a impacto',move_speed_percent:'Velocidade',evasion_percent:'Esquiva',physical_defense_percent:'Defesa física'};
  const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const percent=key=>key==='crit'||key==='bonus_crit'||key.endsWith('_percent');
  const display=(key,value)=>`${Number.isInteger(value)?value:Number(value.toFixed(2))}${percent(key)?'%':''}`;
  function filterCleanStats(stats){
    const flat={...stats,...(stats?.attributes||{})};delete flat.attributes;
    return Object.fromEntries(Object.entries(flat).filter(([key,value])=>labels[key]&&typeof value==='number'&&Number.isFinite(value)&&value!==0).map(([key,value])=>[key,percent(key)?value*100:value]));
  }
  function itemColumn(item,{equipped=false}={}){
    const rarity=item.rarity||'common',stats=filterCleanStats(item.stats||{}),allowed=item.allowed!==false;
    return `<section class="game-tip-column"><div class="game-tip-kicker">${equipped?'EQUIPADO AGORA':'ITEM EM FOCO'}</div><h3 class="game-tip-name rarity-${escape(rarity)}">${escape(item.name)}</h3><div class="game-tip-meta">${escape(item.rarityName||rarity)} · LV ${escape(item.level||1)}${item.rank?' · RANK '+escape(item.rank):''}</div>${item.className?`<div class="game-tip-class ${allowed?'allowed':'blocked'}">Somente ${escape(item.className)}</div>`:''}<div class="game-tip-stats">${Object.entries(stats).map(([key,value])=>`<div><span>${escape(labels[key])}</span><b>+${escape(display(key,value))}</b></div>`).join('')||'<div class="game-tip-muted">Sem bônus de atributo</div>'}</div>${item.power!=null?`<div class="game-tip-power">⚡ ${escape(item.power)}</div>`:''}${item.description?`<p class="game-tip-description">${escape(item.description)}</p>`:''}${item.origin?`<div class="game-tip-muted">Origem: ${escape(item.origin)}</div>`:''}</section>`;
  }
  function comparison(hovered,equipped){
    const left=filterCleanStats(hovered.stats||{}),right=filterCleanStats(equipped.stats||{});
    const rows=[...new Set([...Object.keys(left),...Object.keys(right)])].map(key=>[key,(left[key]||0)-(right[key]||0)]).filter(([,delta])=>Math.abs(delta)>1e-9);
    const score=(hovered.power||0)-(equipped.power||0);
    return `<div class="game-tip-compare"><strong>Comparando com ${escape(equipped.typeName||'o item')} equipado.</strong>${rows.map(([key,delta])=>`<div><span>${escape(labels[key])}</span><b class="${delta>0?'positive':'negative'}">${delta>0?'+':'−'}${escape(display(key,Math.abs(delta)))}</b></div>`).join('')||'<div class="game-tip-muted">Atributos iguais</div>'}<div class="game-tip-score"><span>⚡ Poder</span><b class="${score>0?'positive':score<0?'negative':'neutral'}">${score>0?'+':score<0?'−':''}${Math.abs(score)}</b></div></div>`;
  }
  function itemHTML(hovered,equipped){
    const left=itemColumn(hovered).replace('</section>',`${equipped?comparison(hovered,equipped):''}</section>`);
    return `<div class="game-tooltip-grid ${equipped?'with-comparison':''}">${left}${equipped?itemColumn(equipped,{equipped:true}):''}</div>`;
  }
  function skillHTML(skill){
    const description=escape(skill.description||'').replace(/(\d+(?:[.,]\d+)?\s*(?:%|s|tiles?)?)/gi,'<strong class="game-tip-number">$1</strong>');
    const tone=skill.damageType==='magic'?'magic':skill.damageType==='physical'?'physical':'';
    return `<section class="game-tip-skill ${tone}"><div class="game-tip-kicker">${skill.passive?'TALENTO PASSIVO':'HABILIDADE '+escape(skill.key||'')}</div><h3 class="game-tip-name">${escape(skill.name)}</h3><div class="game-tip-skill-meta">${skill.passive?'<span>Efeito permanente</span>':`<span>Recarga <b>${skill.cooldown?escape(skill.cooldown)+'s':'Sem recarga'}</b></span><span>Custo <b>${skill.costText?escape(skill.costText):skill.cost?`${escape(skill.cost)} ${escape(skill.resource||'Energia')}`:'Sem custo'}</b></span>`}</div><p>${description}</p></section>`;
  }
  function attach(resolve){
    const node=document.createElement('div');node.id='gameTooltip';node.className='game-tooltip hidden';node.setAttribute('role','tooltip');document.body.append(node);
    let target=null;
    function place(x,y){const gap=16,margin=8;node.style.left='0px';node.style.top='0px';const box=node.getBoundingClientRect();let left=x+gap,top=y+gap;if(left+box.width>innerWidth-margin)left=x-box.width-gap;if(top+box.height>innerHeight-margin)top=y-box.height-gap;node.style.left=`${Math.max(margin,Math.min(left,innerWidth-box.width-margin))}px`;node.style.top=`${Math.max(margin,Math.min(top,innerHeight-box.height-margin))}px`;}
    function show(element,event){const data=resolve(element);if(!data){hide();return;}target=element;node.innerHTML=data.kind==='skill'?skillHTML(data.skill):itemHTML(data.item,data.equipped);node.classList.remove('hidden');element.setAttribute('aria-describedby','gameTooltip');const rect=element.getBoundingClientRect();place(event?.clientX??rect.right,event?.clientY??rect.top);}
    function hide(){if(target)target.removeAttribute('aria-describedby');target=null;node.classList.add('hidden');}
    const selector='[data-item], [data-inv-slot], [data-talent-select], [data-haki-toggle], [data-haki-cast], #skill1, #skill2, #skill3, #zoanTransform';
    document.addEventListener('pointerover',event=>{const element=event.target.closest?.(selector);if(element&&element!==target)show(element,event);});
    document.addEventListener('pointermove',event=>{if(target){if(!target.isConnected){hide();return;}place(event.clientX,event.clientY);}});
    document.addEventListener('pointerout',event=>{if(target&&event.target.closest?.(selector)===target&&!target.contains(event.relatedTarget))hide();});
    document.addEventListener('focusin',event=>{const element=event.target.closest?.(selector);if(element)show(element);});
    document.addEventListener('focusout',event=>{if(event.target===target)hide();});
    document.addEventListener('scroll',()=>{if(target)hide();},true);
    return {hide,refresh(){if(target?.isConnected)show(target);else hide();}};
  }
  root.MareTooltips={filterCleanStats,itemHTML,skillHTML,attach};
  if(typeof module!=='undefined')module.exports=root.MareTooltips;
})(globalThis);
