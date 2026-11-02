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
  function project(base, data) {
    const o = data.online,
      frozen = !o.battle&&['active','won','lost'].includes(o.combat?.status),
      f = frozen ? o.combat.fighter ?? o.combatPreview : o.combatPreview;
    if (!f || !Number.isFinite(f.maxHp) || f.maxHp < 1)
      throw new Error("invalid_server_state");
    return {
      ...base,
      name: data.character.name,
      classId: data.character.classId,
      factionId: data.character.factionId,
      level: o.state.level,
      xp: safe(o.progression.xpIntoLevel),
      gold: safe(o.state.gold),
      hp: o.battle?.hp ?? (frozen && o.combat?.encounterId ? o.combat.playerHp : f.maxHp),
      energy: o.battle?.energy ?? 0,
      ...(o.prison?{impelDown:structuredClone(o.prison)}:{}),
      claimed: [...(o.contracts?.claimed||[])],
      talentVersion:2,talentSeq:o.talents?.revision||0,talentBuilds:{[data.character.classId]:structuredClone(o.talents?.build||{nodes:{},keystone:null,ultimate:null})},
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
      ...(o.battle?{hunts:structuredClone(o.battle.hunts),stats:{...Object.fromEntries(Object.keys(base.stats).map(k=>[k,0])),kills:Object.values(o.battle.hunts.areas).reduce((n,a)=>n+a.kills,0),boss:Object.values(o.battle.hunts.areas).reduce((n,a)=>n+a.bosses,0)}}:{}),
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
    let panel = null,
      section = null,
      error = "",
      reading = false;
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
        location.replace("/online/");
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
      if (!client.data) location.replace("/online/");
      render();
    });
    let lastRead=0;
    const poll = setInterval(() => {
      if (document.hidden || reading || client.busy) return;
      const now=Date.now(),period=client.data?.online.battle&&client.controlled?750:3000;
      if(now-lastRead<period)return;lastRead=now;
      reading = true;
      void client
        .read(true)
        .catch(message)
        .finally(() => {
          reading = false;
        });
    }, 250);
    const renewal = setInterval(() => {
      if (!document.hidden) void client.renew().catch(message);
    }, 30000);
    root.addEventListener("pagehide", () => {
      clearInterval(poll);
      clearInterval(renewal);
    });
    return {
      open,
      render,
      close() {
        panel = null;
      },
      error: message,
      run,
    };
  }
  root.MareOnlineGameUI = { project, derived, mount, worldPosition };
  if (typeof module !== "undefined") module.exports = { project, derived, worldPosition };
})(globalThis);
