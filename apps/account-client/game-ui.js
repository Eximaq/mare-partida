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
  function project(base, data) {
    const o = data.online,
      f = o.combat?.fighter ?? o.combatPreview;
    if (!f || !Number.isInteger(f.maxHp) || f.maxHp < 1)
      throw new Error("invalid_server_state");
    return {
      ...base,
      name: data.character.name,
      classId: data.character.classId,
      factionId: data.character.factionId,
      level: o.state.level,
      xp: safe(o.progression.xpIntoLevel),
      gold: safe(o.state.gold),
      hp: o.combat?.encounterId ? o.combat.playerHp : f.maxHp,
      energy: 0,
      potions: 0,
      materials: 0,
      inventory: [],
      equipment: Object.fromEntries(
        Object.keys(base.equipment).map((k) => [k, null]),
      ),
      attributes: { ...o.attributes.allocated },
      attributePoints: o.attributes.available,
      stats: Object.fromEntries(Object.keys(base.stats).map((k) => [k, 0])),
    };
  }
  function derived(base, data) {
    const f = data.online.combat?.fighter ?? data.online.combatPreview;
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
    control_required: "Assuma o controle deste personagem para agir.",
    control_conflict:
      "Outra aba está controlando seu personagem. Assuma o controle se quiser continuar aqui.",
    state_version_conflict: "O progresso mudou. Confira os dados atualizados.",
    gold_insufficient: "Ouro insuficiente.",
    item_equipped: "Desequipe antes de vender a última unidade.",
    item_quantity_insufficient: "Quantidade insuficiente.",
    attribute_points_insufficient: "Pontos insuficientes.",
    combat_cooldown: "Aguarde a recarga do ataque.",
    combat_rest: "Aguarde o descanso antes do próximo encontro.",
    combat_daily_limit: "O limite de encontros em 24 horas foi atingido.",
    pending_command: "Confira o pedido pendente antes de enviar outra ação.",
    authentication_required: "Sua sessão terminou.",
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
          "<p>Use WASD ou clique no chão para caminhar. Use os NPCs e menus para abrir caçadas, inventário, mercador e personagem. As ações confirmadas permanecem salvas no servidor.</p><p>Presença de outros jogadores, habilidades, frutas, forja e mapas adicionais ainda não estão disponíveis online.</p>"
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
    const poll = setInterval(() => {
      if (document.hidden || reading || client.busy) return;
      reading = true;
      void client
        .read()
        .catch(message)
        .finally(() => {
          reading = false;
        });
    }, 3000);
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
  root.MareOnlineGameUI = { project, derived, mount };
  if (typeof module !== "undefined") module.exports = { project, derived };
})(globalThis);
