(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MareMotion96 = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const index = points => Object.fromEntries(points.map(p => [p.label, { x: p.x * 128, y: p.y * 128, z_index: p.z_index || 0 }]));
  const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const length = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
  function headTransform(restPoints, posePoints, padding) {
    const r = index(restPoints), p = index(posePoints);
    const angle = wrap(Math.atan2(p.NOSE.y - p.NECK.y, p.NOSE.x - p.NECK.x)
      - Math.atan2(r.NOSE.y - r.NECK.y, r.NOSE.x - r.NECK.x));
    const cos = Math.cos(angle), sin = Math.sin(angle);
    return { angle, map(v) {
      const x = v.x - r.NOSE.x, y = v.y - r.NOSE.y;
      return { x: p.NOSE.x + x * cos - y * sin + padding,
        y: p.NOSE.y + x * sin + y * cos + padding };
    } };
  }
  function socketTransform(anchor, socket, padding) {
    const angle = socket.angle || 0, cos = Math.cos(angle), sin = Math.sin(angle);
    return { angle, map(v) {
      const x = v.x - anchor.x, y = v.y - anchor.y;
      return { x: anchor.x + socket.x + padding + x * cos - y * sin,
        y: anchor.y + socket.y + padding + x * sin + y * cos };
    } };
  }
  function boneTransform(a, b, c, d, padding) {
    const oldLength = length(a, b), newLength = length(c, d);
    if (oldLength < .001 || newLength < .001) throw Error('Degenerate bone');
    const ux = (b.x - a.x) / oldLength, uy = (b.y - a.y) / oldLength;
    const vx = (d.x - c.x) / newLength, vy = (d.y - c.y) / newLength;
    return v => {
      const x = v.x - a.x, y = v.y - a.y;
      const along = (x * ux + y * uy) * newLength / oldLength, across = -x * uy + y * ux;
      return { x: c.x + vx * along - vy * across + padding,
        y: c.y + vy * along + vx * across + padding };
    };
  }
  function torsoTransform(restPoints, posePoints, padding) {
    const r = index(restPoints), p = index(posePoints);
    return { map: boneTransform(r.NECK, mid(r['LEFT HIP'], r['RIGHT HIP']), p.NECK, mid(p['LEFT HIP'], p['RIGHT HIP']), padding) };
  }
  function distanceToSegment(v, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, den = dx * dx + dy * dy;
    const t = den ? clamp(((v.x - a.x) * dx + (v.y - a.y) * dy) / den, 0, 1) : 0;
    return Math.hypot(v.x - a.x - dx * t, v.y - a.y - dy * t);
  }
  function clothMesh(type, restPoints, posePoints, bounds, padding) {
    const r = index(restPoints), p = index(posePoints), torso = torsoTransform(restPoints, posePoints, padding);
    const left = boneTransform(r['LEFT HIP'], r['LEFT KNEE'], p['LEFT HIP'], p['LEFT KNEE'], padding);
    const right = boneTransform(r['RIGHT HIP'], r['RIGHT KNEE'], p['RIGHT HIP'], p['RIGHT KNEE'], padding);
    const hipY = (r['LEFT HIP'].y + r['RIGHT HIP'].y) / 2;
    const vertices = [], columns = 4, rows = 4;
    for (let y = 0; y <= rows; y++) for (let x = 0; x <= columns; x++) {
      const source = { x: bounds.x0 + (bounds.x1 - bounds.x0) * x / columns,
        y: bounds.y0 + (bounds.y1 - bounds.y0) * y / rows };
      let target = torso.map(source);
      if (type === 'pants') {
        const dl = distanceToSegment(source, r['LEFT HIP'], r['LEFT KNEE']);
        const dr = distanceToSegment(source, r['RIGHT HIP'], r['RIGHT KNEE']);
        const wl = 1 / Math.pow(dl + 1, 4), wr = 1 / Math.pow(dr + 1, 4);
        const l = left(source), rr = right(source);
        const t = clamp((source.y - hipY) / Math.max(1, bounds.y1 - hipY), 0, 1);
        target = { x: target.x * (1 - t) + (l.x * wl + rr.x * wr) / (wl + wr) * t,
          y: target.y * (1 - t) + (l.y * wl + rr.y * wr) / (wl + wr) * t };
      }
      vertices.push({ source, target });
    }
    const triangles = [];
    for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
      const a = y * (columns + 1) + x, b = a + 1, c = a + columns + 1, d = c + 1;
      triangles.push([vertices[a], vertices[b], vertices[d]], [vertices[a], vertices[d], vertices[c]]);
    }
    return triangles;
  }
  function affineMesh(map, width = 128, height = 128) {
    const q = [{ x: 0, y: 0 }, { x: width, y: 0 }, { x: width, y: height }, { x: 0, y: height }];
    return [[0, 1, 2], [0, 2, 3]].map(ids => ids.map(i => ({ source: q[i], target: map(q[i]) })));
  }
  function rasterMesh(source, sw, sh, triangles, width, height) {
    if (![sw, sh, width, height].every(n => Number.isInteger(n) && n > 0) || source.length !== sw * sh * 4) throw Error('Invalid raster dimensions');
    const output = new Uint8ClampedArray(width * height * 4);
    for (const triangle of triangles) {
      const [a, b, c] = triangle, A = a.target, B = b.target, C = c.target;
      if (![A, B, C].every(v => Number.isFinite(v.x) && Number.isFinite(v.y))) throw Error('Invalid mesh');
      const den = (B.y - C.y) * (A.x - C.x) + (C.x - B.x) * (A.y - C.y);
      if (Math.abs(den) < 1e-8) continue;
      const x0 = Math.max(0, Math.floor(Math.min(A.x, B.x, C.x))), x1 = Math.min(width - 1, Math.ceil(Math.max(A.x, B.x, C.x)));
      const y0 = Math.max(0, Math.floor(Math.min(A.y, B.y, C.y))), y1 = Math.min(height - 1, Math.ceil(Math.max(A.y, B.y, C.y)));
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const u = ((B.y - C.y) * (x + .5 - C.x) + (C.x - B.x) * (y + .5 - C.y)) / den;
        const v = ((C.y - A.y) * (x + .5 - C.x) + (A.x - C.x) * (y + .5 - C.y)) / den, w = 1 - u - v;
        if (u < -1e-7 || v < -1e-7 || w < -1e-7) continue;
        const sx = Math.floor(a.source.x * u + b.source.x * v + c.source.x * w + 1e-8);
        const sy = Math.floor(a.source.y * u + b.source.y * v + c.source.y * w + 1e-8);
        if (sx < 0 || sx >= sw || sy < 0 || sy >= sh) continue;
        const si = (sy * sw + sx) * 4, di = (y * width + x) * 4;
        if (source[si + 3] >= output[di + 3]) output.set(source.subarray(si, si + 4), di);
      }
    }
    return output;
  }
  function clipSpec(pack, clip) {
    const frame = clip?.frame || pack.frame, pivot = clip?.pivot || pack.pivot;
    return { width: frame.width, height: frame.height, pivot, scale: 96 / pack.referenceHeight };
  }
  return { headTransform, socketTransform, torsoTransform, clothMesh, affineMesh, rasterMesh, distanceToSegment, clipSpec };
});
