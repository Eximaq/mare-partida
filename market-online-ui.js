'use strict';
/* Mercado dos Mares reads the authoritative catalogue and sends versioned commands. */
((global) => {
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
  const count = new Intl.NumberFormat('pt-BR');
  const date = new Intl.DateTimeFormat('pt-BR', {dateStyle:'short', timeStyle:'short'});
  const tabs = {market:'Mercado', inventory:'Anunciar', offers:'Minha Proposta', sales:'Minhas Vendas', purchases:'Minhas Compras'};
  const categories = {weapons:'Armas', armor:'Armaduras e vestimentas', accessories:'Acessórios', fruits:'Akuma no Mi', pearls:'Pérolas', consumables:'Consumíveis', materials:'Materiais', fragments:'Fragmentos', other:'Outros'};
  const slots = {weapon:'Arma', head:'Cabeça', coat:'Peitoral', gloves:'Mãos', legs:'Calça', boots:'Pés', cloak:'Capa', belt:'Cinto', necklace:'Colar', ring:'Anel', charm:'Acessório', akuma_no_mi:'Akuma no Mi', pearl:'Pérola'};
  const rarities = {common:'Comum', uncommon:'Incomum', rare:'Raro', epic:'Épico', legendary:'Lendário', supreme:'Supremo'};
  const fruitTypes = {paramecia:'Paramecia', logia:'Logia', zoan:'Zoan'};
  const attributes = {attack:'Ataque', defense:'Defesa', hp:'Vida', energy:'Energia', strength:'Força', dexterity:'Destreza', vitality:'Vitalidade', intelligence:'Inteligência', spirit:'Espírito', crit:'Crítico', critChance:'Chance crítica', attackSpeedPercent:'Velocidade de ataque', critDamage:'Dano crítico', accuracy:'Precisão', evasion:'Esquiva'};
  const modes = {direct:'Venda direta', auction:'Leilão por propostas'};
  const states = {active:'Ativo', pending:'Pendente', accepted:'Aceita', rejected:'Recusada', withdrawn:'Retirada', expired:'Expirada', sold:'Vendido', cancelled:'Cancelado', canceled:'Cancelado', closed:'Encerrada por outra venda', outbid:'Encerrada por outra venda'};
  const sorts = {newest:'Mais recentes', name_asc:'Nome A–Z', name_desc:'Nome Z–A', price_asc:'Menor preço', price_desc:'Maior preço', rarity:'Raridade', level:'Nível', potential:'Potencial', expiry:'Prazo restante', quantity:'Quantidade', category:'Categoria'};
  const origins = {native:'Nativa', basic:'Básica / fusão'};
  const saleFilters = {active:'Ativas', proposals:'Com propostas', sold:'Vendidas', cancelled:'Canceladas', expired:'Expiradas'};
  const errors = {
    market_gold_insufficient:'O saldo disponível de Berry é insuficiente.',
    market_stale:'Os dados da negociação mudaram. Confira a versão atualizada.',
    market_listing_missing:'Este anúncio não está mais disponível.',
    market_proposal_missing:'Esta proposta não está mais disponível.',
    market_invalid_amount:'Confira o valor informado.',
    market_invalid_quantity:'Confira a quantidade disponível do item.',
    market_item_unavailable:'O item deixou de estar disponível na mochila.',
    market_item_untradable:'Este item não pode ser negociado.',
    market_item_changed:'O item mudou. Selecione novamente na mochila.',
    market_publish_rate:'Aguarde um pouco antes de publicar novamente.',
    market_offer_below_minimum:'O valor é inferior à proposta mínima.',
    market_fee_changed:'A taxa foi atualizada. Revise o novo líquido antes de anunciar.',
    invalid_request:'Confira os filtros. O valor mínimo deve ser menor ou igual ao máximo.',
    market_buy_unavailable:'Este anúncio não tem compra imediata.',
    market_confirm_buy_now:'Confirme a compra imediata pelo preço anunciado.',
    market_proposal_limit:'O anúncio atingiu o limite de propostas pendentes.',
    market_wallet_limit:'Sua carteira atingiu o limite de Berry.',
    market_busy:'Outra operação está em andamento. Atualize e tente novamente.',
    market_unavailable:'O servidor ainda não disponibiliza o Mercado dos Mares.',
    market_own_listing:'Você já é dono do item anunciado.',
    market_self_dealing:'A negociação deve envolver jogadores de contas diferentes.',
    market_listing_closed:'O anúncio encerrou. Selecione uma oferta ativa.',
    market_listing_changed:'O anúncio mudou. Confira a oferta atualizada.',
    market_proposal_changed:'A proposta mudou. Confira o valor atualizado.',
    market_version_conflict:'A negociação mudou. Confira os dados atualizados.',
    market_insufficient_berry:'O saldo disponível de Berry é insuficiente.',
    insufficient_gold:'O saldo disponível de Berry é insuficiente.',
    market_listing_limit:'Você atingiu o limite de anúncios ativos.',
    market_rate_limited:'Aguarde um pouco antes de publicar novamente.',
    market_item_equipped:'Desequipe o item antes de anunciá-lo.',
    market_item_locked:'Desbloqueie o item antes de anunciá-lo.',
    market_item_bound:'Este item é vinculado ao personagem.',
    market_item_reserved:'Este item está reservado em outra negociação.',
    trade_item_reserved:'Este item está reservado em uma troca.',
    market_item_ineligible:'Este item não está disponível para anúncio.',
    market_offer_too_low:'O valor é inferior à proposta mínima.',
    market_buy_now_required:'Confirme a compra imediata pelo preço anunciado.',
    market_price_changed:'O preço mudou. Confira a oferta atualizada.',
    inventory_full:'Mochila cheia. A entrega continua aguardando no Correio.',
    control_required:'Assuma o controle do personagem para negociar.',
    control_conflict:'O personagem está sob controle de outra sessão.',
    pending_command:'O servidor ainda está processando a operação anterior.',
  };
  const success = {
    market_publish:'Anúncio publicado. O item está reservado.',
    market_buy:'Compra concluída. Resgate o item no Correio.',
    market_offer:'Proposta enviada. O valor fica reservado enquanto estiver pendente.',
    market_withdraw:'Proposta retirada. O saldo reservado voltou a ficar disponível.',
    market_reject:'Proposta recusada. A reserva do comprador foi liberada.',
    market_accept:'Venda concluída. O valor líquido está disponível em Minhas Vendas.',
    market_cancel:'Anúncio cancelado. Resgate o item devolvido no Correio.',
    market_collect:'Berry recebido.',
    market_collect_all:'Valores de venda recebidos.',
    market_read_notices:'Avisos marcados como lidos.',
  };
  const noticeTitles = {
    proposal_received:'Nova proposta recebida', proposal_accepted:'Sua proposta foi aceita', proposal_rejected:'Sua proposta foi recusada',
    proposal_withdrawn:'Uma proposta foi retirada', proposal_expired:'Uma proposta expirou e a reserva foi liberada',
    proposal_closed:'Uma proposta foi encerrada e a reserva foi liberada', purchase:'Compra concluída. O item está no Correio',
    sale:'Venda concluída. Há Berry para receber', listing_expired:'Anúncio expirado. Resgate o item no Correio',
    listing_cancelled:'Anúncio cancelado. Resgate o item no Correio',
  };
  const maxBerry = 1_000_000_000_000;
  const money = value => {
    try { return count.format(BigInt(value ?? 0)) + ' Berry'; }
    catch { return '—'; }
  };
  const unit = (value, quantity) => new Intl.NumberFormat('pt-BR', {maximumFractionDigits:2}).format(Number(value) / quantity) + ' Berry/un.';
  const dateText = value => value && Number.isFinite(Date.parse(value)) ? date.format(new Date(value)) : '—';
  const feeAmount = (gross, bps) => BigInt(gross) * BigInt(bps) / 10000n;
  const feePercent = bps => count.format(Number(bps) / 100) + '%';
  const validAmount = value => /^[1-9]\d{0,14}$/.test(String(value ?? '')) && Number(value) <= maxBerry;
  const exists = value => value !== null && value !== undefined && value !== '';
  const menu = () => '<button type="button" role="menuitem" data-market-open><img src="assets/ui/boss-dungeons/berry-reward.png" alt="" draggable="false"><span><b>MERCADO DOS MARES</b><small>Compre, anuncie e negocie com outros jogadores.</small></span><span class="social-badge" data-market-badge hidden></span></button>';
  const defaultFilters = () => ({market:{sort:'newest'}, inventory:{sort:'newest'}, sales:{}});
  const modeOptions = {...modes, auction:'Leilões'};
  const rankOptions = Object.fromEntries(['E','D','C','B','A','S'].map(rank => [rank, 'Rank ' + rank]));
  const classOptions = {sword:'Espadachim', brawler:'Lutador', gunner:'Atirador', rogue:'Gatuno', cyborg:'Ciborgue', strategist:'Estrategista', healer:'Suporte'};
  const filterLabels = {q:'Busca', mode:'Modalidade', category:'Categoria', slot:'Slot', rarity:'Raridade', rank:'Rank', fruitType:'Tipo', minLevel:'Nível mín.', maxLevel:'Nível máx.', minPotential:'Potencial mín.', maxPotential:'Potencial máx.', minPrice:'Preço mín.', maxPrice:'Preço máx.', classId:'Classe', attribute:'Atributo', origin:'Origem'};
  const filterOptions = {mode:modeOptions, category:categories, slot:slots, rarity:rarities, rank:rankOptions, fruitType:fruitTypes, classId:classOptions, attribute:attributes, origin:origins};
  const blank = text => '<p class="market-empty">'+escape(text)+'</p>';
  function select(name, label, values, selected, first, data = '') {
    const opts = Object.entries(values).map(([value, caption]) => '<option value="'+escape(value)+'"'+(String(selected) === value ? ' selected' : '')+'>'+escape(caption)+'</option>').join('');
    return '<label class="market-field"><span>'+escape(label)+'</span><select name="'+name+'" '+data+'>'+(first ? '<option value="">'+escape(first)+'</option>' : '')+opts+'</select></label>';
  }
  function field(name, label, value, opts = {}) {
    const {type='text', min, max, placeholder, required=false, data=''} = opts;
    return '<label class="market-field"><span>'+escape(label)+'</span><input name="'+name+'" type="'+type+'" value="'+escape(value)+'" '+data+
      (min == null ? '' : ' min="'+min+'"')+(max == null ? '' : ' max="'+max+'"')+(type === 'number' ? ' step="1" inputmode="numeric"' : ' maxlength="80"')+
      (placeholder ? ' placeholder="'+escape(placeholder)+'"' : '')+(required ? ' required' : '')+'></label>';
  }
  function button(label, action, id = '', opts = {}) {
    return '<button type="button" class="market-button'+(opts.primary ? ' market-primary' : '')+'" data-market-action="'+action+'" data-market-id="'+escape(id)+'"'+
      (opts.disabled ? ' disabled' : '')+(opts.label ? ' aria-label="'+escape(opts.label)+'"' : '')+(opts.pressed == null ? '' : ' aria-pressed="'+opts.pressed+'"')+'>'+escape(label)+'</button>';
  }
  function create(options) {
    const body = options.root ?? options.body;
    const read = options.fetch ?? ((view, params) => options.read({view, ...params}));
    const writable = options.controlled ?? options.canWrite;
    const selfId = options.selfId ?? (() => null);
    let view = 'market', visible = false, model = null, pending = false, writing = false, failed = false, notice = '';
    let revision = 0, page = 1, selected = null, purchaseListing = null, draft = {mode:'direct', quantity:'1', hours:'24'}, filters = defaultFilters();
    let advanced = false, help = false, noticesOpen = false, timer, badgePending = false, activeFetch = 0;
    const canWrite = () => Boolean(options.available() && writable() && !writing);
    const entries = () => model?.entries ?? [];
    const quantity = (item, listing) => Math.max(1, Number(listing?.quantity ?? item?.quantity ?? item?.qty) || 1);
    const getItem = row => row?.item ?? row;
    const itemId = row => String(getItem(row)?.instanceId ?? getItem(row)?.id ?? '');
    const itemTitle = item => [item?.name || 'Item', item?.level != null ? 'LV '+item.level : ''].filter(Boolean).join(' · ');
    const isStack = item => item?.stackable === true || item?.category === 'materials' || item?.category === 'fragments' || quantity(item) > 1;
    function itemIcon(item) {
      if (!item) return '';
      const id = item.catalogId ?? item.def;
      const html = options.icon?.(id, item);
      if (html) return html;
      const art = options.item?.(item)?.icon;
      return art ? '<img alt="" src="'+escape(art)+'" loading="lazy" draggable="false">' : '<span aria-hidden="true">◈</span>';
    }
    const selectedRow = () => entries().find(row => (view === 'inventory' ? itemId(row) : String(row.id)) === selected);
    const fee = listing => Number(listing?.feeBps ?? model?.feeBps ?? 1000);
    const own = listing => Boolean(selfId() && (listing?.seller?.id === selfId()));
    const marketPrice = listing => listing.mode === 'direct' ? listing.directPrice : listing.buyNow ?? listing.minOffer;
    const draftReady = () => !pending && !!selectedRow() && canWrite();
    function itemIdentity(item, qty, heading = 'strong') {
      const rarity = rarities[item?.rarity] || item?.rarity;
      const subline = [rarity, item?.rank ? 'Rank '+item.rank : '', fruitTypes[String(item?.fruitType).toLowerCase()], qty > 1 ? count.format(qty)+' un.' : ''].filter(Boolean).join(' · ');
      return '<span class="market-identity"><span class="market-item-art rarity-'+escape(item?.rarity || 'common')+'">'+itemIcon(item)+'</span><span><'+heading+' class="market-item-title rarity-'+escape(item?.rarity || 'common')+'">'+escape(itemTitle(item))+'</'+heading+'><small>'+escape(subline)+'</small></span></span>';
    }
    const pairs = object => Array.isArray(object)
      ? object.map((a,i) => [a?.key ?? a?.attribute ?? String(i + 1), a?.value ?? a?.amount ?? a?.name ?? a])
      : Object.entries(object ?? {});
    const facts = rows => '<dl class="market-facts">'+rows.filter(([,v])=>exists(v)).map(([k,v])=>'<div><dt>'+escape(k)+'</dt><dd>'+escape(v)+'</dd></div>').join('')+'</dl>';
    function itemFacts(item) {
      const className = item.classId ? options.className?.(item.classId) || classOptions[item.classId] || item.classId : null;
      const equipment = !!item.slot && !['pearl','akuma_no_mi'].includes(item.slot);
      const bonus = pairs(item.attributes).filter(([,v])=>typeof v === 'number' && v !== 0).map(([k,v])=>[attributes[k] || k, (v > 0 ? '+' : '')+count.format(v)]);
      const pearlList = (Array.isArray(item.pearls) ? item.pearls : []).map(pearl => {
        if (pearl == null) return '';
        if (typeof pearl === 'number') return options.item?.({def:pearl})?.name || 'Pérola';
        return pearl.name || (pearl.attribute ? (attributes[pearl.attribute] || pearl.attribute)+(pearl.level ? ' NV '+pearl.level : '') : '');
      }).filter(Boolean);
      return facts([
        ['Categoria',categories[item.category] || item.category],
        ['Slot', slots[item.slot]],
        ['Classe', className],
        ['Potencial', exists(item.potential) ? count.format(item.potential)+'%' : null],
        ['Aprimoramento', equipment && exists(item.upgrade) ? '+'+item.upgrade : null],
        ['Pérolas', pearlList.join(', ')],
        ['Origem', origins[item.origin] || item.origin],
        ['Obtido em', item.originLabel],
        ...bonus,
      ]);
    }
    function wallet() {
      const wallet = model?.wallet;
      return '<dl class="market-wallet">'+[
        ['Berry disponível', wallet?.available],['Berry reservado', wallet?.reserved],['Valor a receber', wallet?.receivable],
      ].map(([name,value])=>'<div><dt>'+name+'</dt><dd>'+(wallet ? money(value) : '—')+'</dd></div>').join('')+'</dl>';
    }
    function priceFacts(listing) {
      const qty = quantity(listing.item, listing);
      if (listing.mode === 'direct') return facts([['Preço total',money(listing.directPrice)], ['Por unidade',qty > 1 ? unit(listing.directPrice,qty) : null]]);
      return facts([['Proposta mínima',money(listing.minOffer)], ['Maior proposta válida',exists(listing.highestOffer)?money(listing.highestOffer):'Sem propostas'],
        ['Compra imediata',exists(listing.buyNow) ? money(listing.buyNow) : 'Indisponível'],['Mínima por unidade', qty > 1 ? unit(listing.minOffer,qty) : null],
        ['Compra imediata por unidade', qty > 1 && exists(listing.buyNow) ? unit(listing.buyNow,qty) : null]]);
    }
    function pageControls() {
      const current = model?.page ?? page;
      return '<footer class="market-paging">'+button('Anterior','prev','',{disabled:pending || current <= 1})+'<span>Página '+current+'</span>'+button('Próxima','next','',{disabled:pending || !model?.hasMore})+'</footer>';
    }
    function renderFilters(isMarket) {
      const f = filters[view];
      const filterSelect = (key, first) => select(key, filterLabels[key], filterOptions[key], f[key], first);
      const filterRange = (key, max, min=0) => field(key, filterLabels[key], f[key], {type:'number', min, max});
      const allowedSorts = isMarket ? Object.fromEntries(Object.entries(sorts).filter(([key])=>!['quantity','category'].includes(key))) :
        Object.fromEntries(Object.entries(sorts).filter(([key])=>!['price_asc','price_desc','expiry'].includes(key)));
      const active = Object.entries(f).filter(([key,value])=>key !== 'sort' && exists(value));
      return '<aside class="market-frame market-filters"><h3>'+(isMarket ? 'Pesquisar ofertas' : 'Mini inventário')+'</h3>'+
        '<form data-market-form="filters">'+
        field('q','Nome do item',f.q,{type:'search',placeholder:'Buscar por nome…'})+
        filterSelect('category','Todas as categorias')+
        filterSelect('rarity','Todas as raridades')+
        select('sort','Ordenar',allowedSorts,f.sort)+
        '<details class="market-advanced"'+(advanced?' open':'')+'><summary>Filtros avançados</summary><div class="market-filter-extra">'+
        filterSelect('slot','Todos os slots')+filterSelect('rank','Todos os ranks')+filterSelect('fruitType','Todos os tipos')+
        filterSelect('classId','Todas as classes')+filterSelect('attribute','Todos os atributos')+filterSelect('origin','Todas as origens')+
        '<div class="market-ranges">'+filterRange('minLevel',100,1)+filterRange('maxLevel',100,1)+filterRange('minPotential',100)+filterRange('maxPotential',100)+
        (isMarket ? filterRange('minPrice',maxBerry)+filterRange('maxPrice',maxBerry) : '')+'</div></div></details>'+
        '<div class="market-actions"><button type="submit" class="market-button market-primary">Aplicar filtros</button>'+button('Limpar filtros','reset-filters','',{disabled:!active.length && f.sort === 'newest'})+'</div></form>'+
        (active.length ? '<p class="market-active"><b>Filtros ativos</b> '+active.map(([key,value])=>'<span>'+escape(filterLabels[key]+' · '+(filterOptions[key]?.[value]||value))+'</span>').join('')+'</p>' : '')+
        (!isMarket ? '<p class="market-muted">Itens equipados, bloqueados, vinculados ou reservados ficam indisponíveis para anúncio.</p>' : '')+
        '</aside>';
    }
    function renderMarket() {
      const row = selectedRow();
      const priceLabel = ['price_asc','price_desc'].includes(filters.market.sort) ?
        '<p class="market-muted">Preço por unidade. Nos leilões, usa a compra imediata ou, se não houver, a proposta mínima.</p>' : '';
      const rows = entries().map(listing=>{
        const qty = quantity(listing.item, listing);
        return '<button type="button" class="market-listing" data-market-action="select" data-market-id="'+escape(listing.id)+'" aria-pressed="'+(selected === String(listing.id))+'">'+
          itemIdentity(listing.item,qty)+'<span class="market-listing-price"><small>'+escape(modes[listing.mode])+'</small><b>'+money(marketPrice(listing))+'</b>'+
          (qty>1?'<small>'+unit(marketPrice(listing),qty)+'</small>':'')+'</span></button>';
      });
      return '<div class="market-workspace">'+renderFilters(true)+'<section class="market-frame market-results" aria-label="Ofertas do mercado">'+
        '<div class="market-mode-actions" aria-label="Modalidades">'+[['','Todos'],['direct','Venda direta'],['auction','Leilões']].map(([key,title])=>button(title,'mode',key,{pressed:(filters.market.mode||'')===key})).join('')+'</div>'+
        priceLabel+(rows.join('') || blank('Nenhuma oferta com esses filtros.'))+pageControls()+'</section><aside class="market-frame market-inspect" aria-label="Detalhes do anúncio">'+
        (row ? inspectListing(row) : blank('Selecione uma oferta para conferir o item e suas condições.'))+'</aside></div>';
    }
    function inspectListing(row) {
      const qty = quantity(row.item,row);
      const buy = row.mode === 'direct' || exists(row.buyNow);
      const pendingOwn = row.ownProposal ?? null;
      return itemIdentity(row.item,qty,'h3')+facts([['Vendedor',row.seller?.name],['Prazo',dateText(row.expiresAt)]])+priceFacts(row)+itemFacts(row.item)+
        (own(row) ? '<p class="market-muted">Este é um dos seus anúncios.</p>'+button('Ver Minhas Vendas','tab','sales') : '')+
        (!own(row) && row.status === 'active' ? '<div class="market-actions">'+
          (buy ? button(row.mode === 'direct' ? 'Comprar' : 'Comprar agora','buy',row.id,{primary:true,disabled:!canWrite()}) : '')+
          '</div>'+(row.mode === 'auction' ? '<form data-market-form="offer" data-market-id="'+escape(row.id)+'" class="market-offer-form">'+
            field('amount','Sua proposta (Berry)',pendingOwn?.amount,{type:'number',min:row.minOffer,max:maxBerry,required:true})+
            '<button class="market-button" type="submit"'+(!canWrite()?' disabled':'')+'>'+(pendingOwn?'Atualizar proposta':'Revisar proposta')+'</button></form>' : '') : '');
    }
    function renderInventory() {
      const item = getItem(selectedRow());
      const hours = Object.fromEntries((model?.durations || [24,48,72]).map(value=>[value,value+' horas']));
      const rows = entries().map(row=>{
        const entry = getItem(row), id = itemId(row), qty = quantity(entry,row);
        return '<button type="button" class="market-tile" data-market-action="select" data-market-id="'+escape(id)+'" aria-pressed="'+(selected===id)+'" title="'+escape(itemTitle(entry))+'">'+
          itemIdentity(entry,qty)+'</button>';
      });
      return '<div class="market-workspace market-announcing">'+renderFilters(false)+
        '<section class="market-frame market-results"><h3>Mochila negociável</h3><div class="market-inventory-grid">'+
        (rows.join('') || blank('Nenhum item elegível com esses filtros.'))+'</div>'+pageControls()+'</section>'+
        '<aside class="market-frame market-inspect"><h3>Condições do anúncio</h3>'+
        (item ? itemIdentity(item,quantity(item,selectedRow()))+itemFacts(item)+
          '<form data-market-form="publish" class="market-publish-form">'+select('mode','Modalidade',modes,draft.mode,null,'data-market-draft')+
          select('hours','Duração',hours,draft.hours,null,'data-market-draft')+
          (isStack(item) ? field('quantity','Quantidade do lote',draft.quantity,{type:'number',min:1,max:quantity(item,selectedRow()),required:true,data:'data-market-draft'}) : '')+
          (draft.mode==='direct' ? field('price','Preço total em Berry',draft.price,{type:'number',min:1,max:maxBerry,required:true,data:'data-market-draft'}) :
            field('minOffer','Proposta mínima em Berry',draft.minOffer,{type:'number',min:1,max:maxBerry,required:true,data:'data-market-draft'})+
            field('buyNow','Compra imediata (opcional)',draft.buyNow,{type:'number',min:1,max:maxBerry,data:'data-market-draft'}))+
          '<p class="market-muted">Taxa de '+feePercent(fee())+' somente quando vender. O anúncio reserva a peça ou o lote inteiro.</p>'+
          '<button type="submit" class="market-button market-primary"'+(!draftReady()?' disabled':'')+'>Revisar anúncio</button></form>' :
          blank('Escolha uma peça ou um lote na mochila para anunciar.'))+'</aside></div>';
    }
    function renderOffers() {
      return '<section class="market-frame market-history"><h3>Propostas que você enviou</h3><p class="market-muted">Você pode retirar propostas pendentes ou ajustar o valor de uma delas. O saldo reservado só volta a ficar disponível quando a proposta é encerrada sem compra.</p>'+
        (entries().map(offer=>{
          const listing=offer.listing, qty=quantity(listing.item, listing);
          return '<article class="market-record">'+itemIdentity(listing.item,qty,'h4')+
            facts([['Vendedor',listing.seller?.name], ['Valor oferecido',money(offer.amount)], ['Valor reservado',money(offer.reserved)],
              ['Enviada',dateText(offer.createdAt)],['Prazo',dateText(listing.expiresAt)],['Estado',offer.status==='closed' && listing.status==='cancelled' ? 'Encerrada por cancelamento' : states[offer.status]||offer.status]])+
            '<div class="market-actions">'+
            (offer.status==='pending'? '<form data-market-form="offer-update" data-market-id="'+escape(offer.id)+'" class="market-offer-form">'+
              field('amount','Novo valor (Berry)',offer.amount,{type:'number',min:listing.minOffer,max:maxBerry,required:true})+
              '<button class="market-button" type="submit"'+(!canWrite()?' disabled':'')+'>Revisar valor</button></form>'+
              button('Retirar','withdraw',offer.id,{disabled:!canWrite()}) : '')+
            (offer.status==='accepted' ? button('Ver compra','purchase',listing.id) : '')+'</div></article>';
        }).join('') || blank('Você ainda não enviou propostas.'))+pageControls()+'</section>';
    }
    function renderSales() {
      const sale = row => {
        const current=row.sale;
        return current ? facts([['Vendida em',dateText(current.soldAt)],['Comprador',current.buyer?.name],
          ['Preço efetivo',money(current.gross)],['Comissão',money(current.fee)],['Líquido',money(current.net)],
          ['Recebido',current.collectedAt ? dateText(current.collectedAt) : null],['Pendente',current.collectedAt ? null : money(current.net)]])+
          (!current.collectedAt ? button('Receber','collect',current.id,{primary:true,disabled:!canWrite()}) : '') : '';
      };
      return '<section class="market-frame market-history"><header class="market-history-head"><h3>Seus anúncios e vendas</h3>'+
        '<form data-market-form="sale-filter">'+select('status','Estado do anúncio',saleFilters,filters.sales.status,'Todos','data-market-sale-filter')+'</form>'+
        button('Receber tudo','collect-all','',{primary:true,disabled:!canWrite()||Number(model?.wallet?.receivable??0)<=0})+'</header>'+
        (entries().map(row=>{
          const qty=quantity(row.item,row);
          const proposals=row.proposals||[];
          const waiting=proposals.filter(offer=>offer.status==='pending').length;
          return '<article class="market-record">'+itemIdentity(row.item,qty,'h4')+
            facts([['Modalidade',modes[row.mode]], ['Estado',states[row.status]||row.status], ['Publicado',dateText(row.createdAt)],['Prazo',dateText(row.expiresAt)]])+
            priceFacts(row)+sale(row)+
            (row.status==='active' ? button('Cancelar anúncio','cancel',row.id,{disabled:!canWrite()}) : '')+
            (proposals.length ? '<details class="market-proposals" data-market-details="proposals:'+escape(row.id)+'"><summary>Propostas recebidas ('+(row.status==='active'?waiting+' pendentes':proposals.length)+')</summary>'+
              proposals.map(offer=>'<div><strong>'+escape(offer.buyer?.name)+' · '+money(offer.amount)+'</strong><small>'+escape(dateText(offer.createdAt)+' · '+(states[offer.status]||offer.status))+'</small>'+
              (row.status==='active'&&offer.status==='pending' ? '<span class="market-actions">'+button('Aceitar','accept',offer.id,{primary:true,disabled:!canWrite()})+button('Recusar','reject',offer.id,{disabled:!canWrite()})+'</span>' : '')+'</div>').join('')+'</details>' : '')+
            (row.mailId && !row.deliveredAt && ['cancelled','expired'].includes(row.status)?button('Resgatar devolução no Correio','mail',row.mailId):'')+
            '<details class="market-snapshot" data-market-details="listing:'+escape(row.id)+'"><summary>Ficha do item</summary>'+itemFacts(row.item)+'</details></article>';
        }).join('') || blank('Nenhum anúncio neste estado.'))+pageControls()+'</section>';
    }
    function renderPurchases() {
      return '<section class="market-frame market-history"><h3>Seu histórico de compras</h3>'+
        (purchaseListing ? button('Ver todas as compras','reset-purchase') : '')+
        (entries().map(sale=>{
          const listing=sale.listing, qty=quantity(listing.item,listing);
          return '<article class="market-record">'+itemIdentity(listing.item,qty,'h4')+
            facts([['Vendedor',listing.seller?.name], ['Valor pago',money(sale.gross)], ['Por unidade',qty>1?unit(sale.gross,qty):null],
              ['Modalidade',modes[listing.mode]],['Data',dateText(sale.soldAt)],['Entrega',sale.deliveredAt ? 'Resgatada em '+dateText(sale.deliveredAt) : 'Aguardando resgate no Correio']])+
            (sale.deliveredAt ? '' : button('Abrir Correio','mail',sale.mailId,{primary:true}))+
            '<details class="market-snapshot" data-market-details="purchase:'+escape(sale.id)+'"><summary>Ficha na data da compra</summary>'+itemFacts(listing.item)+'</details></article>';
        }).join('') || blank('Você ainda não concluiu nenhuma compra.'))+pageControls()+'</section>';
    }
    function renderHelp() {
      return '<aside class="market-frame market-help"><h3>Como negociar</h3><ul>'+
        '<li><b>Venda direta</b> vende a peça ou o lote inteiro pelo preço anunciado.</li>'+
        '<li><b>Leilões por propostas</b> reservam Berry enquanto a proposta está pendente. Você pode retirá-la, e o vendedor precisa aceitá-la para vender.</li>'+
        '<li><b>Compra imediata</b> encerra o anúncio pelo preço informado. Propostas nesse valor ou acima abrem a confirmação de compra pelo preço anunciado.</li>'+
        '<li><b>Taxa</b> é fixada ao publicar e descontada do vendedor no fechamento da venda. O anúncio mostra a taxa vigente antes de confirmar.</li>'+
        '<li><b>Prazo e cancelamento</b> encerram as propostas e liberam as reservas. O item volta pelo Correio. O prazo não arremata automaticamente.</li>'+
        '<li><b>Resgates</b> de itens ficam no Correio até caberem na mochila. O Berry líquido da venda fica em Minhas Vendas.</li>'+
        '<li><b>Itens indisponíveis</b> incluem os vinculados, reservados, equipados e bloqueados.</li></ul></aside>';
    }
    function renderNotices() {
      const notices=model?.notices ?? [];
      if (!notices.length) return '';
      return '<details class="market-frame market-notices"'+(noticesOpen?' open':'')+'><summary>Avisos recentes ('+notices.length+')</summary><ul>'+
        notices.map(n=>'<li><strong>'+escape(noticeTitles[n.kind]||'Negociação atualizada')+'</strong> · '+escape(dateText(n.createdAt))+'</li>').join('')+
        '</ul>'+button('Marcar como lidos','read-notices','',{disabled:!canWrite()})+'</details>';
    }
    function paint({keepScroll = false} = {}) {
      if (!visible) return;
      const previous = document.activeElement;
      const action = previous?.dataset?.marketAction;
      const id = previous?.dataset?.marketId;
      const field = previous?.name;
      const form = previous?.closest('[data-market-form]')?.dataset.marketForm;
      const expanded = new Set([...body.querySelectorAll('[data-market-details][open]')].map(el=>el.dataset.marketDetails));
      const content = body.querySelector('.market-scroll');
      const scroll = keepScroll ? content?.scrollTop ?? 0 : 0;
      if (model && !selected && ['market','inventory'].includes(view) && entries().length) {
        selected = view==='market' ? String(entries()[0].id) : itemId(entries()[0]);
      }
      const inner = model ? {market:renderMarket,inventory:renderInventory,offers:renderOffers,sales:renderSales,purchases:renderPurchases}[view]() : '';
      body.innerHTML = '<section class="market-shell">'+wallet()+'<nav class="market-tabs" aria-label="Abas do Mercado dos Mares">'+
        Object.entries(tabs).map(([key,label])=>button(label,'tab',key,{pressed:key===view})).join('')+
        button('?','help','',{label:'Como funciona o mercado',pressed:help})+'</nav>'+
        (options.pending?.() ? '<div class="market-recovery"><span>Uma operação ainda aguarda confirmação do servidor.</span>'+
          button('Consultar operação','resume','',{primary:true,disabled:writing})+'</div>' : '')+
        '<p class="market-notice" role="status"'+(!notice?' hidden':'')+'>'+escape(notice)+'</p>'+
        '<div class="market-scroll" aria-busy="'+(pending||writing)+'">'+(help?renderHelp():'')+renderNotices()+
        (!options.available() ? blank('Entre com um personagem online em um servidor com o Mercado dos Mares habilitado.') : !model ?
          blank(failed?'Não foi possível carregar o mercado.':'Consultando o mercado…')+(failed?button('Tentar novamente','retry'):'') : inner)+
        '</div></section>';
      for (const detail of body.querySelectorAll('[data-market-details]')) {
        if (expanded.has(detail.dataset.marketDetails)) detail.open=true;
      }
      body.querySelector('.market-scroll').scrollTop = scroll;
      if (action) {
        [...body.querySelectorAll('[data-market-action]')].find(el=>el.dataset.marketAction===action && el.dataset.marketId===id)?.focus({preventScroll:true});
      } else if (field && form) {
        [...body.querySelectorAll('input,select')].find(el=>el.name===field && el.closest('[data-market-form]')?.dataset.marketForm===form)?.focus({preventScroll:true});
      }
    }
    async function refresh({background=false} = {}) {
      const current = ++activeFetch;
      const opening = revision;
      if (!visible || !options.available()) return;
      pending = !background;
      failed = false;
      let changed = false;
      if (!background) paint({keepScroll:true});
      try {
        const next = await read(view, {...filters[view], page, ...(view==='purchases' && purchaseListing?{listingId:purchaseListing}:{})});
        if (current !== activeFetch || opening !== revision || !visible) return;
        if (background && pausedRefresh()) return;
        if (background && JSON.stringify(next) === JSON.stringify(model)) return;
        model = next;
        changed = true;
        if (exists(next.pending)) setBadge(next.pending);
        if (selected && !selectedRow()) selected=null;
      } catch (error) {
        if (current !== activeFetch || opening !== revision || !visible || background) return;
        notice = errors[error?.code] || 'Não foi possível consultar o mercado.';
        failed = true;
      } finally {
        if (current === activeFetch && opening === revision && visible && !background) {
          pending=false;
          paint({keepScroll:true});
        } else if (current === activeFetch && opening === revision && visible && background && changed && !pausedRefresh()) {
          paint({keepScroll:true});
        }
      }
    }
    function setBadge(value) {
      const amount = Math.max(0,Number(value)||0);
      const badge = document.querySelector('[data-market-badge]');
      if (badge) {
        badge.hidden = amount === 0;
        badge.textContent = amount > 99 ? '99+' : String(amount);
        badge.setAttribute('aria-label',amount+' pendências no Mercado dos Mares');
      }
      options.badge?.(amount);
    }
    async function refreshBadge() {
      if (!options.available() || badgePending || document.hidden) return;
      badgePending=true;
      try { const next = await read('badge',{}); setBadge(next.pending); }
      catch { /* Preserve the last authoritative badge during connection interruptions. */ }
      finally { badgePending=false; }
    }
    function resetDraft() {
      draft = {mode:'direct',quantity:'1',hours:String(model?.durations?.[0] || 24)};
    }
    function changeTab(next, listingId=null) {
      if (!(next in tabs) || (next===view && purchaseListing===listingId) || writing) return;
      view=next; page=1; selected=null; purchaseListing=listingId; model=null; notice=''; advanced=false; resetDraft();
      paint();
      void refresh();
    }
    function open() {
      if (visible) return;
      visible=true; revision++; page=1; selected=null; purchaseListing=null; model=null; notice=''; failed=false;
      view='market'; help=false; advanced=false; noticesOpen=false; filters=defaultFilters(); resetDraft();
      paint();
      void refresh();
      void refreshBadge();
    }
    function close() {
      visible=false; revision++; activeFetch++; pending=false;
    }
    function pausedRefresh() {
      const focused=document.activeElement;
      return document.querySelector('.confirmation-overlay') ||
        (body.contains(focused) && focused?.matches('input,select,[role="combobox"],[role="listbox"],[role="option"],summary'));
    }
    function start() {
      if (timer) return;
      timer=setInterval(()=>{
        if (!visible || document.hidden || pending || writing || view==='inventory' || pausedRefresh()) return;
        void refresh({background:true});
      },15000);
    }
    function financialSummary(gross, bps) {
      const commission=feeAmount(gross,bps);
      return 'Bruto '+money(gross)+' · taxa '+feePercent(bps)+' ('+money(commission)+') · líquido '+money(BigInt(gross)-commission)+'.';
    }
    async function execute(payload) {
      if (!canWrite()) return false;
      const opening=revision;
      writing=true;
      try {
        const receipt=await options.command(payload);
        if (receipt===null || receipt===false) return options.pending?.()===true;
        if (opening===revision && visible) {
          notice=success[payload.kind];
          if (payload.kind==='market_publish') {selected=null; resetDraft();}
        }
        return true;
      } catch (error) {
        if (options.pending?.()) {
          if (opening===revision && visible) notice='O servidor ainda não confirmou o resultado desta operação.';
          return true;
        }
        const message=errors[error?.code] || 'A operação não foi concluída. Confira o estado atualizado antes de tentar novamente.';
        if (opening===revision && visible) notice=message;
        options.alert?.(message);
        return false;
      } finally {
        writing=false;
        if (opening===revision && visible) void refresh();
        void refreshBadge();
      }
    }
    async function resume() {
      if (writing || !options.pending?.() || !options.resume) return;
      writing=true;
      const opening=revision;
      paint({keepScroll:true});
      try {
        const receipt=await options.resume();
        if (opening===revision && visible && receipt!=null) notice='Operação consultada. Confira o resultado nas abas do Mercado.';
      } catch (error) {
        if (opening===revision && visible) notice=errors[error?.code] || 'Ainda não foi possível consultar a operação.';
      } finally {
        writing=false;
        if (opening===revision && visible) void refresh();
        void refreshBadge();
      }
    }
    function confirm(title, message, acceptLabel, payload, {item, qty, result, danger=false} = {}) {
      if (!canWrite() || pending) return;
      const model={
        fingerprint:JSON.stringify(payload),
        subject:item ? {name:itemTitle(item),detail:[rarities[item.rarity], count.format(qty || 1)+((qty || 1)>1?' unidades':' unidade')].filter(Boolean).join(' · '),src:options.artPath?.(item.catalogId,item)} : null,
        result,
      };
      if (options.confirm) options.confirm({title,message,acceptLabel,danger,model},()=>execute(payload));
      else if (global.confirm([title,message,result].filter(Boolean).join('\n\n'))) void execute(payload);
    }
    function buy(listing) {
      if (!listing || own(listing)) return;
      const price=listing.mode==='direct' ? listing.directPrice : listing.buyNow;
      if (!validAmount(price)) return;
      confirm('Confirmar compra','Você vai comprar de '+listing.seller.name+'. O item será entregue pelo Correio.','COMPRAR',
        {kind:'market_buy',listingId:listing.id,version:listing.version,amount:Number(price)},
        {item:listing.item,qty:quantity(listing.item,listing),result:'Total a pagar '+money(price)+'.'});
    }
    function offer(listing, value, existing) {
      if (!listing || own(listing) || !validAmount(value) || Number(value)<Number(listing.minOffer)) return;
      if (exists(listing.buyNow) && Number(value)>=Number(listing.buyNow)) {buy(listing);return;}
      const payload={kind:'market_offer', listingId:listing.id, version:listing.version, amount:Number(value)};
      if (existing) Object.assign(payload,{proposalId:existing.id,proposalVersion:existing.version});
      confirm(existing?'Revisar proposta':'Enviar proposta','O valor fica reservado enquanto a proposta estiver pendente.','CONFIRMAR PROPOSTA',payload,
        {item:listing.item,qty:quantity(listing.item,listing),result:'Valor oferecido '+money(value)+'.'});
    }
    function publish(form) {
      const row=selectedRow(),item=getItem(row);
      if (!item || !form.reportValidity()) return;
      const values=Object.fromEntries(new FormData(form));
      const payload={kind:'market_publish', itemId:itemId(row), mode:values.mode, quantity:Number(values.quantity||1), hours:Number(values.hours), feeBps:fee()};
      const conditions=values.mode==='direct' ? values.price : values.minOffer;
      if (!validAmount(conditions)) return;
      if (payload.mode==='direct') payload.price=Number(conditions);
      else {
        payload.minOffer=Number(conditions);
        if (values.buyNow) {
          if (!validAmount(values.buyNow) || Number(values.buyNow)<payload.minOffer) {
            notice='A compra imediata precisa ser igual ou maior que a proposta mínima.';
            paint({keepScroll:true});
            return;
          }
          payload.buyNow=Number(values.buyNow);
        }
      }
      confirm('Publicar anúncio',modes[payload.mode]+' por '+payload.hours+' horas. O item ficará reservado.', 'PUBLICAR', payload, {
        item, qty:payload.quantity,
        result:(payload.mode==='auction'?'Na proposta mínima · ':'')+financialSummary(conditions,fee())+
          (payload.buyNow ? ' Compra imediata · '+financialSummary(payload.buyNow,fee()) : ''),
      });
    }
    function actOnProposal(action, id) {
      const listing = action==='withdraw' ? entries().find(row=>String(row.id)===id)?.listing :
        entries().find(row=>row.proposals?.some(p=>String(p.id)===id));
      const proposal = action==='withdraw' ? entries().find(row=>String(row.id)===id) : listing?.proposals?.find(p=>String(p.id)===id);
      if (!listing || !proposal || proposal.status!=='pending') return;
      const captions = {withdraw:['Retirar proposta','A reserva de Berry desta proposta será liberada.','RETIRAR'],accept:['Aceitar proposta','A venda será concluída para '+proposal.buyer?.name+'.','ACEITAR'],reject:['Recusar proposta','A reserva de Berry do comprador será liberada.','RECUSAR']};
      confirm(...captions[action],{kind:'market_'+action, listingId:listing.id, version:listing.version, proposalId:proposal.id, proposalVersion:proposal.version},
        {item:listing.item,qty:quantity(listing.item,listing),result:action==='accept' ? financialSummary(proposal.amount,fee(listing)) : money(proposal.amount),danger:action!=='accept'});
    }
    function changeFilters(values) {
      filters[view]=Object.fromEntries(Object.entries(values).filter(([,value])=>exists(value)));
      page=1; selected=null;
      void refresh();
    }
    body.addEventListener('click', event=>{
      const target=event.target.closest('[data-market-action]');
      if (!visible || !target || target.disabled) return;
      const {marketAction:action,marketId:id}=target.dataset;
      if (action==='tab') {changeTab(id);body.querySelector('.market-tabs [aria-pressed=true]')?.focus({preventScroll:true});}
      if (action==='help') {help=!help; paint({keepScroll:true});body.querySelector('[data-market-action="help"]')?.focus({preventScroll:true});}
      if (action==='retry') void refresh();
      if (action==='resume') void resume();
      if (action==='mode') changeFilters({...filters.market,mode:id});
      if (action==='reset-filters') changeFilters(defaultFilters()[view]);
      if (action==='next' || action==='prev') {page=(model?.page??page)+(action==='next'?1:-1); selected=null; void refresh();}
      if (action==='select') {
        selected=id;
        if (view==='inventory') resetDraft();
        paint({keepScroll:true});
        if (matchMedia('(max-width: 570px)').matches) body.querySelector('.market-inspect')?.scrollIntoView({block:'nearest'});
        else [...body.querySelectorAll('[data-market-action="select"]')].find(x=>x.dataset.marketId===id)?.focus({preventScroll:true});
      }
      if (action==='mail') options.openMail?.(id);
      if (action==='purchase') changeTab('purchases',id);
      if (action==='reset-purchase') changeTab('purchases');
      if (action==='read-notices') {
        const noticeIds=(model?.notices??[]).map(n=>n.id);
        if (noticeIds.length) void execute({kind:'market_read_notices',noticeIds});
      }
      if (action==='buy') buy(entries().find(row=>String(row.id)===id));
      if (['withdraw','accept','reject'].includes(action)) actOnProposal(action,id);
      if (action==='cancel') {
        const row=entries().find(listing=>String(listing.id)===id);
        if (row) confirm('Cancelar anúncio','As propostas pendentes serão encerradas. Resgate o item devolvido no Correio.','CANCELAR ANÚNCIO',
          {kind:'market_cancel',listingId:row.id,version:row.version},{item:row.item,qty:quantity(row.item,row),danger:true});
      }
      if (action==='collect' || action==='collect-all') {
        const value=action==='collect' ? entries().find(row=>String(row.sale?.id)===id)?.sale?.net : model?.wallet?.receivable;
        if (/^[1-9]\d*$/.test(String(value))) confirm('Receber Berry','O líquido será transferido para a sua carteira.','RECEBER',
          action==='collect' ? {kind:'market_collect',saleId:id} : {kind:'market_collect_all'},{result:'Valor disponível '+money(value)+'.'});
      }
    });
    body.addEventListener('submit', event=>{
      if (!visible) return;
      const form=event.target.closest('[data-market-form]');
      if (!form) return;
      event.preventDefault();
      const values=Object.fromEntries(new FormData(form));
      const id=form.dataset.marketId;
      if (form.dataset.marketForm==='filters') changeFilters(view==='market' ? {...values,mode:filters.market.mode} : values);
      if (form.dataset.marketForm==='publish') publish(form);
      if (form.dataset.marketForm==='offer') {
        const listing=entries().find(row=>String(row.id)===id);
        offer(listing,values.amount,listing?.ownProposal ?? null);
      }
      if (form.dataset.marketForm==='offer-update') {
        const row=entries().find(proposal=>String(proposal.id)===id);
        if (row) offer(row.listing,values.amount,row);
      }
    });
    body.addEventListener('input',event=>{
      if (visible && event.target.matches('input[data-market-draft]')) draft[event.target.name]=event.target.value;
    });
    body.addEventListener('change',event=>{
      if (!visible) return;
      const target=event.target;
      if (target.matches('select[data-market-draft]')) {
        draft[target.name]=target.value;
        if (target.name==='mode') paint({keepScroll:true});
      }
      if (target.matches('select[data-market-sale-filter]')) changeFilters({status:target.value});
    });
    body.addEventListener('toggle',event=>{
      if (visible && event.target.isConnected && event.target.matches('.market-advanced')) advanced=event.target.open;
      if (visible && event.target.isConnected && event.target.matches('.market-notices')) noticesOpen=event.target.open;
    },true);
    return {open,close,start,setBadge,refreshBadge};
  }
  global.MareMarketUI={create,menu};
})(globalThis);
