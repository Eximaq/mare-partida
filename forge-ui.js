'use strict';
/* One view, shared visual selection; mutations remain in MareForge.execute. */
((root)=>{
  const studioAttributes=['strength','dexterity','vitality','intelligence','spirit'];
  const combatGlyphs=Object.freeze({
    energy:{color:'#7fd9ff',path:'M14 1 4 14h6l-1 9 11-14h-7z'},
    crit:{color:'#ffd581',path:'M12 2v4m0 12v4M2 12h4m12 0h4m-4 0a6 6 0 1 1-12 0 6 6 0 0 1 12 0ZM12 10v4m-2-2h4'},
    attackSpeedPercent:{color:'#83debf',path:'M3 7h11m-7 5h10M3 17h11m1-14 6 9-6 9'},
    critDamage:{color:'#ffae8d',path:'m12 2 2.2 6.6 6.5-2.9-3 6.3 4.3 4.9-6.7.1L12 23l-2.4-6-6.6.1 4.6-5-3.1-6.2 6.2 2.8z'}
  });
  function render({game,defs,item,ui,result,derive,icon,escapeHTML:E,fmt}){
    const F=root.MareForge,r=item?F.rarity[item.rarity]:null,definition=item?defs[item.def]:null;
    const uiGlyph=name=>{const source=['upgrade','imbue','fusion','reforge'].includes(name)?'assets/ui/forge-hd/'+name+'.png':'assets/ui/inventory-final/icons/'+name+'.png';return '<img class="forge-hd-icon" src="'+source+'" alt="" draggable="false">';};
    const bonusGlyph=stat=>{
      if(studioAttributes.includes(stat))return '<img class="forge-hd-icon" src="assets/ui/character-studio/attributes/'+stat+'.png" alt="" draggable="false">';
      if(stat==='hp')return uiGlyph('heart');
      const glyph=Object.hasOwn(combatGlyphs,stat)?combatGlyphs[stat]:null;
      return glyph?'<svg class="forge-hd-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="'+glyph.path+'" fill="'+(stat==='energy'?glyph.color:'none')+'" stroke="'+glyph.color+'" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>':'';
    };
    const emptySlot='<svg class="forge-hd-plus" viewBox="0 0 32 32" aria-hidden="true"><path d="M16 5v22M5 16h22" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>';
    const fusionArrow='<svg class="forge-hd-arrow" viewBox="0 0 48 40" aria-hidden="true"><path d="M17 3h14v17h10L24 37 7 20h10Z" fill="#e9b24a" stroke="#ffe1a1" stroke-width="2"/></svg>';

    const slotNames={weapon:'Arma',head:'Cabeça',necklace:'Colar',coat:'Peitoral',legs:'Calça',boots:'Pés',cloak:'Capa',gloves:'Mãos',ring:'Anel',belt:'Cinto',charm:'Acessório'};
    const gears=[...Object.values(game.equipment).filter(i=>F.isGear(i,defs)).map(i=>({item:i,where:'equipped'})),...game.inventory.filter(i=>F.isGear(i,defs)).map(i=>({item:i,where:'bag'}))];
    const fusionGear=ui.tab==='fusion'&&ui.fusionMode!=='pearls',ids=(ui.fusionIds||[]).filter(Boolean),filters=ui.filters||{};
    const repairing=ui.tab==='repair';
    const condition=i=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:3}).format(F.durabilityOf(i)/F.hitsPerPercent)+'%';
    const dismantling=ui.tab==='dismantle',dismantleIds=ui.dismantleIds||[];
    const selectedRarity=gears.find(x=>ids.includes(x.item.id))?.item.rarity;
    const blocked=i=>ids.includes(i.id)?'Este equipamento já está em um slot':i.locked?'Item bloqueado':!game.inventory.some(x=>x.id===i.id)?'Equipado: retire para usar na fusão':i.sockets.some(Boolean)?'Remova as pérolas antes de fundir':['legendary','supreme'].includes(i.rarity)?'Receita de Supremo ainda não habilitada':selectedRarity&&i.rarity!==selectedRarity?'Selecione a mesma raridade':ids.length>=5&&!ids.includes(i.id)?'Cinco itens já selecionados':'';
    const canPay=c=>!!c&&game.gold>=c.gold&&game.materials>=(c.materials||0);
    const action=(type,label,reason='',extra='')=>`<button type="button" class="dialog-button forge2-action" data-forge-action="${type}" data-forge-seq="${game.forgeSeq}" ${type==='upgrade'?`data-forge="${definition?.slot||'weapon'}"`:''} ${extra} ${reason?'disabled':''}>${uiGlyph(type==='upgrade'?'upgrade':type==='imbue'?'imbue':type==='fuse'||type==='fuseEquipment'?'fusion':type==='dismantle'?'bag':type==='remove'?'down':'reforge')}<span>${label}</span></button>${reason&&type!=='reforgeLine'?`<small class="forge2-disabled-reason">${E(reason)}</small>`:''}`;
    const unavailable=c=>canPay(c)?'':c?.materials?'Recursos insuficientes.':'Berry insuficientes.';
    const amount=x=>['crit','attackSpeedPercent','critDamage'].includes(x.stat)?(x.value*100).toFixed(2)+'%':fmt(x.value);
    const extras=list=>`<ul class="forge2-extras">${(list||[]).map(x=>`<li><span>${bonusGlyph(x.stat)}${F.names[x.stat]||E(x.stat)}</span><b>+${amount(x)}</b></li>`).join('')}</ul>`;
    const resourceCost=(label,art,cost,stock)=>{
      const missing=cost-stock;
      return `<div class="forge-hd-cost">
        ${art}<span><b>${fmt(cost)}</b> ${label}</span>${missing>0?`<small>${missing===1?'Falta':'Faltam'} ${fmt(missing)}</small>`:''}
      </div>`;
    };
    const costs=c=>`<section class="forge2-costs" aria-label="Custo">
      <span class="forge-cost-label" aria-hidden="true">Custo</span>
      <div class="forge-hd-cost-items">
        ${resourceCost('Berry','<img src="assets/ui/inventory-final/berry.png" alt="">',c.gold,game.gold)}
        ${c.materials===undefined?'':resourceCost(c.materials===1?F.itemFragment.name:'Fragmentos de Item',icon(F.itemFragment.iconKey,''),c.materials,game.materials)}
      </div>
    </section>`;
    function reforgeChanges(){
      if(!result?.before||!result.after||!['reforge','reforgeLine'].includes(result.type))return '';
      const rows=result.before.flatMap((before,index)=>{
        const after=result.after[index];
        return after&&(before.stat!==after.stat||before.value!==after.value)?[{before,after}]:[];
      });
      if(!rows.length)return '<p class="forge-reforge-delta-empty">Atributos sem alteração.</p>';
      const cell=x=>`<td><span>${bonusGlyph(x.stat)}<span>${F.names[x.stat]}</span><b>+${amount(x)}</b></span></td>`;
      return `<table class="forge-reforge-delta" aria-label="Atributos alterados">
        <thead><tr><th scope="col">Antes</th><th scope="col">Depois</th></tr></thead>
        <tbody>${rows.map(({before,after})=>`<tr>${cell(before)}${cell(after)}</tr>`).join('')}</tbody>
      </table>`;
    }
    const preview=changed=>{
      const a=F.itemStats(item,defs),b=F.itemStats(changed,defs),compatible=definition.slot!=='weapon'||definition.type===game.classId;
      const before=derive(game),after=compatible?derive({...game,equipment:{...game.equipment,[definition.slot]:changed}}):before;
      const row=(glyph,label,a,b)=>`<div><span class="forge-stat-label">${glyph}${E(label)}</span><b>${a}</b><span class="forge-stat-arrow" aria-hidden="true">→</span><em>${b}</em></div>`;
      return `<section class="forge2-preview"><h4>${uiGlyph('anchor')}${ui.tab==='upgrade'?'Prévia do aprimoramento':'Prévia ao equipar'}</h4><div class="forge-preview-labels" aria-hidden="true"><span></span><span>Atual</span><span></span><span>Após</span></div>${[['attack','Ataque','attack'],['defense','Defesa','shield'],['hp','Vida','heart']].map(([k,n,glyph])=>row(uiGlyph(glyph),n,fmt(a[k]),fmt(b[k]))).join('')}${ui.tab==='imbue'?F.keys.map(k=>row(bonusGlyph(k),F.names[k],before.attributes[k],after.attributes[k])).join(''):''}${compatible?row(uiGlyph('power'),'Poder de Combate',fmt(before.power),fmt(after.power)):'<div><span class="forge-stat-label">'+uiGlyph('power')+'Poder de Combate</span><b class="forge-stat-message">Arma de outra classe</b></div>'}</section>`;
    };
    const filterSelect=(key,label,options)=>`<label>${label}<select data-forge-filter="${key}"><option value="">Todos</option>${options.map(([v,n])=>`<option value="${v}" ${filters[key]===v?'selected':''}>${n}</option>`).join('')}</select></label>`;
    const matched=gears.filter(({item:i,where})=>(!repairing||F.hasDurability(i,defs))&&(!fusionGear||where==='bag')&&(!dismantling||where==='bag'&&F.dismantleReturn(i,game,defs)>0)&&(!filters.search||defs[i.def].name.toLocaleLowerCase('pt-BR').includes(filters.search.toLocaleLowerCase('pt-BR')))&&(!filters.rarity||i.rarity===filters.rarity)&&(!filters.slot||defs[i.def].slot===filters.slot)&&(dismantling||!filters.where||where===filters.where)&&(!filters.level||i.level>=Number(filters.level)));
    const pages=Math.max(1,Math.ceil(matched.length/16));ui.page=Math.max(0,Math.min(ui.page||0,pages-1));
    const shown=matched.slice(ui.page*16,ui.page*16+16);
    const tile=({item:i,where})=>{const d=defs[i.def],reason=fusionGear?blocked(i):'',active=dismantling?dismantleIds.includes(i.id):fusionGear?ids.includes(i.id):item?.id===i.id,stats=F.itemStats(i,defs);return `<button type="button" class="forge2-tile ${active?'selected':''} ${reason?'unavailable':''}" style="--item-rarity:${F.rarity[i.rarity].color}" data-forge-item="${E(i.id)}" ${fusionGear&&!reason?`draggable="true" data-fusion-drag="${E(i.id)}"`:""} aria-pressed="${active}" ${reason?'aria-disabled="true"':''} title="${E(`${F.gearName(i,defs)} · ${F.rarity[i.rarity].name}\nATQ ${stats.attack} · DEF ${stats.defense} · VIDA ${stats.hp}\n${i.extras.map(x=>F.names[x.stat]+' +'+amount(x)).join(' · ')}\n${reason|| (where==='equipped'?'Equipado':'Mochila')}`)}">${icon(i.def,d.name)}<b class="forge2-plus">+${i.plus}</b><span class="forge2-tile-name">${E(F.gearName(i,defs))}</span>${dismantling?`<span class="forge2-fragment-yield">+${fmt(F.dismantleReturn(i,game,defs))} frag.</span>`:''}${repairing?`<small class="forge2-repair-tile"><span>${E(F.rarity[i.rarity].name)} · ${condition(i)}</span><span>${fmt(F.repairCost(i,defs))} Berry</span></small>`:''}<span class="forge2-badges">${where==='equipped'?'<em>E</em>':''}${i.locked?'<em>Trava</em>':''}${(fusionGear||dismantling)&&active?'<em>✓</em>':''}</span></button>`;};
    const searchGlyph=uiGlyph('search');
    const gearSelection=`<h3>${uiGlyph('anchor')}${dismantling?'Equipamentos desmontáveis':fusionGear?'Materiais da fusão':'Equipamentos'}</h3><label class="forge2-search"><span class="sr-only">Pesquisar por nome</span>${searchGlyph}<input id="forgeSearch" type="search" value="${E(filters.search||'')}" placeholder="Buscar equipamento…"></label><div class="forge2-filters">${filterSelect('rarity','Raridade',Object.entries(F.rarity).map(([k,v])=>[k,v.name]))}${filterSelect('slot','Categoria',Object.entries(slotNames))}${dismantling?'':filterSelect('where','Localização',[['equipped','Equipados'],['bag','Mochila']])}<label>Nível mínimo<input type="number" min="1" max="9999" data-forge-filter="level" value="${E(filters.level||'')}" placeholder="Todos"></label></div><div class="forge2-grid-meta"><small>${matched.length} ${matched.length===1?'item':'itens'}</small><button type="button" data-forge-list>${ui.list?'Ver grid':'Ver lista'}</button></div><div class="forge2-catalog ${ui.list?'as-list':''}">${['equipped','bag'].map(where=>{const group=shown.filter(x=>x.where===where);return group.length?`<h4>${uiGlyph(where==='equipped'?'equipment':'bag')}${where==='equipped'?'Equipados':'Mochila'}</h4><div class="forge2-item-grid">${group.map(tile).join('')}</div>`:'';}).join('')||'<p class="forge2-empty-note">Nenhum equipamento corresponde aos filtros.</p>'}</div>${pages>1?`<div class="forge2-pagination"><button type="button" data-forge-page="-1" ${ui.page===0?'disabled':''} aria-label="Página anterior">‹</button><small>${ui.page+1} de ${pages}</small><button type="button" data-forge-page="1" ${ui.page>=pages-1?'disabled':''} aria-label="Próxima página">›</button></div>`:''}${fusionGear?'<p>Equipados, bloqueados e peças com pérolas não podem ser consumidos.</p>':''}`;
    function pearlGrid(){const source=F.pearls.filter(p=>game.inventory.some(i=>F.pearlOf(i,defs)?.id===p.id&&!i.locked));return `<div class="forge2-pearl-grid">${source.map(p=>{const available=game.inventory.filter(i=>F.pearlOf(i,defs)?.id===p.id&&!i.locked),active=available.some(i=>i.id===ui.pearlItemId);return `<button type="button" class="forge2-pearl ${active?'selected':''}" data-forge-pearl="${E(available[0]?.id||'')}" aria-pressed="${active}" title="${E(p.name)} · +${p.level*2}% · ${available.length} desbloqueadas">${icon(p.id,p.name)}<small>${['FOR','DES','VIT','INT','ESP'][F.keys.indexOf(p.attribute)]} ${p.level}</small><b>×${available.length}</b></button>`;}).join('')||'<p class="forge2-empty-note">Nenhuma pérola disponível. Encontre pérolas Nv.1 nas caçadas.</p>'}</div>`;}
    function pearlFusionGrid(){
      const filters=ui.pearlFilters||{},selected=(ui.pearlFusionIds||[]).filter(Boolean),first=F.pearlOf(game.inventory.find(i=>i.id===selected[0]),defs);
      const owned=F.pearls.filter(p=>game.inventory.some(i=>F.pearlOf(i,defs)?.id===p.id));
      const shown=owned.filter(p=>(!filters.attribute||p.attribute===filters.attribute)&&(!filters.level||p.level===Number(filters.level))&&(!filters.search||p.name.toLocaleLowerCase('pt-BR').includes(filters.search.toLocaleLowerCase('pt-BR'))));
      const select=(key,label,options)=>`<label>${label}<select data-forge-pearl-filter="${key}"><option value="">Todos</option>${options.map(([id,n])=>`<option value="${id}" ${filters[key]===String(id)?'selected':''}>${n}</option>`).join('')}</select></label>`;
      return `<h3>${uiGlyph('imbue')}Pérolas da mochila</h3><label class="forge2-search"><span class="sr-only">Pesquisar por nome</span>${searchGlyph}<input id="forgePearlSearch" type="search" value="${E(filters.search||'')}" placeholder="Pesquisar pérola..."></label><div class="forge2-filters">${select('attribute','Atributo',F.keys.map(k=>[k,F.names[k]]))}${select('level','Nível',[1,2,3,4,5].map(n=>[n,'Nv.'+n]))}</div><div class="forge2-grid-meta"><small>${game.inventory.filter(i=>F.isPearl(i,defs)).length} pérolas · ${shown.length} tipos</small><button type="button" data-forge-list>${ui.list?'Ver grid':'Ver lista'}</button></div><div class="forge2-pearl-grid forge2-fusion-pearl-grid ${ui.list?'as-list':''}">${shown.map(p=>{
        const units=game.inventory.filter(i=>F.pearlOf(i,defs)?.id===p.id),locked=units.filter(i=>i.locked).length,used=units.filter(i=>selected.includes(i.id)).length,available=units.filter(i=>!i.locked&&!selected.includes(i.id)).length;
        const reason=p.level>=5?'Nv.5 não pode ser fundido':first&&first.id!==p.id?'Atributo e nível incompatíveis':!available?'Sem unidades desbloqueadas livres':selected.length>=5?'Os cinco slots estão preenchidos':'';
        return `<button type="button" class="forge2-pearl ${used?'selected':''} ${reason?'unavailable':''}" data-forge-fusion-pearl="${p.id}" aria-disabled="${!!reason}" ${reason?'':`draggable="true" data-fusion-drag="${p.id}"`} title="${E(p.name)} · ${available} disponíveis · ${locked} bloqueadas${reason?' · '+reason:''}">${icon(p.id,p.name)}<span>${['FOR','DES','VIT','INT','ESP'][F.keys.indexOf(p.attribute)]} · Nv.${p.level}</span><small>${available} disponíveis</small>${used?`<small>${used} nos slots</small>`:''}${locked?`<small class="forge2-lock-label">${locked} bloqueada${locked>1?'s':''}</small>`:''}</button>`;
      }).join('')}</div>${!owned.length||!game.inventory.some(i=>F.isPearl(i,defs)&&!i.locked)?'<p class="forge2-empty-note">Você não possui pérolas disponíveis para fusão</p>':!shown.length?'<p class="forge2-empty-note">Nenhuma pérola corresponde aos filtros.</p>':''}<p>Cada clique encaixa uma unidade livre. Unidades nos slots permanecem na mochila até a confirmação.</p>`;
    }

    function fusionWorkspace(slots,detail,equipment){
      const padded=Array.from({length:5},(_,n)=>slots[n]||null),filled=padded.filter(id=>game.inventory.some(i=>i.id===id)).length;
      return `<div class="forge2-fusion-workspace ${equipment?'forge-fusion-equipment':'forge-fusion-pearls'}"><section class="forge2-fusion-materials"><h4>Materiais <span class="forge-fusion-count">${filled} / 5</span></h4><div class="forge2-material-slots" aria-label="Cinco materiais da fusão">${padded.map((id,index)=>{const i=game.inventory.find(i=>i.id===id),p=F.pearlOf(i,defs),name=i?(p?p.name:F.gearName(i,defs)):'';return `<button type="button" class="forge2-material-slot ${i?'filled':'empty'}" data-fusion-slot-index="${index}" data-fusion-material-id="${i?E(i.id):''}" aria-label="Slot ${index+1}${i?': '+E(name)+'. Remover material':': vazio'}" title="${i?E(name)+' · Clique para remover':'Slot vazio · Clique no grid ou arraste um material'}">${i?icon(p?p.id:i.def,name):emptySlot}${i?'<span class="forge-material-remove" aria-hidden="true">×</span>':''}<small>${p?F.names[p.attribute]+' · Nv.'+p.level:'Slot '+(index+1)}</small></button>`;}).join('')}</div><div class="forge2-fusion-arrow" aria-hidden="true">${fusionArrow}</div><div class="forge2-fusion-tools">${equipment?'<button type="button" data-forge-auto>Selecionar automaticamente</button>':''}<button type="button" data-forge-clear>Limpar seleção</button></div><small>Clique em um material para removê-lo.</small>${equipment?'<details class="forge-fusion-about"><summary>Regras da fusão</summary><p>Cinco peças da mesma raridade, desbloqueadas e sem pérolas. O resultado é básico, na raridade seguinte e no menor nível dos materiais.</p></details>':''}</section><section class="forge2-fusion-details">${detail}</section></div>`;
    }
    const resultStage=(art,label,caption,pearl=false)=>`<figure class="forge-fusion-result-stage ${pearl?'is-pearl':''}"><div class="forge-fusion-result-orbit" aria-hidden="true"></div>${art||'<img class="forge-hd-mystery" src="assets/ui/contracts-hd/mystery.png" alt="Resultado ainda não definido">'}<figcaption><strong>${E(label)}</strong><span>${E(caption)}</span></figcaption></figure>`;
    const header=item?`<div class="forge2-item-head">${icon(item.def,definition.name)}<div><h3 style="color:${r.color}">${E(F.gearName(item,defs))}</h3><span style="color:${r.color}">${r.name} · ${item.locked?'Bloqueado':game.inventory.some(i=>i.id===item.id)?'Mochila':'Equipado'}</span></div></div>${root.MareTooltips.potentialHTML({...item,gear:true})}<div class="forge2-current"><span>${uiGlyph("attack")}<small>ATQ</small><b>${fmt(F.itemStats(item,defs).attack)}</b></span><span>${uiGlyph("shield")}<small>DEF</small><b>${fmt(F.itemStats(item,defs).defense)}</b></span><span>${uiGlyph("heart")}<small>VIDA</small><b>${fmt(F.itemStats(item,defs).hp)}</b></span><span>${uiGlyph("imbue")}<small>Encaixes</small><b>${item.sockets.filter(Boolean).length}/${item.sockets.length}</b></span></div>`:'<p class="forge2-empty-note">Selecione um equipamento no grid.</p>';
    let operation='',left=gearSelection,comparison='';
    if(ui.tab==='upgrade'&&item){const c=F.upgradeCost(item),max=item.plus>=F.refinement.max;
      const chance=Math.round(F.upgradeChance(item)*100);
      comparison=preview({...item,plus:max?item.plus:item.plus+1});
      operation=`<div class="forge-upgrade-summary">${header}
        <div class="forge2-refinement">
          <strong>+${item.plus} → ${max?'Máximo':`+${item.plus+1}`}</strong>
          <div class="forge-anvil-stage" aria-hidden="true">
            <img class="forge-bench-art" src="assets/ui/forge-reference/forge-bench.png" alt="" draggable="false">
            <div class="forge-fire forge-fire-coals"></div>
            <div class="forge-bench-item">${icon(item.def,'')}</div>
            <div class="forge-embers">
              ${Array.from({length:20},(_,n)=>{
                const start=42+(n*7)%17;
                const drift=(n*19)%91-45;
                const rise=54+(n*13)%58;
                const delay=(n*131)%2600;
                return `<i style="--start:${start}%;--drift:${drift}px;--rise:-${rise}px;--delay:-${delay}ms"></i>`;
              }).join('')}
            </div>
          </div>
        </div>
        ${max?'':costs(c)}
        <div class="forge2-chance"><span>Chance de sucesso</span><strong>${max?'Máximo':chance+'%'}</strong></div>
        ${max?'':`<progress class="forge-chance-meter" max="100" value="${chance}" aria-label="Chance de sucesso"></progress>`}
        ${!max&&chance<100?`<p class="forge2-risk">A falha consome os materiais e ${F.failedRefinement(item)===item.plus?'mantém':'volta para'} +${F.failedRefinement(item)}.</p>`:''}
        ${action('upgrade','APRIMORAR EQUIPAMENTO',item.locked?'Desbloqueie este equipamento no inventário.':max?'Limite +20 atingido.':unavailable(c))}</div>`;
    }
    if(ui.tab==='imbue'&&item){const chosen=game.inventory.find(i=>i.id===ui.pearlItemId&&!i.locked),p=F.pearlOf(chosen,defs),free=Number.isInteger(ui.socket)&&ui.socket>=0&&ui.socket<r.sockets&&item.sockets[ui.socket]===null;
      operation=`${header}<div class="forge2-sockets">${item.sockets.map((id,i)=>{const p=F.pearlById[id],fee=p?F.removalCost(item,p):0;return `<section class="forge2-socket ${i===ui.socket?'selected':''}"><button type="button" data-forge-socket="${i}" aria-pressed="${i===ui.socket}">${p?icon(id,p.name):emptySlot}<span>Encaixe ${i+1}<b>${p?E(p.name):'Vazio'}</b></span></button>${p?action('remove','REMOVER · '+fmt(fee)+' Berry',item.locked?'Equipamento bloqueado':game.inventory.length>=120?'Mochila cheia':game.gold<fee?'Berry insuficientes':'',`data-forge-remove="${i}"`):''}</section>`;}).join('')||'<p class="forge2-empty-note">Comum não possui sockets. Selecione Incomum ou superior.</p>'}</div><div class="forge2-op-columns"><div><h4>Pérolas disponíveis</h4>${pearlGrid()}${p?`<p>${E(p.name)} · +${p.level*2}% ${F.names[p.attribute]}</p>`:''}${action('imbue','INSTALAR PÉROLA',item.locked?'Equipamento bloqueado':!free?'Selecione um encaixe livre':!p?'Selecione uma pérola':'')}</div>${free&&p?'<details class="forge2-imbue-preview"><summary>Prévia dos atributos e Poder</summary>'+preview({...item,sockets:item.sockets.map((id,i)=>i===ui.socket?p.id:id)})+'</details>':''}</div>`;
    }

    if(ui.tab==='fusion'){
      const modes=`<div class="forge2-subtabs">${[['equipment','Fundir equipamentos'],['pearls','Fundir pérolas']].map(([id,n])=>`<button type="button" data-forge-fusion-mode="${id}" class="${(ui.fusionMode||'equipment')===id?'active':''}">${uiGlyph(id==='equipment'?'attack':'imbue')}<span>${n}</span></button>`).join('')}</div>`;
      if(fusionGear){
        const plan=F.equipmentFusion(game,ui.fusionIds,ui.outputSlot||'weapon',defs),target=plan.error?null:defs[plan.def];
        const base=target?{def:plan.def,rarity:plan.target,level:plan.level,plus:0,baseStats:{attack:target.attack||0,defense:target.defense||0,hp:target.hp||0},extras:[],sockets:Array(F.rarity[plan.target].sockets).fill(null)}:null;
        const stats=base?F.itemStats(base,defs):null,estimated=base?derive({...game,equipment:{...game.equipment,[target.slot]:base}}).power:null;
        const detail=`<h4>Resultado</h4><div class="forge-result-scroll">${resultStage(target?icon(plan.def,target.name):'',target?target.name+' +0':'Equipamento resultante',target?F.rarity[plan.target].name+' · Nv.'+plan.level:'Insira os materiais para visualizar a prévia.')}<label class="forge2-field">Tipo resultante<select id="forgeOutputSlot">${Object.entries(slotNames).map(([id,n])=>`<option value="${id}" ${(ui.outputSlot||'weapon')===id?'selected':''}>${n}</option>`).join('')}</select></label><section class="forge-fusion-stat-preview"><h4>Atributos da peça · base</h4>${[['attack','Ataque','attack'],['defense','Defesa','shield'],['hp','Vida','heart']].map(([key,label,glyph])=>`<div><span>${uiGlyph(glyph)}${label}</span><b data-fusion-base-stat="${key}">${stats?fmt(stats[key]):'—'}</b></div>`).join('')}<div><span>${uiGlyph('power')}Poder ao equipar</span><b data-fusion-base-power>${estimated===null?'—':fmt(estimated)}</b></div><small>Prévia sem os extras sorteados.</small></section>${target?`<p class="forge-fusion-extra-note">${F.rarity[plan.target].extras} extras sorteados · ${F.rarity[plan.target].sockets} encaixes vazios</p>${costs(plan.cost)}<div class="forge2-chance"><span>Chance de sucesso</span><strong>100%</strong></div>`:`<p class="forge2-empty-note">${E(plan.error)}</p>`}</div><footer class="forge-result-actions">${action('fuseEquipment','FUNDIR EQUIPAMENTO',plan.error||unavailable(plan.cost))}</footer>`;
        operation=`${modes}${fusionWorkspace(ui.fusionIds||[],detail,true)}`;
      }else{
        left=pearlFusionGrid();const slots=ui.pearlFusionIds||[],plan=F.pearlFusion(game,slots,defs),first=game.inventory.find(i=>i.id===slots.find(Boolean)),p=F.pearlOf(first,defs),settings=p?F.fusion[p.level-1]:null,next=p?F.pearls.find(q=>q.attribute===p.attribute&&q.level===p.level+1):null;
        const matching=p?slots.filter(id=>{const i=game.inventory.find(i=>i.id===id);return i&&!i.locked&&F.pearlOf(i,defs)?.id===p.id}).length:0;
        const detail=`<h4>${uiGlyph('fusion')}Resultado da fusão</h4><div class="forge-result-scroll"><div class="forge-pearl-result-layout">${resultStage(next?icon(next.id,next.name):'',next?next.name:'Pérola resultante',next?'Nv.'+next.level+' · '+F.names[next.attribute]:'Selecione cinco pérolas do mesmo atributo e nível.',true)}<section class="forge-pearl-result-description">${next?`<span class="forge-fusion-attribute">${E(F.names[next.attribute])}</span><p class="forge-pearl-result-bonus"><strong>+${Math.round(next.percent*100)}%</strong> ${E(F.names[next.attribute])} ao imbuir.</p>`:'<p>Insira materiais para conhecer o próximo nível e seu bônus.</p>'}<div class="forge-pearl-material-summary"><h5>Materiais consumidos</h5>${p?icon(p.id,p.name):''}<span>${p?E(p.name):'Pérolas do mesmo atributo e nível'}<b class="${matching===5?'ready':''}">${matching} / 5</b></span></div></section><section class="forge-pearl-result-cost">${settings&&next?costs({gold:settings.gold}):'<h4>Custo da fusão</h4><p>Depende do nível dos materiais.</p>'}<div class="forge2-chance"><span>Chance de sucesso</span><strong>${settings&&next?Math.round(settings.chance*100)+'%':'—'}</strong></div></section></div></div><footer class="forge-result-actions"><p class="forge2-risk">A tentativa consome as 5 pérolas e os Berry mesmo em caso de falha.</p>${action('fuse','FUNDIR PÉROLAS',plan.error||unavailable({gold:plan.gold}))}</footer>`;
        operation=`${modes}${fusionWorkspace(slots,detail,false)}`;
      }
    }


    if(repairing){
      const plan=F.repairPlan(game,'repair',item?.id,defs);
      const all=F.repairPlan(game,'repairAll',null,defs);
      const selected=F.hasDurability(item,defs);
      if(selected){
        const restored={...item,durability:F.maxDurability};
        const equipped=Object.values(game.equipment).some(i=>i?.id===item.id);
        const slot=definition.slot;
        const compatible=slot!=='weapon'||definition.type===game.classId;
        const gearState=piece=>({...game,equipment:{...game.equipment,[slot]:piece}});
        const before=compatible?derive(gearState(item)).power:null;
        const after=compatible?derive(gearState(restored)).power:null;
        const rates=F.efficiency(item),percent=n=>new Intl.NumberFormat('pt-BR',{maximumFractionDigits:2}).format(n*100)+'%';
        operation=`${header}<h4>Reparo individual</h4>
          <p>Durabilidade <strong>${condition(item)} → 100%</strong></p>
          <p>Eficiência de ataque <strong>${percent(rates.attack)} → 100%</strong> · Defesa <strong>${percent(rates.defense)} → 100%</strong></p>
          <p>${equipped?'Poder de combate':'Poder de combate ao equipar'} <strong>${compatible?fmt(before)+' → '+fmt(after):'Arma de outra classe'}</strong></p>
          ${plan.items.length?costs({gold:plan.total}):''}
          ${action('repair','REPARAR SELECIONADO',!plan.items.length?'Este equipamento já está em 100%.':unavailable({gold:plan.total}))}`;
      }else operation='<p class="forge2-empty-note">Selecione um equipamento para reparar.</p>';
      operation+=`<section class="forge2-repair-batch"><h4>Equipamentos em uso · ${all.items.length}</h4>
        ${all.items.length?costs({gold:all.total}):''}
        ${action('repairAll','REPARAR TUDO',!all.items.length?'Os equipamentos em uso já estão em 100%.':unavailable({gold:all.total}))}</section>`;
    }
    if(dismantling){
      const plan=F.dismantlePlan(game,dismantleIds,defs),material=F.itemFragment;
      const selected=plan.items?.map(({item:piece,fragments})=>`<li><span>${E(F.gearName(piece,defs))} · ${E(F.rarity[piece.rarity].name)} · +${piece.plus}</span><b>+${fmt(fragments)}</b></li>`).join('');
      operation=`${selected?`<p class="forge-dismantle-yield">${icon(material.iconKey,'')}<strong>+${fmt(plan.total||0)}</strong> ${E(material.name)}</p>`:''}
        ${selected?`<ul class="forge2-extras">${selected}</ul>`:'<p class="forge2-empty-note">Selecione as peças que quer desmontar.</p>'}
        ${action('dismantle','DESMONTAR EQUIPAMENTOS',plan.error||'')}`;
    }

    if(ui.tab==='reforge'&&item){
      const single=ui.reforgeMode!=='all',c=F.reforgeCost(item,single),reason=item.locked?'Equipamento bloqueado':unavailable(c);
      const lines=item.extras.map((x,i)=>`<li>
        <span class="forge-reforge-stat">${bonusGlyph(x.stat)}<span>${F.names[x.stat]}</span><b>+${amount(x)}</b></span>
        ${action('reforgeLine','REFORJAR',reason,`data-forge-line="${i}" aria-label="Reforjar ${E(F.names[x.stat])}"`)}
      </li>`).join('');
      operation=`${header}<div class="forge2-subtabs">
        <button type="button" data-forge-reforge-mode="line" aria-pressed="${single}" class="${single?'active':''}">${uiGlyph('reforge')}<span>Reforjar atributo</span></button>
        <button type="button" data-forge-reforge-mode="all" aria-pressed="${!single}" class="${single?'':'active'}">${uiGlyph('fusion')}<span>Reforjar todos</span></button>
      </div>${costs(c)}${single?`<ul class="forge2-extras forge2-reforge-lines">${lines}</ul>
        ${item.locked?'<small class="forge2-disabled-reason">Equipamento bloqueado</small>':''}`:
        `${extras(item.extras)}${action('reforge','REFORJAR TODOS',reason)}`}${reforgeChanges()}`;
    }
    const visible=result&&(result.type===ui.tab||ui.tab==='repair'&&result.type==='repairAll'||(ui.tab==='imbue'&&['imbue','remove'].includes(result.type))||(ui.tab==='fusion'&&['fuse','fuseEquipment'].includes(result.type))||(ui.tab==='reforge'&&result.type==='reforgeLine'));
    return `<div class="forge-hd-workbench"><div class="forge2-shell" data-forge-view="${ui.tab}"><nav class="forge2-tabs" role="tablist" aria-label="Operações da forja">${[['upgrade','Aprimorar'],['imbue','Imbuir'],['fusion','Fusão'],['reforge','Reforja'],['dismantle','Desmontar'],['repair','Reparar']].map(([id,n])=>`<button type="button" role="tab" data-forge-tab="${id}" aria-selected="${ui.tab===id}" class="${ui.tab===id?'active':''}">${uiGlyph(id==='dismantle'?'bag':id==='repair'?'reforge':id)}<span>${n}</span></button>`).join('')}</nav><div class="forge2-layout"><aside class="forge2-selection">${left}</aside><section class="forge2-operation" role="tabpanel"><output id="forgeOperationResult" class="forge2-outcome ${visible?(result.success?'success':'failure'):''}" role="status" aria-live="polite">${visible?`<strong>${E(result.message)}</strong>${result.cost?`<span>Consumidos: ${fmt(result.cost.gold)} Berry${result.cost.materials?' e '+fmt(result.cost.materials)+' × '+F.itemFragment.name:''}.</span>`:''}`:''}</output><div class="forge2-operation-content">${operation||header}</div></section><aside class="forge-reference-sidebar${comparison?' has-preview':''}">
      ${comparison}<div class="forge-hd-art" aria-hidden="true"><img src="assets/ui/forge-reference/smith.png" alt="" draggable="false"></div>
    </aside></div></div></div>`;
  }
  root.MareForgeUI={render,presentation:Object.freeze({prepareMs:400,revealMs:2400})};if(typeof module!=='undefined')module.exports=root.MareForgeUI;
})(globalThis);
