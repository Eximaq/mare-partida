/*
 * Geometric fit regression, separate from the general appearance smoke test.
 * Native pixels only. A successful run is not artistic approval.
 * Optional evidence: --evidence=<absolute directory outside the repository>.
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { chromium } = require('playwright');

const origin = process.argv.find(value => /^https?:\/\//.test(value)) || 'http://127.0.0.1:8154/';
const evidenceArgument = process.argv.find(value => value.startsWith('--evidence='));
const evidenceDirectory = evidenceArgument ? path.resolve(evidenceArgument.slice(11)) : null;
const createBoards = process.argv.includes('--boards');
const geometryOnly = process.argv.includes('--geometry-only');
const repository = path.resolve(__dirname, '..');
if (evidenceDirectory) {
  const relative = path.relative(repository, evidenceDirectory);
  assert.ok(relative && (relative.startsWith('..' + path.sep) || path.isAbsolute(relative)),
    'Evidence must be outside the repository');
}
assert.ok(!createBoards || evidenceDirectory, '--boards requires --evidence outside the repository');

async function run() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
  });
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    page.on('pageerror', error => errors.push(error.message));
    if (evidenceDirectory) {
      await fs.mkdir(evidenceDirectory, { recursive: true });
      await page.exposeBinding('saveFitBoard', async (_source, name, encoded) => {
        assert.match(name, /^[a-z0-9-]+\.png$/);
        await fs.writeFile(path.join(evidenceDirectory, name), Buffer.from(encoded, 'base64'));
      });
    }
    await page.goto(new URL('tools/paper-doll-96-v3/?revision=visual-fit-contract', origin).href);
    await page.waitForFunction(() => window.__review96v3);
    const report = await page.evaluate(async ({ createBoards, geometryOnly }) => {
      const q = window.__review96v3, api = window.MareAppearance96;
      if (typeof api.fitPairToBody !== 'function') throw Error('Surface-based pair fitting is required by the fit contract');
      const violations = [], diagnostics = [], native = new Map();
      const counts = { matrices: 0, pairedMatrices: 0, poses: 0, pairSides: 0, trousers: 0, faces: 0, hair: 0, mixed: 0, faceOrder: 0, boards: 0 };
      const metrics = { maximumContactGap: 0, maximumVisibleAnatomyGap:0, occludedHandContacts:0, uncoveredFootCore: 0, offSurfacePixels: 0, distantFragments: 0, semiTransparentPixels: 0, faceOutsideHead: 0, hairWithoutHeadContact: 0, faceOverOpaqueHair: 0, compositeSemiTransparent: 0, raisedGloveVisibilityFailures: 0 };
      const issue = (reason, context, details) => violations.push({ reason, ...context, ...details });
      const pixels = async (file, width = 128, height = 128, frame = 0) => {
        const key = [file, width, height, frame].join(':');
        if (native.has(key)) return native.get(key);
        const image = await q.image(file), c = document.createElement('canvas');
        c.width = width; c.height = height;
        c.getContext('2d').drawImage(image, frame * width, 0, width, height, 0, 0, width, height);
        const value = c.getContext('2d').getImageData(0, 0, width, height).data;
        native.set(key, value); return value;
      };
      const components = (data, width, height) => {
        const seen = new Uint8Array(width * height), groups = [];
        for (let p = 0; p < seen.length; p++) {
          if (seen[p] || !data[p * 4 + 3]) continue;
          const group = [p]; seen[p] = 1;
          for (let n = 0; n < group.length; n++) {
            const a = group[n], x = a % width, y = Math.floor(a / width);
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
              const xx = x + dx, yy = y + dy, k = yy * width + xx;
              if (xx < 0 || yy < 0 || xx >= width || yy >= height || seen[k] || !data[k * 4 + 3]) continue;
              seen[k] = 1; group.push(k);
            }
          }
          groups.push(group);
        }
        return groups.sort((a, b) => b.length - a.length);
      };
      const bodyDistance = (data, width, height) => {
        const distance = new Uint16Array(width * height); distance.fill(65535);
        const queue = [];
        for (let p = 0; p < distance.length; p++) if (data[p * 4 + 3]) { distance[p] = 0; queue.push(p); }
        for (let n = 0; n < queue.length; n++) {
          const a = queue[n], x = a % width, y = Math.floor(a / width);
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx, yy = y + dy, k = yy * width + xx;
            if (xx < 0 || yy < 0 || xx >= width || yy >= height || distance[k] <= distance[a] + 1) continue;
            distance[k] = distance[a] + 1; queue.push(k);
          }
        }
        return distance;
      };
      const joint = (pose, label, padding) => {
        const p = pose.find(value => value.label === label);
        if (!p) throw Error('Missing joint ' + label);
        return { x: p.x * 128 + padding, y: p.y * 128 + padding };
      };
      const outsideEdge = (data, width, height) => {
        let found = 0;
        for (let p = 0; p < width * height; p++) {
          const x = p % width, y = Math.floor(p / width);
          if ((x === 0 || y === 0 || x === width - 1 || y === height - 1) && data[p * 4 + 3]) found++;
        }
        return found;
      };
      const distantComponents = (data, width, height) => {
        const groups = components(data, width, height);
        if (groups.length < 2) return 0;
        const mask = new Uint8ClampedArray(data.length);
        for (const p of groups[0]) mask[p * 4 + 3] = 255;
        const distances = bodyDistance(mask, width, height);
        return groups.slice(1).filter(group => group.every(p => distances[p] > 2)).reduce((total, group) => total + group.length, 0);
      };

      // Check native inputs independently of the composited body. Colour alone
      // cannot distinguish bronze trim from skin and is diagnostic, not a gate.
      for (const style of q.catalog.styles) for (const body of Object.keys(q.manifest.bodies)) for (const direction of q.manifest.directions) {
        const context = { id: style.id, kind: style.kind, body, direction };
        const data = await pixels(style.layers[body][direction]);
        let partial = 0;
        for (let i = 3; i < data.length; i += 4) if (data[i] > 0 && data[i] < 255) partial++;
        if (partial) issue('non-binary-native-alpha', context, { pixels: partial });
        metrics.semiTransparentPixels += partial;
        if (outsideEdge(data, 128, 128)) issue('native-material-touches-cell-edge', context, {});
        if (style.kind === 'face') {
          const head = await pixels(q.catalog.originalHeads[body][direction]);
          let outside = 0;
          for (let i = 3; i < data.length; i += 4) if (data[i] && !head[i]) outside++;
          if (outside) issue('native-face-outside-head', context, { pixels: outside });
        }
        diagnostics.push({ ...context, components: components(data, 128, 128).map(group => group.length) });
        if (['boots', 'gloves'].includes(style.kind)) {
          const parts = style.parts?.[body]?.[direction];
          if (!parts?.LEFT || !parts?.RIGHT) issue('missing-independent-left-right-materials', context, {});
          for (const side of ['LEFT', 'RIGHT']) if (parts?.[side]) {
            const part = await pixels(parts[side]);
            const groups = components(part, 128, 128);
            if (groups.length !== 1) issue('disconnected-native-pair-matrix', { ...context, side }, { components: groups.map(group => group.length) });
            let semi = 0;
            for (let i = 3; i < part.length; i += 4) if (part[i] > 0 && part[i] < 255) semi++;
            if (semi) issue('non-binary-native-pair-alpha', { ...context, side }, { pixels: semi });
            counts.pairedMatrices++;
          }
        }
        counts.matrices++;
      }

      const slots = ['pants', 'boots', 'gloves', 'cloak', 'head'];
      const slotIds = Object.fromEntries(slots.map(slot => [slot, q.catalog.styles.filter(style => style.kind === slot).map(style => style.id)]));
      for (const [body, bodyManifest] of Object.entries(q.manifest.bodies)) {
        const poses = q.manifest.directions.map(direction => ({ action: 'static', direction, frames: 1, layers: bodyManifest.layers[direction], clip: null }));
        for (const [action, directions] of Object.entries(bodyManifest.clips)) if (action !== 'attack-tech') {
          for (const [direction, clip] of Object.entries(directions)) poses.push({ action, direction, frames: clip.frames, layers: clip.layers, clip });
        }
        for (const clip of poses) for (let frame = 0; frame < clip.frames; frame++) {
          const context = { body, action: clip.action, direction: clip.direction, frame };
          const spec = window.MareMotion96.clipSpec(q.manifest, clip.clip);
          const { width, height } = spec, padding = (width - 128) / 2;
          const rig = q.appearanceRigs.clips[body]?.[clip.action]?.[clip.direction];
          const rest = rig?.rest || q.appearanceRigs.rests[body][clip.direction];
          const pose = rig?.poses[frame] || rest, socket = rig?.sockets[frame] || { x: 0, y: 0, angle: 0 };
          const bodyPixels = new Uint8ClampedArray(await pixels(clip.layers.body, width, height, frame)),handSurface=new Uint8ClampedArray(bodyPixels.length);
          for(const slot of ['underArms','foreground'])if(clip.layers[slot]){const layer=await pixels(clip.layers[slot],width,height,frame);for(let i=0;i<layer.length;i+=4)if(layer[i+3]){bodyPixels.set(layer.subarray(i,i+4),i);handSurface.set(layer.subarray(i,i+4),i);}}
          const restBody = await pixels(q.catalog.fitBases?.[body]?.[clip.direction] || bodyManifest.layers[clip.direction].body);
          const distance = bodyDistance(bodyPixels, width, height);
          const cleanHead = await pixels(q.catalog.originalHeads[body][clip.direction]);
          const head = api.attach(cleanHead, 'head', rest, pose, socket, padding, width, height).full;
          for (const style of q.catalog.styles) {
            const data = await pixels(style.layers[body][clip.direction]);
            const sourceParts = style.parts?.[body]?.[clip.direction]
              ? Object.fromEntries(await Promise.all(Object.entries(style.parts[body][clip.direction]).map(async ([key, file]) => [key, await pixels(file)])))
              : null;
            if (style.kind === 'boots' || style.kind === 'gloves') {
              const fitOptions={coverHand:style.fingerCoverage==='full',handSurface,material:style.nativeMaterial};
              const fitted = api.fitPairToBody(data, style.kind, rest, pose, padding, width, height, bodyPixels, restBody, sourceParts,fitOptions);
              const rawFitted=api.fitPairToBody(data,style.kind,rest,pose,padding,width,height,bodyPixels,restBody,sourceParts,{...fitOptions,occlusion:false});
              const restDistance=bodyDistance(restBody,128,128);
              const nativeVolume=Object.fromEntries(['LEFT','RIGHT'].map(side=>{let max=0;const material=sourceParts[side];for(let p=0;p<128*128;p++)if(material[p*4+3])max=Math.max(max,restDistance[p]);return [side,max];}));
              for (const side of ['LEFT', 'RIGHT']) {
                const layer = rawFitted[side], endpoint = style.kind === 'boots' ? ' LEG' : ' ARM';
                const contact = joint(pose, side + endpoint, padding);
                let nearest = Infinity, offSurface = 0, count = 0;
                for (let p = 0; p < width * height; p++) if (layer[p * 4 + 3]) {
                  const x = p % width, y = Math.floor(p / width);
                  nearest = Math.min(nearest, Math.hypot(x - contact.x, y - contact.y));
                  if (distance[p] > nativeVolume[side]+1) offSurface++;
                  count++;
                }
                let nativeContact=0;
                if(style.kind==='gloves'&&style.nativeMaterial){
                  nativeContact=Infinity;
                  for(const v of MareSurface96.profile(bodyPixels,pose,'gloves',padding,width,height).pixels){if(v.bone.side!==side)continue;const r=bodyPixels[v.i],g=bodyPixels[v.i+1],b=bodyPixels[v.i+2];if(!(r>80&&r>b*1.3&&g/r>.33&&g/r<.91))continue;
                    const j=Object.fromEntries(pose.map(p=>[p.label,{x:p.x*128,y:p.y*128}])),hip={x:(j['LEFT HIP'].x+j['RIGHT HIP'].x)/2,y:(j['LEFT HIP'].y+j['RIGHT HIP'].y)/2};
                    if(!handSurface[v.i+3]&&MareMotion96.distanceToSegment({x:v.x,y:v.y},j.NECK,hip)+1<v.distance)continue;
                    const d=Math.hypot(v.x+padding-contact.x,v.y+padding-contact.y);if(d<=8)nativeContact=Math.min(nativeContact,d);}
                  if(!Number.isFinite(nativeContact))metrics.occludedHandContacts++;
                }
                if(Number.isFinite(nearest))metrics.maximumContactGap = Math.max(metrics.maximumContactGap, nearest);
                if(Number.isFinite(nearest)&&Number.isFinite(nativeContact))metrics.maximumVisibleAnatomyGap=Math.max(metrics.maximumVisibleAnatomyGap,nearest-nativeContact);
                metrics.offSurfacePixels += offSurface;
                // A hidden hand must not be painted through an opaque torso/underwear.
                // Compare to the nearest actually visible native skin, not an
                // estimator contact covered by another part of the body.
                const allowedContact=Math.max(2,nativeContact+.25);
                if (nearest > allowedContact) issue('attachment-contact-gap', { ...context, id: style.id, side }, { distance: nearest, nativeContact, pixels: count });
                if (offSurface) issue('attachment-off-body-surface', { ...context, id: style.id, side }, { pixels: offSurface });
                const fragments = distantComponents(layer, width, height);
                metrics.distantFragments += fragments;
                if (fragments > 0) issue('detached-attachment-fragments', { ...context, id: style.id, side }, { pixels: fragments });
                counts.pairSides++;
              }
              if (style.kind === 'boots') {
                let uncovered = 0;
                for (const side of ['LEFT', 'RIGHT']) {
                  const owned=new Map(MareSurface96.profile(bodyPixels,pose,'boots',padding,width,height).pixels.map(p=>[p.i/4,p.bone.side]));
                  const ankle = joint(pose, side + ' LEG', padding), knee = joint(pose, side + ' KNEE', padding);
                  const length = Math.hypot(ankle.x - knee.x, ankle.y - knee.y);
                  if (length < 1) { issue('invalid-shin-bone', context, { side }); continue; }
                  const ux = (ankle.x - knee.x) / length, uy = (ankle.y - knee.y) / length;
                  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
                    const p = y * width + x, dx = x - ankle.x, dy = y - ankle.y;
                    if (!bodyPixels[p * 4 + 3] || owned.get(p)!==side) continue;
                    const along = dx * ux + dy * uy, across = Math.abs(-dx * uy + dy * ux);
                    // A deliberately small core avoids treating boot volume or
                    // the calf hem as anatomy; bare toes/ankles still fail.
                    if (along < 0 || along > 4 || across > 2) continue;
                    if (!fitted.LEFT[p * 4 + 3] && !fitted.RIGHT[p * 4 + 3]) uncovered++;
                  }
                }
                metrics.uncoveredFootCore += uncovered;
                if (uncovered) issue('uncovered-foot-core', { ...context, id: style.id }, { pixels: uncovered });
              }
            } else if (style.kind === 'pants') {
              const layer = api.fitTrousersToBody(data, bodyPixels, rest, pose, padding, width, height, restBody, sourceParts,{material:style.nativeMaterial});
              let outside = 0;
              for (let p = 0; p < width * height; p++) if (layer[p * 4 + 3] && distance[p] > 1) outside++;
              if (outside) issue('trousers-outside-body-surface', { ...context, id: style.id }, { pixels: outside });
              counts.trousers++;
            } else if (style.kind === 'face') {
              const layer = api.clipToHead(api.attach(data, 'face', rest, pose, socket, padding, width, height).full, head);
              let outside = 0;
              for (let p = 0; p < width * height; p++) if (layer[p * 4 + 3] && !head[p * 4 + 3]) outside++;
              metrics.faceOutsideHead += outside;
              if (outside) issue('animated-face-outside-head', { ...context, id: style.id }, { pixels: outside });
              counts.faces++;
            } else if (style.kind === 'hair') {
              const layer = api.attach(data, 'hair', rest, pose, socket, padding, width, height).full;
              const calibration = q.catalog.headCalibration?.[clip.direction] || {};
              let contact = 0;
              for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
                const xx = x + (calibration.hairX || 0), yy = y + (calibration.hairY || 0);
                if (xx >= 0 && xx < width && yy >= 0 && yy < height && layer[(y * width + x) * 4 + 3] && head[(yy * width + xx) * 4 + 3]) contact++;
              }
              if (contact < 8) { metrics.hairWithoutHeadContact++; issue('hair-detached-from-head', { ...context, id: style.id }, { pixels: contact }); }
              counts.hair++;
            }
          }

          // Every native pose is also composited with both mixed sets. These
          // catches exercise layer order and the actual wardrobe fit path.
          if (!geometryOnly) for (let set = 0; set < 2; set++) {
            const look = { hair: set ? 'hair-braided' : 'hair-wavy', face: set ? 'face-calm' : 'face-resolute', skin: set ? 'ebony' : 'porcelain', hairColor: set ? 'pink' : 'black' };
            for (let s = 0; s < slots.length; s++) look[slots[s]] = slotIds[slots[s]][(set + s) % 2];
            const canvas = await q.render(body, clip.action, clip.direction, frame, [], look);
            const rgba = canvas.getContext('2d').getImageData(0, 0, width, height).data;
            let partial=0;for(let i=3;i<rgba.length;i+=4)if(rgba[i]>0&&rgba[i]<255)partial++;
            metrics.compositeSemiTransparent+=partial;if(partial)issue('composited-non-binary-alpha',{...context,set},{pixels:partial});
            const border = outsideEdge(rgba, width, height);
            if (border) issue('mixed-set-cell-clipping', { ...context, set }, { pixels: border });
            counts.mixed++;
          }
          // The draw order is tested through the real compositor, not inferred
          // from a clipped mask. Rotate the hairstyle so every style and every
          // direction participates without rendering a full Cartesian product.
          if (!geometryOnly) {
          const hairs = q.catalog.styles.filter(style => style.kind === 'hair');
          const hairStyle = hairs[counts.poses % hairs.length];
          const hairData = await pixels(hairStyle.layers[body][clip.direction]);
          const hairMask = api.attach(hairData, 'hair', rest, pose, socket, padding, width, height).full;
          const look = { hair: hairStyle.id, hairColor: 'brown', face: 'face-gentle' };
          const withFace = await q.render(body, clip.action, clip.direction, frame, [], look);
          const withoutFace = await q.render(body, clip.action, clip.direction, frame, [], { ...look, face: 'none' });
          const aa = withFace.getContext('2d').getImageData(0, 0, width, height).data;
          const bb = withoutFace.getContext('2d').getImageData(0, 0, width, height).data;
          const calibration = q.catalog.headCalibration?.[clip.direction] || {};
          let onHair = 0, outsideHead = 0;
          for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            if (![0, 1, 2, 3].some(k => aa[i + k] !== bb[i + k])) continue;
            if (!head[i + 3]) outsideHead++;
            const hx = x - (calibration.hairX || 0), hy = y - (calibration.hairY || 0);
            if (hx >= 0 && hx < width && hy >= 0 && hy < height && hairMask[(hy * width + hx) * 4 + 3] === 255) onHair++;
          }
          metrics.faceOverOpaqueHair += onHair; metrics.faceOutsideHead += outsideHead;
          if (onHair) issue('face-drawn-over-opaque-hair', { ...context, id: hairStyle.id }, { pixels: onHair });
          if (outsideHead) issue('composited-face-outside-head', context, { pixels: outsideHead });
          counts.faceOrder++;
          }
          if(!geometryOnly){
            const raised=['LEFT','RIGHT'].filter(side=>joint(pose,side+' ARM',padding).y<joint(pose,'NECK',padding).y-2);
            if(raised.length){
              const base={hair:'none',face:'none',pants:'none',cloak:'none',head:'none'},a=await q.render(body,clip.action,clip.direction,frame,[],{...base,gloves:'item-26'}),b=await q.render(body,clip.action,clip.direction,frame,[],{...base,gloves:'none'});
              const aa=a.getContext('2d').getImageData(0,0,width,height).data,bb=b.getContext('2d').getImageData(0,0,width,height).data;
              const style=q.catalog.styles.find(s=>s.id==='item-26'),raw=await pixels(style.layers[body][clip.direction]),parts=Object.fromEntries(await Promise.all(Object.entries(style.parts[body][clip.direction]).map(async([key,file])=>[key,await pixels(file)])));
              const fitted=api.fitPairToBody(raw,'gloves',rest,pose,padding,width,height,bodyPixels,restBody,parts,{coverHand:true,handSurface,material:style.nativeMaterial});
              for(const side of raised){let expected=0,changed=0;for(let i=0;i<aa.length;i+=4){if(!fitted[side][i+3]||head[i+3])continue;expected++;if([0,1,2,3].some(c=>aa[i+c]!==bb[i+c]))changed++;}
                if(expected>=4&&changed<3){metrics.raisedGloveVisibilityFailures++;issue('raised-glove-overwritten-by-bare-hand',{...context,side},{expected,changed});}
              }
            }
          }
          counts.poses++;
        }
      }

      if (createBoards) {
        // One board per model/body/action, every frame in all four directions.
        // All files remain outside Git; labels do not overlap the sprite cell.
        for (const [body, b] of Object.entries(q.manifest.bodies)) for (const action of ['static', 'idle', 'walk', 'attack-unarmed', 'attack-sword', 'attack-firearm', 'attack-daggers', 'attack-focus']) {
          const width = action.startsWith('attack-') ? 160 : 128;
          const frames = action === 'static' ? 1 : b.clips[action].south.frames;
          for (const style of q.catalog.styles) {
            const board = document.createElement('canvas'), cell = width * 2, row = cell + 24;
            board.width = Math.max(440, frames * cell); board.height = row * 4 + 30;
            const ctx = board.getContext('2d'); ctx.imageSmoothingEnabled = false;
            ctx.fillStyle = '#192b3a'; ctx.fillRect(0, 0, board.width, board.height);
            ctx.font = '14px monospace'; ctx.fillStyle = '#fff'; ctx.fillText([body, action, style.id, '2x'].join(' — '), 8, 20);
            for (let d = 0; d < q.manifest.directions.length; d++) {
              const direction = q.manifest.directions[d];
              for (let frame = 0; frame < frames; frame++) {
                const look = { hairColor: 'brown', [style.kind]: style.id };
                const canvas = await q.render(body, action, direction, frame, [], look);
                ctx.drawImage(canvas, frame * cell, 30 + d * row, cell, cell);
                ctx.fillStyle = '#fff'; ctx.fillText(direction + ' #' + frame, frame * cell + 8, 30 + d * row + cell + 17);
              }
            }
            await window.saveFitBoard([body, action, style.id].join('-') + '.png', board.toDataURL('image/png').split(',')[1]);
            counts.boards++;
          }
        }
      }
      return { schema: 'mare-fit-96-v1', mode: geometryOnly ? 'geometry-diagnostic' : 'full', visualApproval: false, revision: q.manifest.visualRevision, counts, metrics, violations, diagnostics, storage: localStorage.length };
    }, { createBoards, geometryOnly });
    let uiStates=0;
    if(!geometryOnly)for(const body of ['masculino','feminino'])for(const direction of ['south','north','west','east'])for(let set=0;set<2;set++){
      for(const [slot,value]of Object.entries({hair:set?'hair-curly':'hair-wavy',face:set?'face-calm':'face-resolute',skin:set?'copper':'light',pants:set?'item-22':'item-21',boots:set?'item-9':'item-8',gloves:set?'item-26':'item-25',cloak:set?'item-23':'item-24',head:set?'item-19':'item-18'}))await page.selectOption('#look-'+slot,value);
      await page.selectOption('#body',body);await page.selectOption('#direction',direction);
      for(const action of ['idle','walk','attack-unarmed','attack-sword','attack-firearm','attack-daggers','attack-focus']){await page.selectOption('#action',action);await page.waitForFunction(n=>document.getElementById('status').textContent.includes(n+' frames'),action==='idle'?4:8);uiStates++;}
    }
    if(!geometryOnly){const frame=await page.evaluate(()=>__review96v3.frame);await page.waitForFunction(f=>__review96v3.frame!==f,frame);}
    report.counts.uiStates=uiStates;assert.equal(uiStates,geometryOnly?0:112);
    if (evidenceDirectory) await fs.writeFile(path.join(evidenceDirectory, 'visual-fit-audit.json'), JSON.stringify(report, null, 2));
    const violationCounts = report.violations.reduce((out, item) => { out[item.reason] = (out[item.reason] || 0) + 1; return out; }, {});
    console.log(JSON.stringify({ schema: report.schema, mode: report.mode, revision: report.revision, counts: report.counts, metrics: report.metrics, violations: report.violations.length, violationCounts, examples: report.violations.slice(0, 12), visualApproval: false }));
    assert.equal(report.counts.poses, 424, 'All 416 distinct moving frames and eight static views must be covered');
    assert.equal(report.counts.pairedMatrices, 64, 'Each pair has independent complete left/right matrices for both bodies and four directions');
    assert.equal(report.counts.pairSides, 3392);
    assert.equal(report.counts.trousers, 848);
    assert.equal(report.counts.faces, 2544);
    assert.equal(report.counts.hair, 4240);
    assert.equal(report.counts.mixed, geometryOnly ? 0 : 848);
    assert.equal(report.counts.faceOrder, geometryOnly ? 0 : 424);
    assert.equal(report.storage, 0, 'The isolated bench must not create saves');
    assert.deepEqual(errors, [], 'Browser errors');
    assert.equal(report.violations.length, 0,
      'Fit defects require correction; passing this gate does not approve the art. ' + JSON.stringify(report.violations.slice(0, 12)));
  } finally { await browser.close(); }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
