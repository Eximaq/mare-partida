/* Adapter for the existing HUD/dialogs. The offline economy is never executed here. */
(function (root) {
  "use strict";
  const attrs = ["strength", "dexterity", "vitality", "intelligence", "spirit"],
    names = ["Força", "Destreza", "Vitalidade", "Inteligência", "Espírito"];
  const escape = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
  const safe = (n) =>
    Number(
      BigInt(n) > BigInt(Number.MAX_SAFE_INTEGER)
        ? BigInt(Number.MAX_SAFE_INTEGER)
        : BigInt(n),
    );
  // Presentation extrapolates a server-approved polyline; it never posts its result.
  function worldPosition(w, elapsedMs) {
    const duration=Math.max(0,Date.parse(w.motionUntil)-Date.parse(w.serverNow));
    let budget=w.speed*Math.max(0,Math.min(duration,Number.isFinite(elapsedMs)?elapsedMs:0))/1000;
    let {x,y}=w.position,direction=w.direction,moving=false;
    for(const p of w.path){const dx=p.x-x,dy=p.y-y,d=Math.hypot(dx,dy);if(!d)continue;if(budget<=0)break;
      direction=Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'back':'front');const step=Math.min(d,budget);x+=dx/d*step;y+=dy/d*step;budget-=step;
      moving=step<d;if(moving)break;
    }
    return {x,y,direction,moving:moving&&elapsedMs<duration};
  }
  // Cosmetic correction only. Commands/collisions keep using worldPosition directly.
  // Manual correction is short; sampled combat spans its observed update cadence.
  // Neither mode extends the approved path or extrapolates unseen combat positions.
  function createWorldPresentation({walk=false,route}={}) {
    if(walk)return createWalkingPresentation(route);
    let snapshot=null,received=0,offset={x:0,y:0},duration=200;
    function sample(now){
      if(!snapshot)return null;
      const elapsed=Math.max(0,now-received),pose=worldPosition(snapshot,elapsed);
      const weight=Math.max(0,1-elapsed/duration);
      return {...pose,x:pose.x+offset.x*weight,y:pose.y+offset.y*weight,
        moving:pose.moving||(weight>0&&Math.hypot(offset.x,offset.y)>.1)};
    }
    return {sample,update(next,now,{buffered=false}={}){
      if(next===snapshot)return false;
      const previous=sample(now),target=worldPosition(next,0);
      // A peer can start moving between polls. Allow that observed progress,
      // while still snapping large teleports and never retaining stale offsets.
      const limit=Math.min(512,Math.max(128,next.speed*Math.min(3,Math.max(0,now-received)/1000)+32));
      const snap=!previous||snapshot.mapId!==next.mapId||now-received>5000||Math.hypot(previous.x-target.x,previous.y-target.y)>limit;
      offset=snap?{x:0,y:0}:{x:previous.x-target.x,y:previous.y-target.y};
      duration=buffered?Math.max(250,Math.min(1250,now-received+100)):200;
      snapshot=next;received=now;return snap;
    }};
  }
  // Walking may remain behind a late server sample, but must never sprint to catch
  // it. Bridge only through the same collision map, then follow the approved path.
  function createWalkingPresentation(route=(from,to)=>[{x:to.x,y:to.y}]) {
    let snapshot=null,received=0,state=null;
    const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
    const length=(from,points)=>{let n=0;for(const p of points){n+=distance(from,p);from=p;}return n;};
    function sample(now){
      if(!state)return null;
      const elapsed=Math.max(0,now-received),dt=Math.max(0,Math.min(100,now-state.last));state.last=Math.max(state.last,now);
      const lease=Math.max(0,Date.parse(snapshot.motionUntil)-Date.parse(snapshot.serverNow));
      const bridge=state.buffered?state.bridge*Math.min(1,elapsed/state.duration):state.bridge;
      const allowed=bridge+Math.min(state.pathLength,snapshot.speed*Math.min(elapsed,lease)/1000);
      let budget=Math.max(0,Math.min(snapshot.speed*dt/1000,allowed-state.travel)),moved=0;
      while(budget>1e-9&&state.points.length){
        const p=state.points[0],dx=p.x-state.x,dy=p.y-state.y,d=Math.hypot(dx,dy);
        if(d<1e-8){state.points.shift();continue;}
        const step=Math.min(d,budget);state.x+=dx/d*step;state.y+=dy/d*step;state.travel+=step;budget-=step;moved+=step;
        state.direction=Math.abs(dx)>Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'back':'front');
        if(step>=d-1e-8){state.x=p.x;state.y=p.y;state.points.shift();}
      }
      if(dt>0)state.moving=moved>1e-8;
      return {x:state.x,y:state.y,direction:state.direction,moving:state.moving};
    }
    return {sample,update(next,now,{buffered=false,reset=false}={}){
      if(next===snapshot&&!reset)return false;
      const previous=sample(now),snap=!previous||snapshot.mapId!==next.mapId||reset;
      const origin=snap?next.position:previous;
      const bridge=distance(origin,next.position)<1e-8?[]:route(origin,next.position);
      const connected=distance(origin,next.position)<1e-8||(bridge.length&&distance(bridge.at(-1),next.position)<1e-6);
      const points=connected?[...bridge,...next.path].map(p=>({x:p.x,y:p.y})):[];
      state={x:origin.x,y:origin.y,direction:next.direction,moving:false,last:now,points,travel:0,
        bridge:connected?length(origin,bridge):0,pathLength:connected?length(next.position,next.path):0,
        buffered:buffered&&!next.path.length,duration:Math.max(250,Math.min(1250,now-received+100))};
      snapshot=next;received=now;return snap;
    }};
  }
  // Local render diagnostics only: no timer or network request per frame.
  function createFrameMeter(){
    let frames=[];
    return {reset(){frames=[];},frame(t){if(!Number.isFinite(t))return;frames.push(t);while(frames.length>2&&frames[1]<t-1000)frames.shift();},sample(){
      if(frames.length<2)return {fps:null,maxFrameMs:null};
      let max=0;for(let i=1;i<frames.length;i++)max=Math.max(max,frames[i]-frames[i-1]);
      const span=frames.at(-1)-frames[0];return {fps:span>0?Math.round((frames.length-1)*1000/span):null,maxFrameMs:Math.round(max)};
    }};
  }
  function stepMonsterVisual(m,pose,dt,frameId){
    if(frameId===undefined||m.onlineVisualFrame!==frameId){m.onlineVisualFrame=frameId;m.onlineVisualOrigin={x:m.x,y:m.y};}
    const dx=pose.x-m.onlineVisualOrigin.x,dy=pose.y-m.onlineVisualOrigin.y,moving=Math.hypot(dx,dy)>1e-8;
    m.x=pose.x;m.y=pose.y;m.moving=moving?1:0;
    if(moving&&!(m.attackAnim>0))m.emberFacing=Math.abs(dx)>Math.abs(dy)?(dx<0?'west':'east'):(dy<0?'north':'south');
    m.emberElapsed=(m.emberElapsed||0)+dt;m.attackAnim=Math.max(0,m.attackAnim-dt);m.hit=Math.max(0,m.hit-dt);
  }
  function fruitTimeline(value,epoch,time){
    if(!value)return null;const shift=time-(epoch||Date.now())/1000;
    const times=new Set(['started','until','last','time','impact','launch','launched','finished','ready','next']);
    const walk=(v,key='')=>{if(typeof v==='number')return v>1e8&&v<1e11&&(times.has(key)||key.endsWith('Until'))?v+shift:v;if(!v||typeof v!=='object')return v;if(v.serverSet)return new Set(v.serverSet.map(x=>walk(x)));if(v.serverMap)return new Map(v.serverMap.map(x=>[x[0],walk(x[1],'last')]));if(Array.isArray(v))return v.map(x=>walk(x));return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,walk(x,k)]));};
    return walk(value);
  }
  function fruitView(b,time){const f=b?.fruit;return f?{...fruitTimeline(f,f.time,time),cooldowns:{...f.cooldowns}}:null;}
  function project(base, data) {
    const o = data.online,
      frozen = !o.battle&&['active','won','lost'].includes(o.combat?.status),
      f = frozen ? o.combat.fighter ?? o.combatPreview : o.combatPreview;
    if (!f || !Number.isFinite(f.maxHp) || f.maxHp < 1)
      throw new Error("invalid_server_state");
    return {
      ...base,
      characterId:data.character.id,onlineFruits:!!o.fruits,akumaCompendium:[...(o.fruits?.registered||[])],zoanTransformed:!!o.battle?.fruit?.transformed,fruitCooldowns:{...o.battle?.fruit?.cooldowns},
      name:o.profile?.identity.name??data.character.name,
      classId:o.profile?.identity.classId??data.character.classId,
      factionId:o.profile?.identity.factionId??data.character.factionId,
      ...(o.profile?{appearance96:structuredClone(o.profile.appearance),preferences:structuredClone(o.profile.preferences),created:Date.parse(o.profile.createdAt),totalPlay:o.battle?.metrics?.seconds??0,onlineMetrics:!!o.battle?.metrics}:{}),
      level: o.state.level,
      xp: safe(o.progression.xpIntoLevel),
      gold: safe(o.state.gold),
      hp: o.battle?.hp ?? (frozen && o.combat?.encounterId ? o.combat.playerHp : f.maxHp),
      energy: o.battle?.energy ?? 0,
      hierarchyPlayerId:data.character.id,hierarchyFaction:data.character.factionId,hierarchyTier:o.hierarchy?.tier||1,
      ...(o.haki?{has_haki_unlocked:o.haki.state.unlocked,haki:structuredClone(o.haki.state)}:{}),
      ...(o.dungeons?{bossDungeons:structuredClone(o.dungeons)}:{}),
      ...(o.prison?{impelDown:structuredClone(o.prison)}:{}),
      claimed: [...(o.contracts?.claimed||[])],
      talentVersion:3,talentLegacyBudget:Math.max(0,(o.talents?.earned||0)-(globalThis.MareAchievements?.bonus({achievements:o.achievements})||0)),talentSeq:o.talents?.revision||0,talentBuilds:{[data.character.classId]:structuredClone(o.talents?.build||{nodes:{},keystone:null,ultimate:null})},
      talentCooldowns:structuredClone(o.battle?.talentCooldowns||{}),achievements:{version:1,claimed:[...(o.achievements?.claimed||[])],records:structuredClone(o.achievements?.records||{})},onlineAchievements:o.achievements?structuredClone(o.achievements):null,
      potions: 0,
      materials: 0,
      inventory: [],
      equipment: Object.fromEntries(
        Object.keys(base.equipment).map((k) => [k, null]),
      ),
      attributes: { ...o.attributes.allocated },
      attributePoints: o.attributes.available,
      stats: Object.fromEntries(Object.keys(base.stats).map((k) => [k, 0])),
      ...(o.originalInventory?structuredClone(o.originalInventory):{}),
      ...(o.battle?{hunts:structuredClone(o.battle.hunts),stats:{...Object.fromEntries(Object.keys(base.stats).map(k=>[k,0])),damage:o.battle.metrics?.damage??0,goldEarned:o.dungeonGoldEarned||0,kills:o.achievements?.kills??Object.values(o.battle.hunts.areas).reduce((n,a)=>n+a.kills,0),boss:Object.values(o.battle.hunts.areas).reduce((n,a)=>n+a.bosses,0)}}:{}),
    };
  }
  function derived(base, data) {
    const f = !data.online.battle&&['active','won','lost'].includes(data.online.combat?.status)?data.online.combat.fighter??data.online.combatPreview:data.online.combatPreview;
    if(f.rulesetId==='original-character-v1')return {...base,...structuredClone(f.stats),magicDefense:f.stats.defense};
    return {
      ...base,
      maxHP: f.maxHp,
      maxEnergy: 0,
      attack: f.attackMin,
      physical: f.attackMin,
      elemental: f.attackMin,
      defense: f.armor,
      magicDefense: f.armor,
      speed: 1000 / f.cooldownMs,
      crit: 0,
      moveSpeed: 150,
      healthRegen: 0,
      energyRegen: 0,
      power: f.attackMin + f.armor + f.maxHp,
    };
  }
  const labels = {
    party_prison_individual:'Impel Down é uma atividade individual. Saia da Party para participar.',
    party_not_joined:'Você não está em uma Party.',party_already_joined:'Este personagem já participa de uma Party.',party_full:'O grupo já tem quatro membros.',party_leader_required:'Esta ação é exclusiva do líder.',party_self_invite:'Você não pode convidar a si mesmo.',party_player_unavailable:'Não encontrei um único personagem online com esse nome.',party_invite_missing:'Este convite não está disponível.',party_invite_expired:'Este convite expirou.',party_activity_active:'A atividade já começou. Aguarde o grupo encerrar.',party_member_busy:'Um membro está terminando outra ação. Tente novamente.',party_member_unavailable:'Todos precisam estar conectados, vivos e disponíveis.',party_member_in_dungeon:'Um membro precisa retornar da masmorra antes da preparação.',party_destination_locked:'O destino exige um nível que nem todos os membros possuem.',party_dungeon_already_completed:'Um membro já concluiu essa masmorra ou tem um baú pendente.',party_preparation_expired:'A preparação expirou. O líder pode preparar novamente.',party_not_ready:'Todos os membros precisam confirmar prontidão.',party_collective_navigation_required:'Use SOCIAL → Grupo para viajar juntos, ou saia da Party para voltar ao porto.',

    profile_port_only:'Volte ao porto para editar seu personagem.',profile_unavailable:'O perfil está temporariamente indisponível.',
    fruit_cast_unavailable:'Confira sua fruta equipada, energia, recarga e alvo.',fruit_transform_unavailable:'A transformação exige uma fruta Zoan equipada.',fruit_required:'Você precisa possuir essa fruta para registrá-la.',fruit_already_registered:'Essa fruta já está registrada.',fruit_move_unavailable:'O Gênio não pode alcançar esse destino.',
    dungeon_level_required:'Seu nível ainda não permite esta masmorra.',
    dungeon_already_claimed:'Esta masmorra já foi concluída.',
    dungeon_reward_unavailable:'A recompensa está indisponível ou já foi recebida.',
    dungeon_chest_out_of_range:'Aproxime-se do baú desta masmorra para receber.',
    dungeon_inventory_full:'Libere espaço na mochila. A recompensa permanece pendente.',
    dungeon_craft_unavailable:'Confira os dez fragmentos desbloqueados e o espaço na mochila.',
    dungeon_reveal_unavailable:'Esta revelação já foi encerrada.',
    character_dead:'Aguarde seu personagem retornar para iniciar outra tentativa.',

    prison_floor_locked:'Somente o próximo andar pode ser iniciado.',
    prison_already_active:'Você já está em uma expedição de Impel Down.',
    prison_milestone_unavailable:'Este marco ainda não está disponível ou já foi resgatado.',
    box_unavailable:'Esta caixa não pode ser aberta.',
    achievement_incomplete:'A meta desta conquista ainda não foi alcançada.',
    achievement_unavailable:'Esta conquista depende de um sistema ainda indisponível online.',
    achievement_already_claimed:'A recompensa desta conquista já foi resgatada.',
    talent_build_invalid:'A árvore não atende aos pontos ou requisitos confirmados pelo servidor.',
    talent_build_unchanged:'Essa árvore já está vazia ou não contém novos investimentos.',
    talent_reset_port_only:'Retorne ao porto para redefinir seus talentos.',
    talents_unavailable:'Os talentos estão temporariamente indisponíveis.',
    inventory: "Inventário",
    shop: "Mercador do Porto",
    character: "Personagem",
    modes: "Expedições",
    map: "Expedições",
    hunt: "Caçadas",
    contracts: "Caçadas",
    settings: "Configurações",
    myprofile: "Meu Perfil",
    help: "Guia do Navegante",
  };
  const errors = {
    hierarchy_tier_conflict:'O cargo mudou. Consulte novamente antes de promover.',
    hierarchy_level_required:'Alcance o nível necessário para a próxima promoção.',
    hierarchy_locked:'Esta ascensão requer itens especiais ainda não descobertos nos mares.',
    haki_unlock_unavailable:'Confira o nível50 e um Livro da Vontade desbloqueado na mochila.',
    haki_invest_unavailable:'Confira os pré-requisitos, a graduação e os fragmentos disponíveis.',
    haki_unlearned:'Conclua o ramo antes de ativar a habilidade.',
    haki_toggle_unavailable:'Ative um Haki aprendido durante uma expedição, com Vontade disponível.',
    haki_cast_unavailable:'Confira a Vontade, o desbloqueio do Conquistador e sua recarga.',

    battle_target_missing:'Esse alvo não está mais disponível.',
    battle_skill_unavailable:'A habilidade precisa de energia, recarga e um alvo ao alcance.',
    battle_rules_changed:'As regras de combate foram atualizadas. Aguarde a atualização do servidor.',
    battle_original_active:'A caçada já usa os monstros da ilha. Escolha sua rota no mapa.',
    battle_unavailable:'Entre em uma ilha e aguarde seu personagem renascer para caçar.',
    contract_incomplete:'O objetivo deste contrato ainda não foi concluído.',
    contract_already_claimed:'A recompensa deste contrato já foi recebida.',
    contracts_unavailable:'Os contratos estão temporariamente indisponíveis.',
    battle_first_unavailable:'A primeira vitória ainda não pode ser resgatada.',
    world_destination_blocked:'Esse destino não tem passagem livre.',
    world_route_unavailable:'Não há uma rota livre até esse ponto.',
    world_level_required:'Seu nível ainda não permite viajar para essa ilha.',
    world_combat_pending:'Conclua o encontro e receba a recompensa antes de viajar.',
    world_rules_changed:'O mapa foi atualizado. Aguarde a atualização do servidor.',
    control_required: "Assuma o controle deste personagem para agir.",
    control_conflict:
      "Outra aba está controlando seu personagem. Assuma o controle se quiser continuar aqui.",
    state_version_conflict: "O progresso mudou. Confira os dados atualizados.",
    gold_insufficient: "Ouro insuficiente.",
    item_equipped: "Desequipe antes de vender a última unidade.",
    item_quantity_insufficient: "Quantidade insuficiente.",
    attribute_points_insufficient: "Pontos insuficientes.",
    combat_out_of_range:'Aproxime-se do adversário para atacar.',
    combat_line_blocked:'Há um obstáculo entre você e o adversário.',
    combat_cooldown: "Aguarde a recarga do ataque.",
    combat_rest: "Aguarde o descanso antes do próximo encontro.",
    combat_daily_limit: "O limite de encontros em 24 horas foi atingido.",
    pending_command: "Confira o pedido pendente antes de enviar outra ação.",
    authentication_required: "Sua sessão terminou.",
    forge_operation_rejected: 'Operação recusada. Confira custos, bloqueios, sockets e materiais.',
    equipment_during_combat: 'Conclua o combate antes de trocar equipamentos ou usar a forja.',
    inventory_conversion_capacity: 'Libere espaço no inventário anterior antes da conversão. Seus itens foram preservados.',
    item_not_found: 'Este item não está disponível no seu inventário.',
    item_protected: 'Desbloqueie o item antes de vender ou modificar.',
    item_class_mismatch: 'Essa arma não pertence à sua classe.',
    inventory_full: 'Libere um espaço na mochila.',
    potion_not_needed: 'A poção só pode ser usada em combate com vida incompleta.',
    potion_insufficient: 'Você não possui poções.',
    invalid_server_state: "Não foi possível validar os dados do personagem.",
  };
  function mount(client, hooks) {
    const $ = (id) => document.getElementById(id);
    const frameMeter=createFrameMeter(),meter=document.createElement('div');
    meter.id='onlinePerformance';meter.setAttribute('aria-label','Conexão e desempenho');
    meter.textContent='Ping HTTP: — · FPS: —';document.body.append(meter);
    function renderPerformance(){
      const n=client.network||{},f=frameMeter.sample(),ms=v=>Number.isFinite(v)?Math.round(v)+' ms':'—';
      meter.textContent=(client.available?'Ping HTTP: '+ms(n.rttMs):'Sem conexão')+' · FPS: '+(document.hidden?'—':f.fps??'—')+' · Estado: '+ms(n.ageMs);
      meter.title='Ping HTTP inclui rede e processamento do servidor. Estado é o tempo desde a última leitura válida, não o ping. Intervalo entre leituras: '+ms(n.intervalMs)+'. Maior intervalo entre frames: '+ms(f.maxFrameMs)+'. FPS baixo indica lentidão de renderização.';
      meter.dataset.stale=String(!client.available||n.ageMs>5000);
    }
    const performanceTimer=setInterval(renderPerformance,1000);
    const resetPerformance=()=>{frameMeter.reset();renderPerformance();};
    document.addEventListener('visibilitychange',resetPerformance);
    let panel = null,
      section = null,
      error = "",
      reading = false,
      redirecting = false;
    const redirectToLogin = () => {
      if (redirecting) return;
      redirecting = true;
      location.replace("/online/");
    };
    const button = (text, action, disabled = false, extra = "") =>
      `<button type="button" class="dialog-button" data-online-action="${action}" ${disabled ? "disabled" : ""} ${extra}>${text}</button>`;
    const locked = () =>
      !client.available ||
      !client.controlled ||
      client.busy ||
      !!client.pending;
    const message = (e) => {
      error =
        errors[e.code] ||
        "Não foi possível confirmar a ação. Atualize o progresso antes de continuar.";
      hooks.message(error);
      render();
    };
    const run = async (fn) => {
      try {
        error = "";
        await fn();
      } catch (e) {
        message(e);
      } finally {
        render();
      }
    };
    function content() {
      const d = client.data,
        o = d?.online;
      if (!o) return "<p>Conferindo sua sessão…</p>";
      const head = `<p class="online-state-note">${client.available ? (client.controlled ? "Personagem sob seu controle." : "Outra aba pode estar controlando este personagem.") : "Conexão interrompida. As ações estão pausadas."}</p>${error ? `<p role="alert">${escape(error)}</p>` : ""}${!client.controlled ? button("Assumir controle", "control", client.busy) : ""}${client.pending ? `<p>Uma resposta ficou pendente. Confira ou retome o mesmo pedido.</p>${button("Retomar pedido", "resume", !client.controlled || client.busy)}` : ""}`;
      if (["inventory", "shop"].includes(panel)) {
        const inventory = o.inventory,
          catalog = o.itemCatalog;
        return (
          head +
          `<p>Ouro: <strong>${escape(o.state.gold)}</strong></p><div class="online-item-list">` +
          catalog
            .map((item) => {
              const quantity =
                  inventory.items.find((i) => i.itemId === item.itemId)
                    ?.quantity ?? 0,
                equipped = Object.values(inventory.equipped).includes(
                  item.itemId,
                );
              return `<article class="online-item"><h3>${escape(item.name)}</h3><p>Na mochila: ${quantity}${equipped ? " · Equipado" : ""}</p><p>Compra ${escape(item.buyPrice)} · Venda ${escape(item.sellPrice)} ouro</p><div>${button("Comprar 1", "inventory.buy", locked(), `data-item="${item.itemId}"`)}${button("Vender 1", "inventory.sell", locked() || quantity < 1, `data-item="${item.itemId}"`)}${item.slot === "material" ? "" : button(equipped ? "Desequipar" : "Equipar", equipped ? "equipment.unequip" : "equipment.equip", locked() || quantity < 1, `data-item="${item.itemId}" data-slot="${item.slot}"`)}</div></article>`;
            })
            .join("") +
          "</div>"
        );
      }
      if (["character", "myprofile"].includes(panel)) {
        if (section && section !== "status")
          return (
            head +
            "<p>Este recurso ainda não está disponível no modo online.</p>"
          );
        return (
          head +
          `<h3>${escape(d.character.name)} · Nível ${o.state.level}</h3><p>XP total ${escape(o.state.experience)} · Ouro ${escape(o.state.gold)}</p><p>Pontos disponíveis: <strong>${o.attributes.available}</strong></p><form id="online-attributes">` +
          attrs
            .map(
              (a, i) =>
                `<label>${names[i]} · investidos ${o.attributes.allocated[a]}<input name="${a}" type="number" min="0" max="${o.attributes.available}" step="1" value="0" ${locked() ? "disabled" : ""}></label>`,
            )
            .join("") +
          `<button class="dialog-button" ${locked() ? "disabled" : ""}>Confirmar distribuição</button></form><p>A distribuição vale para o próximo encontro.</p>`
        );
      }
      if (["modes", "map", "hunt", "contracts"].includes(panel)) {
        if(o.battle)return head+'<p>Explore as ilhas pelo mapa e use a caçada na HUD. Os contratos serão integrados em outra etapa.</p>';
        const h = o.hunt,
          c = o.combat;
        return (
          head +
          `<h3>Ronda do cais</h3><p>${escape({ locked: "Inicie sua jornada para liberar a ronda.", available: "Ronda disponível: 30 segundos, 20 XP e 8 ouro.", active: "Ronda em andamento. O servidor está contando o prazo.", ready: "Ronda concluída. A recompensa está disponível.", claimed: "Recompensa da ronda recebida." }[h.status])}</p>` +
          (!o.journey.started
            ? button("Iniciar jornada", "journey.begin", locked())
            : "") +
          (h.status === "available"
            ? button("Iniciar ronda", "hunt.begin", locked())
            : h.status === "ready"
              ? button("Receber recompensa", "hunt.claim", locked())
              : "") +
          `<h3>Saqueador do cais</h3><p>${escape({ locked: "Conclua a ronda para liberar o encontro.", available: "Encontro disponível.", active: "Combate em andamento.", won: "Vitória confirmada. Receba seu prêmio.", lost: "Derrota registrada. Aguarde o descanso para tentar novamente.", claimed: "Prêmio recebido. Aguarde o descanso para um novo encontro." }[c.status])}</p>` +
          (c.canBegin
            ? button("Enfrentar saqueador", "combat.begin", locked())
            : "") +
          (c.status === "active"
            ? button("Voltar ao combate", "view-combat") +
              button("Atacar", "combat.attack", locked() || !c.attackReady)
            : "") +
          (c.status === "won"
            ? button("Receber prêmio", "combat.claim", locked())
            : "") +
          button("Atualizar", "refresh", client.busy)
        );
      }
      if (panel === "settings")
        return (
          head +
          button("Atualizar progresso", "refresh", client.busy) +
          button("Sair da conta", "logout", client.busy) +
          "<p>Os dados confirmados pelo servidor permanecem salvos.</p>"
        );
      if (panel === "help")
        return (
          head +
          "<p>Use WASD ou clique no chão para caminhar. Use os NPCs e menus para abrir caçadas, inventário, mercador e personagem. As ações confirmadas permanecem salvas no servidor.</p><p>Presença de outros jogadores, habilidades, frutas e mapas adicionais ainda estão em desenvolvimento.</p>"
        );
      return (
        head + "<p>Este recurso ainda não está disponível no modo online.</p>"
      );
    }
    function render() {
      if (!panel) return;
      $("dialogTitle").textContent = labels[panel] || "Em preparação";
      $("dialogBody").innerHTML = content();
    }
    function open(name, tab = null) {
      panel = name;
      section = tab;
      render();
    }
    async function action(action, el) {
      if (action === "refresh") return client.read();
      if (action === "control") {
        if (
          !confirm(
            "Assumir o controle neste dispositivo? O controle anterior será encerrado.",
          )
        )
          return;
        return client.acquire(true);
      }
      if (action === "logout") {
        await client.logout();
        redirectToLogin();
        return;
      }
      if (action === "resume") return client.resume();
      if (action === "view-combat") {
        hooks.combat();
        hooks.close();
        return;
      }
      let payload = {};
      if (action.startsWith("inventory."))
        payload = { itemId: el.dataset.item, quantity: 1 };
      if (action === "equipment.equip") payload = { itemId: el.dataset.item };
      if (action === "equipment.unequip") payload = { slot: el.dataset.slot };
      if (
        [
          "inventory.buy",
          "inventory.sell",
          "equipment.equip",
          "equipment.unequip",
        ].includes(action) &&
        !confirm("Confirmar esta alteração no personagem?")
      )
        return;
      await client.command(action, payload);
      if (action === "combat.begin") {
        hooks.combat();
        hooks.close();
      }
    }
    document.addEventListener(
      "click",
      (event) => {
        const b = event.target.closest("[data-online-action]");
        if (b) {
          event.preventDefault();
          event.stopImmediatePropagation();
          void run(() => action(b.dataset.onlineAction, b));
          return;
        }
        if (client.data?.online.originalInventory && event.target.closest("#usePotion,#buyPotion"))return;
        if (client.data?.online.battle && event.target.closest('#skill1,#skill2'))return;
        if (client.data?.online.haki && event.target.closest('#hakiKing'))return;
        if (client.data?.online.fruits && event.target.closest('#skill3,#zoanTransform'))return;
        if(client.data?.online.profile&&event.target.closest('#changePath'))return;
        if (
          event.target.closest(
            "#skill1,#skill2,#skill3,#usePotion,#buyPotion,#zoanTransform,#hakiKing,#changePath",
          )
        ) {
          event.preventDefault();
          event.stopImmediatePropagation();
          hooks.message(
            "Este recurso ainda não está disponível no modo online.",
          );
        }
      },
      true,
    );
    document.addEventListener(
      "submit",
      (event) => {
        if (event.target.id !== "online-attributes") return;
        event.preventDefault();
        event.stopImmediatePropagation();
        const allocation = Object.fromEntries(
          attrs.map((k) => [k, Number(event.target.elements[k].value)]),
        );
        if (
          !confirm(
            "Investir estes pontos? A distribuição é permanente nesta etapa.",
          )
        )
          return;
        void run(() => client.command("attributes.allocate", { allocation }));
      },
      true,
    );
    client.subscribe(() => {
      hooks.sync();
      if (!client.data) redirectToLogin();
      render();
    });
    let lastRead=0,lastFullRead=0;
    const poll = setInterval(() => {
      if (redirecting || document.hidden || reading || client.busy) return;
      const now=Date.now(),period=client.data?.online.battle&&client.controlled?750:3000;
      if(now-lastRead<period)return;lastRead=now;
      reading = true;
      const full=now-lastFullRead>=3000||!client.readFrame;if(full)lastFullRead=now;
      void (full?client.read(true):client.readFrame())
        .catch(message)
        .finally(() => {
          reading = false;
        });
    }, 250);
    const renewal = setInterval(() => {
      if (!redirecting && !document.hidden) void client.renew().catch(message);
    }, 30000);
    const resumePresence = () => {
      if (!redirecting && !document.hidden)
        void client.read(true).then(() => client.renew()).then(() => client.read(true)).catch(message);
    };
    document.addEventListener("visibilitychange", resumePresence);
    root.addEventListener("pagehide", () => {
      clearInterval(performanceTimer);meter.remove();
      document.removeEventListener("visibilitychange",resetPerformance);
      clearInterval(poll);
      clearInterval(renewal);
      document.removeEventListener("visibilitychange", resumePresence);
    });
    return {
      frame:t=>{if(!document.hidden)frameMeter.frame(t);},
      open,
      render,
      close() {
        panel = null;
      },
      error: message,
      run,
    };
  }
  root.MareOnlineGameUI = { project, derived, mount, worldPosition, createWorldPresentation, createFrameMeter, stepMonsterVisual, fruitView, fruitTimeline, message:e=>labels[e.code]||"Não foi possível concluir. Confira a sessão e tente novamente." };
  if (typeof module !== "undefined") module.exports = { project, derived, worldPosition, createWorldPresentation, createFrameMeter, stepMonsterVisual, fruitView, fruitTimeline };
})(globalThis);
