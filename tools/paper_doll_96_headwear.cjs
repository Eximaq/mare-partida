'use strict';

// Headwear owns fabric/metal, never the generated face beneath it.
function cleanHeadwear(source, width = 128, height = 128) {
  if (source.length !== width * height * 4) throw Error('Invalid headwear canvas');
  const blue = new Uint8Array(width * height), seen = new Uint8Array(blue.length), groups = [];
  for (let p = 0; p < blue.length; p++) {
    const i = p * 4, r = source[i], g = source[i + 1], b = source[i + 2];
    blue[p] = source[i + 3] >= 128 && b > r * 1.08 && b >= g * .9 && b > 24 ? 1 : 0;
  }
  for (let p = 0; p < blue.length; p++) {
    if (!blue[p] || seen[p]) continue;
    const group = [p]; seen[p] = 1;
    for (let n = 0; n < group.length; n++) {
      const q = group[n], x = q % width, y = Math.floor(q / width);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy, k = yy * width + xx;
        if (xx < 0 || yy < 0 || xx >= width || yy >= height || seen[k] || !blue[k]) continue;
        seen[k] = 1; group.push(k);
      }
    }
    groups.push(group);
  }
  groups.sort((a, b) => b.length - a.length);
  if (!groups[0]?.length) throw Error('Headwear has no fabric/metal core');
  const core = new Set(groups[0]), out = new Uint8ClampedArray(source.length);
  const near = (x, y, radius) => {
    for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < width && yy < height && core.has(yy * width + xx)) return true;
    }
    return false;
  };
  for (let p = 0; p < blue.length; p++) {
    const i = p * 4, x = p % width, y = Math.floor(p / width);
    if (source[i + 3] < 128) continue;
    const r = source[i], g = source[i + 1], b = source[i + 2], max = Math.max(r, g, b), min = Math.min(r, g, b);
    const material = blue[p] && near(x, y, 2);
    const ink = max < 60 && near(x, y, 1);
    const steel = max - min < 24 && near(x, y, 1);
    if (material || ink || steel) { out.set(source.subarray(i, i + 4), i); out[i + 3] = 255; }
  }
  return out;
}

module.exports = { cleanHeadwear };
