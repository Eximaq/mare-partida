(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MareLayers96 = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  const order = ['body', 'pants', 'top', 'face', 'hair'];
  function safeFile(file) {
    return typeof file === 'string' && /^assets\/[a-z0-9-]+\.png$/.test(file);
  }
  function validate(pack) {
    if (!pack || pack.productionEnabled !== false || pack.frame?.width !== 128 || pack.frame?.height !== 128
        || pack.pivot?.x !== 64 || pack.pivot?.y !== 112 || pack.referenceHeight !== 96) throw Error('Invalid 96px layer contract');
    for (const body of Object.values(pack.bodies)) {
      for (const layers of Object.values(body.layers || {})) {
        if (!order.every(slot => safeFile(layers[slot]))) throw Error('Incomplete static layer set');
      }
      for (const action of Object.values(body.clips || {})) for (const clip of Object.values(action)) {
        if (clip.modular === true && !order.every(slot => safeFile(clip.layers?.[slot]))) throw Error('Incomplete animated layer set');
      }
    }
    return true;
  }
  function visible(layers, hidden = []) {
    return order.filter(slot => layers?.[slot] && !hidden.includes(slot)).map(slot => ({ slot, file: layers[slot] }));
  }
  function draw(ctx, images, layers, frame, frameSize, hidden = []) {
    const pieces = visible(layers, hidden);
    const render = (target, file) => {
      const image = images.get(file);
      if (!image) throw Error('Layer not loaded: ' + file);
      const x = frame * frameSize.width;
      if (x + frameSize.width > image.width || frameSize.height > image.height) throw Error('Frame outside layer');
      target.drawImage(image, x, 0, frameSize.width, frameSize.height, 0, 0, frameSize.width, frameSize.height);
    };
    const body = pieces.find(piece => piece.slot === 'body');
    if (body) render(ctx, body.file);
    const overlays = pieces.filter(piece => piece.slot !== 'body');
    if (body && overlays.length) {
      // Preserve the approved partially transparent edge pixels. Underpaint is
      // revealed only when a piece is hidden; it must not tint that piece's edge.
      const mask = ctx.canvas.ownerDocument.createElement('canvas');
      mask.width = frameSize.width; mask.height = frameSize.height;
      const mc = mask.getContext('2d');
      for (const piece of overlays) render(mc, piece.file);
      const data = mc.getImageData(0, 0, mask.width, mask.height);
      for (let i = 3; i < data.data.length; i += 4) if (data.data[i]) data.data[i] = 255;
      mc.putImageData(data, 0, 0);
      ctx.save(); ctx.globalCompositeOperation = 'destination-out'; ctx.drawImage(mask, 0, 0); ctx.restore();
    }
    for (const piece of overlays) render(ctx, piece.file);
  }
  return { order, validate, visible, draw };
});
