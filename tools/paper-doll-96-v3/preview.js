/* Isolated art review: native frames, bounded caches, no save access. */
(async function () {
  'use strict';
  const $ = id => document.getElementById(id), rig = window.MareRig96, motion = window.MareMotion96;
  if(location.protocol==='file:'){$('status').textContent='Abra esta bancada pelo endereço HTTP da prévia para carregar as camadas e animações.';return;}
  const response = await fetch('manifest.json', {cache:'no-store'});
  if (!response.ok) throw Error('Não foi possível carregar o pacote.');
  const manifest = await response.json();
  const [catalog, appearanceRigs, weaponCatalog] = await Promise.all(['appearance-catalog.json','appearance-rig.json','weapons.json'].map(async file => { const r=await fetch(file, {cache:'no-store'}); if(!r.ok) throw Error('Catálogo de aparência indisponível.'); return r.json(); }));
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
      img.src = url + (url.includes('?') ? '&' : '?') + 'revision=' + encodeURIComponent((manifest.visualRevision || 'base')+'-'+weaponCatalog.revision);
    });
    inflight.set(url, promise); return promise;
  }
  const map = await new Promise((resolve, reject) => {
    const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = '../../assets/lobby-map.png';
  });
  const wardrobe = MareWardrobe96.create(catalog, appearanceRigs, image, {weapons:weaponCatalog});
  const controlNames={hair:'Cabelo',face:'Rosto',skin:'Pele',hairColor:'Cor do cabelo',torso:'Torso',weapon:'Arma',pants:'Calças',boots:'Calçados',gloves:'Luvas',cloak:'Capa',head:'Cabeça'};
  for(const [slot,label] of Object.entries(controlNames)){
    const wrapper=document.createElement('label');wrapper.textContent=label+' ';const select=document.createElement('select');select.id='look-'+slot;select.dataset.look=slot;
    const initial=new Option(['hair','face'].includes(slot)?'Original':slot==='skin'?'Original':slot==='hairColor'?'Castanho':'Sem equipamento',slot==='hairColor'?'brown':'original');select.add(initial);
    if(['hair','face'].includes(slot))select.add(new Option('Sem '+label.toLowerCase(),'none'));
    const list=slot==='weapon'?weaponCatalog.items:slot==='skin'?Object.entries(MareAppearance96.skins).map(([id,p])=>({id,name:p.name})):slot==='hairColor'?Object.entries(MareAppearance96.hairs).filter(([id])=>id!=='brown').map(([id,p])=>({id,name:p.name})):catalog.styles.filter(p=>p.kind===slot);
    for(const item of list)select.add(new Option(item.name,item.id));wrapper.append(select);$('appearance-controls').append(wrapper);
  }
  const lookValues=()=>{
    const look=Object.fromEntries([...document.querySelectorAll('[data-look]')].map(el=>[el.dataset.look,el.value]));
    if($('inspect-grip').checked&&look.weapon!=='original'){look.gloves='original';look.inspectionBareHands=true;}
    return look;
  };
  let playing = true, epoch = performance.now(), frame = 0;
  function selection(bodyName = $('body').value, action = $('action').value, direction = $('direction').value) {
    const body = manifest.bodies[bodyName], clip = body.clips[action]?.[direction];
    return { body:bodyName,action,direction,look:{},key: [bodyName, action, direction].join(':'), reference: body.references[direction],
      clip: clip?.modular ? clip : null,
      layers: action === 'static' ? body.layers?.[direction] : clip?.modular ? clip.layers : null };
  }
  function displaySelection(body,action,direction){
    const flipX=direction==='west'&&catalog.canonicalMirror?.allLayers===true;
    const value=selection(body,action,flipX?'east':direction);
    value.flipX=flipX;value.requestedDirection=direction;value.key=[body,action,direction].join(':');
    value.reference=manifest.bodies[body].references[direction];return value;
  }
  function compose(selected, fi, hidden = []) {
    const spec = motion.clipSpec(manifest, selected.clip);
    const key = [selected.key, JSON.stringify(selected.look), fi, ...hidden].join(':');
    if (composites.has(key)) return composites.get(key);
    const tile = document.createElement('canvas'); const pad=wardrobe.weaponPadding(selected,spec,selected.look);tile.width = spec.width+pad.x*2; tile.height = spec.height+pad.top+pad.bottom;tile.mareSpec={...spec,width:tile.width,height:tile.height,pivot:{x:spec.pivot.x+pad.x,y:spec.pivot.y+pad.top}};const tc=tile.getContext('2d');tc.translate(pad.x,pad.top);
    if(Object.keys(selected.look).length)wardrobe.draw(tc,selected.images||loaded,selected,fi,spec,hidden,selected.look);
    else MareLayers96.draw(tc, selected.images||loaded, selected.layers, fi, spec, hidden);
    tc.setTransform(1,0,0,1,0,0);if(selected.flipX){const copy=document.createElement('canvas');copy.width=tile.width;copy.height=tile.height;copy.getContext('2d').drawImage(tile,0,0);const cx=tile.getContext('2d');cx.clearRect(0,0,tile.width,tile.height);cx.save();cx.imageSmoothingEnabled=false;cx.setTransform(-1,0,0,1,tile.width+1,0);cx.drawImage(copy,0,0);cx.restore();}
    composites.set(key, tile);
    if (composites.size > 64) composites.delete(composites.keys().next().value);
    return tile;
  }
  async function render(body, action, direction, fi = 0, hidden = [], look = {}) {
    const selected = displaySelection(body, action, direction);selected.look=look;
    if (!selected.layers) throw Error('Movimento ainda não disponível.');
    const baseImages=await Promise.all(Object.values(selected.layers).map(async file=>[file,await image(file)]));
    const appearanceImages=await wardrobe.prepare(selected,look);selected.images=new Map([...baseImages,...appearanceImages]);
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
      const shown=tile.mareSpec||spec;if(detail.width!==shown.width*2||detail.height!==shown.height*2){detail.width=shown.width*2;detail.height=shown.height*2;dc.imageSmoothingEnabled=false;}actor(ctx, tile, shown); dc.drawImage(tile, 0, 0, detail.width, detail.height);
      $('status').textContent = clip ? '96 px · ' + clip.frames + ' frames reais · ' + clip.fps + ' FPS · frame ' + (frame + 1) + ' · animação em avaliação'
        : '96 px · pose estática · corpo, rosto, cabelo e roupas independentes';
    } else $('status').textContent = 'Este movimento/direção ainda não foi produzido.';
  }
  async function refresh() {
    const token = ++version, next = displaySelection($('body').value,$('action').value,$('direction').value); next.look=lookValues(); active = null;
    for(const option of $('action').options){option.dataset.baseLabel ||= option.textContent;const available=option.value==='static'||!!manifest.bodies[next.body].clips[option.value]?.[next.direction];option.disabled=!available;option.textContent=option.dataset.baseLabel+(available?'':' · pendente');}
    $('status').textContent = 'Carregando camadas…';
    protectedFiles = new Set([next.reference,...Object.values(next.layers||{}),...wardrobe.requiredFiles(next,next.look)]);
    next.images=new Map(await Promise.all([...protectedFiles].map(async file=>[file,await image(file)])));
    if (token !== version) return;
    frame = 0; epoch = performance.now(); active = next; draw(epoch);
  }
  function showError(error) { $('status').textContent = error.message; console.error(error); }
  for(const el of document.querySelectorAll('[data-look]'))el.addEventListener('change',()=>refresh().catch(showError));
  $('inspect-grip').addEventListener('change',()=>refresh().catch(showError));
  for (const id of ['body', 'direction', 'action']) $(id).addEventListener('change', () => refresh().catch(showError));
  $('frame').addEventListener('input', () => { playing = false; frame = Number($('frame').value); $('play').textContent = 'Reproduzir'; draw(performance.now()); });
  $('play').addEventListener('click', () => {
    playing = !playing; const clip = active?.clip;
    epoch = performance.now() - (clip ? frame * 1000 / clip.fps : 0);
    $('play').textContent = playing ? 'Pausar' : 'Reproduzir';
  });
  function tick(now) { try{draw(now);}catch(error){active=null;showError(error);}requestAnimationFrame(tick); }
  await refresh(); requestAnimationFrame(tick);
  window.__review96v3 = { manifest, catalog, appearanceRigs, weaponCatalog, wardrobe, loaded, selection, render, image, draw, get frame() { return frame; },
    get playing() { return playing; }, get cacheSize() { return composites.size; }, get imageCacheSize() { return loaded.size; } };
})().catch(error => { document.getElementById('status').textContent = error.message; console.error(error); });
