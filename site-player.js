(() => {
  const stateKey = 'tears-off-player-state';
  const player = document.getElementById('track-player') || document.body.appendChild(document.createElement('audio'));
  player.id = 'track-player';
  player.preload = 'none';

  const buttons = [...document.querySelectorAll('.play-button')];
  const albumName = document.querySelector('h1')?.textContent.trim() || 'Tears Off';
  const cover = document.querySelector('.cover, .album-cover img')?.src || '';
  const tracks = buttons.map((button, index) => ({
    title: button.closest('li')?.querySelector('.track-title')?.textContent.trim() || `Track ${index + 1}`,
    src: new URL(button.dataset.src, window.location.href).href
  }));
  let currentIndex = -1;
  let albumMode = false;
  let saveTimer;
  let playAlbumButton = document.querySelector('.play-album');
  if (!playAlbumButton && tracks.length) {
    playAlbumButton = document.createElement('button');
    playAlbumButton.className = 'button play-album';
    playAlbumButton.type = 'button';
    playAlbumButton.textContent = 'Play Album';
    const trackHeading = document.querySelector('#tracks-title') || document.querySelector('.tracklist')?.previousElementSibling?.querySelector('h2');
    trackHeading?.insertAdjacentElement('afterend', playAlbumButton);
  }

  const ui = document.createElement('div');
  ui.className = 'site-player';
  ui.hidden = true;
  ui.innerHTML = '<div class="site-player__copy"><span class="site-player__eyebrow">Now playing</span><span class="site-player__title">Tears Off</span></div><div class="site-player__controls"><button type="button" data-player-previous aria-label="Previous track">‹</button><button type="button" data-player-toggle aria-label="Play">Play</button><button type="button" data-player-next aria-label="Next track">›</button></div>';
  document.body.appendChild(ui);

  const titleNode = ui.querySelector('.site-player__title');
  const toggle = ui.querySelector('[data-player-toggle]');
  const previous = ui.querySelector('[data-player-previous]');
  const next = ui.querySelector('[data-player-next]');

  const style = document.createElement('style');
  style.textContent = '.site-player{position:fixed;z-index:20;right:max(1rem,env(safe-area-inset-right));bottom:max(1rem,env(safe-area-inset-bottom));left:max(1rem,env(safe-area-inset-left));display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.75rem 1rem;border:1px solid rgba(244,240,232,.25);border-radius:.5rem;background:rgba(32,35,31,.96);box-shadow:0 .6rem 2rem rgba(0,0,0,.3);color:#f4f0e8;font-family:ui-sans-serif,system-ui,sans-serif}.site-player[hidden]{display:none}.site-player__copy{display:grid;min-width:0}.site-player__eyebrow{color:#d9a99b;font-size:.62rem;font-weight:800;letter-spacing:.11em;text-transform:uppercase}.site-player__title{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.8rem}.site-player__controls{display:flex;align-items:center;gap:.35rem}.site-player button{min-width:2.35rem;min-height:2.35rem;border:1px solid rgba(244,240,232,.35);border-radius:999px;background:transparent;color:inherit;font:700 .7rem/1 ui-sans-serif,system-ui,sans-serif;cursor:pointer}.site-player button:hover{border-color:#d9a99b;color:#d9a99b}@media(min-width:42rem){.site-player{left:auto;width:min(30rem,calc(100% - 2rem))}}';
  document.head.appendChild(style);

  const readState = () => {
    try { return JSON.parse(sessionStorage.getItem(stateKey) || 'null'); } catch { return null; }
  };
  const writeState = () => {
    if (!player.src) return;
    try {
      sessionStorage.setItem(stateKey, JSON.stringify({
        src: player.src,
        time: player.currentTime || 0,
        playing: !player.paused,
        index: currentIndex,
        albumMode,
        albumName,
        cover,
        title: titleNode.textContent,
        tracks
      }));
    } catch {}
  };
  const resetButtons = () => buttons.forEach(button => {
    button.textContent = 'Play';
    button.setAttribute('aria-pressed', 'false');
  });
  const syncButtons = () => {
    resetButtons();
    if (!player.paused && currentIndex >= 0 && buttons[currentIndex]) {
      buttons[currentIndex].textContent = 'Pause';
      buttons[currentIndex].setAttribute('aria-pressed', 'true');
    }
    toggle.textContent = player.paused ? 'Play' : 'Pause';
    toggle.setAttribute('aria-label', player.paused ? 'Play' : 'Pause');
  };
  const updateMediaSession = () => {
    if (!('mediaSession' in navigator)) return;
    const active = tracks[currentIndex] || { title: titleNode.textContent, src: player.src };
    if ('MediaMetadata' in window) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: active.title || 'Tears Off', artist: 'Tears Off · Marek Šniager', album: albumName,
        artwork: cover ? [{ src: cover, sizes: '600x600', type: 'image/jpeg' }] : []
      });
    }
    navigator.mediaSession.playbackState = player.paused ? 'paused' : 'playing';
  };
  const setTrack = (index, start = false) => {
    if (!tracks.length || index < 0 || index >= tracks.length) return;
    currentIndex = index;
    const track = tracks[currentIndex];
    if (player.src !== track.src) player.src = track.src;
    titleNode.textContent = track.title;
    ui.hidden = false;
    updateMediaSession();
    if (start) player.play().catch(() => syncButtons());
    syncButtons();
    writeState();
  };
  const playAlbum = () => { albumMode = true; setTrack(0, true); };
  const playNext = () => {
    if (!tracks.length) return;
    albumMode = true;
    setTrack(Math.min(currentIndex + 1, tracks.length - 1), true);
  };
  const playPrevious = () => {
    if (!tracks.length) return;
    albumMode = true;
    setTrack(Math.max(currentIndex - 1, 0), true);
  };

  buttons.forEach((button, index) => button.addEventListener('click', () => {
    if (currentIndex === index && !player.paused) {
      player.pause();
      return;
    }
    albumMode = false;
    setTrack(index, true);
  }));
  playAlbumButton?.addEventListener('click', playAlbum);
  toggle.addEventListener('click', () => {
    if (!player.src && tracks.length) setTrack(0, false);
    if (!player.src) return;
    if (player.paused) player.play().catch(() => syncButtons()); else player.pause();
  });
  previous.addEventListener('click', playPrevious);
  next.addEventListener('click', playNext);
  player.addEventListener('play', () => { ui.hidden = false; syncButtons(); updateMediaSession(); writeState(); });
  player.addEventListener('pause', () => { syncButtons(); updateMediaSession(); writeState(); });
  player.addEventListener('timeupdate', () => {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(writeState, 300);
  });
  player.addEventListener('ended', () => {
    if (albumMode && currentIndex < tracks.length - 1) setTrack(currentIndex + 1, true);
    else { albumMode = false; syncButtons(); writeState(); }
  });
  window.addEventListener('pagehide', writeState);
  if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('play', () => player.play().catch(() => {}));
    navigator.mediaSession.setActionHandler('pause', () => player.pause());
    navigator.mediaSession.setActionHandler('previoustrack', playPrevious);
    navigator.mediaSession.setActionHandler('nexttrack', playNext);
  }

  const saved = readState();
  if (saved?.src) {
    const savedTracks = Array.isArray(saved.tracks) ? saved.tracks : [];
    if (!tracks.length || saved.albumName !== albumName) {
      tracks.splice(0, tracks.length, ...savedTracks);
    }
    currentIndex = saved.index ?? tracks.findIndex(track => track.src === saved.src);
    albumMode = Boolean(saved.albumMode);
    player.src = saved.src;
    titleNode.textContent = saved.title || tracks[currentIndex]?.title || 'Tears Off';
    ui.hidden = false;
    player.addEventListener('loadedmetadata', () => { if (saved.time) player.currentTime = saved.time; }, { once: true });
    if (saved.playing) player.play().catch(() => { syncButtons(); updateMediaSession(); });
    else { syncButtons(); updateMediaSession(); }
  }
})();
