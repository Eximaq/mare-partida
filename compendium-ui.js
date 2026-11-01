'use strict';
/* Compendium presentation over the canonical catalog. No combat textures or gameplay writes. */
((root)=>{
  if(typeof module!=='undefined'){
    require('./akuma-system.js');require('./character-system.js');require('./forge-system.js');require('./item-art.js');
  }
  const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const types=Object.freeze({all:'Todas',paramecia:'Paramecia',zoan:'Zoan',logia:'Logia'});
  const typeIcons={all:'assets/ui/character-menu/akuma.png'};
  const typeGlyph=id=>id==='all'?'<img src="'+typeIcons.all+'" alt="">':'<span class="comp-type-glyph comp-type-'+id+'" aria-hidden="true"></span>';
  const fold=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
  const createState=()=>({type:'all',rank:'all',rarity:'all',query:'',sort:'rank',selected:null,info:false});
  const classification=f=>{const id=root.MareAkuma.rarityFor(f),r=root.MareForge.rarity[id];return {id,name:r.name,color:r.color};};
  const artwork=f=>root.MareItemArt.path(null,{fruitId:f.id})||f.icon_path;
  function registration(game,f,capacity=120){
    const registered=root.MareAkuma.registered(game).includes(f.id);
    const equipped=game?.equipment?.akuma_no_mi?.fruitId===f.id;
    const possessed=equipped||(game?.inventory||[]).some(i=>i.fruitId===f.id);
    // Every catalog entry is currently available in the existing demonstration.
    const available=!!root.MareAkuma.byId(f.id),space=possessed||(game?.inventory||[]).length<capacity;
    return {registered,equipped,possessed,available,eligible:available&&!registered&&space,
      label:registered?'REGISTRADA':!available?'INDISPONÍVEL':!space?'MOCHILA CHEIA':'REGISTRAR FRUTA',
      reason:registered?'Registro permanente, mesmo sem uma cópia na mochila.':!available?'Fruta ainda indisponível no catálogo atual.':!space?'Libere um espaço na mochila.':'O registro atual concede uma cópia quando você ainda não possui a fruta. Não há custo de Berry.'};
  }
  function model(game,state,capacity=120){
    const A=root.MareAkuma,registered=new Set(A.registered(game)),catalog=A.catalog;
    const rows=catalog.filter(f=>(state.type==='all'||A.familyFor(f)===state.type)&&(state.rank==='all'||f.rank===state.rank)&&(state.rarity==='all'||classification(f).id===state.rarity)&&fold(f.name).includes(fold(state.query.trim())));
    const rankIndex=r=>A.ranks.indexOf(r);
    rows.sort((a,b)=>state.sort==='name'?a.name.localeCompare(b.name,'pt-BR'):state.sort==='registered'?Number(registered.has(b.id))-Number(registered.has(a.id))||rankIndex(b.rank)-rankIndex(a.rank):rankIndex(b.rank)-rankIndex(a.rank));
    const selected=rows.find(f=>f.id===state.selected)||rows[0]||null;
    return {rows,selected,registered,count:registered.size,bonus:Math.round((root.MareCharacters.compendiumMultiplier(registered.size)-1)*10000)/100,
      ranks:[...A.ranks].reverse().map(rank=>{const fruits=catalog.filter(f=>f.rank===rank);return {rank,total:fruits.length,count:fruits.filter(f=>registered.has(f.id)).length,...classification(rank)};}),
      status:selected?registration(game,selected,capacity):null};
  }
  const visual=(fruit,registered,large=false)=>`<span class="comp-fruit-art ${large?'is-large':''} ${registered?'':'is-silhouette'}"><canvas width="${large?320:224}" height="${large?320:224}" data-compendium-art="${E(fruit.id)}" data-colored="${registered}" role="img" aria-label="${registered?E(fruit.name):'Silhueta da fruta '+E(fruit.name)}"></canvas>${registered?'':'<span class="comp-question" aria-hidden="true">?</span>'}</span>`;
  const badge=f=>`<span class="comp-rank-letter" style="--fruit-rarity:${classification(f).color}">${f.rank}</span>`;
  function card(f,m){
    const c=classification(f),registered=m.registered.has(f.id),selected=m.selected?.id===f.id;
    return `<button type="button" class="comp-fruit-card rarity-${c.id} ${registered?'is-registered':'is-unregistered'} ${selected?'is-selected':''}" style="--fruit-rarity:${c.color}" data-compendium-fruit="${E(f.id)}" aria-pressed="${selected}" aria-label="${E(f.name)} · Rank ${f.rank}, ${c.name} · ${types[root.MareAkuma.familyFor(f)]} · ${registered?'Registrada':'Não registrada'}">${badge(f)}${visual(f,registered)}<span class="comp-card-copy"><strong>${E(f.name)}</strong><small>${typeGlyph(root.MareAkuma.familyFor(f))}${types[root.MareAkuma.familyFor(f)]}<span class="comp-registered-mark" aria-label="${registered?'Registrada':'Não registrada'}">${registered?'✓':'?'}</span></small></span></button>`;
  }
  const percentage=n=>'+'+n.toLocaleString('pt-BR',{maximumFractionDigits:1,minimumFractionDigits:1})+'%';
  function detail(m){
    const f=m.selected;if(!f)return '<div class="comp-empty-details"><h3>Nenhuma fruta selecionada</h3><p>Limpe os filtros para explorar o catálogo.</p></div>';
    const c=classification(f),s=m.status;
    const stats=root.MareAkuma.bonusStats({type:'akuma_no_mi',fruitId:f.id});
    const labels={...root.MareAkumaPassives.labels,healing_received_percent:'Cura recebida',max_hp_percent:'Vida máxima',impact_resistance_percent:'Resistência a impacto',move_speed_percent:'Velocidade de movimento',evasion_percent:'Esquiva',physical_defense_percent:'Defesa física'};
    const effectRows=Object.entries(stats).filter(([,n])=>Number.isFinite(n)&&n!==0).map(([k,v])=>`<div><dt>${E(labels[k]||k.replace('bonus_','').replaceAll('_',' '))}</dt><dd>${E((v>0?'+':'')+((k.endsWith('_percent')||root.MareAkumaPassives.percent(k))?(v*100).toLocaleString('pt-BR',{maximumFractionDigits:1})+'%':v))}</dd></div>`).join('');
    return `<div class="comp-detail-scroll"><header class="comp-detail-heading" style="--fruit-rarity:${c.color}">${badge(f)}<div><h2>${E(f.name)}</h2><small>${typeGlyph(root.MareAkuma.familyFor(f))}${types[root.MareAkuma.familyFor(f)]} · ${c.name}</small></div></header>
      ${visual(f,s.registered,true)}<p class="comp-description">${E(f.description||'Descrição não cadastrada.')}</p>
      <section class="comp-bonus"><h3>BÔNUS PERMANENTE DO COMPÊNDIO</h3><dl><div><dt><img src="assets/ui/character-studio/attributes/vitality.png" alt="">Vida máxima base</dt><dd data-compendium-bonus>${percentage(m.bonus)}</dd></div><div><dt><img src="assets/ui/character-studio/attributes/strength.png" alt="">Força base</dt><dd>${percentage(m.bonus)}</dd></div></dl><small>Acumulado de ${m.count} fruta(s) registrada(s) em toda a coleção.</small></section>
      <section class="comp-information"><h3>INFORMAÇÕES</h3><dl><div><dt>Rank / raridade</dt><dd class="rarity-${c.id}">${f.rank} · ${c.name}</dd></div><div><dt>Tipo</dt><dd>${types[root.MareAkuma.familyFor(f)]}</dd></div><div><dt>Registro</dt><dd>${s.registered?'Permanente':'Não registrada'}</dd></div><div><dt>Cópia possuída</dt><dd>${s.possessed?'Sim':'Não'}</dd></div><div><dt>Equipada</dt><dd>${s.equipped?'Sim':'Não'}</dd></div></dl></section>
      <details class="comp-own-effects"><summary>Efeitos próprios ao equipar</summary>${effectRows?`<dl>${effectRows}</dl>`:'<p>Consulte as habilidades abaixo para os efeitos próprios desta fruta.</p>'}<ul>${root.MareAkuma.activeSkills(f.id).map(skill=>`<li><strong>${E(skill.name)}</strong>${skill.description?`<p>${E(skill.description)}</p>`:''}</li>`).join('')}</ul><p>Estes efeitos dependem do equipamento e não são o bônus permanente da coleção.</p></details>
      <small class="comp-rate">Cada registro único: +0,1% de Vida máxima base e Força base. O filtro não altera o bônus.</small></div>
      <footer class="comp-register-action"><button type="button" data-fruit-register="${E(f.id)}" ${s.eligible?'':'disabled'}>${s.label}</button><small role="status">${E(s.reason)}</small></footer>`;
  }
  function shell(state,m){
    return `<section class="compendium-hd" aria-label="Compêndio de Akuma no Mi"><div class="comp-top-row"><nav class="comp-type-tabs" aria-label="Tipo de fruta">${Object.entries(types).map(([id,name])=>`<button type="button" data-compendium-type="${id}" aria-pressed="${id===state.type}">${typeGlyph(id)}${name}</button>`).join('')}</nav><button type="button" class="comp-availability" data-compendium-info aria-expanded="${state.info}"><img src="assets/ui/character-studio/attributes/intelligence.png" alt="">Ranks e Disponibilidade</button></div>
      <section class="comp-rules" ${state.info?'':'hidden'}><h3>Ranks e disponibilidade</h3><p>Todos os seis ranks do catálogo atual permitem registro na demonstração, por qualquer classe ou nível. Registrar concede uma cópia quando você ainda não possui a fruta; é necessário espaço na mochila. Não há cobrança de Berry.</p><p>O registro é permanente e não se repete. Cada fruta única concede +0,1% de Vida máxima base e Força base. Equipar é uma ação separada, disponível no inventário.</p><p>S: Supremo · A/B: Lendário · C/D: Épico · E: Raro. Ranks permanecem separados.</p></section>
      <div class="comp-workspace"><aside class="comp-ranks" aria-label="Ranks, registradas em relação ao total"><h3>RANKS</h3><button type="button" data-compendium-rank="all" class="comp-all-ranks" aria-pressed="${state.rank==='all'}">Todos os ranks</button><div data-compendium-ranks></div><small>Registradas / total<br>de cada rank</small></aside>
      <section class="comp-gallery"><div class="comp-filters"><label class="comp-search"><span aria-hidden="true">⌕</span><input type="search" data-compendium-query value="${E(state.query)}" aria-label="Pesquisar fruta" placeholder="Pesquisar fruta..." autocomplete="off"></label><select data-compendium-type-select aria-label="Tipo de fruta">${Object.entries(types).map(([id,name])=>`<option value="${id}" ${state.type===id?'selected':''}>${id==='all'?'Todos os tipos':name}</option>`).join('')}</select><select data-compendium-rarity aria-label="Raridade"><option value="all">Todas as raridades</option>${['supreme','legendary','epic','rare'].map(id=>`<option value="${id}" ${state.rarity===id?'selected':''}>${root.MareForge.rarity[id].name}</option>`).join('')}</select><select data-compendium-sort aria-label="Ordenação"><option value="rank">Rank ↓</option><option value="name">Nome A–Z</option><option value="registered">Registradas</option></select></div>
      <div class="comp-result-line"><span data-compendium-results role="status" aria-live="polite"></span><button type="button" data-compendium-clear>Limpar filtros</button></div><div class="comp-fruit-grid" data-compendium-grid aria-label="Frutas do catálogo"></div></section><aside class="comp-details" data-compendium-details aria-label="Detalhes da fruta selecionada"></aside></div></section>`;
  }
  function tooltip(game,id){
    const f=root.MareAkuma.byId(id);if(!f)return null;
    const c=classification(f),s=registration(game,f);
    return {name:f.name,rank:f.rank,rarity:c.id,rarityName:c.name,type:types[root.MareAkuma.familyFor(f)],description:f.description||'Descrição não cadastrada.',state:s.registered?'Registrada permanentemente':'Não registrada'};
  }
  // One bounded entry per official UI icon; masks are prepared once, never in the game loop.
  const images=new Map(),MAX_IMAGES=64;
  function loadArt(f){
    const src=artwork(f);if(images.has(src))return images.get(src);
    if(images.size>=MAX_IMAGES)images.delete(images.keys().next().value);
    const promise=new Promise(resolve=>{
      const image=new Image();image.decoding='async';
      image.onload=()=>{
        try{
          const c=document.createElement('canvas');c.width=image.naturalWidth;c.height=image.naturalHeight;
          const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
          const data=ctx.getImageData(0,0,c.width,c.height).data;
          let x0=c.width,y0=c.height,x1=-1,y1=-1;
          for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(data[(y*c.width+x)*4+3]>8){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
          if(x1<0)throw Error('Arte sem desenho');
          const cut=document.createElement('canvas');cut.width=x1-x0+1;cut.height=y1-y0+1;cut.getContext('2d').drawImage(c,x0,y0,cut.width,cut.height,0,0,cut.width,cut.height);
          const mask=document.createElement('canvas');mask.width=cut.width;mask.height=cut.height;const mc=mask.getContext('2d');mc.drawImage(cut,0,0);mc.globalCompositeOperation='source-in';mc.fillStyle='#020407';mc.fillRect(0,0,mask.width,mask.height);
          resolve({cut,mask,src});
        }catch(e){resolve({error:true,src});}
      };
      image.onerror=()=>resolve({error:true,src});image.src=src;
    });images.set(src,promise);return promise;
  }
  let dispose=()=>{};
  function mount(body,{getGame,state,register,hideTooltip=()=>{},capacity=120}){
    dispose();let alive=true;const initial=model(getGame(),state,capacity);state.selected=initial.selected?.id||null;body.innerHTML=shell(state,initial);
    const heading=body.closest('.dialog')?.querySelector('.dialog-header');let subtitle=document.createElement('p');subtitle.className='comp-heading-subtitle';subtitle.textContent='Complete o compêndio e descubra o poder das frutas.';heading?.querySelector('div')?.append(subtitle);
    const grid=body.querySelector('[data-compendium-grid]'),details=body.querySelector('[data-compendium-details]');
    const showArt=scope=>{
      for(const target of scope.querySelectorAll('[data-compendium-art]')){
        const f=root.MareAkuma.byId(target.dataset.compendiumArt);loadArt(f).then(asset=>{
          if(!alive||!target.isConnected||target.dataset.compendiumArt!==f.id)return;
          target.dataset.artSource=asset.src;
          if(asset.error){target.dataset.artError='true';target.setAttribute('aria-label','Arte indisponível: '+f.name);const note=document.createElement('small');note.className='comp-art-error';note.textContent='Arte indisponível';target.parentElement.append(note);return;}
          const source=target.dataset.colored==='true'?asset.cut:asset.mask,ctx=target.getContext('2d'),fit=target.width*.86,scale=fit/Math.max(source.width,source.height),w=source.width*scale,h=source.height*scale;
          ctx.clearRect(0,0,target.width,target.height);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(source,(target.width-w)/2,(target.height-h)/2,w,h);target.dataset.artReady='true';
        });
      }
    };
    const refreshDetails=m=>{details.innerHTML=detail(m);showArt(details);};
    const refresh=()=>{
      hideTooltip();const m=model(getGame(),state,capacity);state.selected=m.selected?.id||null;
      body.querySelector('[data-compendium-results]').textContent=m.rows.length+' de '+root.MareAkuma.catalog.length+' frutas · '+m.count+' registradas';
      body.querySelector('[data-compendium-ranks]').innerHTML=m.ranks.map(r=>`<button type="button" data-compendium-rank="${r.rank}" aria-pressed="${state.rank===r.rank}" style="--fruit-rarity:${r.color}"><span class="comp-rank-letter">${r.rank}</span><strong>${r.name}</strong><small>${r.count}/${r.total}</small></button>`).join('');
      body.querySelector('[data-compendium-rank=all]').setAttribute('aria-pressed',state.rank==='all');
      body.querySelectorAll('[data-compendium-type]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.compendiumType===state.type));
      body.querySelector('[data-compendium-type-select]').value=state.type;body.querySelector('[data-compendium-rarity]').value=state.rarity;body.querySelector('[data-compendium-sort]').value=state.sort;
      grid.innerHTML=m.rows.map(f=>card(f,m)).join('')||'<div class="comp-no-results"><h3>Nenhuma fruta encontrada</h3><p>Altere a busca ou limpe os filtros.</p><button type="button" data-compendium-clear>Limpar filtros</button></div>';
      grid.scrollTop=0;refreshDetails(m);showArt(grid);
    };
    const click=async e=>{
      const b=e.target.closest('button');if(!b||!body.contains(b))return;
      if(b.hasAttribute('data-compendium-fruit')){
        state.selected=b.dataset.compendiumFruit;grid.querySelectorAll('[data-compendium-fruit]').forEach(c=>{const active=c===b;c.classList.toggle('is-selected',active);c.setAttribute('aria-pressed',active);});refreshDetails(model(getGame(),state,capacity));if(e.pointerType==='touch'&&matchMedia('(max-width:1024px)').matches)details.scrollIntoView({block:'start'});
      }else if(b.hasAttribute('data-compendium-type')){state.type=b.dataset.compendiumType;refresh();}
      else if(b.hasAttribute('data-compendium-rank')){state.rank=b.dataset.compendiumRank;refresh();body.querySelector('[data-compendium-rank="'+state.rank+'"]').focus({preventScroll:true});}
      else if(b.hasAttribute('data-compendium-clear')){Object.assign(state,{type:'all',rank:'all',rarity:'all',query:''});body.querySelector('[data-compendium-query]').value='';refresh();}
      else if(b.hasAttribute('data-compendium-info')){state.info=!state.info;body.querySelector('.comp-rules').hidden=!state.info;b.setAttribute('aria-expanded',state.info);}
      else if(b.hasAttribute('data-fruit-register')){
        e.stopPropagation();if(b.disabled)return;const fruit=root.MareAkuma.byId(b.dataset.fruitRegister);if(!fruit||!registration(getGame(),fruit,capacity).eligible)return;
        b.disabled=true;b.textContent='REGISTRANDO…';await register(fruit.id);if(alive&&body.isConnected)refresh();
      }
    };
    const change=e=>{const t=e.target;if(t.matches('[data-compendium-type-select]'))state.type=t.value;else if(t.matches('[data-compendium-rarity]'))state.rarity=t.value;else if(t.matches('[data-compendium-sort]'))state.sort=t.value;else return;refresh();};
    const input=e=>{if(e.target.matches('[data-compendium-query]')){state.query=e.target.value;refresh();}};
    body.addEventListener('click',click);body.addEventListener('change',change);body.addEventListener('input',input);refresh();
    dispose=()=>{alive=false;hideTooltip();subtitle.remove();body.removeEventListener('click',click);body.removeEventListener('change',change);body.removeEventListener('input',input);};
  }
  const api={types,createState,classification,artwork,registration,model,tooltip,mount,unmount:()=>dispose(),cacheSize:()=>images.size};
  root.MareCompendium=api;if(typeof module!=='undefined')module.exports=api;
})(globalThis);
