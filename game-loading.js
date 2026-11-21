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
  const bytes = n => (n / 1048576).toLocaleString('pt-BR', {maximumFractionDigits: 1});
  async function digestOf(buffer) {
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', buffer));
    return Array.from(digest, n => n.toString(16).padStart(2, '0')).join('');
  }
  let scenePending = false, failure = false, prepared = false, interfaceReady = false, generation = 0;
  function progress(value) {
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
    await sw.register(new URL('game-content-worker.js', scope), {scope});
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
    const {units} = await response.json();
    await bind(controller);
    const storage = await caches.open('kaizoku-content-bytes:' + scope);
    const cached = new Set((await storage.keys()).map(key => key.url));
    const total = units.reduce((n, unit) => n + unit[1], 0);
    let loaded = 0;
    const queue = [];
    for (const [path, size, hash] of units) {
      const key = new URL('loading-data/' + hash, scope).href;
      if (cached.has(key)) loaded += size; else queue.push({path, size, hash, key});
    }
    function update() {
      progress(96 * loaded / Math.max(1, total));
      amount.textContent = bytes(loaded) + ' / ' + bytes(total) + ' MiB';
    }
    update();
    phase.textContent = queue.length ? 'Preparando mapas, personagens e equipamentos' : 'Conferindo os arquivos desta versão';
    let cursor = 0, stopped = false;
    async function download() {
      while (!stopped && cursor < queue.length) {
        const {path, size, hash, key} = queue[cursor++];
        try {
          const source = new URL(path, scope);
          source.searchParams.set('install', hash.slice(0, 16));
          const file = await fetch(source).catch(() => fetch(source, {cache: 'reload'}));
          if (!file.ok) throw Error('Não foi possível baixar um arquivo do jogo.');
          const buffer = await file.arrayBuffer();
          if (buffer.byteLength !== size) throw Error('Um arquivo chegou incompleto.');
          if (await digestOf(buffer) !== hash)
            throw Error('Um arquivo não corresponde à versão do jogo.');
          await storage.put(key, new Response(buffer));
          loaded += size; update();
        } catch (error) { stopped = true; throw error; }
      }
    }
    const results = await Promise.allSettled(Array.from({length: Math.min(6, queue.length)}, download));
    const failed = results.find(result => result.status === 'rejected');
    if (failed) throw failed.reason;
    controller.postMessage({type: 'installed', catalog});
  }
  async function prepare() {
    show();
    for (;;) {
      try {
        if (catalog) await install();
        await document.fonts.ready;
        prepared = true;
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
    show(); scenePending = true;
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
    get prepared() { return prepared; },
    get failed() { return failure; },
    get pending() { return scenePending && !failure; }};
})();
