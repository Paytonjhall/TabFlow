const audio = new Audio();

audio.addEventListener("ended", () => {
  chrome.runtime.sendMessage({
    target: "background-music",
    type: "MUSIC_TRACK_ENDED"
  });
});

audio.addEventListener("error", () => {
  chrome.runtime.sendMessage({
    target: "background-music",
    type: "MUSIC_TRACK_ERROR",
    error: "Audio stream failed."
  });
});

async function playTrack(track) {
  audio.src = track.sourceUrl;
  audio.load();
  await audio.play();
}

function pauseTrack() {
  audio.pause();
}

async function resumeTrack() {
  await audio.play();
}

function stopTrack() {
  audio.pause();
  audio.removeAttribute("src");
  audio.load();
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.target !== "offscreen-audio") {
    return false;
  }

  Promise.resolve()
    .then(async () => {
      if (message.type === "PLAY_TRACK") {
        await playTrack(message.track);
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

      sendResponse({ ok: true });
    })
    .catch((error) => {
      console.error(error);
      sendResponse({ ok: false, error: error.message });
    });

  return true;
});
