/* Isolated art review: native frames, bounded caches, no save access. */
(async function () {
  'use strict';
  const $ = id => document.getElementById(id), rig = window.MareRig96, motion = window.MareMotion96;
  const response = await fetch('manifest.json');
  if (!response.ok) throw Error('Não foi possível carregar o pacote.');
  const manifest = await response.json();
  window.MareLayers96.validate(manifest);
  const loaded = new Map(), inflight = new Map(), composites = new Map();
  let protectedFiles = new Set(), active = null, version = 0;
  function trimImages() {
    while (loaded.size > 32) {
      const key = [...loaded.keys()].find(key => !protectedFiles.has(key));
      if (!key) break;
      loaded.delete(key);
    }
  }
  async function image(url) {
    if (loaded.has(url)) { const img = loaded.get(url); loaded.delete(url); loaded.set(url, img); return img; }
    if (inflight.has(url)) return inflight.get(url);
    const promise = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => { loaded.set(url, img); inflight.delete(url); trimImages(); resolve(img); };
      img.onerror = () => { inflight.delete(url); reject(Error('Imagem ausente: ' + url)); };
      img.src = url;
    });
    inflight.set(url, promise); return promise;
  }
  const map = await new Promise((resolve, reject) => {
    const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = '../../assets/lobby-map.png';
  });
  let playing = true, epoch = performance.now(), frame = 0;
  function selection(bodyName = $('body').value, action = $('action').value, direction = $('direction').value) {
    const body = manifest.bodies[bodyName], clip = body.clips[action]?.[direction];
    return { key: [bodyName, action, direction].join(':'), reference: body.references[direction],
      clip: clip?.modular ? clip : null,
      layers: action === 'static' ? body.layers?.[direction] : clip?.modular ? clip.layers : null };
  }
  function compose(selected, fi, hidden = []) {
    const spec = motion.clipSpec(manifest, selected.clip);
    const key = [selected.key, fi, ...hidden].join(':');
    if (composites.has(key)) return composites.get(key);
    const tile = document.createElement('canvas'); tile.width = spec.width; tile.height = spec.height;
    MareLayers96.draw(tile.getContext('2d'), loaded, selected.layers, fi, spec, hidden);
    composites.set(key, tile);
    if (composites.size > 64) composites.delete(composites.keys().next().value);
    return tile;
  }
  async function render(body, action, direction, fi = 0, hidden = []) {
    const selected = selection(body, action, direction);
    if (!selected.layers) throw Error('Movimento ainda não disponível.');
    await Promise.all(Object.values(selected.layers).map(image));
    return compose(selected, fi, hidden);
  }
  function actor(ctx, img, spec, x = 300, feet = 260) {
    ctx.drawImage(img, 0, 0, spec.width, spec.height,
      x - spec.pivot.x * spec.scale, feet - spec.pivot.y * spec.scale, spec.width * spec.scale, spec.height * spec.scale);
  }
  function background(canvas) {
    const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(map, 1250, 1120, 600, 400, 0, 0, 600, 400);
    ctx.fillStyle = '#0004'; ctx.beginPath(); ctx.ellipse(300, 260, 15, 4, 0, 0, Math.PI * 2); ctx.fill();
    return ctx;
  }
  function draw(now) {
    if (!active) return;
    const { reference, clip, layers } = active;
    if (!clip) frame = 0;
    else if (playing) {
      const duration = clip.frames * 1000 / clip.fps, time = now - epoch;
      frame = rig.frameAt(clip, $('repeat').checked && !clip.loop ? time % (duration + 150) : time);
    }
    $('frame').max = clip ? clip.frames - 1 : 0; $('frame').value = frame;
    actor(background($('reference')), loaded.get(reference), motion.clipSpec(manifest));
    const ctx = background($('animated')), detail = $('detail'), spec = motion.clipSpec(manifest, clip);
    if (detail.width !== spec.width * 2) { detail.width = spec.width * 2; detail.height = spec.height * 2; }
    const dc = detail.getContext('2d'); dc.imageSmoothingEnabled = false; dc.clearRect(0, 0, detail.width, detail.height);
    if (layers) {
      const hidden = [...document.querySelectorAll('[data-layer]')].filter(el => !el.checked).map(el => el.dataset.layer);
      const tile = compose(active, frame, hidden);
      actor(ctx, tile, spec); dc.drawImage(tile, 0, 0, detail.width, detail.height);
      $('status').textContent = clip ? '96 px · ' + clip.frames + ' frames reais · ' + clip.fps + ' FPS · frame ' + (frame + 1) + ' · animação em avaliação'
        : '96 px · pose estática · corpo, rosto, cabelo e roupas independentes';
    } else $('status').textContent = 'Este movimento/direção ainda não foi produzido.';
  }
  async function refresh() {
    const token = ++version, next = selection(); active = null;
    $('status').textContent = 'Carregando camadas…';
    protectedFiles = new Set([next.reference, ...Object.values(next.layers || {})]);
    await Promise.all([...protectedFiles].map(image));
    if (token !== version) return;
    frame = 0; epoch = performance.now(); active = next; draw(epoch);
  }
  function showError(error) { $('status').textContent = error.message; console.error(error); }
  for (const id of ['body', 'direction', 'action']) $(id).addEventListener('change', () => refresh().catch(showError));
  $('frame').addEventListener('input', () => { playing = false; frame = Number($('frame').value); $('play').textContent = 'Reproduzir'; draw(performance.now()); });
  $('play').addEventListener('click', () => {
    playing = !playing; const clip = active?.clip;
    epoch = performance.now() - (clip ? frame * 1000 / clip.fps : 0);
    $('play').textContent = playing ? 'Pausar' : 'Reproduzir';
  });
  function tick(now) { draw(now); requestAnimationFrame(tick); }
  await refresh(); requestAnimationFrame(tick);
  window.__review96v3 = { manifest, loaded, selection, render, image, draw, get frame() { return frame; },
    get playing() { return playing; }, get cacheSize() { return composites.size; }, get imageCacheSize() { return loaded.size; } };
})().catch(error => { document.getElementById('status').textContent = error.message; console.error(error); });
