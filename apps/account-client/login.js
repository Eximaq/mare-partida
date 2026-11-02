/* Public account entry only. Gameplay is hosted at /game, never in this form. */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  let mode = "login",
    working = false;
  const messages = {
    authentication_failed:
      "Não foi possível entrar. Confira a senha e a confirmação do e-mail.",
    rate_limited: "Muitas tentativas. Aguarde antes de tentar novamente.",
    csrf_rejected:
      "A sessão mudou. Atualize a página antes de tentar novamente.",
    character_exists: "A conta já possui um personagem. Entre novamente.",
    invalid_request: "Confira os campos informados.",
  };
  async function api(path, data) {
    const options = { cache: "no-store", signal: AbortSignal.timeout(10000) };
    if (data !== undefined) {
      const csrf = await api("/v1/auth/csrf");
      Object.assign(options, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": csrf.csrfToken,
        },
        body: JSON.stringify(data),
      });
    }
    const r = await fetch(path, options),
      value = r.status === 204 ? {} : await r.json();
    if (!r.ok)
      throw Object.assign(
        new Error(
          messages[value.error] || "Serviço indisponível. Tente novamente.",
        ),
        { code: value.error },
      );
    return value;
  }
  async function enter() {
    const me = await api("/v1/me");
    if (me.character) {
      location.replace("/game");
      return;
    }
    $("login-view").hidden = true;
    $("create-form").hidden = false;
    $("panel-title").textContent = "Seu primeiro personagem";
  }
  async function busy(event, operation) {
    event.preventDefault();
    if (working) return;
    working = true;
    const button = event.submitter;
    if (button) button.disabled = true;
    $("status").textContent = "Aguarde…";
    try {
      await operation();
    } catch (error) {
      $("status").textContent =
        error.message ||
        "Conexão interrompida. Confira antes de tentar novamente.";
    } finally {
      working = false;
      if (button) button.disabled = false;
    }
  }
  for (const button of document.querySelectorAll("[data-mode]"))
    button.addEventListener("click", () => {
      if (working) return;
      mode = button.dataset.mode;
      for (const b of document.querySelectorAll("[data-mode]"))
        b.setAttribute("aria-pressed", String(b === button));
      $("password-field").hidden = mode === "recover";
      $("password").required = mode !== "recover";
      $("password").autocomplete =
        mode === "signup" ? "new-password" : "current-password";
      $("panel-title").textContent = {
        login: "Entrar no jogo",
        signup: "Criar conta",
        recover: "Recuperar acesso",
      }[mode];
      $("login-submit").textContent = {
        login: "Entrar no jogo",
        signup: "Criar conta",
        recover: "Enviar instruções",
      }[mode];
      $("status").textContent = "";
    });
  $("login-form").addEventListener(
    "submit",
    (event) =>
      void busy(event, async () => {
        try {
          const result = await api("/v1/auth/" + mode, {
            email: $("email").value.trim(),
            ...(mode === "recover" ? {} : { password: $("password").value }),
          });
          if (mode === "login") await enter();
          else $("status").textContent = result.message;
        } finally {
          $("password").value = "";
        }
      }),
  );
  $("create-form").addEventListener(
    "submit",
    (event) =>
      void busy(event, async () => {
        await api("/v1/characters", {
          name: $("name").value.trim(),
          classId: $("class").value,
          factionId: $("faction").value,
        });
        location.replace("/game");
      }),
  );
  $("reset-form").addEventListener(
    "submit",
    (event) =>
      void busy(event, async () => {
        let finished = false;
        try {
          await api("/v1/auth/reset", { password: $("new-password").value });
          $("status").textContent = "Senha alterada. Entre novamente.";
          finished = true;
        } catch (error) {
          if (
            error.code === "authentication_required" ||
            error.code === "password_reset_unconfirmed" ||
            !error.code
          ) {
            $("status").textContent =
              "Esta recuperação terminou. Se você salvou uma senha nova, entre com ela; não repita a troca.";
            finished = true;
          } else throw error;
        } finally {
          $("new-password").value = "";
          if (finished) {
            $("reset-form").hidden = true;
            $("login-view").hidden = false;
            history.replaceState(null, "", "/online/");
          }
        }
      }),
  );
  if (new URL(location.href).searchParams.get("recovery") === "1") {
    $("login-view").hidden = true;
    $("reset-form").hidden = false;
    $("panel-title").textContent = "Definir nova senha";
  } else
    void enter().catch((error) => {
      if (error.code !== "authentication_required")
        $("status").textContent = error.message;
    });
})();
