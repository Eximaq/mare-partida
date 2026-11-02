/* BFF session for the original game. No demo storage, provider tokens or client rewards. */
(function (root) {
  "use strict";
  const key = "mare-game-pending-v1",
    classes = [
      "sword",
      "brawler",
      "gunner",
      "rogue",
      "cyborg",
      "strategist",
      "healer",
    ];
  const attributes = [
      "strength",
      "dexterity",
      "vitality",
      "intelligence",
      "spirit",
    ],
    items = ["dock-scrap-v1", "training-weapon-v1", "dock-vest-v1"];
  const originalSlots=['head','necklace','coat','legs','boots','weapon','cloak','gloves','ring','belt','charm','akuma_no_mi'];
  const instanceId=v=>typeof v==='string'&&/^[a-zA-Z0-9-]{1,80}$/.test(v);
  function validForge(op){
    if(!op||typeof op!=='object'||!Number.isSafeInteger(op.expectedSeq)||op.expectedSeq<0)return false;
    const fields={upgrade:['itemId'],imbue:['itemId','pearlItemId','socket'],remove:['itemId','socket'],fuse:['itemIds'],fuseEquipment:['itemIds','slot'],reforge:['itemId'],reforgeLine:['itemId','line']}[op.type];
    if(!fields||Object.keys(op).sort().join()!==['type','expectedSeq',...fields].sort().join())return false;
    return fields.every(k=>k==='itemIds'?Array.isArray(op[k])&&op[k].length===5&&new Set(op[k]).size===5&&op[k].every(instanceId):k==='slot'?originalSlots.includes(op[k]):k==='socket'||k==='line'?Number.isInteger(op[k])&&op[k]>=0&&op[k]<=(k==='socket'?4:7):instanceId(op[k]));
  }
  function validIntent(action, p) {
    if (!p || typeof p !== "object" || Array.isArray(p)) return false;
    const keys = Object.keys(p).sort().join();
    if(['items.initialize','potions.buy','potions.use'].includes(action))return keys==='';
    if(['items.equip','items.sell'].includes(action))return keys==='itemId'&&instanceId(p.itemId);
    if(action==='items.lock')return keys==='itemId,locked'&&instanceId(p.itemId)&&typeof p.locked==='boolean';
    if(action==='items.unequip')return keys==='slot'&&originalSlots.includes(p.slot);
    if(action==='forge.execute')return keys==='operation'&&validForge(p.operation);

    if (
      [
        "journey.begin",
        "hunt.begin",
        "hunt.claim",
        "combat.begin",
        "combat.attack",
        "combat.claim",
        "state.sync",
      ].includes(action)
    )
      return keys === "";
    if (["inventory.buy", "inventory.sell"].includes(action))
      return (
        keys === "itemId,quantity" &&
        items.includes(p.itemId) &&
        Number.isInteger(p.quantity) &&
        p.quantity >= 1 &&
        p.quantity <= 100
      );
    if (action === "equipment.equip")
      return keys === "itemId" && items.slice(1).includes(p.itemId);
    if (action === "equipment.unequip")
      return keys === "slot" && ["weapon", "armor"].includes(p.slot);
    return (
      action === "attributes.allocate" &&
      keys === "allocation" &&
      p.allocation &&
      Object.keys(p.allocation).sort().join() ===
        attributes.slice().sort().join() &&
      attributes.every(
        (k) =>
          Number.isInteger(p.allocation[k]) &&
          p.allocation[k] >= 0 &&
          p.allocation[k] <= 2147483647,
      ) &&
      attributes.reduce((sum, k) => sum + p.allocation[k], 0) > 0 &&
      attributes.reduce((sum, k) => sum + p.allocation[k], 0) <= 2147483647
    );
  }
  function createSession({
    fetch,
    storage,
    uuid = () => root.crypto.randomUUID(),
  }) {
    let data = null,
      control = null,
      pending = null,
      busy = false,
      available = false,
      readVersion = 0;
    const listeners = new Set();
    const notify = () => {
      for (const fn of listeners) fn();
    };
    const discard = () => {
      pending = null;
      storage.removeItem(key);
    };
    const fault = (code) => Object.assign(new Error(code), { code });
    async function api(path, payload) {
      const headers = {},
        options = { cache: "no-store", signal: AbortSignal.timeout(10000) };
      if (payload !== undefined) {
        const csrf = await api("/v1/auth/csrf");
        headers["content-type"] = "application/json";
        headers["x-csrf-token"] = csrf.csrfToken;
        Object.assign(options, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });
      }
      const response = await fetch(path, options),
        result = response.status === 204 ? {} : await response.json();
      if (!response.ok) {
        if (response.status === 401) {
          data = null;
          control = null;
          readVersion++;
          discard();
          notify();
        }
        throw Object.assign(fault(result.error || "unavailable"), {
          status: response.status,
        });
      }
      return result;
    }
    function validate(me, online) {
      if (!me.character) return;
      const c = me.character,
        s = online?.state;
      if (
        !/^[a-f0-9-]{36}$/.test(c.id) ||
        !classes.includes(c.classId) ||
        typeof c.name !== "string" ||
        !s ||
        s.characterId !== c.id ||
        !Number.isSafeInteger(s.version) ||
        s.version < 0 ||
        !Number.isInteger(s.level) ||
        s.level < 1 ||
        s.level > 2147483647 ||
        !/^\d{1,19}$/.test(s.gold) ||
        !/^\d{1,19}$/.test(s.experience)
      )
        throw fault("invalid_server_state");
    }
    async function read() {
      const revision = ++readVersion;
      let me, online;
      try {
        me = await api("/v1/me");
        online = me.character
          ? await api(`/v1/characters/${me.character.id}/online-state`)
          : null;
        validate(me, online);
      } catch (error) {
        available = false;
        notify();
        throw error;
      }
      if (revision !== readVersion) return;
      if (data?.character?.id !== me.character?.id) {
        control = null;
        pending = null;
      }
      data = { character: me.character ?? null, online };
      available = true;
      if (!pending && me.character) {
        try {
          const saved = JSON.parse(storage.getItem(key) || "null");
          if (
            saved &&
            saved.characterId === me.character.id &&
            /^[a-f0-9-]{36}$/.test(saved.requestId) &&
            Number.isSafeInteger(saved.expectedVersion) &&
            saved.expectedVersion >= 0 &&
            validIntent(saved.action, saved.payload)
          )
            pending = saved;
          else if (saved) discard();
        } catch {
          discard();
        }
      }
      notify();
      return data;
    }
    async function acquire(takeover = false) {
      if (!data?.character) throw fault("character_required");
      let payload = {};
      if (takeover) {
        const current = await api(`/v1/characters/${data.character.id}`);
        if (current.control) payload = { expectedEpoch: current.control.epoch };
      }
      control = await api(
        `/v1/characters/${data.character.id}/control`,
        payload,
      );
      notify();
      return control;
    }
    async function send(intent) {
      if (busy || !available || !control || !data?.character)
        throw fault("control_required");
      busy = true;
      notify();
      try {
        await api(`/v1/characters/${data.character.id}/commands`, {
          requestId: intent.requestId,
          expectedVersion: intent.expectedVersion,
          action: intent.action,
          payload: intent.payload,
          control: { epoch: control.epoch, token: control.token },
        });
        discard();
        await read();
      } catch (error) {
        if (error.status && error.status < 500) discard();
        if (error.code === "control_conflict") control = null;
        await read().catch(() => {});
        throw error;
      } finally {
        busy = false;
        notify();
      }
    }
    return {
      enabled: true,
      get available() {
        return available;
      },
      get data() {
        return data;
      },
      get controlled() {
        return !!control;
      },
      get busy() {
        return busy;
      },
      get pending() {
        return pending;
      },
      subscribe(fn) {
        listeners.add(fn);
        return () => listeners.delete(fn);
      },
      api,
      read,
      load: read,
      acquire,
      async command(action, payload = {}) {
        if (!validIntent(action, payload)) throw fault("invalid_intent");
        if (pending) throw fault("pending_command");
        if (!available || !control || !data?.character)
          throw fault("control_required");
        const intent = {
          characterId: data.character.id,
          requestId: uuid(),
          expectedVersion: data.online.state.version,
          action,
          payload: JSON.parse(JSON.stringify(payload)),
        };
        storage.setItem(key, JSON.stringify(intent));
        pending = intent;
        return send(pending);
      },
      async resume() {
        if (!pending) throw fault("no_pending_command");
        return send(pending);
      },
      async renew() {
        if (!control || !data?.character) return;
        try {
          await api(`/v1/characters/${data.character.id}/control/renew`, {
            epoch: control.epoch,
            token: control.token,
          });
        } catch (error) {
          control = null;
          notify();
          throw error;
        }
      },
      async logout() {
        await api("/v1/auth/logout", { scope: "local" });
        readVersion++;
        control = null;
        data = null;
        discard();
        notify();
      },
    };
  }
  root.MareGameSessionFactory = { createSession, validIntent };
  if (typeof module !== "undefined")
    module.exports = { createSession, validIntent };
  if (typeof document !== "undefined") {
    root.MareGameSession = createSession({
      fetch: root.fetch.bind(root),
      storage: root.sessionStorage,
    });
    document.body.classList.add("online-game", "online-session-loading");
  }
})(globalThis);
