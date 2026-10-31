const $ = (selector) => document.querySelector(selector);
let mode = "login",
  character = null,
  lease = null,
  active = false;
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
  password_reset_unconfirmed:
    "A resposta da troca de senha não pôde ser confirmada. Tente entrar com a nova senha; se necessário, solicite outra recuperação.",
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
async function api(path, data) {
  const headers = {};
  let method = "GET";
  if (data !== undefined) {
    const context = await read(
      await fetch("/v1/auth/csrf", { cache: "no-store" }),
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
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    }),
  );
}
function showLogin() {
  $("#control-state").textContent = "Nenhum controle solicitado nesta aba.";
  active = false;
  character = null;
  lease = null;
  $("#signed-in").hidden = true;
  $("#signed-out").hidden = false;
  $("#reset-form").hidden = true;
  $("#panel-title").textContent = "Entrar na conta";
}
async function refresh() {
  try {
    const me = await api("/v1/me");
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
    }
  } catch (error) {
    if (error.code === "authentication_required") showLogin();
    else status(error.message);
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
    try {
      lease = await api(`/v1/characters/${character.id}/control`, {});
    } catch (error) {
      if (error.code !== "control_conflict") throw error;
      const current = await api(`/v1/characters/${character.id}`);
      if (
        !confirm(
          "Assumir o controle nesta aba? A outra aba ou dispositivo perderá o controle.",
        )
      )
        return;
      lease = await api(`/v1/characters/${character.id}/control`, {
        expectedEpoch: current.control.epoch,
      });
    }
    $("#control-state").textContent = "Controle ativo nesta aba.";
    status("Controle atribuído. Ainda não há comandos de gameplay online.");
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
$("#reset-form").addEventListener("submit", (event) => {
  event.preventDefault();
  void busy(event.submitter, async () => {
    try {
      await api("/v1/auth/reset", { password: $("#new-password").value });
      history.replaceState(null, "", "/online/");
      showLogin();
      status("Senha alterada. Entre novamente.");
    } finally {
      $("#new-password").value = "";
    }
  });
});
setInterval(() => {
  if (active && !document.hidden) void refresh();
}, 60000);
setInterval(() => {
  if (lease && character && !document.hidden)
    void api(`/v1/characters/${character.id}/control/renew`, {
      epoch: lease.epoch,
      token: lease.token,
    }).catch(() => {
      lease = null;
      $("#control-state").textContent = "Controle encerrado nesta aba.";
    });
}, 30000);
if (new URL(location.href).searchParams.get("recovery") === "1") {
  $("#signed-out").hidden = true;
  $("#reset-form").hidden = false;
  $("#panel-title").textContent = "Definir nova senha";
} else void refresh();
