// Closed historical preset only. Caller must opt in; never fallback to it implicitly.
export function resolveDonorF6North(manifest, { enabled, gender, action, direction, timeSeconds = 0 }) {
  if (!enabled || gender !== 'female' || action !== 'walk' || direction !== 'north') return null;
  const tick = Math.floor(Math.max(0, timeSeconds) * manifest.clip.fps) % manifest.timeline.length;
  return { source: manifest.timeline[tick], logicalFrame: manifest.logicalFrame, pivot: manifest.pivot, density: manifest.density, tick };
}
export function drawDonorF6North(ctx, image, resolved, footX, footY, scale = 1) {
  if (!resolved || !image) return false;
  ctx.save(); ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, footX - resolved.pivot.x * scale, footY - resolved.pivot.y * scale,
    resolved.logicalFrame.width * scale, resolved.logicalFrame.height * scale);
  ctx.restore(); return true;
}
