(() => {
  'use strict';
  const screen = document.getElementById('gameLoading');
  const app = document.getElementById('app');
  const meter = screen.querySelector('progress');
  const percent = screen.querySelector('output');
  const phase = screen.querySelector('[role=status]');
  const retry = screen.querySelector('button');
  const catalog = document.documentElement.dataset.gameContent;
  const scope = new URL('./', document.baseURI).href;
  let preparing;

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
  async function bind() {
    const worker = navigator.serviceWorker;
    if (!catalog || !worker || !window.caches) return;
    const url = new URL('game-content-worker.js', scope);
    url.searchParams.set('on-demand', '1');
    if (document.documentElement.hasAttribute('data-renderer-fixture')) url.searchParams.set('renderer', '1');
    await worker.register(url, {scope});
    const controller = await waitForController(worker, url.href);
    if (controller) controller.postMessage({type: 'bind', catalog, onDemand: true});
  }
  function prepare() {
    // Registration and the catalog are independent from boot. CacheStorage is optional.
    return preparing ??= bind().catch(error => console.warn('[game] content_cache_unavailable', error));
  }
  function finish() {
    meter.value = 100;
    percent.textContent = '100%';
    screen.hidden = true;
    app.inert = false;
    app.removeAttribute('aria-busy');
    window.MareUI?.syncModals();
    if (!document.getElementById('startOverlay')?.classList.contains('hidden')) document.getElementById('characterName')?.focus();
  }
  function fail(message) {
    screen.hidden = false;
    app.inert = true;
    app.setAttribute('aria-busy', 'true');
    phase.textContent = message;
    retry.hidden = false;
    retry.onclick = () => location.reload();
    retry.focus({preventScroll: true});
  }
  window.MareGameLoading = {prepare, finish, fail};
})();
