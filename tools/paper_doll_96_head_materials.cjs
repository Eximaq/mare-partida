/* Native head-material cleanup. No scaling, generated anatomy or face repainting.
 * All coordinates below are in the established 128 px rest frame.
 */
'use strict';
const FRAME = 128;
function validate(data) {
  if (data.length !== FRAME * FRAME * 4) throw Error('Expected a native 128 px RGBA head material');
}
function components(source) {
  validate(source);
  const seen = new Uint8Array(FRAME * FRAME), groups = [];
  for (let start = 0; start < seen.length; start++) {
    if (seen[start] || !source[start * 4 + 3]) continue;
    const group = [start]; seen[start] = 1;
    for (let n = 0; n < group.length; n++) {
      const p = group[n], x = p % FRAME, y = Math.floor(p / FRAME);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy, q = yy * FRAME + xx;
        if (xx < 0 || yy < 0 || xx >= FRAME || yy >= FRAME || seen[q] || !source[q * 4 + 3]) continue;
        seen[q] = 1; group.push(q);
      }
    }
    groups.push(group);
  }
  return groups.sort((a, b) => b.length - a.length);
}
function restoreHead(originalBody, previousHead, originalFace) {
  validate(originalBody); validate(previousHead); validate(originalFace);
  const out = new Uint8ClampedArray(previousHead.length);
  // The approved body already contains a neutral face, scalp, ears and jaw.
  // A generated bald replacement can extend skin beyond a short hairline.
  for (let y = 0; y < 44; y++) for (let x = 0; x < FRAME; x++) {
    const i = (y * FRAME + x) * 4;
    if (originalBody[i + 3] >= 128) out.set(originalBody.subarray(i, i + 4), i);
    // Eyelashes may project one native pixel beyond the neutral skin. Their
    // approved footprint is allowed, but the head beneath remains featureless.
    else if (originalFace[i + 3]) {
      let nearest = -1, distance = Infinity;
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
        const xx = x + dx, yy = y + dy, j = (yy * FRAME + xx) * 4, d = dx * dx + dy * dy;
        if (xx < 0 || yy < 0 || xx >= FRAME || yy >= 44 || d >= distance || originalBody[j + 3] < 128) continue;
        if (originalBody[j] <= 80 || originalBody[j] <= originalBody[j + 2] * 1.28) continue;
        distance = d; nearest = j;
      }
      if (nearest >= 0) out.set(originalBody.subarray(nearest, nearest + 4), i);
    }
    if (out[i + 3]) out[i + 3] = 255;
  }
  return out;
}
function normalizeFace(source, head) {
  validate(source); validate(head);
  const out = new Uint8ClampedArray(source);
  for (let i = 0; i < out.length; i += 4) {
    if (!head[i + 3] || !out[i + 3]) out.fill(0, i, i + 4);
    else out[i + 3] = 255;
  }
  return out;
}
function cleanHair(source, original = false) {
  validate(source);
  const out = new Uint8ClampedArray(source);
  // Older original separations contain nearly invisible matte pixels. Do not
  // promote their alpha 1 edge/noise to an opaque black shape.
  for (let i = 0; i < out.length; i += 4) {
    if (out[i + 3] >= 128) out[i + 3] = 255;
    else out.fill(0, i, i + 4);
  }
  // Eyes accidentally extracted with short hair are separate lower islands.
  // A shaved temple island higher on the scalp remains a legitimate material.
  for (const group of components(out).slice(1)) {
    const top = Math.min(...group.map(p => Math.floor(p / FRAME)));
    if (top >= 32) for (const p of group) out.fill(0, p * 4, p * 4 + 4);
  }
  for (let i = 0; i < out.length; i += 4) {
    if (out[i + 3]) out[i + 3] = 255;
    else out.fill(0, i, i + 4);
  }
  return out;
}
function mirrorHairEast(source, body) {
  validate(source);
  if (!['masculino', 'feminino'].includes(body)) throw Error('Unknown body');
  const out = new Uint8ClampedArray(source.length), sum = 128;
  for (let y = 0; y < FRAME; y++) for (let x = 0; x < FRAME; x++) {
    const xx = sum - x;
    if (xx >= 0 && xx < FRAME) out.set(source.subarray((y * FRAME + x) * 4, (y * FRAME + x + 1) * 4), (y * FRAME + xx) * 4);
  }
  return out;
}
function distanceToSegment(v, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, den = dx * dx + dy * dy;
  const t = den ? Math.max(0, Math.min(1, ((v.x - a.x) * dx + (v.y - a.y) * dy) / den)) : 0;
  return Math.hypot(v.x - a.x - dx * t, v.y - a.y - dy * t);
}
function cleanBodyHead(source, head, rest, pose, socket, padding, width, height, body) {
  validate(head);
  if (source.length !== width * height * 4) throw Error('Invalid native body frame');
  const out = new Uint8ClampedArray(source);
  const joints = Object.fromEntries(pose.map(p => [p.label, { x: p.x * FRAME + padding, y: p.y * FRAME + padding }]));
  const neck = joints.NECK, oldNose = joints.NOSE;
  if (!neck || !oldNose) throw Error('Missing head contacts');
  let bottom = -1, left = FRAME, right = -1;
  for (let y = 0; y < FRAME; y++) for (let x = 0; x < FRAME; x++) if (head[(y * FRAME + x) * 4 + 3]) {
    bottom = Math.max(bottom, y); left = Math.min(left, x); right = Math.max(right, x);
  }
  if (bottom < 0) throw Error('Empty approved head');
  let jawLeft = FRAME, jawRight = -1;
  for (let x = 0; x < FRAME; x++) if (head[(bottom * FRAME + x) * 4 + 3]) { jawLeft = Math.min(jawLeft, x); jawRight = Math.max(jawRight, x); }
  const jaw = { x: (jawLeft + jawRight) / 2 + (socket.x || 0) + padding, y: bottom + (socket.y || 0) + padding };
  const x0 = Math.min(left - 3 + (socket.x || 0) + padding, oldNose.x - 24);
  const x1 = Math.max(right + 3 + (socket.x || 0) + padding, oldNose.x + 24);
  const y0 = 9 + (socket.y || 0) + padding, y1 = Math.min(neck.y - .75, jaw.y + 9);
  let removed = 0, protectedArms = 0;
  for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(height - 1, Math.ceil(y1)); y++) for (let x = Math.max(0, Math.floor(x0)); x <= Math.min(width - 1, Math.ceil(x1)); x++) {
    const i = (y * width + x) * 4;
    if (!out[i + 3]) continue;
    const point = { x: x + .5, y: y + .5 };
    if (point.y > y1) continue;
    const arm = ['LEFT', 'RIGHT'].some(side => {
      const shoulder = joints[side + ' SHOULDER'], elbow = joints[side + ' ELBOW'], hand = joints[side + ' ARM'];
      return shoulder && elbow && hand && (distanceToSegment(point, shoulder, elbow) <= (body === 'masculino' ? 6 : 5) || distanceToSegment(point, elbow, hand) <= 4.5 || Math.hypot(point.x - hand.x, point.y - hand.y) <= 5);
    });
    if (arm) { protectedArms++; continue; }
    // The head is supplied as its own master. Below its jaw, retain a native
    // neck corridor to the animated neck contact, rather than an old chin rim.
    if (point.y > jaw.y && distanceToSegment(point, jaw, neck) <= (body === 'masculino' ? 5 : 4)) continue;
    out.fill(0, i, i + 4); removed++;
  }
  return { pixels: out, removed, protectedArms, region: { x0, x1, y0, y1, jaw, neck } };
}
// Mirror every layer of the head family with this same pixel sum.
const mirrorHeadFamily = source => mirrorHairEast(source,'masculino');
function cleanFaceFeatures(source, protectedPixels = []) {
  validate(source);
  const keep = new Set(protectedPixels), out = new Uint8ClampedArray(source.length);
  for (let p = 0; p < FRAME * FRAME; p++) {
    const i = p * 4, rgb = source.subarray(i, i + 3), max = Math.max(...rgb), min = Math.min(...rgb);
    // Keep eyelids, iris and sclera. Warm antialias/cheek matte belongs to
    // the neutral head and cannot be pasted over a different skin colour.
    if (source[i + 3] >= 128 && (keep.has(p) || max < 100 || min >= 225 && max - min <= 30)) {
      out.set(source.subarray(i, i + 4), i); out[i + 3] = 255;
    }
  }
  return out;
}
function profileFace(head, body, iris, expression = 'original') {
  validate(head);
  if (!['masculino', 'feminino'].includes(body) || iris.length !== 2) throw Error('Invalid profile face');
  const out = new Uint8ClampedArray(head.length), protection = [];
  const x = body === 'feminino' ? 69 : 67, y = body === 'feminino' ? 34 : 35;
  const ink = [17, 19, 25], white = [245, 243, 237];
  const put = (xx, yy, rgb, eye = false) => {
    const p = yy * FRAME + xx;
    if (!head[p * 4 + 3]) throw Error('Profile feature outside canonical skull');
    out.set([...rgb, 255], p * 4); if (eye) protection.push(p);
  };
  for (let dx = 0; dx < 4; dx++) put(x + dx, y, ink);
  put(x, y + 1, white); put(x + 1, y + 1, white);
  put(x + 2, y + 1, iris[0], true); put(x + 3, y + 1, ink);
  put(x + 1, y + 2, white); put(x + 2, y + 2, iris[1], true); put(x + 3, y + 2, ink);
  put(x + 1, y - 2, ink); put(x + 2, y - (expression === 'resolute' ? 1 : 2), ink);
  if (expression !== 'calm') put(x + 3, y - 2, ink);
  const mouthY = body === 'feminino' ? 40 : 41;
  put(body === 'feminino' ? 70 : 69, mouthY, [42, 26, 24]);
  return { pixels: out, protection };
}
module.exports = { mirrorHeadFamily, components, restoreHead, normalizeFace, cleanHair, mirrorHairEast, cleanBodyHead, cleanFaceFeatures, profileFace };
