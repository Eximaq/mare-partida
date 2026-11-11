(() => {
  'use strict';

  const dialog = document.querySelector('.pix-dialog');
  const amount = dialog.querySelector('.pix-amount');
  const imageSlot = dialog.querySelector('.pix-image');
  const status = dialog.querySelector('.pix-status');
  const copy = dialog.querySelector('.pix-copy');
  const feedback = dialog.querySelector('.pix-copy-feedback');
  const manualCode = dialog.querySelector('.pix-copy-manual');
  const close = dialog.querySelector('.pix-close');
  const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  let currentPayment;

  for (const button of document.querySelectorAll('[data-pix-amount]')) {
    button.addEventListener('click', () => {
      const value = button.dataset.pixAmount;
      const qr = button.dataset.pixQr;
      const codeSource = button.dataset.pixCode;
      const payment = { code: '' };
      currentPayment = payment;
      amount.textContent = formatter.format(Number(value));
      imageSlot.replaceChildren();
      status.textContent = 'Pix temporariamente indisponível.';
      copy.disabled = true;
      feedback.textContent = '';
      manualCode.hidden = true;
      manualCode.value = '';
      dialog.showModal();

      if (codeSource?.split('?')[0] === `./assets/pix-${value}.txt`) {
        fetch(codeSource).then(response => {
          if (!response.ok) throw new Error('Código Pix indisponível');
          return response.text();
        }).then(text => {
          if (currentPayment !== payment || !dialog.open) return;
          const code = text.trim();
          if (!code.startsWith('000201')) throw new Error('Código Pix inválido');
          payment.code = code;
          copy.disabled = false;
        }).catch(() => {
          if (currentPayment !== payment || !dialog.open) return;
          feedback.textContent = 'Código para copiar indisponível. Tente novamente mais tarde.';
        });
      }

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
        status.textContent = 'Escaneie o QR Code ou use Pix Copia e Cola no app do seu banco.';
      }).catch(() => {
        if (!image.isConnected || !dialog.open) return;
        image.remove();
        status.textContent = 'QR Code indisponível. Tente novamente mais tarde.';
      });
    });
  }

  copy.addEventListener('click', async () => {
    const payment = currentPayment;
    if (!payment?.code) return;
    try {
      await navigator.clipboard.writeText(payment.code);
      if (currentPayment !== payment || !dialog.open) return;
      manualCode.hidden = true;
      feedback.textContent = 'Código copiado!';
    } catch {
      if (currentPayment !== payment || !dialog.open) return;
      feedback.textContent = 'Selecione e copie o código abaixo.';
      manualCode.value = payment.code;
      manualCode.hidden = false;
      manualCode.focus();
      manualCode.select();
    }
  });

  close.addEventListener('click', () => dialog.close());
})();
