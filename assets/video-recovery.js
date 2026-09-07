// Playback guard for mobile browsers: wait for usable media data, keep the
// muted state declarative, and allow one targeted retry if playback stalls at startup.
(() => {
  const video = document.getElementById('main-video');
  if (!video) return;

  const source = video.querySelector('source');
  const status = document.getElementById('video-status');
  const playButton = document.getElementById('video-play');
  let recoveryUsed = false;
  let hasPlayedOnce = false;
  let recoveryTimer = 0;
  let activePlay = null;

  function ensureMobilePlaybackAttributes() {
    video.muted = true;
    video.defaultMuted = true;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('preload', 'auto');
  }

  function waitForPlayableData(timeout = 10000) {
    if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      let timeoutId;

      const cleanup = () => {
        window.clearTimeout(timeoutId);
        video.removeEventListener('canplay', onReady);
        video.removeEventListener('loadeddata', onReady);
        video.removeEventListener('error', onError);
      };

      const onReady = () => {
        cleanup();
        resolve();
      };

      const onError = () => {
        cleanup();
        reject(video.error || new Error('La vidéo n’a pas pu être chargée.'));
      };

      timeoutId = window.setTimeout(() => {
        cleanup();
        reject(new Error('La vidéo n’a pas fourni assez de données à temps.'));
      }, timeout);

      video.addEventListener('canplay', onReady);
      video.addEventListener('loadeddata', onReady);
      video.addEventListener('error', onError);
    });
  }

  function resetVideo({ bypassCache = false } = {}) {
    video.pause();
    video.currentTime = 0;

    if (bypassCache && source) {
      const url = new URL(source.getAttribute('src'), document.baseURI);
      url.searchParams.set('retry', '1');
      source.setAttribute('src', `${url.pathname}${url.search}${url.hash}`);
    }

    video.load();
  }

  function showManualPlay() {
    if (playButton) playButton.hidden = false;
    if (status) status.textContent = 'Touchez pour lancer le film.';
  }

  async function playInvitationVideo({ reset = false, preferSound = !video.muted } = {}) {
    if (activePlay) return activePlay;

    activePlay = (async () => {
      ensureMobilePlaybackAttributes();
      if (reset) resetVideo();

      try {
        await waitForPlayableData();
        await video.play();

        if (preferSound) {
          video.muted = false;
          try {
            await video.play();
          } catch {
            // A delayed unmute is commonly rejected on iOS; keep the film playing silently.
            video.muted = true;
            showManualPlay();
          }
        }
      } catch (error) {
        if (!recoveryUsed) {
          recoveryUsed = true;
          resetVideo({ bypassCache: true });
          await waitForPlayableData().then(() => video.play());
          return;
        }

        console.error('Video playback failed:', error);
        showManualPlay();
        throw error;
      } finally {
        activePlay = null;
      }
    })();

    return activePlay;
  }

  function scheduleStartupRecovery() {
    if (recoveryUsed || recoveryTimer || !hasPlayedOnce || video.paused) return;
    if (video.currentTime >= 1.5) return;

    recoveryTimer = window.setTimeout(() => {
      recoveryTimer = 0;
      if (recoveryUsed || video.paused || video.currentTime >= 1.5) return;

      recoveryUsed = true;
      resetVideo({ bypassCache: true });
      playInvitationVideo({ preferSound: false }).catch(() => {});
    }, 1200);
  }

  ensureMobilePlaybackAttributes();
  video.addEventListener('playing', () => {
    hasPlayedOnce = true;
    if (playButton) playButton.hidden = true;
    if (status) status.textContent = '';
  });
  video.addEventListener('timeupdate', () => {
    if (video.currentTime >= 1.5 && recoveryTimer) {
      window.clearTimeout(recoveryTimer);
      recoveryTimer = 0;
    }
  });
  video.addEventListener('waiting', scheduleStartupRecovery);
  video.addEventListener('stalled', scheduleStartupRecovery);
  video.addEventListener('error', () => {
    if (!recoveryUsed && !video.paused) scheduleStartupRecovery();
  });

  window.installInvitationVideoRecovery = () => {
    window.playInvitationVideo = playInvitationVideo;
    window.invitationVideoPlayback = {
      play: playInvitationVideo,
      reset: () => resetVideo(),
    };
  };
})();

