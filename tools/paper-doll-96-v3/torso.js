(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('./surface.js') : root.MareSurface96);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MareTorso96 = api;
})(typeof globalThis === 'object' ? globalThis : this, function (surface) {
  'use strict';
  const geometry = points => {
    const j = Object.fromEntries(points.map(p => [p.label, { x: p.x * 128, y: p.y * 128, z: p.z_index || 0 }]));
    const hip = { x: (j['LEFT HIP'].x + j['RIGHT HIP'].x) / 2, y: (j['LEFT HIP'].y + j['RIGHT HIP'].y) / 2 };
    return { j, axis: surface.axis(j.NECK, hip), shoulder: Math.max(10, Math.abs(j['LEFT SHOULDER'].x - j['RIGHT SHOULDER'].x) / 2 + 1),
      waist: Math.max(8, Math.abs(j['LEFT HIP'].x - j['RIGHT HIP'].x) / 2 + 2) };
  };
  const radius = (g, t) => g.shoulder * (1 - t) + g.waist * t;
  function fit(source, body, restPoints, posePoints, padding, width, height, handSurface) {
    if (source.length !== 128 * 128 * 4 || body.length !== width * height * 4) throw Error('Invalid torso material');
    const rest = geometry(restPoints), pose = geometry(posePoints), out = new Uint8ClampedArray(body.length);
    const forearms = ['LEFT', 'RIGHT'].flatMap(side => [
      { a: surface.axis(pose.j[side + ' ELBOW'], pose.j[side + ' ARM']), z: pose.j[side + ' ARM'].z, start: -1, radius: 4 },
      { a: surface.axis(pose.j[side + ' SHOULDER'], pose.j[side + ' ELBOW']), z: pose.j[side + ' ELBOW'].z, start: 3, radius: 3.2 }
    ]);
    const sample = (x, y) => {
      const xx = Math.round(x), yy = Math.round(y);
      let found = -1, distance = Infinity;
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
        const sx = xx + dx, sy = yy + dy, d = dx * dx + dy * dy;
        if (sx < 0 || sy < 0 || sx >= 128 || sy >= 128 || d >= distance) continue;
        const i = (sy * 128 + sx) * 4;
        if (source[i + 3] >= 128) { found = i; distance = d; }
      }
      return found;
    };
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (body[i + 3] < 128) continue;
      const xx = x - padding, yy = y - padding, q = pose.axis.at(xx, yy), t = q.along / pose.axis.length;
      if (t < -.02 || t > 1.06 || Math.abs(q.across) > radius(pose, t)) continue;
      const r = body[i], g = body[i + 1], b = body[i + 2];
      const nativeSkin = r > 65 && r > b * 1.25 && g / r > .3 && g / r < .93;
      const ink = Math.max(r, g, b) < 65;
      const nearestArm=forearms.reduce((best,bone)=>{const p=bone.a.at(xx,yy),distance=Math.hypot(p.across,p.along-Math.max(0,Math.min(bone.a.length,p.along)));return !best||distance<best.distance?{...bone,distance}:best;},null);
      if(nativeSkin && handSurface?.[i + 3] >= 128 && nearestArm.z>=pose.j.NECK.z) continue;
      // A raised/crossed bare forearm stays in front of the shirt. Underwear
      // pixels cannot be mistaken for an arm and leave a hole in the chest.
      const arm = (nativeSkin || ink) && forearms.some(({ a, z, start, radius }) => {
        const v = a.at(xx, yy);
        return v.along >= start && v.along <= a.length + 3 && Math.abs(v.across) <= radius &&
          z >= pose.j.NECK.z;
      });
      if (arm) continue;
      const p = rest.axis.point(t * rest.axis.length, q.across * radius(rest, t) / radius(pose, t));
      const from = sample(p.x, p.y);
      if (from >= 0) { out.set(source.subarray(from, from + 4), i); out[i + 3] = 255; }
    }
    return { full: out };
  }
  function baseClothing(body, points, padding, width, height, female) {
    const g = geometry(points), pants = new Uint8ClampedArray(body.length), top = new Uint8ClampedArray(body.length);
    const hip = g.axis.point(g.axis.length, 0), counts = { pants: 0, top: 0 };
    const ramp = [[12,16,27],[22,30,48],[32,46,69],[46,63,87],[66,84,109]];
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4, r = body[i], green = body[i + 1], b = body[i + 2];
      const neutral = Math.max(r, green, b) >= 72 && Math.max(r, green, b) - Math.min(r, green, b) <= 32;
      const navy = b > r * 1.1 && b >= green * .85;
      if (body[i + 3] < 128 || !neutral && !navy) continue;
      const xx = x - padding, yy = y - padding, v = g.axis.at(xx, yy);
      let slot;
      if (yy >= hip.y - 8 && yy <= hip.y + 17 && Math.abs(v.across) < g.waist + 9) slot = 'pants';
      else if (female && yy >= g.j.NECK.y + 4 && yy < hip.y - 8 && Math.abs(v.across) < g.shoulder + 4) slot = 'top';
      if (!slot) continue;
      const shade = Math.max(1, Math.min(4, Math.floor((r + green + b) / 3 / 55)));
      (slot === 'pants' ? pants : top).set(navy ? [r, green, b, 255] : [...ramp[shade], 255], i); counts[slot]++;
    }
    const legs = ['LEFT','RIGHT'].map(side => surface.axis(g.j[side + ' HIP'], g.j[side + ' KNEE']));
    const arms = ['LEFT','RIGHT'].map(side => surface.axis(g.j[side + ' ELBOW'], g.j[side + ' ARM']));
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4, r = body[i], green = body[i + 1], b = body[i + 2];
      if (pants[i + 3] || body[i + 3] < 128) continue;
      const xx = x - padding, yy = y - padding;
      const skin = r > 65 && r > b * 1.25 && green / r > .3 && green / r < .93;
      if (!skin && Math.max(r, green, b) >= 65) continue;
      const leg = legs.some(a => { const p = a.at(xx, yy); return p.along >= -1 && p.along <= a.length * .68 && Math.abs(p.across) <= 7; });
      const hand = arms.some(a => { const p = a.at(xx, yy); return p.along >= a.length * .45 && p.along <= a.length + 3 && Math.abs(p.across) < 3.5; });
      const pelvis = yy >= hip.y - 5 && yy <= hip.y + 3 && Math.abs(g.axis.at(xx, yy).across) <= g.waist + 2;
      if (!leg && !pelvis || hand) continue;
      const shade = Math.max(r, green, b) < 65 ? 0 : (.2126*r+.7152*green+.0722*b < 150 ? 2 : 3);
      pants.set([...ramp[shade], 255], i); counts.pants++;
    }
    // Recover only native dark edges immediately adjoining the garment.
    for (const data of [pants, top]) {
      const snapshot = new Uint8ClampedArray(data);
      for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
        const i = (y * width + x) * 4;
        if (snapshot[i + 3] || body[i + 3] < 128 || Math.max(body[i], body[i + 1], body[i + 2]) > 62) continue;
        if ([[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy]) => snapshot[((y + dy) * width + x + dx) * 4 + 3])) data.set([...ramp[0], 255], i);
      }
    }
    return { pants, top, counts };
  }
  return { fit, geometry, radius, baseClothing };
});
