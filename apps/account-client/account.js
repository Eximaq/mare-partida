const $ = (selector) => document.querySelector(selector);
let mode = "login",
  character = null,
  lease = null,
  active = false;
let online = null, pendingCommand = null, commandWorking = false;
let viewRevision = 0, identityRevision = 0, identity = null;
const PENDING_COMMAND = "mare-online-pending-v1";
const messages = {
  authentication_required: "Sua sessão terminou. Entre novamente.",
  authentication_failed:
    "Não foi possível entrar. Confira os dados e a confirmação do e-mail.",
  csrf_rejected: "A sessão mudou em outra aba. Tente novamente.",
  rate_limited: "Muitas tentativas. Aguarde antes de tentar novamente.",
  invalid_request: "Confira os campos informados.",
  character_exists: "Esta conta já possui um personagem.",
  control_conflict:
    "Outra aba ou dispositivo está controlando este personagem.",
  state_version_conflict: "O progresso mudou. Confira o estado atualizado antes de continuar.",
  journey_already_started: "A jornada já foi iniciada. Conferindo o progresso…",
  idempotency_conflict: "A solicitação não corresponde ao registro anterior. Confira o progresso.",
  command_rate_limited: "Aguarde um minuto antes de enviar outra solicitação.",
  command_history_full: "O limite deste ambiente de teste foi atingido.",
  hunt_not_ready: "A caçada ainda está em andamento no servidor. Aguarde e atualize o progresso.",
  hunt_not_started: "Inicie a caçada antes de receber a recompensa.",
  hunt_already_started: "Esta caçada já foi iniciada. Conferindo o progresso…",
  hunt_already_claimed: "A recompensa já foi recebida. Conferindo o progresso…",
  journey_required: "Inicie a jornada antes da caçada.",
  progression_limit: "O limite de progressão foi atingido; nenhuma recompensa foi aplicada.",
  state_version_exhausted: "O limite de versão deste ambiente foi atingido.",
  hunt_required: "Conclua a primeira caçada e receba sua recompensa antes do combate.",
  combat_cooldown: "O ataque ainda está em recarga no servidor. Aguarde a atualização.",
  combat_not_started: "Inicie o encontro antes de atacar.",
  combat_already_started: "Este encontro já foi iniciado. Conferindo o combate…",
  combat_finished: "O encontro já terminou. Conferindo o resultado…",
  combat_not_won: "O prêmio exige uma vitória confirmada pelo servidor.",
  combat_rest: "Descanse 60 segundos após o encerramento antes de iniciar outro encontro.",
  combat_reward_pending: "Receba o prêmio da vitória anterior antes de iniciar outro encontro.",
  combat_daily_limit: "Limite de 10 inícios em 24 horas atingido. Aguarde para iniciar outro encontro.",
  combat_history_full: "Limite de 100 encontros deste piloto atingido. O histórico permanece preservado.",
  combat_already_claimed: "O prêmio já foi recebido. Conferindo o progresso…",
  password_reset_unconfirmed:
    "A resposta da troca de senha não pôde ser confirmada. A senha pode já ter sido alterada. Entre com a nova senha; não repita a troca.",
};
const status = (text) => {
  $("#status").textContent = text;
};
async function read(response) {
  if (
    response.headers.get("X-Mare-Test-Fixture") ===
    "local-deterministic-provider"
  )
    $("#environment").textContent =
      "Teste local automatizado — provedor simulado";
  const result = response.status === 204 ? {} : await response.json();
  if (!response.ok) {
    const error = new Error(
      messages[result.error] ||
        "Serviço indisponível. Tente novamente mais tarde.",
    );
    error.code = result.error;
    throw error;
  }
  return result;
}
async function api(path, data, signal) {
  const headers = {};
  let method = "GET";
  if (data !== undefined) {
    const context = await read(
      await fetch("/v1/auth/csrf", { cache: "no-store", signal }),
    );
    headers["x-csrf-token"] = context.csrfToken;
    headers["content-type"] = "application/json";
    method = "POST";
  }
  return read(
    await fetch(path, {
      method,
      headers,
      cache: "no-store",
      signal,
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    }),
  );
}
async function onlineApi(path, data) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try { return await api(path, data, controller.signal); }
  finally { clearTimeout(timer); }
}
function clearPendingCommand() {
  pendingCommand = null;
  try { sessionStorage.removeItem(PENDING_COMMAND); } catch { /* memory-only fallback */ }
}
function restorePendingCommand(id) {
  if (pendingCommand?.characterId === id) return;
  try {
    const saved = JSON.parse(sessionStorage.getItem(PENDING_COMMAND) || "null");
    if (saved && (["characterId,expectedVersion,requestId", "action,characterId,expectedVersion,requestId"].includes(Object.keys(saved).sort().join())) &&
        (saved.action === undefined || ["hunt.begin", "hunt.claim", "combat.begin", "combat.attack", "combat.claim"].includes(saved.action)) &&
        saved.characterId === id && typeof saved.requestId === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(saved.requestId) &&
        Number.isSafeInteger(saved.expectedVersion) && saved.expectedVersion >= 0) {
      pendingCommand = saved; return;
    }
  } catch { /* malformed or unavailable storage cannot authorize anything */ }
  clearPendingCommand();
}
function pendingAction() { return pendingCommand?.action || "journey.begin"; }
function actionConfirmed(action) {
  if (!online) return false;
  if (action === "journey.begin") return online.journey.started;
  if (action === "hunt.begin") return ["active", "ready", "claimed"].includes(online.hunt?.status);
  if (action.startsWith("combat.")) return !!pendingCommand && online.combat?.lastRequestId === pendingCommand.requestId;
  return action === "hunt.claim" && online.hunt?.status === "claimed";
}
function canSend(action) {
  if (commandWorking || !active || !character || !online || !lease || (pendingCommand && pendingAction() !== action)) return false;
  // An uncertain repeated action must be replayable even if a later command ended the battle.
  if (pendingCommand && action.startsWith("combat.")) return true;
  if (action === "combat.begin") return online.combat?.canBegin ?? online.combat?.status === "available";
  if (action === "combat.attack") return online.combat?.status === "active" && online.combat.attackReady;
  if (action === "combat.claim") return online.combat?.status === "won";
  return action === "journey.begin" ? !online.journey.started :
    online.journey.started && online.hunt?.status === (action === "hunt.begin" ? "available" : "ready");
}
function renderOnline() {
  $("#online-level").textContent = online ? String(online.state.level) : "—";
  $("#online-xp").textContent = online ? online.state.experience : "—";
  $("#online-gold").textContent = online ? online.state.gold : "—";
  const progression=online?.progression;
  $("#level-progress").textContent=!progression ? "" : progression.atCap ?
    "Nível máximo deste piloto alcançado. Todo o XP continua preservado." :
    `Próximo nível: ${progression.xpIntoLevel} / ${progression.xpForNextLevel} XP — faltam ${progression.xpToNextLevel} XP.`;
  $("#level-points").textContent=progression ?
    `Pontos de atributo conquistados: ${progression.earnedAttributePoints}. A distribuição online será liberada em outra etapa; o combate atual mantém seus valores.` : "";
  $("#journey-state").textContent = !online ? "Progresso ainda não confirmado." :
    online.journey.started ? "Jornada iniciada no servidor." : "Sua jornada online ainda não foi iniciada.";
  for (const [selector, action, label] of [["#journey-start","journey.begin","Iniciar jornada"],
      ["#hunt-start","hunt.begin","Iniciar caçada"],["#hunt-claim","hunt.claim","Receber recompensa"],
      ["#combat-start","combat.begin",online?.combat?.encounterNumber ? "Novo encontro" : "Enfrentar saqueador"],["#combat-attack","combat.attack","Atacar"],["#combat-claim","combat.claim","Receber prêmio do combate"]]) {
    $(selector).disabled = !canSend(action);
    $(selector).textContent = pendingCommand && pendingAction() === action ? (commandWorking ? "Conferindo…" : "Retomar solicitação") : label;
  }
  const hunt=online?.hunt;
  $("#hunt-state").textContent = !hunt ? "Caçada ainda não confirmada." : ({
    locked: "Inicie a jornada para liberar a primeira caçada.",
    available: "Ronda do cais disponível — uma caçada introdutória por personagem.",
    active: "Caçada em andamento no servidor. Atualize o progresso após o prazo para conferir.",
    ready: "Caçada concluída. Assuma o controle e receba sua recompensa.",
    claimed: "Recompensa recebida e registrada no servidor.",
  })[hunt.status];
  $("#hunt-reward").textContent = hunt ? `${hunt.durationSeconds} segundos · ${hunt.experience} XP · ${hunt.gold} de ouro` : "";
  const combat=online?.combat;
  $("#combat-state").textContent = !combat ? "Combate ainda não confirmado." : ({
    locked:"Conclua a Ronda do cais e receba a recompensa para liberar este encontro.",
    available:"Saqueador do cais — encontros com resultado e prêmio registrados no servidor.",
    active:combat.attackReady ? "Seu ataque está pronto. O inimigo contra-ataca se sobreviver." : "Aguardando a recarga de 2 segundos no servidor…",
    won:"Vitória confirmada. Receba o prêmio deste encontro.",
    lost:"Derrota confirmada. Este encontro terminou sem prêmio.",
    claimed:"Prêmio do combate recebido e registrado no servidor.",
  })[combat.status];
  if (combat && ["lost","claimed"].includes(combat.status)) {
    $("#combat-state").textContent += combat.historyFull ? " Limite de 100 encontros deste piloto atingido." :
      combat.startsRemaining === 0 ? " Limite de 10 inícios em 24 horas atingido. Atualize o progresso mais tarde." :
      combat.canBegin ? " Um novo encontro está disponível, com vida restaurada ao iniciar." :
      " Descanse 60 segundos após o encerramento e atualize o progresso para liberar outro encontro.";
  }
  const entered=combat && !["locked","available"].includes(combat.status);
  $("#combat-player-hp").textContent=entered?`${combat.playerHp} / ${combat.playerMaxHp}`:"—";
  $("#combat-enemy-hp").textContent=entered?`${combat.enemyHp} / ${combat.enemyMaxHp}`:"—";
  $("#combat-turn").textContent=entered?String(combat.turn):"—";
  $("#combat-last").textContent=combat?.lastAttack?`Último turno: ${combat.lastAttack.playerDamage} de dano causado; ${combat.lastAttack.enemyDamage} recebido.`:"";
  $("#online-refresh").disabled = commandWorking;
}
async function loadOnline(revision, id) {
  try {
    const result = await onlineApi(`/v1/characters/${id}/online-state`);
    if (revision !== viewRevision || !active || character?.id !== id) return;
    if (result.state?.characterId !== id || !Number.isSafeInteger(result.state.version) || result.state.version < 0 ||
        !Number.isInteger(result.state.level) || result.state.level < 1 || typeof result.journey?.started !== "boolean" ||
        ![result.state.gold, result.state.experience].every(v => typeof v === "string" && /^(0|[1-9][0-9]{0,18})$/.test(v)))
      throw new Error("Resposta de progresso inválida.");
    if (result.hunt && (!["locked","available","active","ready","claimed"].includes(result.hunt.status) ||
        !Number.isSafeInteger(result.hunt.durationSeconds) || result.hunt.durationSeconds < 1 ||
        ![result.hunt.gold,result.hunt.experience].every(v => typeof v === "string" && /^(0|[1-9][0-9]{0,18})$/.test(v))))
      throw new Error("Resposta de caçada inválida.");
    if (result.combat && (!["locked","available","active","won","lost","claimed"].includes(result.combat.status) ||
        !Number.isInteger(result.combat.playerHp) || result.combat.playerHp < 0 || result.combat.playerHp > 30 ||
        !Number.isInteger(result.combat.enemyHp) || result.combat.enemyHp < 0 || result.combat.enemyHp > 36 ||
        !Number.isInteger(result.combat.turn) || result.combat.turn < 0 || result.combat.turn > 4 ||
        result.combat.playerMaxHp !== 30 || result.combat.enemyMaxHp !== 36 || typeof result.combat.attackReady !== "boolean"))
      throw new Error("Resposta de combate inválida.");
    if (result.progression) {
      const p=result.progression, amount=v=>typeof v==="string" && /^(0|[1-9][0-9]{0,18})$/.test(v) && BigInt(v)<=9223372036854775807n;
      if (p.catalogId!=="online-levels-v1" || p.maxLevel!==20 || result.state.level>20 ||
          p.earnedAttributePoints!==(result.state.level-1)*5 || p.atCap!==(result.state.level===20) ||
          !amount(p.xpIntoLevel) || BigInt(p.xpIntoLevel)>BigInt(result.state.experience) ||
          (p.atCap ? p.xpForNextLevel!==null || p.xpToNextLevel!==null :
            !amount(p.xpForNextLevel) || !amount(p.xpToNextLevel) || BigInt(p.xpToNextLevel)<=0n ||
            BigInt(p.xpIntoLevel)+BigInt(p.xpToNextLevel)!==BigInt(p.xpForNextLevel)))
        throw new Error("Resposta de nível inválida.");
    }
    online = result;
    if (pendingCommand && actionConfirmed(pendingAction())) clearPendingCommand();
    $("#journey-message").textContent = pendingCommand ?
      "Há uma solicitação sem resposta confirmada. Retome o controle e confira novamente, sem criar outro pedido." :
      online.journey.started ? "Registro confirmado. A primeira caçada é uma missão temporizada; combate em mapa ainda não está disponível online." :
      "Assuma o controle nesta aba para iniciar. O progresso da demonstração permanece separado.";
  } catch (error) {
    if (revision !== viewRevision || !active || character?.id !== id) return;
    online = null;
    if (error.code === "authentication_required") { showLogin(); return; }
    $("#journey-message").textContent = "Não foi possível confirmar o progresso. Atualize quando a conexão voltar.";
  }
  renderOnline();
}
async function sendOnlineAction(action) {
  if (!canSend(action)) return;
  const id = character.id, revision = identityRevision;
  let refusal = "";
  commandWorking = true;
  if (!pendingCommand) {
    pendingCommand = { characterId: id, requestId: crypto.randomUUID(), expectedVersion: online.state.version, ...(action === "journey.begin" ? {} : { action }) };
    try { sessionStorage.setItem(PENDING_COMMAND, JSON.stringify(pendingCommand)); } catch { /* current-tab memory remains usable */ }
  }
  renderOnline();
  try {
    await onlineApi(`/v1/characters/${id}/commands`, {
      requestId: pendingCommand.requestId, action, expectedVersion: pendingCommand.expectedVersion,
      control: { epoch: lease.epoch, token: lease.token }, payload: {},
    });
    if (revision !== identityRevision) return;
    clearPendingCommand();
  } catch (error) {
    if (revision !== identityRevision) return;
    if (error.code === "authentication_required") { showLogin(); return; }
    refusal = messages[error.code] || "";
    if (error.code === "control_conflict") {
      lease = null; $("#control-state").textContent = "Controle encerrado nesta aba.";
    }
    if (["combat_rest", "combat_reward_pending", "combat_daily_limit", "combat_history_full", "state_version_conflict", "journey_already_started", "hunt_already_started", "hunt_already_claimed", "hunt_not_started", "hunt_not_ready", "hunt_required", "combat_already_started", "combat_already_claimed", "combat_not_started", "combat_not_won", "combat_finished", "combat_cooldown", "idempotency_conflict", "invalid_request"].includes(error.code)) clearPendingCommand();
    // Transport/503 errors may follow a committed action. Reconcile with GET only.
  } finally {
    if (revision === identityRevision) {
      await refresh();
      if (revision === identityRevision) {
        commandWorking = false;
        if (refusal && online && !actionConfirmed(action)) $("#journey-message").textContent = refusal;
        renderOnline();
      }
    }
  }
}
$("#journey-start").addEventListener("click", () => { void sendOnlineAction("journey.begin"); });
$("#hunt-start").addEventListener("click", () => { void sendOnlineAction("hunt.begin"); });
$("#hunt-claim").addEventListener("click", () => { void sendOnlineAction("hunt.claim"); });
for (const [selector, action] of [["#combat-start","combat.begin"],["#combat-attack","combat.attack"],["#combat-claim","combat.claim"]])
  $(selector).addEventListener("click", () => { void sendOnlineAction(action); });
$("#online-refresh").addEventListener("click", () => { if (!commandWorking) void refresh(); });
function showLogin() {
  viewRevision++; identityRevision++; identity = null;
  online = null; commandWorking = false; clearPendingCommand();
  $("#control-state").textContent = "Nenhum controle solicitado nesta aba.";
  active = false;
  character = null;
  lease = null;
  $("#signed-in").hidden = true;
  $("#signed-out").hidden = false;
  $("#reset-form").hidden = true;
  $("#panel-title").textContent = "Entrar na conta";
  renderOnline();
}
async function refresh() {
  const revision = ++viewRevision;
  online = null; renderOnline();
  try {
    const me = await onlineApi("/v1/me");
    if (revision !== viewRevision) return;
    const nextIdentity = me.account.id + ":" + (me.character?.id || "");
    if (identity !== nextIdentity) {
      if (identity !== null) clearPendingCommand();
      identityRevision++; identity = nextIdentity; lease = null; commandWorking = false;
      $("#control-state").textContent = "Nenhum controle solicitado nesta aba.";
    }
    active = true;
    character = me.character;
    $("#signed-out").hidden = true;
    $("#reset-form").hidden = true;
    $("#signed-in").hidden = false;
    $("#panel-title").textContent = "Sua conta";
    $("#character-form").hidden = !!character;
    $("#character").hidden = !character;
    if (character) {
      $("#character-name").textContent = character.name;
      const classes = {
        sword: "Espadachim",
        brawler: "Lutador",
        gunner: "Atirador",
        rogue: "Gatuno",
        cyborg: "Ciborgue",
        strategist: "Estrategista",
        healer: "Curandeiro",
      };
      $("#character-details").textContent =
        classes[character.classId] || "Personagem";
      restorePendingCommand(character.id);
      await loadOnline(revision, character.id);
    }
  } catch (error) {
    if (revision !== viewRevision) return;
    if (error.code === "authentication_required") showLogin();
    else { status(error.code ? error.message : "Não foi possível acessar sua conta. Confira a conexão e atualize."); renderOnline(); }
  }
}
function selectMode(next) {
  mode = next;
  for (const button of document.querySelectorAll("[data-mode]"))
    button.setAttribute("aria-pressed", String(button.dataset.mode === mode));
  $("#password-field").hidden = mode === "recover";
  $("#password").required = mode !== "recover";
  $("#password").autocomplete =
    mode === "signup" ? "new-password" : "current-password";
  const titles = {
    login: "Entrar na conta",
    signup: "Criar uma conta",
    recover: "Recuperar acesso",
  };
  const labels = {
    login: "Entrar",
    signup: "Criar conta",
    recover: "Enviar instruções",
  };
  $("#panel-title").textContent = titles[mode];
  $("#auth-submit").textContent = labels[mode];
  status("");
}
for (const button of document.querySelectorAll("[data-mode]"))
  button.addEventListener("click", () => selectMode(button.dataset.mode));
async function busy(button, operation) {
  button.disabled = true;
  const label = button.textContent;
  button.textContent = "Aguarde…";
  button.setAttribute("aria-busy", "true");
  try {
    await operation();
  } catch (error) {
    status(error.message);
  } finally {
    button.disabled = false;
    button.textContent = label;
    button.removeAttribute("aria-busy");
  }
}
$("#auth-form").addEventListener("submit", (event) => {
  event.preventDefault();
  void busy($("#auth-submit"), async () => {
    try {
      const data = {
        email: $("#email").value.trim(),
        ...(mode === "recover" ? {} : { password: $("#password").value }),
      };
      const result = await api("/v1/auth/" + mode, data);
      if (mode === "login") {
        status("Você entrou na sua conta.");
        await refresh();
      } else status(result.message);
    } finally {
      $("#password").value = "";
    }
  });
});
$("#character-form").addEventListener("submit", (event) => {
  event.preventDefault();
  void busy(event.submitter, async () => {
    await api("/v1/characters", {
      name: $("#name").value,
      classId: $("#class").value,
      factionId: $("#faction").value,
    });
    status("Personagem registrado.");
    await refresh();
  });
});
$("#control").addEventListener("click", () => {
  void busy($("#control"), async () => {
    if (!character) return;
    const id = character.id, revision = identityRevision;
    let acquired;
    try {
      acquired = await api(`/v1/characters/${id}/control`, {});
    } catch (error) {
      if (revision !== identityRevision) return;
      if (error.code !== "control_conflict") throw error;
      const current = await api(`/v1/characters/${id}`);
      if (revision !== identityRevision) return;
      if (
        !confirm(
          "Assumir o controle nesta aba? A outra aba ou dispositivo perderá o controle.",
        )
      )
        return;
      acquired = await api(`/v1/characters/${id}/control`, {
        expectedEpoch: current.control.epoch,
      });
    }
    if (revision !== identityRevision) return;
    lease = acquired;
    $("#control-state").textContent = "Controle ativo nesta aba.";
    status("Controle atribuído a esta aba.");
    renderOnline();
  });
});
for (const [id, scope] of [
  ["#logout", "local"],
  ["#logout-all", "all"],
])
  $(id).addEventListener("click", () => {
    void busy($(id), async () => {
      await api("/v1/auth/logout", { scope });
      showLogin();
      status("Você saiu da conta.");
    });
  });
$("#rotate").addEventListener("click", () => {
  void busy($("#rotate"), async () => {
    await api("/v1/auth/rotate", {});
    await refresh();
    status("Sessão renovada. A validade máxima não foi estendida.");
  });
});
let resetPending = false,
  resetConsumed = false;
function finishReset(message) {
  resetConsumed = true;
  history.replaceState(null, "", "/online/");
  showLogin();
  selectMode("login");
  status(message);
  $("#email").focus();
}
$("#reset-form").addEventListener("submit", (event) => {
  event.preventDefault();
  if (resetPending || resetConsumed) return;
  resetPending = true;
  void busy(event.submitter, async () => {
    try {
      await api("/v1/auth/reset", { password: $("#new-password").value });
      finishReset("Senha alterada. Entre novamente.");
    } catch (error) {
      if (error.code === "authentication_required") {
        finishReset(
          "Esta recuperação terminou. Se você já salvou uma nova senha, entre com ela; não repita a troca.",
        );
      } else if (error.code === "password_reset_unconfirmed" || !error.code) {
        // A lost reply can follow a committed password change. Never retry it.
        finishReset(messages.password_reset_unconfirmed);
      } else throw error;
    } finally {
      $("#new-password").value = "";
      resetPending = false;
    }
  });
});
setInterval(() => {
  if (active && !document.hidden) void refresh();
}, 60000);
setInterval(() => {
  if (lease && character && !document.hidden) {
    const renewing = lease;
    void api(`/v1/characters/${character.id}/control/renew`, {
      epoch: lease.epoch,
      token: lease.token,
    }).catch(() => {
      if (lease !== renewing) return;
      lease = null;
      $("#control-state").textContent = "Controle encerrado nesta aba.";
      renderOnline();
    });
  }
}, 30000);
let combatPollRunning = false;
setInterval(() => {
  if (active && online?.combat?.status === "active" && !commandWorking && !combatPollRunning && !document.hidden) {
    combatPollRunning = true;
    void refresh().finally(() => { combatPollRunning = false; });
  }
}, 3000);
if (new URL(location.href).searchParams.get("recovery") === "1") {
  $("#signed-out").hidden = true;
  $("#reset-form").hidden = false;
  $("#panel-title").textContent = "Definir nova senha";
} else void refresh();
