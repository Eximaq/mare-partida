/* Isolated art review: no game state or storage access. */
(async function () {
  'use strict';
  const $ = id => document.getElementById(id), rig = window.MareRig96;
  const response = await fetch('manifest.json');
  if (!response.ok) throw Error('Não foi possível carregar o pacote.');
  const manifest = await response.json();
  window.MareLayers96.validate(manifest);
  if (manifest.productionEnabled !== false || manifest.referenceHeight !== 96) throw Error('Contrato de revisão inválido.');
  const images = new Map();
  async function image(url) {
    if (images.has(url)) return images.get(url);
    const promise = new Promise((resolve, reject) => {
      const img = new Image(); img.onload = () => resolve(img); img.onerror = () => reject(Error('Imagem ausente: ' + url)); img.src = url;
    });
    images.set(url, promise); return promise;
  }
  const urls = new Set(['../../assets/lobby-map.png']);
  for (const body of Object.values(manifest.bodies)) {
    Object.values(body.references).forEach(url => urls.add(url));
    for (const layers of Object.values(body.layers || {})) Object.values(layers).forEach(url => urls.add(url));
    for (const action of Object.values(body.clips)) for (const clip of Object.values(action)) {
      if (clip.modular) Object.values(clip.layers).forEach(url => urls.add(url));
    }
  }
  const loaded = new Map(await Promise.all([...urls].map(async url => [url, await image(url)])));
  const map = loaded.get('../../assets/lobby-map.png');
  const composites = new Map();
  let playing = true, epoch = performance.now(), frame = 0;
  function selection() {
    const body = manifest.bodies[$('body').value], direction = $('direction').value;
    const clip = body.clips[$('action').value]?.[direction];
    return { reference: body.references[direction],
      clip: clip?.modular ? clip : null,
      layers: $('action').value === 'static' ? body.layers?.[direction] : clip?.modular ? clip.layers : null };
  }
  function actor(ctx, img, sourceX, sourceY, x, feet) {
    const scale = rig.displayScale(manifest);
    ctx.drawImage(img, sourceX, sourceY, manifest.frame.width, manifest.frame.height,
      x - manifest.pivot.x * scale, feet - manifest.pivot.y * scale,
      manifest.frame.width * scale, manifest.frame.height * scale);
  }
  function background(canvas) {
    const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(map, 1250, 1120, 600, 400, 0, 0, 600, 400);
    ctx.fillStyle = '#0004'; ctx.beginPath(); ctx.ellipse(300, 260, 15, 4, 0, 0, Math.PI * 2); ctx.fill();
    return ctx;
  }
  function draw(now) {
    const { reference, clip, layers } = selection();
    if (!clip) frame = 0;
    if (clip && playing) frame = rig.frameAt(clip, now - epoch);
    if (clip) frame = Math.min(frame, clip.frames - 1);
    $('frame').max = clip ? clip.frames - 1 : 0; $('frame').value = frame;
    actor(background($('reference')), loaded.get(reference), 0, 0, 300, 260);
    const ctx = background($('animated'));
    const detail = $('detail').getContext('2d'); detail.imageSmoothingEnabled = false; detail.clearRect(0, 0, 256, 256);
    if (layers) {
      const hidden = [...document.querySelectorAll('[data-layer]')].filter(el => !el.checked).map(el => el.dataset.layer);
      const key = [$('body').value, $('direction').value, $('action').value, frame, ...hidden].join(':');
      let tile = composites.get(key);
      if (!tile) {
        tile = document.createElement('canvas'); tile.width = manifest.frame.width; tile.height = manifest.frame.height;
        window.MareLayers96.draw(tile.getContext('2d'), loaded, layers, frame, manifest.frame, hidden);
        composites.set(key, tile);
        if (composites.size > 64) composites.delete(composites.keys().next().value);
      }
      actor(ctx, tile, 0, 0, 300, 260);
      detail.drawImage(tile, 0, 0, 256, 256);
      $('status').textContent = clip ? `96 px · ${clip.frames} frames reais · ${clip.fps} FPS · frame ${frame + 1} · animação em avaliação` : '96 px · pose estática · corpo, rosto, cabelo e roupas independentes';
    } else {
      $('status').textContent = 'Este movimento/direção ainda não foi produzido. A referência à esquerda permanece disponível.';
    }
  }
  for (const id of ['body', 'direction', 'action']) $(id).addEventListener('change', () => { frame = 0; epoch = performance.now(); draw(epoch); });
  $('frame').addEventListener('input', () => { playing = false; frame = Number($('frame').value); $('play').textContent = 'Reproduzir'; draw(performance.now()); });
  $('play').addEventListener('click', () => { playing = !playing; const clip = selection().clip; epoch = performance.now() - (clip ? frame * 1000 / clip.fps : 0); $('play').textContent = playing ? 'Pausar' : 'Reproduzir'; });
  function tick(now) { draw(now); requestAnimationFrame(tick); }
  requestAnimationFrame(tick);
  window.__review96v3 = { manifest, loaded, selection, draw, get frame() { return frame; }, get playing() { return playing; }, get cacheSize() { return composites.size; } };
})().catch(error => { document.getElementById('status').textContent = error.message; console.error(error); });
