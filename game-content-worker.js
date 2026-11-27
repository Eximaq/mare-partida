/* Only listed public game resources are served. Session/API traffic stays on the network. */
'use strict';
const scope = self.registration.scope;
const metadata = 'kaizoku-content-index:' + scope;
const storage = 'kaizoku-content-bytes:' + scope;
const releases = new Map();
const catalogs = new Map();
const bindings = new Map();
const metaKey = id => new URL('loading-session/' + id, scope).href;
const byteKey = digest => new URL('loading-data/' + digest, scope).href;

self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

async function cleanup(version, clientId) {
  const windows = await self.clients.matchAll({includeUncontrolled: true, type: 'window'});
  const active = new Set(windows.map(client => client.id));
  const meta = await caches.open(metadata);
  for (const key of await meta.keys()) {
    if (!key.url.startsWith(metaKey(''))) continue;
    const id = key.url.slice(metaKey('').length);
    if (!active.has(id)) { await meta.delete(key); bindings.delete(id); }
  }
  if (windows.some(client => client.id !== clientId)) return;
  const release = await readManifest(version);
  const keep = new Set(release.units.map(unit => byteKey(unit[2])));
  const bytes = await caches.open(storage);
  for (const key of await bytes.keys()) if (!keep.has(key.url)) await bytes.delete(key);
  for (const key of await meta.keys()) {
    if (key.url.startsWith(new URL('game-content-', scope).href) && key.url !== new URL(version, scope).href) {
      await meta.delete(key); releases.delete(key.url);
    }
  }
}
async function readManifest(name) {
  const url = new URL(name, scope).href;
  if (!releases.has(url)) {
    const reading = caches.open(metadata).then(cache => cache.match(url)).then(response => response.json()).then(data => {
      catalogs.set(name, data.files);
      return data;
    });
    releases.set(url, reading);
    reading.catch(() => releases.delete(url));
  }
  return releases.get(url);
}
self.addEventListener('message', event => {
  const name = event.data?.catalog;
  if (!event.source?.id || !/^game-content-[a-f0-9]{24}\.json$/.test(name)) return;
  const id = event.source.id;
  event.waitUntil((async () => {
    try {
      if (event.data.type === 'bind') {
        await readManifest(name);
        bindings.set(id, name);
        // The live binding remains usable when the full installation fills the
        // disk. Persisting it is an optimization, not a prerequisite for entry.
        await (await caches.open(metadata)).put(metaKey(id), new Response(name)).catch(() => {});
      } else if (event.data.type === 'installed') {
        await cleanup(name, id);
      } else return;
      event.ports[0]?.postMessage(true);
    } catch { event.ports[0]?.postMessage(false); }
  })());
});
async function serve(request, clientId, path) {
  let name = bindings.get(clientId);
  if (!name) {
    const saved = await (await caches.open(metadata)).match(metaKey(clientId));
    if (!saved) return fetch(request);
    name = await saved.text();
    bindings.set(clientId, name);
  }
  const manifest = await readManifest(name);
  const record = manifest.files[path];
  if (!Array.isArray(record)) return fetch(request);
  const [unit, offset, size, type] = record;
  const hash = manifest.units[unit][2];
  let stored = await (await caches.open(storage)).match(byteKey(hash));
  if (!stored) {
    const client = await self.clients.get(clientId);
    if (!client) return fetch(request);
    const channel = new MessageChannel();
    const blob = await new Promise(resolve => {
      const timer = setTimeout(() => { channel.port1.close(); resolve(null); }, 1200);
      channel.port1.onmessage = event => { clearTimeout(timer); channel.port1.close(); resolve(event.data); };
      client.postMessage({type:'read-unit', hash}, [channel.port2]);
    });
    if (!blob) return fetch(request);
    stored = new Response(blob);
  }
  const headers = {'Content-Type': type, 'Content-Length': String(size), 'Accept-Ranges': 'bytes'};
  const range = request.headers.get('Range');
  if (!range && offset === 0 && size === manifest.units[unit][1]) return new Response(stored.body, {headers});
  const blob = await stored.blob();
  if (!range) return new Response(blob.slice(offset, offset + size), {headers});
  const m = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!m || (!m[1] && !m[2])) return fetch(request);
  const first = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2]));
  const last = m[1] && m[2] ? Math.min(size - 1, Number(m[2])) : size - 1;
  if (first > last || first >= size) return new Response(null, {status: 416, headers: {'Content-Range': 'bytes */' + size}});
  headers['Content-Length'] = String(last - first + 1);
  headers['Content-Range'] = 'bytes ' + first + '-' + last + '/' + size;
  return new Response(blob.slice(offset + first, offset + last + 1), {status: 206, headers});
}
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.searchParams.has('install')) return;
  // Renderer fixtures use Playwright routes for navigation and all non-fixture artwork.
  if (new URL(self.location.href).searchParams.has('renderer') && !url.href.startsWith(new URL('assets/ui/loading/', scope).href)) return;
  const entry = url.href.split(/[?#]/)[0];
  if (event.request.mode === 'navigate' && event.resultingClientId &&
      [scope, new URL('game', scope).href, new URL('index.html', scope).href, new URL('ui-preview.html', scope).href].includes(entry)) {
    event.respondWith((async () => {
      const page = await fetch(event.request);
      if (!page.ok || !page.headers.get('Content-Type')?.includes('text/html')) return page;
      const name = (await page.clone().text()).match(/<html\b[^>]*\bdata-game-content="(game-content-[a-f0-9]{24}\.json)"/)?.[1];
      if (name) {
        try {
          const meta = await caches.open(metadata);
          if (await meta.match(new URL(name, scope))) {
            bindings.set(event.resultingClientId, name);
            await meta.put(metaKey(event.resultingClientId), new Response(name));
          }
        } catch {
          // Return the fetched HTML even if optional cache metadata cannot be
          // saved. Rejecting respondWith here turns a healthy page into ERR_FAILED.
        }
      }
      return page;
    })());
    return;
  }
  if (!event.clientId || event.request.method !== 'GET' || !event.request.url.startsWith(scope)) return;
  const path = decodeURI(new URL(event.request.url).pathname.slice(new URL(scope).pathname.length));
  if (!/^(?:assets\/|tools\/|icones_menu_pirata\/|pixellab-pip-generations\/|journal-feed\.json$)/.test(path)) return;
  const files = catalogs.get(bindings.get(event.clientId));
  if (files && !Object.hasOwn(files, path)) return;
  event.respondWith(serve(event.request, event.clientId, path));
});
