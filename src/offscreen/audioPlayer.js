const audio = new Audio();
audio.volume = 0.8;

let currentTrackId = "";
let lastProgressSentAt = 0;

function normalizeVolume(volume) {
  const numericVolume = Number(volume);

  if (!Number.isFinite(numericVolume)) {
    return audio.volume;
  }

  return Math.min(1, Math.max(0, numericVolume));
}

function normalizePlaybackTime(time) {
  const numericTime = Number(time);

  if (!Number.isFinite(numericTime) || numericTime < 0) {
    return 0;
  }

  return numericTime;
}

function getAudioProgress() {
  return {
    position: normalizePlaybackTime(audio.currentTime),
    duration: normalizePlaybackTime(audio.duration)
  };
}

function sendProgress({ force = false } = {}) {
  const now = Date.now();

  if (!force && now - lastProgressSentAt < 500) {
    return;
  }

  lastProgressSentAt = now;

  chrome.runtime
    .sendMessage({
      target: "background-music",
      type: "MUSIC_TRACK_PROGRESS",
      trackId: currentTrackId,
      progress: getAudioProgress()
    })
    .catch(() => {});
}

audio.addEventListener("ended", () => {
  sendProgress({ force: true });
  chrome.runtime.sendMessage({
    target: "background-music",
    type: "MUSIC_TRACK_ENDED",
    trackId: currentTrackId
  });
});

audio.addEventListener("error", () => {
  chrome.runtime.sendMessage({
    target: "background-music",
    type: "MUSIC_TRACK_ERROR",
    trackId: currentTrackId,
    error: "Audio stream failed."
  });
});

audio.addEventListener("loadedmetadata", () => {
  sendProgress({ force: true });
});

audio.addEventListener("durationchange", () => {
  sendProgress({ force: true });
});

audio.addEventListener("timeupdate", () => {
  sendProgress();
});

audio.addEventListener("seeked", () => {
  sendProgress({ force: true });
});

async function playTrack(track, volume) {
  currentTrackId = track.id;
  audio.volume = normalizeVolume(volume);
  audio.src = track.sourceUrl;
  audio.load();
  await audio.play();
  sendProgress({ force: true });
}

function pauseTrack() {
  audio.pause();
}

async function resumeTrack() {
  await audio.play();
}

function stopTrack() {
  audio.pause();
  currentTrackId = "";
  audio.removeAttribute("src");
  audio.load();
  sendProgress({ force: true });
}

function setVolume(volume) {
  audio.volume = normalizeVolume(volume);
}

function seekTrack(position) {
  const duration = normalizePlaybackTime(audio.duration);
  const nextPosition = normalizePlaybackTime(position);
  audio.currentTime = duration > 0 ? Math.min(nextPosition, duration) : nextPosition;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.target !== "offscreen-audio") {
    return false;
  }

  Promise.resolve()
    .then(async () => {
      if (message.type === "PLAY_TRACK") {
        await playTrack(message.track, message.volume);
      }

      if (message.type === "PAUSE_TRACK") {
        pauseTrack();
      }

      if (message.type === "RESUME_TRACK") {
        await resumeTrack();
      }

      if (message.type === "STOP_TRACK") {
        stopTrack();
      }

      if (message.type === "SET_VOLUME") {
        setVolume(message.volume);
      }

      if (message.type === "SEEK_TRACK") {
        seekTrack(message.position);
      }

      sendResponse({ ok: true, progress: getAudioProgress() });
    })
    .catch((error) => {
      console.error(error);
      sendResponse({ ok: false, error: error.message });
    });

  return true;
});
