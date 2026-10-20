/* Maré Partida — música de ambiente desacoplada das regras do jogo.
 * Mapeamento: lobby -> porto-das-correntes; hunt -> trilha-cacada.
 * Não lê nem modifica o save do personagem.
 */
(() => {
  'use strict';
  const SETTINGS_KEY = 'mare-partida-audio-v1';
  const SOURCES = {
    lobby: 'assets/audio/porto-das-correntes.mp3',
    hunt: 'assets/audio/trilha-cacada.mp3',
  };
  const LABELS = { lobby: 'Porto das Correntes', hunt: 'Expedição' };
  let settings = { muted: false, volume: 0.30 };
  try {
    const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
    if (stored && typeof stored === 'object') {
      settings.muted = stored.muted === true;
      if (Number.isFinite(stored.volume)) settings.volume = Math.max(0, Math.min(1, stored.volume));
    }
  } catch (_) { /* Navegação privada ou preferência inválida: usar padrão. */ }

  const tracks = Object.fromEntries(Object.entries(SOURCES).map(([key, path]) => {
    const audio = new Audio(new URL(path, document.baseURI).href);
    audio.loop = true;
    audio.preload = 'none';
    audio.volume = 0;
    return [key, audio];
  }));
  const gains = { lobby: 0, hunt: 0 };
  let dock;
  let muteButton;
  let volumeSlider;
  let locationLabel;
  let unlocked = false;
  let current = null;
  let fadeId = 0;
  let fadeFrame = 0;

  function persist() {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (_) { /* Sem armazenamento, controle continua funcional. */ }
  }
  function scene() {
    if (document.body.classList.contains('scene-hunt')) return 'hunt';
    if (document.body.classList.contains('scene-lobby')) return 'lobby';
    return null; // Criação de personagem: não reproduzir música antes de iniciar.
  }
  function applyVolumes() {
    for (const id of Object.keys(tracks)) {
      tracks[id].volume = Math.max(0, Math.min(1, gains[id] * settings.volume));
    }
  }
  function paint() {
    if (!muteButton) return;
    muteButton.textContent = settings.muted ? '♪̸' : '♫';
    muteButton.setAttribute('aria-pressed', String(!settings.muted));
    muteButton.setAttribute('aria-label', settings.muted ? 'Ativar música' : 'Silenciar música');
    muteButton.title = settings.muted ? 'Ativar trilha sonora' : 'Silenciar trilha sonora';
    volumeSlider.value = String(Math.round(settings.volume * 100));
    locationLabel.textContent = settings.muted ? 'Música silenciada' : (LABELS[scene()] || 'Música ambiente');
  }
  function transition() {
    const target = unlocked && !settings.muted && settings.volume > 0 && !document.hidden ? scene() : null;
    if (target === current && (!target || !tracks[target].paused)) {
      applyVolumes();
      paint();
      return;
    }
    current = target;
    fadeId += 1;
    cancelAnimationFrame(fadeFrame);
    const thisFade = fadeId;
    const starting = { ...gains };
    if (target) {
      tracks[target].play().catch(() => {
        // Alguns navegadores ainda exigem clique explícito no controle de áudio.
        if (thisFade === fadeId) { unlocked = false; current = null; transition(); }
      });
    }
    const start = performance.now();
    function step(now) {
      if (thisFade !== fadeId) return;
      const t = Math.min(1, (now - start) / 750);
      for (const id of Object.keys(tracks)) {
        gains[id] = starting[id] + ((id === target ? 1 : 0) - starting[id]) * t;
      }
      applyVolumes();
      if (t < 1) fadeFrame = requestAnimationFrame(step);
      else for (const id of Object.keys(tracks)) if (id !== target) tracks[id].pause();
    }
    fadeFrame = requestAnimationFrame(step);
    paint();
  }
  function unlock() {
    if (!unlocked) unlocked = true;
    transition();
  }
  function init() {
    const parent = document.querySelector('.topbar');
    if (!parent || document.getElementById('mareMusicDock')) return;
    dock = document.createElement('div');
    dock.id = 'mareMusicDock';
    dock.className = 'mare-music-dock';
    dock.setAttribute('role', 'group');
    dock.setAttribute('aria-label', 'Trilha sonora do jogo');
    dock.innerHTML = '<button class="mare-music-toggle" type="button" aria-pressed="true" aria-label="Silenciar música">♫</button>' +
      '<div class="mare-music-detail"><span class="mare-music-location">Música ambiente</span>' +
      '<input class="mare-music-volume" type="range" min="0" max="100" step="1" aria-label="Volume da música" title="Volume da música"></div>';
    parent.appendChild(dock);
    muteButton = dock.querySelector('.mare-music-toggle');
    volumeSlider = dock.querySelector('.mare-music-volume');
    locationLabel = dock.querySelector('.mare-music-location');
    muteButton.addEventListener('click', () => {
      unlocked = true;
      settings.muted = !settings.muted;
      persist();
      transition();
    });
    volumeSlider.addEventListener('input', () => {
      unlocked = true;
      settings.volume = Number(volumeSlider.value) / 100;
      settings.muted = settings.volume === 0;
      persist();
      transition();
      applyVolumes();
    });
    document.addEventListener('pointerdown', unlock, { capture: true });
    document.addEventListener('keydown', unlock, { capture: true });
    document.addEventListener('visibilitychange', transition);
    new MutationObserver(transition).observe(document.body, { attributes: true, attributeFilter: ['class'] });
    paint();
    transition();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
  // Somente leitura, útil para verificar o comportamento sem alterar o jogo.
  window.MareAudio = Object.freeze({ getState: () => ({ scene: scene(), muted: settings.muted, volume: settings.volume, unlocked, track: current }) });
})();
