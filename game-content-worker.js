/* Public game resources are versioned per tab. Session/API traffic stays on the network. */
'use strict';
const scope = self.registration.scope;
const scopePath = new URL(scope).pathname;
const metadata = 'kaizoku-content-index:' + scope;
const storage = 'kaizoku-content-bytes:' + scope;
const releases = new Map();
const bindings = new Map();
const outstanding = new Map();
const transient = new Map();
const activeVersion = /^game-content-[a-f0-9]{24}\.json$/;
const maxTransient = 32 * 1024 * 1024;
const maxTransfers = 3;
const queued = [];
let transientSize = 0;
let running = 0;
const metaKey = id => new URL('loading-session/' + id, scope).href;
const byteKey = digest => new URL('loading-data/' + digest, scope).href;

self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

async function digestOf(buffer) {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', buffer));
  return Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('');
}
async function readManifest(name) {
  if (!releases.has(name)) {
    const reading = (async () => {
      const url = new URL(name, scope).href;
      const meta = await caches.open(metadata).catch(() => null);
      const saved = await meta?.match(url);
      if (saved) return saved.json();
      const response = await fetch(url, {cache: 'no-cache', signal: AbortSignal.timeout(15000)});
      if (!response.ok) throw Error('content_index_unavailable');
      const buffer = await response.arrayBuffer();
      if (name !== 'game-content-' + (await digestOf(buffer)).slice(0, 24) + '.json') throw Error('content_index_mismatch');
      const data = JSON.parse(new TextDecoder().decode(buffer));
      await meta?.put(url, new Response(buffer, {headers: {'Content-Type': 'application/json'}})).catch(() => {});
      return data;
    })();
    releases.set(name, reading);
    reading.catch(() => releases.delete(name));
  }
  return releases.get(name);
}
async function remember(id, binding) {
  bindings.set(id, binding);
  const headers = binding.onDemand ? {'X-Kaizoku-Cache': 'on-demand'} : {};
  await caches.open(metadata).then(cache => cache.put(metaKey(id), new Response(binding.name, {headers}))).catch(() => {});
}
async function restore(id) {
  if (bindings.has(id)) return bindings.get(id);
  const saved = await caches.open(metadata).then(cache => cache.match(metaKey(id))).catch(() => null);
  if (!saved) return null;
  const name = await saved.text();
  if (!activeVersion.test(name)) return null;
  const binding = {name, onDemand: saved.headers.get('X-Kaizoku-Cache') === 'on-demand'};
  bindings.set(id, binding);
  return binding;
}
async function cleanup(version, clientId) {
  const windows = await self.clients.matchAll({includeUncontrolled: true, type: 'window'});
  const active = new Set(windows.map(client => client.id));
  const meta = await caches.open(metadata);
  for (const key of await meta.keys()) {
    if (!key.url.startsWith(metaKey(''))) continue;
    const id = key.url.slice(metaKey('').length);
    if (!active.has(id)) await meta.delete(key);
  }
  for (const id of bindings.keys()) if (!active.has(id)) bindings.delete(id);
  // Preserve the previous release while another tab may be using it.
  if (windows.some(client => client.id !== clientId)) return;
  const release = await readManifest(version);
  const keep = new Set(release.units.map(unit => byteKey(unit[2])));
  const bytes = await caches.open(storage);
  for (const key of await bytes.keys()) if (!keep.has(key.url)) await bytes.delete(key);
  for (const key of await meta.keys()) {
    const name = key.url.slice(scope.length);
    if (activeVersion.test(name) && name !== version) {
      await meta.delete(key);
      releases.delete(name);
    }
  }
}
self.addEventListener('message', event => {
  const name = event.data?.catalog;
  const id = event.source?.id;
  if (!id || !activeVersion.test(name)) return;
  event.waitUntil((async () => {
    try {
      if (event.data.type === 'bind') {
        const onDemand = event.data.onDemand === true;
        await remember(id, {name, onDemand});
        await readManifest(name);
        event.ports[0]?.postMessage(true);
        if (onDemand) await cleanup(name, id).catch(() => {});
      } else if (event.data.type === 'installed') {
        // An open tab can still be using the previous installer during an update.
        await cleanup(name, id);
        event.ports[0]?.postMessage(true);
      }
    } catch { event.ports[0]?.postMessage(false); }
  })());
});

function touchTransient(hash) {
  const blob = transient.get(hash);
  if (blob) { transient.delete(hash); transient.set(hash, blob); }
  return blob;
}
function keepTransient(hash, blob) {
  if (blob.size > maxTransient) return;
  while (transientSize + blob.size > maxTransient && transient.size) {
    const first = transient.keys().next().value;
    transientSize -= transient.get(first).size;
    transient.delete(first);
  }
  transient.set(hash, blob);
  transientSize += blob.size;
}
async function storedUnit(cache, hash) {
  const blob = touchTransient(hash);
  if (blob) return new Response(blob);
  return cache?.match(byteKey(hash)).catch(() => undefined);
}
async function download(path, hash, cache = 'no-cache') {
  const source = new URL(path, scope);
  source.searchParams.set('install', hash.slice(0, 16));
  const response = await fetch(source, {cache, signal: AbortSignal.timeout(45000)});
  if (!response.ok) throw Error('content_unit_unavailable');
  return response.arrayBuffer();
}
async function restorePatch(manifest, [_, size, hash], cache) {
  const patch = manifest.patches?.[hash];
  if (!patch) return null;
  const [path, literalSize, spans] = patch;
  const providers = new Map();
  for (const [, index] of spans) {
    const key = manifest.units[index][2];
    if (key !== hash && !providers.has(key)) {
      const source = await storedUnit(cache, key);
      if (!source) return null;
      providers.set(key, source);
    }
  }
  // Use deltas only when their source bytes are local. A request never installs an unrelated archive.
  const literal = new Uint8Array(await download(path, hash));
  if (literal.length !== literalSize) return null;
  const output = new Uint8Array(size);
  let cursor = 0, consumed = 0;
  for (const [offset, index, start, count] of spans) {
    const gap = offset - cursor;
    output.set(literal.subarray(consumed, consumed + gap), cursor);
    consumed += gap;
    const key = manifest.units[index][2];
    if (key === hash) {
      output.copyWithin(offset, start, start + count);
    } else {
      const source = providers.get(key);
      const blob = source instanceof Blob ? source : await source.blob();
      providers.set(key, blob);
      output.set(new Uint8Array(await blob.slice(start, start + count).arrayBuffer()), offset);
    }
    cursor = offset + count;
  }
  output.set(literal.subarray(consumed), cursor);
  return output.buffer;
}
function transfer(action) {
  return new Promise((resolve, reject) => {
    function run() {
      running++;
      action().then(resolve, reject).finally(() => {
        running--;
        queued.shift()?.();
      });
    }
    if (running < maxTransfers) run();
    else queued.push(run);
  });
}
function requestUnit(manifest, unit, cache) {
  const [path, size, hash] = unit;
  if (outstanding.has(hash)) return outstanding.get(hash);
  const pending = transfer(async () => {
    const verify = async buffer => buffer?.byteLength === size && await digestOf(buffer) === hash;
    let buffer = await restorePatch(manifest, unit, cache).catch(() => null);
    if (!await verify(buffer)) {
      buffer = await download(path, hash).catch(() => null);
      if (!await verify(buffer)) {
        buffer = await download(path, hash, 'reload');
        if (!await verify(buffer)) throw Error('content_unit_mismatch');
      }
    }
    const blob = new Blob([buffer]);
    try {
      if (!cache) throw Error('content_cache_unavailable');
      await cache.put(byteKey(hash), new Response(blob));
    } catch {
      // Private browsing and storage quotas can make CacheStorage unavailable.
      keepTransient(hash, blob);
    }
    return blob;
  });
  outstanding.set(hash, pending);
  pending.finally(() => outstanding.delete(hash)).catch(() => {});
  return pending;
}
async function legacyUnit(clientId, hash) {
  const client = await self.clients.get(clientId);
  if (!client) return null;
  const channel = new MessageChannel();
  const blob = await new Promise(resolve => {
    const timer = setTimeout(() => { channel.port1.close(); resolve(null); }, 1200);
    channel.port1.onmessage = event => { clearTimeout(timer); channel.port1.close(); resolve(event.data); };
    client.postMessage({type: 'read-unit', hash}, [channel.port2]);
  });
  return blob instanceof Blob ? new Response(blob) : null;
}
async function serve(request, clientId, path) {
  const binding = await restore(clientId);
  if (!binding) return fetch(request);
  try {
    const manifest = await readManifest(binding.name);
    if (!Object.hasOwn(manifest.files, path)) return fetch(request);
    const [index, offset, size, type] = manifest.files[path];
    const unit = manifest.units[index];
    const cache = await caches.open(storage).catch(() => null);
    let stored = await storedUnit(cache, unit[2]);
    if (!stored && !binding.onDemand) stored = await legacyUnit(clientId, unit[2]);
    if (!stored) stored = new Response(await requestUnit(manifest, unit, cache));

    const headers = {'Content-Type': type, 'Content-Length': String(size), 'Accept-Ranges': 'bytes'};
    const range = request.headers.get('Range');
    if (!range && offset === 0 && size === unit[1]) return new Response(stored.body, {headers});
    const blob = await stored.blob();
    if (!range) return new Response(blob.slice(offset, offset + size), {headers});
    const m = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (m && (m[1] || m[2])) {
      const first = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2]));
      const last = m[1] && m[2] ? Math.min(size - 1, Number(m[2])) : size - 1;
      if (first <= last && first < size) {
        headers['Content-Length'] = String(last - first + 1);
        headers['Content-Range'] = 'bytes ' + first + '-' + last + '/' + size;
        return new Response(blob.slice(offset + first, offset + last + 1), {status: 206, headers});
      }
    }
    return new Response(null, {status: 416, headers: {'Content-Range': 'bytes */' + size}});
  } catch {
    // A filename can have changed on the next deployment. A bound tab must never draw unverified bytes.
    return new Response(null, {status: 503, headers: {'Cache-Control': 'no-store'}});
  }
}
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.searchParams.has('install')) return;
  // Renderer fixtures must be able to intercept artwork outside the small manifest.
  if (new URL(self.location.href).searchParams.has('renderer') && !url.href.startsWith(new URL('assets/ui/loading/', scope).href)) return;
  const entry = url.href.split(/[?#]/)[0];
  if (event.request.mode === 'navigate' && event.resultingClientId &&
      [scope, new URL('game', scope).href, new URL('index.html', scope).href, new URL('ui-preview.html', scope).href].includes(entry)) {
    event.respondWith((async () => {
      const page = await fetch(event.request);
      if (page.ok && page.headers.get('Content-Type')?.includes('text/html')) {
        const name = (await page.clone().text()).match(/<html\b[^>]*\bdata-game-content="(game-content-[a-f0-9]{24}\.json)"/)?.[1];
        if (name) await remember(event.resultingClientId, {name, onDemand: true});
      }
      return page;
    })());
    return;
  }
  if (!event.clientId || event.request.method !== 'GET' || !url.href.startsWith(scope)) return;
  const path = decodeURI(url.pathname.slice(scopePath.length));
  if (!/^(?:assets\/|tools\/|icones_menu_pirata\/|pixellab-pip-generations\/|journal-feed\.json$)/.test(path)) return;
  event.respondWith(serve(event.request, event.clientId, path));
});
