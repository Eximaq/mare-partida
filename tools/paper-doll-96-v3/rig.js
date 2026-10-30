(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MareRig96 = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  const parents = {
    'LEFT HIP': 'NECK', 'RIGHT HIP': 'NECK',
    'LEFT SHOULDER': 'NECK', 'RIGHT SHOULDER': 'NECK',
    'LEFT ELBOW': 'LEFT SHOULDER', 'RIGHT ELBOW': 'RIGHT SHOULDER',
    'LEFT ARM': 'LEFT ELBOW', 'RIGHT ARM': 'RIGHT ELBOW',
    'LEFT KNEE': 'LEFT HIP', 'RIGHT KNEE': 'RIGHT HIP',
    'LEFT LEG': 'LEFT KNEE', 'RIGHT LEG': 'RIGHT KNEE',
    NOSE: 'NECK', 'LEFT EYE': 'NOSE', 'RIGHT EYE': 'NOSE',
    'LEFT EAR': 'NOSE', 'RIGHT EAR': 'NOSE'
  };
  function index(points) {
    const out = {};
    for (const p of points) {
      if (!p.label || out[p.label] || !Number.isFinite(p.x) || !Number.isFinite(p.y)) throw Error('Invalid joint');
      out[p.label] = p;
    }
    return out;
  }
  function retarget(restPoints, sourcePoints, referencePoints, rootScale = { x: 1.05, y: .92 }) {
    const rest = index(restPoints), source = index(sourcePoints), target = index(referencePoints), out = {};
    for (const key of ['NECK', ...Object.keys(parents)].filter(key => target[key])) {
      const parent = parents[key];
      if (!rest[key] || !source[key] || (parent && (!out[parent] || !rest[parent] || !source[parent]))) throw Error('Missing joint: ' + key);
      const z_index = Math.round((source[key].z_index || 0) * 2);
      if (!parent) {
        out[key] = { ...target[key], x: target[key].x + (source[key].x - rest[key].x) * rootScale.x,
          y: target[key].y + (source[key].y - rest[key].y) * rootScale.y, z_index };
        continue;
      }
      const angle = Math.atan2(source[key].y - source[parent].y, source[key].x - source[parent].x)
        - Math.atan2(rest[key].y - rest[parent].y, rest[key].x - rest[parent].x)
        + Math.atan2(target[key].y - target[parent].y, target[key].x - target[parent].x);
      let length = Math.hypot(target[key].x - target[parent].x, target[key].y - target[parent].y);
      // Walking toward the camera shortens the projected leg as the foot lifts.
      // Keeping every 2D bone at rest length incorrectly erases that motion.
      if (/ELBOW|ARM|KNEE|LEG/.test(key)) {
        const restLength = Math.hypot(rest[key].x - rest[parent].x, rest[key].y - rest[parent].y);
        const poseLength = Math.hypot(source[key].x - source[parent].x, source[key].y - source[parent].y);
        if (restLength > 0) length *= Math.max(.45, Math.min(1.5, poseLength / restLength));
      }
      out[key] = { label: key, x: out[parent].x + Math.cos(angle) * length,
        y: out[parent].y + Math.sin(angle) * length, z_index };
    }
    return referencePoints.map(p => out[p.label]);
  }
  function frameAt(clip, timeMs) {
    if (!Number.isInteger(clip.frames) || clip.frames < 1 || !Number.isFinite(clip.fps) || clip.fps <= 0 || !Number.isFinite(timeMs)) throw Error('Invalid clip clock');
    const frame = Math.floor(Math.max(0, timeMs) * clip.fps / 1000);
    return clip.loop ? frame % clip.frames : Math.min(clip.frames - 1, frame);
  }
  function displayScale(contract) {
    if (!Number.isFinite(contract.referenceHeight) || contract.referenceHeight <= 0) throw Error('Invalid reference height');
    return 96 / contract.referenceHeight;
  }
  return { retarget, frameAt, displayScale };
});
