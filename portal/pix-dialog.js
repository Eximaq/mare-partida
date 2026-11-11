(() => {
  'use strict';

  const dialog = document.querySelector('.pix-dialog');
  const amount = dialog.querySelector('.pix-amount');
  const imageSlot = dialog.querySelector('.pix-image');
  const status = dialog.querySelector('.pix-status');
  const close = dialog.querySelector('.pix-close');
  const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

  for (const button of document.querySelectorAll('[data-pix-amount]')) {
    button.addEventListener('click', () => {
      const value = button.dataset.pixAmount;
      const qr = button.dataset.pixQr;
      amount.textContent = formatter.format(Number(value));
      imageSlot.replaceChildren();
      status.textContent = 'Pix temporariamente indisponível.';
      dialog.showModal();
      if (!qr || qr.split('?')[0] !== `./assets/pix-${value}.png`) return;

      const image = new Image(232, 232);
      image.alt = `QR Code Pix de ${amount.textContent}`;
      image.hidden = true;
      imageSlot.append(image);
      status.textContent = 'Carregando QR Code…';
      image.src = qr;
      image.decode().then(() => {
        if (!image.isConnected || !dialog.open) return;
        image.hidden = false;
        status.textContent = 'Escaneie no app do seu banco e confira o valor antes de confirmar.';
      }).catch(() => {
        if (!image.isConnected || !dialog.open) return;
        image.remove();
        status.textContent = 'QR Code indisponível. Tente novamente mais tarde.';
      });
    });
  }

  close.addEventListener('click', () => dialog.close());
})();
