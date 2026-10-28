'use strict';
/* Cosmetic preferences only: no stats, equipment mutation or storage ownership. */
((root)=>{
  const source=root.MarePaperDollLookData||(typeof module!=='undefined'&&module.exports?require('./paper-doll-look-data.js'):null);
  const E=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function createCatalog(input){
    const data=JSON.parse(JSON.stringify(input));
    const fail=()=>{throw new TypeError('Invalid appearance catalog.');},id=s=>typeof s==='string'&&/^[a-z][a-z0-9-]{0,63}$/.test(s);
    if(data?.defaults?.version!==1||Object.keys(data.groups||{}).sort().join(',')!=='hair,outfit')fail();
    const choices={},entries={};
    for(const [key,group]of Object.entries(data.groups)){
      if(group.slot!==key||typeof group.label!=='string'||!Array.isArray(group.options)||!group.options.length||group.options.length>64||group.equipmentSlot!==undefined&&group.equipmentSlot!=='coat')fail();
      const seen=new Set();entries[key]={};choices[key]={};
      for(const option of group.options){
        if(!id(option.id)||seen.has(option.id)||typeof option.label!=='string'||typeof option.approved!=='boolean'||[option.useDefault===true,option.hidden===true,id(option.pieceId)].filter(Boolean).length!==1)fail();
        seen.add(option.id);
        if(option.approved){entries[key][option.id]=option;choices[key][option.id]=option.label;}
      }
      if(!Object.hasOwn(entries[key],data.defaults[key])||!entries[key][data.defaults[key]].useDefault)fail();
    }
    const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
    freeze(data);freeze(choices);freeze(entries);
    const defaults=data.defaults;
    function read(player){
      const value=player?.paperDollLook;
      if(value?.version!==1)return {...defaults};
      return {version:1,...Object.fromEntries(Object.entries(choices).map(([key,options])=>[key,Object.hasOwn(options,value[key])?value[key]:defaults[key]]))};
    }
    function valid(value){return value?.version===1&&Object.entries(choices).every(([key,options])=>Object.hasOwn(options,value[key]));}
    function apply(player,value,{production=false}={}){
      if(!player||(production?player.devSandbox===true:player.devSandbox!==true)||!valid(value))return null;
      return {...player,paperDollLook:{version:1,hair:value.hair,outfit:value.outfit}};
    }
    function hidden(player){
      const look=read(player);
      return Object.entries(data.groups).filter(([key,g])=>entries[key][look[key]].hidden&&!(g.equipmentSlot&&player?.equipment?.[g.equipmentSlot])).map(([,g])=>g.slot);
    }
    // Whole-clip coverage prevents a selected garment reverting on individual frames.
    function compatible(pack,piece,slot,options){return root.MarePaperDollCatalog.compatible(pack,piece,slot,options);}
    function resolve(pack,player,{production=false,unavailablePieces=new Set()}={}){
      const pieces={...pack.appearance.pieces},cosmeticFallbacks=[],look=read(player);
      for(const [key,group]of Object.entries(data.groups)){
        const option=entries[key][look[key]];
        if(!option.pieceId||group.equipmentSlot&&player?.equipment?.[group.equipmentSlot])continue;
        const piece=pack.pieces.find(p=>p.id===option.pieceId);
        if(!unavailablePieces.has(option.pieceId)&&compatible(pack,piece,group.slot,{production}))pieces[group.slot]=option.pieceId;
        else cosmeticFallbacks.push({slot:group.slot,id:option.id,reason:'unavailable-art'});
      }
      return {pieces,hidden:hidden(player),cosmeticFallbacks};
    }
    function fields(attribute,draft=defaults){
      if(!['doll-look','creation-look'].includes(attribute))throw new TypeError('Invalid appearance selector.');
      const safe=valid(draft)?draft:defaults;
      return Object.entries(choices).map(([key,options])=>`<label>${E(data.groups[key].label)}<select data-${attribute}="${key}">${Object.entries(options).map(([id,name])=>`<option value="${E(id)}" ${safe[key]===id?'selected':''}>${E(name)}</option>`).join('')}</select></label>`).join('');
    }
    function render(player,draft=read(player),message='',equipment=null,defs=[],{production=false}={}){
      const safe=valid(draft)?draft:defaults;
      const controls=fields('doll-look',safe);
      const fallbackNotice=equipment?.cosmeticFallbacks?.length?'<p role="status">Uma aparência selecionada está indisponível. Usamos o visual padrão; sua escolha continua salva.</p>':'';
      const slots={weapon:'Arma',coat:'Torso',head:'Cabeça',boots:'Pés',legs:'Pernas',cloak:'Capa',gloves:'Mãos',necklace:'Colar',belt:'Cinto',ring:'Anel',charm:'Acessório'};
      const reasons={'empty-hands':'O Lutador usa mãos livres neste conjunto.','missing-weapon':'Equipe a arma inicial da classe.','wrong-category':'Arma de outra categoria.','missing-art':'Esta peça ainda não tem camada modular.'};
      const equipmentPanel=production?(equipment?.substitutions?.length?`<section class="doll-equipment"><h3>Aparência dos equipamentos</h3><p>As peças abaixo usam o visual padrão disponível. Seus atributos e bônus continuam ativos.</p><ul>${equipment.substitutions.map(i=>`<li>${E(slots[i.slot]||i.slot)} · ${E(defs[i.def]?.name||'Equipamento')}</li>`).join('')}</ul></section>`:''):equipment?`<section class="doll-equipment"><h3>Conjunto de equipamentos</h3><p>${E(equipment.message)}</p>${equipment.issues.length?`<ul>${equipment.issues.map(i=>`<li><strong>${E(slots[i.slot]||i.slot)}${i.def!==null?' · '+E(defs[i.def]?.name||'Item '+i.def):''}</strong><br>${E(reasons[i.reason]||i.reason)}</li>`).join('')}</ul><button type="button" data-doll-kit>Preparar conjunto de teste</button><p>Guarda as peças incompatíveis na mochila e equipa a arma inicial disponível. Se necessário, cria uma arma somente no laboratório. Não altera classe, facção ou save normal.</p>`:''}</section>`:'';
      return `<section class="doll-dressing"><header><h2>Seu personagem</h2><p>Uma aparência compartilhada entre classes e facções.</p></header><div class="doll-dressing-grid"><figure><canvas id="dollLookCanvas" width="252" height="252" aria-label="Prévia animada da aparência"></canvas><figcaption id="dollLookState" role="status">Carregando prévia…</figcaption><label>Direção<select id="dollLookDirection"><option value="south">Frente</option><option value="north">Costas</option><option value="west">Esquerda</option><option value="east">Direita</option></select></label><label>Movimento<select id="dollLookAction"><option value="idle">Repouso</option><option value="walk">Caminhada</option><option value="attack">Ataque</option></select></label></figure><div class="doll-dressing-controls">${controls}<p>${production?'A roupa equipada tem prioridade sobre a roupa padrão. Você pode mudar estas escolhas a qualquer momento.':'Armadura equipada substitui a roupa padrão. Armas e peças ainda sem camadas usam o personagem original.'}</p><p>${production?'A aparência é salva com seu progresso. Classe e facção continuam definindo seu estilo de combate e seus bônus.':'Prévia de laboratório. As alterações ficam somente no save de teste.'}</p><p role="status">${E(message)}</p><div class="doll-dressing-actions"><button type="button" data-doll-look-apply>Aplicar aparência</button><button type="button" data-doll-look-cancel>Descartar alterações</button></div>${fallbackNotice}${equipmentPanel}</div></div></section>`;
    }
    return {data,defaults,choices,read,valid,apply,hidden,resolve,compatible,fields,render};
  }
  const api={...createCatalog(source),createCatalog};root.MarePaperDollLook=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:window);
