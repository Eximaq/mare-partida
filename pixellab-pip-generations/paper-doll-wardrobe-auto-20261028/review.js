(async function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const data = await fetch('review-data.json').then(r => { if (!r.ok) throw Error('Referências indisponíveis'); return r.json(); });
  const review = WardrobeReview.createReview(data);
  const cache = new Map();
  function image(path) {
    if (!path) return Promise.resolve(null);
    if (!cache.has(path)) cache.set(path, new Promise((resolve, reject) => { const im = new Image(); im.onload = () => resolve(im); im.onerror = () => reject(Error('Imagem ausente: ' + path)); im.src = path; }));
    return cache.get(path);
  }
  let selected = 'pants', revision = 0;
  for (const piece of review.pieces) {
    const button = document.createElement('button');
    button.textContent = piece.label; button.type = 'button'; button.dataset.id = piece.id;
    button.addEventListener('click', () => { selected = piece.id; render(); });
    $('pieces').append(button);
  }
  function paint(id, source, layer) {
    const canvas = $(id), context = canvas.getContext('2d');
    context.clearRect(0, 0, 64, 64); context.imageSmoothingEnabled = false;
    if (source) context.drawImage(source, 0, 0);
    if (layer) context.drawImage(layer, 0, 0);
    if ($('pivot').checked) {
      context.fillStyle = '#5ef4ff'; context.fillRect(28, 52, 9, 1); context.fillRect(32, 48, 1, 9);
    }
    const scale = Math.max(1, Math.min(Number($('scale').value), Math.floor((canvas.parentElement.clientWidth - 8) / 64)));
    canvas.style.width = canvas.style.height = (64 * scale) + 'px';
  }
  async function render() {
    const token = ++revision, { piece, reference: ref } = review.get(selected, $('direction').value);
    $('piece-title').textContent = piece.label;
    $('note').textContent = piece.note;
    for (const button of $('pieces').children) button.setAttribute('aria-pressed', String(button.dataset.id === selected));
    $('raw-status').textContent = ref.image ? 'Referência bruta sem aprovação; pode conter alterações indevidas.' : (ref.note || 'Não gerado após reprovação da primeira vista.');
    const erasures = ref.audit?.skipped_alpha_erasures.length || 0;
    $('candidate-status').textContent = ref.layer ? ('Somente peça dentro da máscara, ainda não aprovada.' + (erasures ? ` ${erasures} pixels que a edição apagaria foram preservados do corpo original; requer revisão.` : '')) : 'Sem camada extraída nesta vista. Nenhum fallback é apresentado como peça nova.';
    $('geometry').textContent = 'Referência 64×64; pivô 32/52. Padding transparente 10/13 restaura 84×84 e pivô 42/65, sem redimensionamento.';
    $('usage').textContent = `${data.usage.confirmedGenerations} gerações com recibo; 1 tentativa sem custo confirmado, reservada em 1. Nenhuma transferência de animação nem retry foi enviado.`;
    $('audit').textContent = JSON.stringify(ref.audit || { status: ref.status, jobId: ref.jobId || null, note: ref.note || piece.note }, null, 2);
    try {
      const [body, raw, layer] = await Promise.all([image(ref.source), image(ref.image), image(ref.layer)]);
      if (token !== revision) return;
      paint('source', body); paint('raw', raw); paint('candidate', ref.layer && !$('layer-only').checked ? body : null, layer);
      document.documentElement.dataset.ready = 'true';
    } catch (error) { if (token === revision) $('note').textContent = error.message; }
  }
  for (const id of ['direction', 'scale', 'pivot', 'layer-only']) $(id).addEventListener('change', render);
  window.addEventListener('resize', render);
  render();
})().catch(error => { document.getElementById('note').textContent = error.message; });
