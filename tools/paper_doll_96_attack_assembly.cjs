/* Native paper-doll attachment assembly. No API calls, interpolation or save access. */
const motion = require('./paper-doll-96-v3/motion.js');
const rgba = (width, height) => new Uint8ClampedArray(width * height * 4);
function bounds(pixels, width, height) {
  let x0 = width, y0 = height, x1 = 0, y1 = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (pixels[(y * width + x) * 4 + 3]) {
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x + 1); y1 = Math.max(y1, y + 1);
  }
  return x1 ? { x0: x0 - 1, y0: y0 - 1, x1: x1 + 1, y1: y1 + 1 } : null;
}
function buildFrame(raw, reference, recipe, frame) {
  const size = recipe.size, padding = recipe.padding;
  if (raw.length !== size * size * 4) throw Error('Unexpected native generation dimensions');
  const rest = recipe.targetRest128, pose = recipe.rawPoses128[frame];
  const boneHead = motion.headTransform(rest, pose, padding), nose = rest.find(p => p.label === 'NOSE');
  const head = recipe.headSockets ? motion.socketTransform({ x: nose.x * 128, y: nose.y * 128 }, recipe.headSockets[frame], padding) : boneHead;
  const generatedHead = recipe.generatedHeadMode === 'bone' ? boneHead : head;
  const parts = {}, headSource = rgba(128, 128), headMask = rgba(128, 128);
  for (let y = 12; y <= 43; y++) for (let x = 44; x <= 87; x++) {
    const i = (y * 128 + x) * 4;
    headSource.set(reference.body.subarray(i, i + 4), i);
    headMask.set([255, 255, 255, 255], i);
  }
  const headMesh = motion.affineMesh(head.map);
  parts.headBase = motion.rasterMesh(headSource, 128, 128, headMesh, size, size);
  const erased = motion.rasterMesh(headMask, 128, 128, motion.affineMesh(generatedHead.map), size, size);
  parts.body = new Uint8ClampedArray(raw);
  for (let i = 0; i < erased.length; i += 4) if (erased[i + 3]) parts.body.fill(0, i, i + 4);
  parts.underArms = rgba(size, size); parts.foreground = rgba(size, size);
  const joints = Object.fromEntries(pose.map(j => [j.label, { x: j.x * 128 + padding, y: j.y * 128 + padding, z: j.z_index || 0 }]));
  const leftZ = joints['LEFT ARM'].z, rightZ = joints['RIGHT ARM'].z;
  const near = leftZ === rightZ ? (recipe.direction === 'west' ? 'LEFT' : 'RIGHT') : leftZ > rightZ ? 'LEFT' : 'RIGHT';
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4;
    if (raw[i + 3] < 100) continue;
    const skin = raw[i] > raw[i + 2] * 1.3 && raw[i + 1] > raw[i + 2] * 1.08;
    const ink = Math.max(raw[i], raw[i + 1], raw[i + 2]) < 60;
    if (!skin && !ink) continue;
    for (const side of ['LEFT', 'RIGHT']) {
      const elbow = joints[side + ' ELBOW'], hand = joints[side + ' ARM'];
      if (motion.distanceToSegment({ x: x + .5, y: y + .5 }, elbow, hand) > (recipe.body === 'masculino' ? 3.5 : 3)
          && Math.hypot(x + .5 - hand.x, y + .5 - hand.y) > 4) continue;
      const front = recipe.direction === 'south' || (recipe.direction !== 'north' && side === near);
      const target = front ? parts.foreground : parts.underArms;
      target.set(raw.subarray(i, i + 4), i);
    }
  }
  for (const slot of ['face', 'hair']) parts[slot] = motion.rasterMesh(reference[slot], 128, 128, headMesh, size, size);
  for (const slot of ['pants', 'top']) {
    const box = bounds(reference[slot], 128, 128);
    parts[slot] = box ? motion.rasterMesh(reference[slot], 128, 128,
      motion.clothMesh(slot, rest, pose, box, padding), size, size) : rgba(size, size);
    // Material may cover the real body; it must never protrude into the air.
    for (let i = 0; i < raw.length; i += 4) if (raw[i + 3] < 100) parts[slot].fill(0, i, i + 4);
  }
  // Generation can widen the neutral underwear beyond the retargeted garment.
  // Extend only existing cloth pixels onto that neutral material, never skin.
  const cloth = new Uint8ClampedArray(parts.pants), hip = {
    x: (joints['LEFT HIP'].x + joints['RIGHT HIP'].x) / 2,
    y: (joints['LEFT HIP'].y + joints['RIGHT HIP'].y) / 2
  };
  for (let y = Math.max(0, Math.floor(hip.y - 8)); y < Math.min(size, hip.y + 16); y++) {
    for (let x = Math.max(0, Math.floor(hip.x - 18)); x < Math.min(size, hip.x + 18); x++) {
      const i = (y * size + x) * 4, max = Math.max(raw[i], raw[i + 1], raw[i + 2]), min = Math.min(raw[i], raw[i + 1], raw[i + 2]);
      if (raw[i + 3] < 100 || cloth[i + 3] > 100 || max < 65 || max - min > 40 || raw[i] > raw[i + 2] * 1.25) continue;
      let best = 82, source = -1;
      for (let dy = -9; dy <= 9; dy++) for (let dx = -9; dx <= 9; dx++) {
        const xx = x + dx, yy = y + dy, distance = dx * dx + dy * dy;
        if (xx < 0 || yy < 0 || xx >= size || yy >= size || distance >= best) continue;
        const j = (yy * size + xx) * 4;
        if (cloth[j + 3] > 200) { best = distance; source = j; }
      }
      if (source >= 0) parts.pants.set(cloth.subarray(source, source + 4), i);
    }
  }
  // The generator occasionally adds a gun despite the body-only reference.
  // These reviewed side-view regions contain the held item, outside the torso.
  // Keep warm skin and its adjacent ink; discard the unrequested object/VFX.
  const sideShot = recipe.action === 'attack-firearm' && ['west', 'east'].includes(recipe.direction);
  const swordArtifact = recipe.body === 'masculino' && recipe.action === 'attack-sword' && recipe.direction === 'east' && frame === 4;
  if (sideShot || swordArtifact) {
    const x0 = swordArtifact ? 44 : recipe.direction === 'west' ? 0 : 91;
    const x1 = swordArtifact ? 73 : recipe.direction === 'west' ? (recipe.body === 'feminino' ? 67 : 63) : size;
    const warm = i => raw[i + 3] > 100 && raw[i] > 70 && raw[i + 1] / raw[i] > .35 && raw[i + 1] / raw[i] < .85 && raw[i + 2] < raw[i] * .7;
    const limbSkin = (x, y) => warm((y * size + x) * 4) && ['LEFT', 'RIGHT'].some(side =>
      motion.distanceToSegment({ x: x + .5, y: y + .5 }, joints[side + ' ELBOW'], joints[side + ' ARM']) < 8);
    for (let y = 50; y < (swordArtifact ? 87 : 99); y++) for (let x = x0; x < x1; x++) {
      const i = (y * size + x) * 4;
      if (!raw[i + 3] || limbSkin(x, y)) continue;
      const ink = Math.max(raw[i], raw[i + 1], raw[i + 2]) < 60;
      let adjacentSkin = false;
      if (ink) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx >= 0 && xx < size && yy >= 0 && yy < size && limbSkin(xx, yy)) adjacentSkin = true;
      }
      if (!adjacentSkin) for (const slot of ['body', 'underArms', 'foreground']) parts[slot].fill(0, i, i + 4);
    }
    if (sideShot) {
      const seen = new Uint8Array(size * size), groups = [];
      for (let pixel = 0; pixel < seen.length; pixel++) {
        if (seen[pixel] || parts.body[pixel * 4 + 3] < 100) continue;
        const group = [pixel]; seen[pixel] = 1;
        for (let n = 0; n < group.length; n++) {
          const p = group[n], x = p % size, y = Math.floor(p / size);
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx, yy = y + dy, next = yy * size + xx;
            if (xx < 0 || yy < 0 || xx >= size || yy >= size || seen[next] || parts.body[next * 4 + 3] < 100) continue;
            seen[next] = 1; group.push(next);
          }
        }
        groups.push(group);
      }
      groups.sort((a, b) => b.length - a.length);
      for (const group of groups.slice(1)) if (group.length < 40) for (const p of group) {
        const x = p % size, y = Math.floor(p / size);
        if (x >= x0 && x < x1 && y >= 50 && y < 99) for (const slot of ['body', 'underArms', 'foreground']) parts[slot].fill(0, p * 4, p * 4 + 4);
      }
    }
  }
  return { parts, headAngle: head.angle };
}
module.exports = { buildFrame, bounds };
