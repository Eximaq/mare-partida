(() => {
  'use strict';

  const community = {
    instagram: '',
    discord: '',
  };
  const pix = {
    enabled: false,
    claimUrl: '',
  };
  const destinations = {
    instagram: /^https:\/\/(?:www\.)?instagram\.com\/[\w.]+\/?$/i,
    discord: /^https:\/\/(?:discord\.gg\/|discord\.com\/invite\/)[\w-]+\/?$/i,
  };

  for (const [platform, url] of Object.entries(community)) {
    if (!destinations[platform].test(url)) continue;
    const link = document.querySelector(`[data-community="${platform}"]`);
    link.href = url;
    link.hidden = false;
    document.querySelector(`[data-community-status="${platform}"]`).hidden = true;
  }

  const claimChannel = /^https:\/\/discord\.com\/channels\/\d+\/\d+\/?$/;
  if (!pix.enabled || !claimChannel.test(pix.claimUrl)) return;

  for (const payment of document.querySelectorAll('[data-pix]')) {
    const amount = payment.dataset.pix;
    const qr = new Image(232, 232);
    qr.className = 'pix-code';
    qr.alt = `QR Code Pix de R$ ${amount}`;
    qr.src = `./assets/pix-${amount}.png`;
    qr.decode().then(() => {
      payment.querySelector('.pix-instructions').prepend(qr);
      payment.querySelector('.pix-claim').href = pix.claimUrl;
      payment.previousElementSibling.hidden = true;
      payment.hidden = false;
    }).catch(() => {
      // Keep the availability message if the QR image cannot be loaded.
    });
  }
})();
