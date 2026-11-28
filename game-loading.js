(() => {
  'use strict';
  const screen = document.getElementById('gameLoading');
  const app = document.getElementById('app');
  const meter = screen.querySelector('progress');
  const percent = screen.querySelector('output');
  const phase = screen.querySelector('[role=status]');
  const amount = screen.querySelector('.loading-size') || document.createElement('div');
  if (!amount.parentNode) { amount.className = 'loading-size'; meter.after(amount); }
  const retry = screen.querySelector('button');
  const fullInstall = document.documentElement.dataset.gameInstall === 'full';
  const catalog = document.documentElement.dataset.gameContent;
  const scope = new URL('./', document.baseURI).href;
  const temporary = new Map();
  navigator.serviceWorker?.addEventListener('message', event => {
    if (event.source !== navigator.serviceWorker.controller || event.data?.type !== 'read-unit') return;
    event.ports[0]?.postMessage(temporary.get(event.data.hash) || null);
  });
  const bytes = n => (n / 1048576).toLocaleString('pt-BR', {maximumFractionDigits: 1});
  async function digestOf(buffer) {
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', buffer));
    return Array.from(digest, n => n.toString(16).padStart(2, '0')).join('');
  }
  let scenePending = false, failure = false, prepared = !fullInstall, interfaceReady = false, generation = 0, preparing;
  function status(message) {
    if (!failure && phase.textContent !== message) phase.textContent = message;
  }
  function progress(value) {
    if (failure) return;
    meter.value = value;
    percent.textContent = Math.floor(value) + '%';
  }
  function show() {
    ++generation;
    screen.hidden = false;
    app.inert = true;
    app.setAttribute('aria-busy', 'true');
  }
  function fail(message, again = () => location.reload()) {
    show();
    failure = true;
    phase.textContent = message;
    if (skipButton) skipButton.hidden = true;
    retry.hidden = false;
    retry.onclick = () => { retry.hidden = true; failure = false; again(); };
    retry.focus({preventScroll: true});
  }
  async function waitForController(worker, script) {
    if (worker.controller?.scriptURL === script) return worker.controller;
    return new Promise(resolve => {
      const done = () => {
        const controller = worker.controller;
        if (controller?.scriptURL === script) settle(controller);
      };
      const settle = controller => {
        clearTimeout(timer);
        worker.removeEventListener('controllerchange', done);
        resolve(controller);
      };
      const timer = setTimeout(() => settle(null), 5000);
      worker.addEventListener('controllerchange', done);
      done();
    });
  }
  async function worker() {
    const sw = navigator.serviceWorker;
    if (!sw || !window.caches) throw Error('Abra o jogo por HTTPS para guardar os arquivos no dispositivo.');
    const url = new URL('game-content-worker.js', scope);
    // Both modes share one registration. The worker stores the mode per tab.
    url.searchParams.set('on-demand', '1');
    if (document.documentElement.hasAttribute('data-renderer-fixture')) url.searchParams.set('renderer', '1');
    await sw.register(url, {scope});
    const controller = await waitForController(sw, url.href);
    if (!controller && fullInstall) throw Error('Atualize a página para ativar o armazenamento do jogo.');
    return controller;
  }
  function bind(controller, onDemand = false) {
    return new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      const timer = setTimeout(() => { channel.port1.close(); reject(Error('O armazenamento do jogo não respondeu.')); }, 15000);
      channel.port1.onmessage = ({data}) => {
        clearTimeout(timer); channel.port1.close();
        if (data) resolve(); else reject(Error('Não foi possível abrir o pacote do jogo.'));
      };
      controller.postMessage({type: 'bind', catalog, onDemand}, [channel.port2]);
    });
  }
  const unitKey = hash => new URL('loading-data/' + hash, scope).href;
  async function fetchBytes(path, hash, size, received, signal) {
    const source = new URL(path, scope);
    source.searchParams.set('install', hash.slice(0, 16));
    const file = await fetch(source, {signal}).catch(error => {
      if (signal?.aborted) throw error;
      return fetch(source, {cache: 'reload', signal});
    });
    if (!file.ok) throw Error('Não foi possível baixar um arquivo do jogo.');
    const reader = file.body.getReader();
    const buffer = new Uint8Array(size);
    let offset = 0;
    for (;;) {
      const {done, value} = await reader.read();
      if (done) break;
      if (value.length > size - offset) {
        await reader.cancel();
        throw Error('Um arquivo não corresponde à versão do jogo.');
      }
      buffer.set(value, offset);
      offset += value.length;
      received(value.length);
    }
    if (offset !== size) throw Error('Um arquivo chegou incompleto.');
    return buffer.buffer;
  }
  async function restoreArchive(unit, patch, units, storage, received, signal) {
    const [path, literalSize, spans] = patch;
    const literal = new Uint8Array(await fetchBytes(path, unit.hash, literalSize, received, signal));
    const output = new Uint8Array(unit.size);
    const providers = new Map();
    let cursor = 0, consumed = 0;
    for (const [offset, provider, start, count] of spans) {
      const gap = offset - cursor;
      output.set(literal.subarray(consumed, consumed + gap), cursor);
      consumed += gap;
      const hash = units[provider][2];
      if (hash === unit.hash) {
        output.copyWithin(offset, start, start + count);
      } else {
        if (!providers.has(hash)) {
          const stored = temporary.get(hash) || await storage.match(unitKey(hash));
          if (!stored) throw Error('Arquivo de origem indisponível.');
          providers.set(hash, new Uint8Array(await stored.arrayBuffer()));
        }
        output.set(providers.get(hash).subarray(start, start + count), offset);
      }
      cursor = offset + count;
    }
    output.set(literal.subarray(consumed), cursor);
    return output.buffer;
  }
  function portAsset(path) {
    if (path.startsWith('assets/ui/')) return !/[-/]reference[/]|\/loading-art\//.test(path);
    return /^(?:icones_menu_pirata\/|tools\/(?:rework-|paper-doll-96-v3\/)|assets\/(?:skins|classes|factions|akuma|haki)\/)/.test(path);
  }
  // The entry button can skip only the alternate HD library. The active map,
  // character and window art always finish before gameplay accepts input.
  let interfaceCached = false, skipButton;
  const libraryAbort = new AbortController();
  let markSceneReady;
  const sceneReady = new Promise(resolve => { markSceneReady = resolve; });
  function offerEarlyEntry() {
    if (skipButton || failure) return;
    skipButton = document.createElement('button');
    skipButton.type = 'button';
    skipButton.textContent = 'Entrar com meu equipamento';
    retry.after(skipButton);
    skipButton.onclick = () => {
      libraryAbort.abort();
      skipButton.hidden = true;
      status('Preparando seu equipamento e as janelas');
    };
  }
  async function install(portOnly = false) {
    const controller = portOnly ? await prepare() : await worker();
    if (portOnly && !controller) return;
    const metadata = await caches.open('kaizoku-content-index:' + scope);
    const indexURL = new URL(catalog, scope);
    let response = await metadata.match(indexURL);
    if (!response) {
      response = await fetch(indexURL, {cache: 'no-cache'});
      if (!response.ok) throw Error('Não foi possível obter a lista de arquivos.');
      const hash = await digestOf(await response.clone().arrayBuffer());
      if (catalog !== 'game-content-' + hash.slice(0, 24) + '.json') throw Error('A lista de arquivos está incompleta. Tente novamente.');
      await metadata.put(indexURL, response.clone());
    }
    const {units, files, portUnits, patches = {}} = await response.json();
    const selected = !portOnly ? null : Number.isInteger(portUnits)
      ? new Set(Array.from({length: portUnits}, (_, index) => index))
      : new Set(Object.entries(files).filter(([path]) => portAsset(path)).map(([, file]) => file[0]));
    if (!portOnly) await bind(controller);
    async function download(group, library = false) {
      const run = () => installUnits(units, patches, group, library);
      if (!navigator.locks) return run();
      // Recheck cached bytes under the lock, but never wait for a frame while holding it.
      const options = library ? {signal: libraryAbort.signal} : {};
      try { await navigator.locks.request('kaizoku-install:' + scope, options, run); }
      catch (error) { if (!(library && libraryAbort.signal.aborted)) throw error; }
    }
    if (selected) {
      const first = new Set();
      const forms = new Set(Object.values(window.MareSpriteCombatV2?.fruits || {}));
      for (const [path, [index]] of Object.entries(files)) {
        const sprite = path.match(/^assets\/sprites-combat-v2\/([^/]+)\//);
        if (path.startsWith('assets/npcs/') || (sprite && forms.has(sprite[1]))) selected.add(index);
        if (selected.has(index) && (path.startsWith('assets/ui/') || path.startsWith('icones_menu_pirata/') ||
            path.startsWith('assets/skins/'))) first.add(index);
      }
      await download(first);
      interfaceCached = true;
      await sceneReady;
      if (libraryAbort.signal.aborted) return;
      const library = new Set([...selected].filter(index => !first.has(index)));
      await download(library, true);
    } else await download(null);
    if (!portOnly) controller.postMessage({type: 'installed', catalog});
  }
  async function installUnits(units, patches, selected, library = false) {
    const storage = await caches.open('kaizoku-content-bytes:' + scope);
    const cached = new Set((await storage.keys()).map(key => key.url));
    const queue = [], providers = new Set(), seen = new Set();
    let total = 0, loaded = 0;
    for (const [index, [path, size, hash]] of units.entries()) {
      if (selected && !selected.has(index)) continue;
      if (seen.has(hash)) continue;
      seen.add(hash);
      const key = unitKey(hash);
      const candidate = patches[hash];
      const patch = !selected || candidate?.[2].every(([, index]) => selected.has(index)) ? candidate : null;
      const transferSize = patch ? patch[1] : size;
      total += transferSize;
      if (cached.has(key) || temporary.has(hash)) {
        loaded += transferSize;
      } else {
        queue.push({path, size, hash, key, patch, transferSize});
        for (const [, index] of patch?.[2] || []) {
          const provider = units[index][2];
          if (provider !== hash) providers.add(provider);
        }
      }
    }
    let inFlight = 0, downloaded = 0, lastUpdate = -Infinity, updateTimer;
    const start = performance.now();
    function update(force = false) {
      if (failure) return;
      const now = performance.now();
      const nextUpdate = 250 - (now - lastUpdate);
      if (!force && nextUpdate > 0 && loaded + inFlight < total) {
        updateTimer ??= setTimeout(() => update(true), nextUpdate);
        return;
      }
      clearTimeout(updateTimer);
      updateTimer = undefined;
      lastUpdate = now;
      const received = loaded + inFlight;
      const remaining = total - received;
      const elapsed = (now - start) / 1000;
      const rate = downloaded / Math.max(elapsed, 1);
      const fraction = total ? received / total : 1;
      progress(selected ? (library ? 30 + 66 * fraction : 30 * fraction) : 96 * fraction);
      status(remaining ? (library ? 'Guardando as outras roupas, armas e animações' : selected ? 'Preparando janelas e equipamentos' : 'Baixando conteúdo do jogo') : 'Verificando os arquivos do jogo');
      let details = bytes(received) + ' / ' + bytes(total) + ' MiB';
      if (remaining && elapsed >= 3 && rate > 0) {
        const seconds = Math.ceil(remaining / rate);
        const estimate = seconds < 60 ? seconds + ' s' : Math.ceil(seconds / 60) + ' min';
        details += ' · ' + bytes(rate) + ' MiB/s · Cerca de ' + estimate;
      }
      if (temporary.size) details += ' · Parte dos arquivos fica nesta aba';
      if (amount) amount.textContent = details;
    }
    update(true);
    let diskFull = false;
    async function installUnit(unit) {
      const {path, size, hash, key, patch, transferSize} = unit;
      const signal = library ? libraryAbort.signal : undefined;
      let buffer, received = 0;
      function onChunk(size) {
        received += size;
        inFlight += size;
        downloaded += size;
        update();
      }
      if (patch) {
        try {
          const rebuilt = await restoreArchive(unit, patch, units, storage, onChunk, signal);
          if (await digestOf(rebuilt) === hash) buffer = rebuilt;
        } catch {
          // The original ZIP remains usable if a patch or its cached source was lost.
        }
      }
      if (!buffer) {
        if (patch) {
          // Count the literal already received and the full fallback download.
          total += received + size - transferSize;
          update(true);
        }
        buffer = await fetchBytes(path, hash, size, onChunk, signal);
        if (await digestOf(buffer) !== hash) throw Error('Um arquivo não corresponde à versão do jogo.');
      }
      const blob = new Blob([buffer]);
      if (!diskFull) {
        try { await storage.put(key, new Response(blob)); }
        catch (error) {
          if (error.name !== 'QuotaExceededError' && error.name !== 'UnknownError' && !(error instanceof TypeError)) throw error;
          diskFull = true;
        }
      }
      if (diskFull && !selected) temporary.set(hash, blob);
      inFlight -= received;
      loaded += received;
      update(true);
    }
    async function installBatch(batch) {
      let cursor = 0, stopped = false;
      async function download() {
        try {
          while (!stopped && !(selected && diskFull) && !(library && libraryAbort.signal.aborted) && cursor < batch.length) await installUnit(batch[cursor++]);
        } catch (error) { stopped = true; throw error; }
      }
      const results = await Promise.allSettled(Array.from({length: Math.min(6, batch.length)}, download));
      const failed = results.find(result => result.status === 'rejected');
      if (failed && !(library && libraryAbort.signal.aborted)) throw failed.reason;
    }
    try {
      await installBatch(queue.filter(unit => providers.has(unit.hash)));
      await installBatch(queue.filter(unit => !providers.has(unit.hash)));
    } finally {
      clearTimeout(updateTimer);
    }
  }
  function prepare() {
    if (!catalog && !fullInstall) return;
    if (!fullInstall) {
      return preparing ??= worker().then(async controller => {
        if (controller) await bind(controller, true);
        return controller;
      }).catch(error => console.warn('[game] content_cache_unavailable', error));
    }
    return preparing ??= prepareFull();
  }
  async function prepareFull() {
    show();
    for (;;) {
      try {
        if (catalog) await install();
        await document.fonts.ready;
        prepared = true;
        if (failure) return;
        if (scenePending) scene();
        else if (interfaceReady) finish();
        else { progress(97); phase.textContent = 'Preparando a entrada no jogo'; }
        return;
      } catch (error) {
        const message = error.name === 'QuotaExceededError'
          ? 'Espaço insuficiente. Libere espaço no dispositivo e tente novamente.'
          : error instanceof TypeError ? 'A transferência foi interrompida. Confira sua conexão.' : error.message;
        await new Promise(resolve => fail(message, resolve));
      }
    }
  }
  async function preparePort() {
    screen.dataset.portEntry = 'true';
    if (catalog) offerEarlyEntry();
    if (catalog) await install(true);
    await document.fonts.ready;
    progress(98);
    status('Preparando o mapa e o personagem');
  }
  function scene() {
    if (failure) return;
    show(); scenePending = true;
    interfaceReady = false;
    if (!prepared || screen.dataset.portEntry === 'true' && !interfaceCached) return;
    progress(98);
    phase.textContent = 'Entrando no mapa';
  }
  function finish() {
    interfaceReady = true;
    if (!prepared || failure || screen.hidden) return;
    const sceneWasPending = scenePending;
    scenePending = false;
    progress(100);
    phase.textContent = 'Tudo pronto';
    const current = ++generation;
    const reveal = () => {
      if (generation !== current) return;
      screen.hidden = true; app.inert = false; app.removeAttribute('aria-busy');
      window.MareUI?.syncModals();
      if (!document.getElementById('startOverlay')?.classList.contains('hidden')) document.getElementById('characterName')?.focus();
    };
    if (fullInstall || sceneWasPending) requestAnimationFrame(() => requestAnimationFrame(reveal));
    else reveal();
  }
  window.MareGameLoading = {fullInstall, prepare, preparePort, markSceneReady, scene, finish, fail,
    status,
    get interfaceCached() { return interfaceCached; },
    get prepared() { return prepared; },
    get failed() { return failure; },
    get pending() { return scenePending && !failure; }};
})();
