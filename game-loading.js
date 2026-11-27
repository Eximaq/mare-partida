(() => {
  'use strict';
  const screen = document.getElementById('gameLoading');
  const app = document.getElementById('app');
  const meter = screen.querySelector('progress');
  const percent = screen.querySelector('output');
  const phase = screen.querySelector('[role=status]');
  const amount = screen.querySelector('.loading-size');
  const retry = screen.querySelector('button');
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
  let scenePending = false, failure = false, prepared = false, interfaceReady = false, generation = 0;
  function status(message) {
    if (!failure) phase.textContent = message;
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
    retry.hidden = false;
    retry.onclick = () => { retry.hidden = true; failure = false; again(); };
    retry.focus({preventScroll: true});
  }
  async function worker() {
    if (!navigator.serviceWorker || !window.caches) throw Error('Abra o jogo por HTTPS para guardar os arquivos no dispositivo.');
    const sw = navigator.serviceWorker;
    const url = new URL('game-content-worker.js', scope);
    if (document.documentElement.hasAttribute('data-renderer-fixture')) url.searchParams.set('renderer', '1');
    await sw.register(url, {scope});
    await sw.ready;
    if (!sw.controller) await new Promise((resolve, reject) => {
      const done = () => { clearTimeout(timer); sw.removeEventListener('controllerchange', done); resolve(); };
      const timer = setTimeout(() => { sw.removeEventListener('controllerchange', done); reject(Error('Atualize a página para ativar o armazenamento do jogo.')); }, 15000);
      sw.addEventListener('controllerchange', done);
      if (sw.controller) done();
    });
    return sw.controller;
  }
  function bind(controller) {
    return new Promise((resolve, reject) => {
      const channel = new MessageChannel();
      const timer = setTimeout(() => { channel.port1.close(); reject(Error('O armazenamento do jogo não respondeu.')); }, 15000);
      channel.port1.onmessage = ({data}) => {
        clearTimeout(timer); channel.port1.close();
        if (data) resolve(); else reject(Error('Não foi possível abrir o pacote do jogo.'));
      };
      controller.postMessage({type: 'bind', catalog}, [channel.port2]);
    });
  }
  const unitKey = hash => new URL('loading-data/' + hash, scope).href;
  async function fetchBytes(path, hash) {
    const source = new URL(path, scope);
    source.searchParams.set('install', hash.slice(0, 16));
    const file = await fetch(source).catch(() => fetch(source, {cache: 'reload'}));
    if (!file.ok) throw Error('Não foi possível baixar um arquivo do jogo.');
    return file.arrayBuffer();
  }
  async function restoreArchive(unit, patch, units, storage) {
    const [path, literalSize, spans] = patch;
    const literal = new Uint8Array(await fetchBytes(path, unit.hash));
    if (literal.length !== literalSize) throw Error('A atualização chegou incompleta.');
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
  async function install() {
    const controller = await worker();
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
    const {units, patches = {}} = await response.json();
    await bind(controller);
    // Recheck stored hashes inside the lock: a second tab may have installed
    // everything while this one was waiting. Never download the same release twice.
    if (navigator.locks) {
      status('Conferindo o carregamento em outras abas');
      await navigator.locks.request('kaizoku-install:' + scope, () => installUnits(units, patches));
    } else await installUnits(units, patches);
    controller.postMessage({type: 'installed', catalog});
  }
  async function installUnits(units, patches) {
    const storage = await caches.open('kaizoku-content-bytes:' + scope);
    const cached = new Set((await storage.keys()).map(key => key.url));
    const queue = [], providers = new Set(), seen = new Set();
    let total = 0, loaded = 0;
    for (const [path, size, hash] of units) {
      if (seen.has(hash)) continue;
      seen.add(hash);
      const key = unitKey(hash);
      const patch = patches[hash];
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
    function update() {
      progress(96 * loaded / Math.max(1, total));
      amount.textContent = bytes(loaded) + ' / ' + bytes(total) + ' MiB' +
        (temporary.size ? ' · Parte dos arquivos fica nesta aba' : '');
    }
    update();
    status(queue.length ? 'Preparando mapas, personagens e equipamentos' : 'Conferindo os arquivos desta versão');
    let diskFull = false;
    async function installUnit(unit) {
      const {path, size, hash, key, patch, transferSize} = unit;
      let buffer;
      if (patch) {
        try {
          const rebuilt = await restoreArchive(unit, patch, units, storage);
          if (await digestOf(rebuilt) === hash) buffer = rebuilt;
        } catch {
          // The original ZIP remains usable if a patch or its cached source was lost.
        }
      }
      if (!buffer) {
        buffer = await fetchBytes(path, hash);
        if (buffer.byteLength !== size) throw Error('Um arquivo chegou incompleto.');
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
      if (diskFull) temporary.set(hash, blob);
      loaded += transferSize; update();
    }
    async function installBatch(batch) {
      let cursor = 0, stopped = false;
      async function download() {
        try {
          while (!stopped && cursor < batch.length) await installUnit(batch[cursor++]);
        } catch (error) { stopped = true; throw error; }
      }
      const results = await Promise.allSettled(Array.from({length: Math.min(6, batch.length)}, download));
      const failed = results.find(result => result.status === 'rejected');
      if (failed) throw failed.reason;
    }
    await installBatch(queue.filter(unit => providers.has(unit.hash)));
    await installBatch(queue.filter(unit => !providers.has(unit.hash)));
  }
  async function prepare() {
    show();
    for (;;) {
      try {
        if (catalog) await install();
        await document.fonts.ready;
        prepared = true;
        if (failure) return;
        if (scenePending) scene();
        else if (interfaceReady) finish();
        else { progress(97); phase.textContent = 'Preparando a cena de entrada'; }
        return;
      } catch (error) {
        const message = error.name === 'QuotaExceededError'
          ? 'Espaço insuficiente. Libere espaço no dispositivo e tente novamente.'
          : error instanceof TypeError ? 'A transferência foi interrompida. Confira sua conexão.' : error.message;
        await new Promise(resolve => fail(message, resolve));
      }
    }
  }
  function scene() {
    if (failure) return;
    show(); scenePending = true;
    interfaceReady = false;
    if (!prepared) return;
    progress(98);
    phase.textContent = 'Preparando o mapa e a animação do personagem';
  }
  function finish() {
    interfaceReady = true;
    if (!prepared || failure || screen.hidden) return;
    scenePending = false;
    progress(100);
    phase.textContent = 'Tudo pronto';
    const current = ++generation;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (generation !== current) return;
      screen.hidden = true; app.inert = false; app.removeAttribute('aria-busy');
      window.MareUI?.syncModals();
      if (!document.getElementById('startOverlay')?.classList.contains('hidden')) document.getElementById('characterName')?.focus();
    }));
  }
  window.MareGameLoading = {prepare, scene, finish, fail,
    status,
    get prepared() { return prepared; },
    get failed() { return failure; },
    get pending() { return scenePending && !failure; }};
})();
