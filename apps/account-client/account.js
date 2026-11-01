const $ = (selector) => document.querySelector(selector);
let mode = "login",
  character = null,
  lease = null,
  active = false;
let online = null, pendingJourney = null, journeyWorking = false;
let viewRevision = 0, identityRevision = 0, identity = null;
const PENDING_JOURNEY = "mare-online-pending-v1";
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
function clearPendingJourney() {
  pendingJourney = null;
  try { sessionStorage.removeItem(PENDING_JOURNEY); } catch { /* memory-only fallback */ }
}
function restorePendingJourney(id) {
  if (pendingJourney?.characterId === id) return;
  try {
    const saved = JSON.parse(sessionStorage.getItem(PENDING_JOURNEY) || "null");
    if (saved && Object.keys(saved).sort().join() === "characterId,expectedVersion,requestId" &&
        saved.characterId === id && typeof saved.requestId === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(saved.requestId) &&
        Number.isSafeInteger(saved.expectedVersion) && saved.expectedVersion >= 0) {
      pendingJourney = saved; return;
    }
  } catch { /* malformed or unavailable storage cannot authorize anything */ }
  clearPendingJourney();
}
function renderOnline() {
  $("#online-level").textContent = online ? String(online.state.level) : "—";
  $("#online-xp").textContent = online ? online.state.experience : "—";
  $("#online-gold").textContent = online ? online.state.gold : "—";
  $("#journey-state").textContent = !online ? "Progresso ainda não confirmado." :
    online.journey.started ? "Jornada iniciada no servidor." : "Sua jornada online ainda não foi iniciada.";
  $("#journey-start").disabled = journeyWorking || !active || !character || !online || online.journey.started || !lease;
  $("#journey-start").textContent = journeyWorking ? "Conferindo…" : pendingJourney ? "Retomar solicitação" : "Iniciar jornada";
  $("#online-refresh").disabled = journeyWorking;
}
async function loadOnline(revision, id) {
  try {
    const result = await onlineApi(`/v1/characters/${id}/online-state`);
    if (revision !== viewRevision || !active || character?.id !== id) return;
    if (result.state?.characterId !== id || !Number.isSafeInteger(result.state.version) || result.state.version < 0 ||
        !Number.isInteger(result.state.level) || result.state.level < 1 || typeof result.journey?.started !== "boolean" ||
        ![result.state.gold, result.state.experience].every(v => typeof v === "string" && /^(0|[1-9][0-9]{0,18})$/.test(v)))
      throw new Error("Resposta de progresso inválida.");
    online = result;
    if (online.journey.started) clearPendingJourney();
    $("#journey-message").textContent = pendingJourney ?
      "Há uma solicitação sem resposta confirmada. Retome o controle e confira novamente, sem criar outro pedido." :
      online.journey.started ? "Registro confirmado. Exploração e combate online ainda não estão disponíveis." :
      "Assuma o controle nesta aba para iniciar. O progresso da demonstração permanece separado.";
  } catch (error) {
    if (revision !== viewRevision || !active || character?.id !== id) return;
    online = null;
    if (error.code === "authentication_required") { showLogin(); return; }
    $("#journey-message").textContent = "Não foi possível confirmar o progresso. Atualize quando a conexão voltar.";
  }
  renderOnline();
}
async function startJourney() {
  if (journeyWorking || !active || !character || !online || online.journey.started || !lease) return;
  const id = character.id, revision = identityRevision;
  let refusal = "";
  journeyWorking = true;
  if (!pendingJourney) {
    pendingJourney = { characterId: id, requestId: crypto.randomUUID(), expectedVersion: online.state.version };
    try { sessionStorage.setItem(PENDING_JOURNEY, JSON.stringify(pendingJourney)); } catch { /* current-tab memory remains usable */ }
  }
  renderOnline();
  try {
    await onlineApi(`/v1/characters/${id}/commands`, {
      requestId: pendingJourney.requestId, action: "journey.begin", expectedVersion: pendingJourney.expectedVersion,
      control: { epoch: lease.epoch, token: lease.token }, payload: {},
    });
    if (revision !== identityRevision) return;
    clearPendingJourney();
  } catch (error) {
    if (revision !== identityRevision) return;
    if (error.code === "authentication_required") { showLogin(); return; }
    refusal = messages[error.code] || "";
    if (error.code === "control_conflict") {
      lease = null; $("#control-state").textContent = "Controle encerrado nesta aba.";
    }
    if (["state_version_conflict", "journey_already_started", "idempotency_conflict", "invalid_request"].includes(error.code)) clearPendingJourney();
    // Transport/503 errors may follow a committed action. Reconcile with GET only.
  } finally {
    if (revision === identityRevision) {
      await refresh();
      if (revision === identityRevision) {
        journeyWorking = false;
        if (refusal && online && !online.journey.started) $("#journey-message").textContent = refusal;
        renderOnline();
      }
    }
  }
}
$("#journey-start").addEventListener("click", () => { void startJourney(); });
$("#online-refresh").addEventListener("click", () => { if (!journeyWorking) void refresh(); });
function showLogin() {
  viewRevision++; identityRevision++; identity = null;
  online = null; journeyWorking = false; clearPendingJourney();
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
      if (identity !== null) clearPendingJourney();
      identityRevision++; identity = nextIdentity; lease = null; journeyWorking = false;
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
      restorePendingJourney(character.id);
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
if (new URL(location.href).searchParams.get("recovery") === "1") {
  $("#signed-out").hidden = true;
  $("#reset-form").hidden = false;
  $("#panel-title").textContent = "Definir nova senha";
} else void refresh();
