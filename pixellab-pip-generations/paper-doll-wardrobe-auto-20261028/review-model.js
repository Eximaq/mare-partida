(function (root) {
  'use strict';
  function createReview(data) {
    if (data.schema !== 'mare-equipment-art-review-v1' || data.productionEnabled !== false || data.approved !== false) throw Error('Review-only data required');
    const directions = ['south', 'north', 'west', 'east'];
    const ids = new Set();
    for (const piece of data.pieces) {
      if (ids.has(piece.id) || piece.productionEnabled !== false || piece.approved !== false || piece.complete !== false) throw Error('Invalid draft');
      ids.add(piece.id);
      for (const direction of directions) {
        const ref = piece.references[direction];
        if (!ref) throw Error('Missing direction status');
        for (const key of ['source', 'image', 'layer', 'mask']) {
          if (ref[key] && !/^(source|originals|candidates|masks)\/[a-z0-9-]+\.png$/.test(ref[key])) throw Error('Unsafe image path');
        }
      }
    }
    return {
      pieces: data.pieces,
      get(id, direction) {
        if (!directions.includes(direction)) throw Error('Unknown direction');
        const piece = data.pieces.find(p => p.id === id) || data.pieces[0];
        return { piece, reference: piece.references[direction] };
      }
    };
  }
  function candidateStatus(ref) {
    if (!ref.layer) return 'Sem camada extraída nesta vista. Nenhum fallback é apresentado como peça nova.';
    if (ref.method === 'masked-pro-flash') return 'Camada gerada diretamente sob máscara; perfil e pixels protegidos preservados. Referência estática ainda não aprovada para produção.';
    const erasures = ref.audit?.skipped_alpha_erasures?.length || 0;
    return 'Somente peça dentro da máscara, ainda não aprovada.' + (erasures ? ` ${erasures} pixels que a edição apagaria foram preservados do corpo original; requer revisão.` : '');
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { createReview, candidateStatus };
  else root.WardrobeReview = { createReview, candidateStatus };
})(typeof globalThis !== 'undefined' ? globalThis : this);
