import {
  configureMusicProvider,
  connectMusicProvider,
  disconnectMusicProvider,
  fetchAudioSource,
  getAvailableMusicProviders,
  getMusicProviderAuthStatus
} from "./features/music/musicProviders.js";

const OFFSCREEN_DOCUMENT_PATH = "src/offscreen/offscreen.html";
const PLAYBACK_STATE_KEY = "music.playbackState";
const PLAYBACK_HISTORY_LIMIT = 20;
const RESTART_TRACK_THRESHOLD_SECONDS = 4;

const playbackState = {
  queue: [],
  history: [],
  currentTrack: null,
  status: "idle",
  error: "",
  volume: 0.8,
  position: 0,
  duration: 0,
  autoplay: {
    enabled: false,
    providerId: "itunesPreview",
    library: [],
    upcoming: []
  }
};
let hasHydratedPlaybackState = false;

function wait(milliseconds) {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, milliseconds);
  });
}

function normalizePlaybackState(state) {
  return {
    queue: Array.isArray(state?.queue) ? state.queue : [],
    history: Array.isArray(state?.history) ? state.history.slice(-PLAYBACK_HISTORY_LIMIT) : [],
    currentTrack: state?.currentTrack ?? null,
    status: state?.status ?? "idle",
    error: state?.error ?? "",
    volume: normalizeVolume(state?.volume),
    position: normalizePlaybackTime(state?.position),
    duration: normalizePlaybackTime(state?.duration),
    autoplay: {
      enabled: Boolean(state?.autoplay?.enabled),
      providerId: state?.autoplay?.providerId ?? "itunesPreview",
      library: normalizeAutoplayLibrary(state?.autoplay?.library),
      upcoming: normalizeAutoplayLibrary(state?.autoplay?.upcoming)
    }
  };
}

function getPublicState() {
  return {
    queue: playbackState.queue,
    history: playbackState.history,
    currentTrack: playbackState.currentTrack,
    status: playbackState.status,
    error: playbackState.error,
    volume: playbackState.volume,
    position: playbackState.position,
    duration: playbackState.duration,
    autoplay: playbackState.autoplay
  };
}

function normalizeVolume(volume) {
  const numericVolume = Number(volume);

  if (!Number.isFinite(numericVolume)) {
    return 0.8;
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

function applyPlaybackProgress(progress = {}) {
  playbackState.position = normalizePlaybackTime(progress.position);
  playbackState.duration = normalizePlaybackTime(progress.duration);
}

function isCurrentTrackMessage(message) {
  return !message.trackId || message.trackId === playbackState.currentTrack?.id;
}

function normalizeAutoplayLibrary(library) {
  return Array.isArray(library)
    ? library.map((item) => String(item).trim()).filter(Boolean)
    : [];
}

function shuffleItems(items) {
  const shuffledItems = [...items];

  for (let index = shuffledItems.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffledItems[index], shuffledItems[randomIndex]] = [shuffledItems[randomIndex], shuffledItems[index]];
  }

  return shuffledItems;
}

function addTrackToHistory(track) {
  if (!track) {
    return;
  }

  playbackState.history = [...playbackState.history, track].slice(-PLAYBACK_HISTORY_LIMIT);
}

async function hydratePlaybackState() {
  if (hasHydratedPlaybackState) {
    return;
  }

  const storedState = await chrome.storage.session.get(PLAYBACK_STATE_KEY);
  Object.assign(playbackState, normalizePlaybackState(storedState[PLAYBACK_STATE_KEY]));
  hasHydratedPlaybackState = true;
}

async function persistPlaybackState() {
  await chrome.storage.session.set({
    [PLAYBACK_STATE_KEY]: getPublicState()
  });
}

async function ensureOffscreenDocument() {
  const offscreenUrl = chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH);

  if (await chrome.offscreen.hasDocument()) {
    return;
  }

  await chrome.offscreen.createDocument({
    url: offscreenUrl,
    reasons: ["AUDIO_PLAYBACK"],
    justification: "TabFlow plays queued music previews from the new tab page."
  });
}

async function sendToAudioPlayer(message) {
  await ensureOffscreenDocument();

  let lastError = null;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const response = await chrome.runtime.sendMessage({ target: "offscreen-audio", ...message });

      if (!response?.ok) {
        throw new Error(response?.error ?? "Audio player unavailable.");
      }

      return response;
    } catch (error) {
      lastError = error;

      if (!String(error.message).includes("Receiving end does not exist")) {
        break;
      }

      await wait(100);
    }
  }

  throw lastError ?? new Error("Audio player unavailable.");
}

function broadcastState({ shouldPersist = true } = {}) {
  if (shouldPersist) {
    persistPlaybackState().catch((error) => {
      console.error(error);
    });
  }

  chrome.runtime
    .sendMessage({
      target: "newtab-music",
      type: "MUSIC_STATE_CHANGED",
      state: getPublicState()
    })
    .catch(() => {});
}

async function playNextTrack() {
  let nextTrack = playbackState.queue.shift() ?? null;
  const previousTrack = playbackState.currentTrack;
  playbackState.error = "";

  if (!nextTrack && playbackState.autoplay.enabled) {
    playbackState.currentTrack = null;
    playbackState.status = "loading";
    broadcastState();

    try {
      nextTrack = await getNextAutoplayTrack();
    } catch (error) {
      console.error(error);
      playbackState.status = "error";
      playbackState.error = error.message;
      broadcastState();
      return getPublicState();
    }
  }

  if (!nextTrack) {
    playbackState.currentTrack = null;
    playbackState.status = "idle";
    playbackState.position = 0;
    playbackState.duration = 0;
    broadcastState();
    return getPublicState();
  }

  addTrackToHistory(previousTrack);
  playbackState.currentTrack = nextTrack;
  playbackState.status = "loading";
  playbackState.position = 0;
  playbackState.duration = 0;
  broadcastState();

  try {
    if (nextTrack.playbackType !== "direct-audio") {
      throw new Error(`${nextTrack.source} playback is not wired to a direct audio stream yet.`);
    }

    const response = await sendToAudioPlayer({
      type: "PLAY_TRACK",
      track: nextTrack,
      volume: playbackState.volume
    });
    applyPlaybackProgress(response.progress);
    playbackState.status = "playing";
  } catch (error) {
    console.error(error);
    playbackState.status = "error";
    playbackState.error = error.message;
  }

  broadcastState();
  return getPublicState();
}

async function getNextAutoplayTrack() {
  if (!playbackState.autoplay.enabled || playbackState.autoplay.library.length === 0) {
    return null;
  }

  const maxAttempts = playbackState.autoplay.library.length;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (playbackState.autoplay.upcoming.length === 0) {
      playbackState.autoplay.upcoming = shuffleItems(playbackState.autoplay.library);
    }

    const query = playbackState.autoplay.upcoming.shift();

    try {
      return await fetchAudioSource(query, playbackState.autoplay.providerId);
    } catch (error) {
      console.error(error);
      playbackState.error = `Autoplay skipped "${query}".`;
    }
  }

  throw new Error("Autoplay could not resolve a playable track.");
}

async function queueSearch({ query, providerId }) {
  playbackState.status = playbackState.currentTrack ? playbackState.status : "loading";
  playbackState.error = "";
  broadcastState();

  const track = await fetchAudioSource(query, providerId);

  if (!playbackState.currentTrack || playbackState.status === "idle" || playbackState.status === "error") {
    playbackState.queue.unshift(track);
    return playNextTrack();
  }

  playbackState.queue.push(track);
  broadcastState();
  return getPublicState();
}

function removeQueuedTrack(trackId) {
  playbackState.queue = playbackState.queue.filter((track) => track.id !== trackId);
  playbackState.error = "";
  broadcastState();
  return getPublicState();
}

async function restartOrPlayPreviousTrack() {
  if (!playbackState.currentTrack) {
    return getPublicState();
  }

  if (
    playbackState.position > RESTART_TRACK_THRESHOLD_SECONDS ||
    playbackState.history.length === 0
  ) {
    const response = await sendToAudioPlayer({
      type: "SEEK_TRACK",
      position: 0
    });
    applyPlaybackProgress(response.progress);
    playbackState.error = "";
    broadcastState();
    return getPublicState();
  }

  const previousTrack = playbackState.history.pop();
  playbackState.queue.unshift(playbackState.currentTrack);
  playbackState.currentTrack = previousTrack;
  playbackState.status = "loading";
  playbackState.error = "";
  playbackState.position = 0;
  playbackState.duration = 0;
  broadcastState();

  try {
    const response = await sendToAudioPlayer({
      type: "PLAY_TRACK",
      track: previousTrack,
      volume: playbackState.volume
    });
    applyPlaybackProgress(response.progress);
    playbackState.status = "playing";
  } catch (error) {
    console.error(error);
    playbackState.status = "error";
    playbackState.error = error.message;
  }

  broadcastState();
  return getPublicState();
}

async function pausePlayback() {
  if (!playbackState.currentTrack) {
    return getPublicState();
  }

  const response = await sendToAudioPlayer({ type: "PAUSE_TRACK" });
  applyPlaybackProgress(response.progress);
  playbackState.status = "paused";
  broadcastState();
  return getPublicState();
}

async function resumePlayback() {
  if (!playbackState.currentTrack) {
    return playNextTrack();
  }

  const response = await sendToAudioPlayer({ type: "RESUME_TRACK" });
  applyPlaybackProgress(response.progress);
  playbackState.status = "playing";
  broadcastState();
  return getPublicState();
}

async function clearQueue() {
  playbackState.queue = [];
  playbackState.history = [];
  playbackState.currentTrack = null;
  playbackState.status = "idle";
  playbackState.error = "";
  playbackState.position = 0;
  playbackState.duration = 0;
  playbackState.autoplay.enabled = false;
  playbackState.autoplay.upcoming = [];
  await sendToAudioPlayer({ type: "STOP_TRACK" });
  broadcastState();
  return getPublicState();
}

async function setPlaybackVolume(volume) {
  playbackState.volume = normalizeVolume(volume);

  if (playbackState.currentTrack) {
    await sendToAudioPlayer({
      type: "SET_VOLUME",
      volume: playbackState.volume
    });
  }

  broadcastState();
  return getPublicState();
}

async function seekPlayback(position) {
  if (!playbackState.currentTrack) {
    playbackState.position = 0;
    broadcastState();
    return getPublicState();
  }

  const response = await sendToAudioPlayer({
    type: "SEEK_TRACK",
    position: normalizePlaybackTime(position)
  });
  applyPlaybackProgress(response.progress);
  broadcastState();
  return getPublicState();
}

async function startAutoplay({ library, providerId }) {
  const autoplayLibrary = normalizeAutoplayLibrary(library);

  if (autoplayLibrary.length === 0) {
    throw new Error("Add songs or artists in settings before starting autoplay.");
  }

  playbackState.autoplay = {
    enabled: true,
    providerId: providerId ?? "itunesPreview",
    library: autoplayLibrary,
    upcoming: shuffleItems(autoplayLibrary)
  };
  playbackState.error = "";

  if (!playbackState.currentTrack || playbackState.status === "idle" || playbackState.status === "error") {
    return playNextTrack();
  }

  broadcastState();
  return getPublicState();
}

function stopAutoplay() {
  playbackState.autoplay.enabled = false;
  playbackState.autoplay.upcoming = [];
  broadcastState();
  return getPublicState();
}

async function handleMusicMessage(message) {
  await hydratePlaybackState();

  switch (message.type) {
    case "MUSIC_ADD_QUERY":
      return queueSearch({
        query: message.query ?? "",
        providerId: message.providerId
      });
    case "MUSIC_REMOVE_QUEUE_TRACK":
      return removeQueuedTrack(message.trackId);
    case "MUSIC_SET_VOLUME":
      return setPlaybackVolume(message.volume);
    case "MUSIC_SEEK":
      return seekPlayback(message.position);
    case "MUSIC_REWIND":
      return restartOrPlayPreviousTrack();
    case "MUSIC_AUTOPLAY_START":
      return startAutoplay({
        library: message.library,
        providerId: message.providerId
      });
    case "MUSIC_AUTOPLAY_STOP":
      return stopAutoplay();
    case "MUSIC_GET_PROVIDERS":
      return {
        state: getPublicState(),
        providers: getAvailableMusicProviders()
      };
    case "MUSIC_PROVIDER_AUTH_STATUS":
      return {
        state: getPublicState(),
        authStatus: await getMusicProviderAuthStatus(message.providerId)
      };
    case "MUSIC_CONFIGURE_PROVIDER":
      return {
        state: getPublicState(),
        authStatus: await configureMusicProvider(message.providerId, message.options)
      };
    case "MUSIC_CONNECT_PROVIDER":
      return {
        state: getPublicState(),
        authStatus: await connectMusicProvider(message.providerId, message.options)
      };
    case "MUSIC_DISCONNECT_PROVIDER":
      return {
        state: getPublicState(),
        authStatus: await disconnectMusicProvider(message.providerId)
      };
    case "MUSIC_GET_STATE":
      return getPublicState();
    case "MUSIC_PLAY":
      return resumePlayback();
    case "MUSIC_PAUSE":
      return pausePlayback();
    case "MUSIC_SKIP":
      return playNextTrack();
    case "MUSIC_CLEAR":
      return clearQueue();
    case "MUSIC_TRACK_ENDED":
      if (!isCurrentTrackMessage(message)) {
        return getPublicState();
      }

      return playNextTrack();
    case "MUSIC_TRACK_ERROR":
      if (!playbackState.currentTrack) {
        return getPublicState();
      }

      if (!isCurrentTrackMessage(message)) {
        return getPublicState();
      }

      playbackState.status = "error";
      playbackState.error = message.error ?? "Could not play this track.";
      broadcastState();
      return getPublicState();
    case "MUSIC_TRACK_PROGRESS":
      if (!isCurrentTrackMessage(message)) {
        return getPublicState();
      }

      applyPlaybackProgress(message.progress);
      broadcastState({ shouldPersist: false });
      return getPublicState();
    default:
      return getPublicState();
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.target !== "background-music") {
    return false;
  }

  handleMusicMessage(message)
    .then((result) => {
      if (result?.state || result?.providers || result?.authStatus) {
        sendResponse({ ok: true, ...result });
        return;
      }

      sendResponse({ ok: true, state: result });
    })
    .catch((error) => {
      console.error(error);
      playbackState.status = "error";
      playbackState.error = error.message;
      broadcastState();
      sendResponse({ ok: false, error: error.message, state: getPublicState() });
    });

  return true;
});
