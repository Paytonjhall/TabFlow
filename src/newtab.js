import { noteRepository } from "./features/notes/noteRepository.js";
import { quickLinkRepository } from "./features/quickLinks/quickLinkRepository.js";
import { settingsRepository, THEME_PRESETS } from "./features/settings/settingsRepository.js";

const noteForm = document.querySelector("#noteForm");
const noteNameInput = document.querySelector("#noteNameInput");
const noteDetailsInput = document.querySelector("#noteDetailsInput");
const noteList = document.querySelector("#noteList");
const notePanel = document.querySelector(".note-panel");
const toggleNotePanelButton = document.querySelector("#toggleNotePanelButton");
const restoreNotePanelButton = document.querySelector("#restoreNotePanelButton");
const saveStatus = document.querySelector("#saveStatus");
const storageAreaLabel = document.querySelector("#storageAreaLabel");
const greetingHeading = document.querySelector("#greetingHeading");
const currentTime = document.querySelector("#currentTime");
const quickLinkForm = document.querySelector("#quickLinkForm");
const quickLinkIconInput = document.querySelector("#quickLinkIconInput");
const quickLinkNameInput = document.querySelector("#quickLinkNameInput");
const quickLinkUrlInput = document.querySelector("#quickLinkUrlInput");
const quickLinkList = document.querySelector("#quickLinkList");
const toggleQuickLinkFormButton = document.querySelector("#toggleQuickLinkFormButton");
const toggleQuickLinkDeleteButton = document.querySelector("#toggleQuickLinkDeleteButton");
const musicPanel = document.querySelector("#musicPanel");
const toggleMusicPanelButton = document.querySelector("#toggleMusicPanelButton");
const musicForm = document.querySelector("#musicForm");
const musicSubmitButton = musicForm.querySelector('button[type="submit"]');
const musicProviderInput = document.querySelector("#musicProviderInput");
const musicProviderNote = document.querySelector("#musicProviderNote");
const musicSearchInput = document.querySelector("#musicSearchInput");
const musicNowPlaying = document.querySelector("#musicNowPlaying");
const musicStatus = document.querySelector("#musicStatus");
const musicQueueList = document.querySelector("#musicQueueList");
const musicAutoplayButton = document.querySelector("#musicAutoplayButton");
const musicPlayPauseButton = document.querySelector("#musicPlayPauseButton");
const musicSkipButton = document.querySelector("#musicSkipButton");
const musicClearButton = document.querySelector("#musicClearButton");
const themeModeButton = document.querySelector("#themeModeButton");
const settingsButton = document.querySelector("#settingsButton");
const settingsDialog = document.querySelector("#settingsDialog");
const settingsForm = document.querySelector("#settingsForm");
const closeSettingsButton = document.querySelector("#closeSettingsButton");
const displayNameInput = document.querySelector("#displayNameInput");
const timeFormatInput = document.querySelector("#timeFormatInput");
const colorModeInput = document.querySelector("#colorModeInput");
const spotifyClientIdInput = document.querySelector("#spotifyClientIdInput");
const spotifyConnectButton = document.querySelector("#spotifyConnectButton");
const spotifyDisconnectButton = document.querySelector("#spotifyDisconnectButton");
const spotifyAuthStatus = document.querySelector("#spotifyAuthStatus");
const autoplayLibraryInput = document.querySelector("#autoplayLibraryInput");
const themeOptions = document.querySelector("#themeOptions");
const settingsStatus = document.querySelector("#settingsStatus");

const FALLBACK_MUSIC_PROVIDERS = Object.freeze([
  {
    id: "itunesPreview",
    label: "iTunes previews",
    isPlayable: true,
    requiresAuth: false
  },
  {
    id: "spotify",
    label: "Spotify",
    isPlayable: false,
    requiresAuth: true
  }
]);

let notes = [];
let quickLinks = [];
let quickLinkDeleteMode = false;
let settings = {
  displayName: "",
  themeId: "ocean",
  musicProviderId: "itunesPreview",
  autoplayLibrary: [],
  timeFormat: "12",
  colorMode: "light",
  goalsPanelOpen: true,
  musicPanelOpen: true
};
let musicState = {
  queue: [],
  currentTrack: null,
  status: "idle",
  error: "",
  autoplay: {
    enabled: false,
    providerId: "itunesPreview",
    library: [],
    upcoming: []
  }
};
let musicProviders = [];
let spotifyAuthState = {
  providerId: "spotify",
  clientId: "",
  hasClientId: false,
  isConnected: false,
  redirectUrl: ""
};
let isAutoplayStarting = false;

function setStatus(message) {
  saveStatus.textContent = message;
}

function setSettingsStatus(message) {
  settingsStatus.textContent = message;
}

function getThemeVariables(theme, colorMode) {
  if (colorMode !== "dark") {
    return {
      bg: theme.bg,
      ink: theme.ink,
      muted: theme.muted,
      panel: "#ffffff",
      field: "#fbfcfa",
      line: theme.line,
      accent: theme.accent,
      accentStrong: theme.accentStrong,
      warm: theme.warm,
      gridA: theme.gridA,
      gridB: theme.gridB,
      shadow: "24 32 39"
    };
  }

  return {
    bg: "#101316",
    ink: "#eef3f5",
    muted: "#9da8b2",
    panel: "#171b20",
    field: "#11161a",
    line: "#2a323a",
    accent: theme.accent,
    accentStrong: "#d6f3f4",
    warm: theme.warm,
    gridA: theme.gridA,
    gridB: "255 255 255",
    shadow: "0 0 0"
  };
}

function applyTheme(themeId, colorMode = settings.colorMode) {
  const theme = THEME_PRESETS[themeId] ?? THEME_PRESETS.ocean;
  const variables = getThemeVariables(theme, colorMode);
  const root = document.documentElement;

  root.style.setProperty("--bg", variables.bg);
  root.style.setProperty("--ink", variables.ink);
  root.style.setProperty("--muted", variables.muted);
  root.style.setProperty("--panel", variables.panel);
  root.style.setProperty("--field", variables.field);
  root.style.setProperty("--line", variables.line);
  root.style.setProperty("--accent", variables.accent);
  root.style.setProperty("--accent-strong", variables.accentStrong);
  root.style.setProperty("--warm", variables.warm);
  root.style.setProperty("--grid-a", variables.gridA);
  root.style.setProperty("--grid-b", variables.gridB);
  root.style.setProperty("--shadow-color", variables.shadow);
  document.body.classList.toggle("dark-mode", colorMode === "dark");
  themeModeButton.textContent = colorMode === "dark" ? "☀" : "◐";
  themeModeButton.setAttribute(
    "aria-label",
    colorMode === "dark" ? "Turn on light mode" : "Turn on dark mode"
  );
}

function getGreetingPeriod(date) {
  const hour = date.getHours();

  if (hour >= 5 && hour < 12) {
    return "morning";
  }

  if (hour >= 12 && hour < 17) {
    return "afternoon";
  }

  if (hour >= 17 && hour < 21) {
    return "evening";
  }

  return "night";
}

function getFormattedTime(date) {
  return new Intl.DateTimeFormat([], {
    hour: "numeric",
    minute: "2-digit",
    hour12: settings.timeFormat !== "24"
  }).format(date);
}

function updateTimeSurface() {
  const now = new Date();
  const name = settings.displayName ? `, ${settings.displayName}` : "";

  greetingHeading.textContent = `Good ${getGreetingPeriod(now)}${name}.`;
  currentTime.textContent = getFormattedTime(now);
}

function setGoalsPanelOpen(isOpen, shouldPersist = true) {
  settings = { ...settings, goalsPanelOpen: isOpen };
  document.body.classList.toggle("goals-panel-closed", !isOpen);
  notePanel.setAttribute("aria-hidden", String(!isOpen));
  toggleNotePanelButton.setAttribute("aria-expanded", String(isOpen));
  restoreNotePanelButton.setAttribute("aria-expanded", String(isOpen));

  if (shouldPersist) {
    settingsRepository.saveSettings(settings).catch((error) => {
      console.error(error);
      setStatus("Could not save layout");
    });
  }
}

function setMusicPanelOpen(isOpen, shouldPersist = true) {
  settings = { ...settings, musicPanelOpen: isOpen };
  musicPanel.classList.toggle("is-collapsed", !isOpen);
  toggleMusicPanelButton.textContent = isOpen ? "↑" : "↓";
  toggleMusicPanelButton.setAttribute("aria-expanded", String(isOpen));
  toggleMusicPanelButton.setAttribute(
    "aria-label",
    isOpen ? "Collapse music queue" : "Expand music queue"
  );

  if (shouldPersist) {
    settingsRepository.saveSettings(settings).catch((error) => {
      console.error(error);
      musicStatus.textContent = "Could not save panel state";
    });
  }
}

function renderThemeOptions() {
  themeOptions.replaceChildren();

  for (const [themeId, theme] of Object.entries(THEME_PRESETS)) {
    const label = document.createElement("label");
    label.className = "theme-option";

    const input = document.createElement("input");
    input.type = "radio";
    input.name = "themeId";
    input.value = themeId;
    input.checked = settings.themeId === themeId;

    const swatch = document.createElement("span");
    swatch.className = "theme-swatch";
    swatch.style.setProperty("--swatch-accent", theme.accent);
    swatch.style.setProperty("--swatch-bg", theme.bg);
    swatch.style.setProperty("--swatch-warm", theme.warm);

    const name = document.createElement("span");
    name.textContent = theme.label;

    label.append(input, swatch, name);
    themeOptions.append(label);
  }
}

function parseAutoplayLibrary(value) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function areAutoplayLibrariesEqual(firstLibrary, secondLibrary) {
  if (firstLibrary.length !== secondLibrary.length) {
    return false;
  }

  return firstLibrary.every((item, index) => item === secondLibrary[index]);
}

function setAutoplayStarting(isStarting) {
  isAutoplayStarting = isStarting;
  renderMusicState(musicState);
}

function syncSettingsForm() {
  displayNameInput.value = settings.displayName;
  timeFormatInput.value = settings.timeFormat;
  colorModeInput.value = settings.colorMode;
  spotifyClientIdInput.value = spotifyAuthState.clientId ?? "";
  autoplayLibraryInput.value = settings.autoplayLibrary.join("\n");
  renderThemeOptions();
}

function applySettings(nextSettings) {
  settings = { ...settings, ...nextSettings };
  applyTheme(settings.themeId, settings.colorMode);
  setGoalsPanelOpen(settings.goalsPanelOpen, false);
  setMusicPanelOpen(settings.musicPanelOpen, false);
  musicProviderInput.value = settings.musicProviderId;
  renderMusicProviderNote();
  updateTimeSurface();
  syncSettingsForm();
}

function setQuickLinkFormVisible(isVisible) {
  quickLinkForm.classList.toggle("is-hidden", !isVisible);
  toggleQuickLinkFormButton.textContent = isVisible ? "Cancel" : "Add new link";

  if (isVisible) {
    quickLinkUrlInput.focus();
  }
}

function setQuickLinkDeleteMode(isEnabled) {
  quickLinkDeleteMode = isEnabled;
  document.body.classList.toggle("quick-link-delete-mode", quickLinkDeleteMode);
  toggleQuickLinkDeleteButton.textContent = quickLinkDeleteMode ? "Done removing" : "Remove link";
}

function renderNotes() {
  noteList.replaceChildren();
  noteList.classList.toggle("is-empty", notes.length === 0);

  if (notes.length === 0) {
    return;
  }

  for (const note of notes) {
    const item = document.createElement("li");
    item.className = "note-item";
    item.dataset.noteId = note.id;

    if (note.completed) {
      item.classList.add("is-complete");
    }

    const content = document.createElement("div");
    content.className = "note-content";

    const title = document.createElement("h3");
    title.textContent = note.name;

    const details = document.createElement("p");
    details.textContent = note.details || "No details added.";

    const actions = document.createElement("div");
    actions.className = "note-actions";

    const completeButton = document.createElement("button");
    completeButton.className = "icon-button complete-button";
    completeButton.type = "button";
    completeButton.textContent = "✓";
    completeButton.title = note.completed ? "Mark incomplete" : "Mark complete";
    completeButton.setAttribute("aria-label", completeButton.title);
    completeButton.dataset.action = "toggle";

    const deleteButton = document.createElement("button");
    deleteButton.className = "icon-button delete-button";
    deleteButton.type = "button";
    deleteButton.textContent = "×";
    deleteButton.title = "Delete note";
    deleteButton.setAttribute("aria-label", "Delete note");
    deleteButton.dataset.action = "delete";

    content.append(title, details);
    actions.append(completeButton, deleteButton);
    item.append(content, actions);
    noteList.append(item);
  }
}

function renderQuickLinks() {
  quickLinkList.replaceChildren();

  if (quickLinks.length === 0) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "empty-quick-link";
    emptyItem.textContent = "Add links you visit often.";
    quickLinkList.append(emptyItem);
    return;
  }

  for (const link of quickLinks) {
    const item = document.createElement("li");
    item.className = "quick-link-item";
    item.dataset.linkId = link.id;

    const anchor = document.createElement("a");
    anchor.className = "quick-link-anchor";
    anchor.href = link.url;

    const icon = document.createElement("span");
    icon.className = "quick-link-icon";
    icon.textContent = link.icon;

    const label = document.createElement("span");
    label.className = "quick-link-name";
    label.textContent = link.name;

    const deleteButton = document.createElement("button");
    deleteButton.className = "quick-link-delete";
    deleteButton.type = "button";
    deleteButton.textContent = "×";
    deleteButton.title = `Delete ${link.name}`;
    deleteButton.setAttribute("aria-label", `Delete ${link.name}`);

    anchor.append(icon, label);
    item.append(anchor, deleteButton);
    quickLinkList.append(item);
  }
}

function renderMusicProviders(providers) {
  musicProviders = Array.isArray(providers) && providers.length > 0 ? providers : [...FALLBACK_MUSIC_PROVIDERS];
  musicProviderInput.replaceChildren();

  for (const provider of musicProviders) {
    const option = document.createElement("option");
    option.value = provider.id;
    option.textContent = provider.label;
    musicProviderInput.append(option);
  }

  musicProviderInput.value = settings.musicProviderId;
  renderMusicProviderNote();
}

function getSelectedMusicProvider() {
  return (
    musicProviders.find((provider) => provider.id === musicProviderInput.value) ??
    FALLBACK_MUSIC_PROVIDERS.find((provider) => provider.id === musicProviderInput.value) ??
    FALLBACK_MUSIC_PROVIDERS[0]
  );
}

function isSelectedMusicProviderPlayable() {
  return getSelectedMusicProvider()?.isPlayable !== false;
}

function renderMusicProviderControls() {
  const isPlayable = isSelectedMusicProviderPlayable();
  musicSubmitButton.textContent = isPlayable ? "Add track" : "Open track";
  musicSearchInput.placeholder = isPlayable ? "Song Name - Artist" : "Song or artist";
  musicAutoplayButton.disabled = isAutoplayStarting || (!isPlayable && !musicState.autoplay.enabled);
  musicAutoplayButton.title = isPlayable
    ? ""
    : "Spotify can search and open tracks, but in-extension playback uses iTunes previews.";
}

function renderMusicProviderNote() {
  if (musicProviderInput.value === "spotify") {
    musicProviderNote.textContent = spotifyAuthState.isConnected
      ? "Spotify search is connected. Tracks open in Spotify; in-extension playback uses iTunes previews."
      : "Spotify needs a Client ID and sign-in from settings. iTunes previews work without sign-in.";
    renderMusicProviderControls();
    return;
  }

  musicProviderNote.textContent = "Using public iTunes preview streams.";
  renderMusicProviderControls();
}

function renderSpotifyAuthStatus(authStatus = spotifyAuthState) {
  spotifyAuthState = { ...spotifyAuthState, ...authStatus };
  spotifyClientIdInput.value = spotifyAuthState.clientId ?? "";
  spotifyAuthStatus.textContent = spotifyAuthState.isConnected
    ? "Spotify is connected."
    : `Spotify is not connected. Redirect URL: ${spotifyAuthState.redirectUrl}`;
  spotifyDisconnectButton.disabled = !spotifyAuthState.isConnected;
  renderMusicProviderNote();
}

function getTrackLabel(track) {
  if (!track) {
    return "Nothing playing";
  }

  return `${track.title} - ${track.artist}`;
}

function renderMusicState(state) {
  musicState = {
    ...musicState,
    ...(state ?? {}),
    autoplay: {
      ...musicState.autoplay,
      ...(state?.autoplay ?? {})
    }
  };
  const isAutoplayEngaged = musicState.autoplay.enabled || isAutoplayStarting;
  musicNowPlaying.textContent = getTrackLabel(musicState.currentTrack);
  musicStatus.textContent =
    musicState.error ||
    (isAutoplayStarting
      ? "starting autoplay"
      : musicState.autoplay.enabled
        ? `autoplay ${musicState.status}`
        : musicState.status);
  musicAutoplayButton.textContent = isAutoplayStarting
    ? "Starting..."
    : musicState.autoplay.enabled
      ? "Stop autoplay"
      : "Autoplay";
  musicAutoplayButton.classList.toggle("is-active", isAutoplayEngaged);
  musicAutoplayButton.setAttribute("aria-pressed", String(isAutoplayEngaged));
  musicPanel.classList.toggle("is-autoplaying", isAutoplayEngaged);
  musicPlayPauseButton.textContent = musicState.status === "playing" ? "Pause" : "Play";
  musicPlayPauseButton.disabled =
    !musicState.currentTrack && musicState.queue.length === 0 && !musicState.autoplay.enabled;
  musicSkipButton.disabled =
    !musicState.currentTrack && musicState.queue.length === 0 && !musicState.autoplay.enabled;
  musicClearButton.disabled =
    !musicState.currentTrack && musicState.queue.length === 0 && !musicState.autoplay.enabled;
  renderMusicProviderControls();
  musicQueueList.replaceChildren();

  if (musicState.queue.length === 0) {
    const item = document.createElement("li");
    item.className = "empty-music-queue";
    item.textContent = musicState.autoplay.enabled
      ? `${musicState.autoplay.upcoming.length} autoplay picks ready.`
      : "Queue is empty.";
    musicQueueList.append(item);
    return;
  }

  for (const track of musicState.queue) {
    const item = document.createElement("li");
    item.textContent = getTrackLabel(track);
    musicQueueList.append(item);
  }
}

async function sendMusicMessage(type, payload = {}) {
  const response = await sendBackgroundMusicMessage(type, payload);

  if (!response?.ok) {
    if (response?.state) {
      renderMusicState(response.state);
    }

    throw new Error(response?.error ?? "Music action failed.");
  }

  if (response.state) {
    renderMusicState(response.state);
  }

  return response.state;
}

async function sendBackgroundMusicMessage(type, payload = {}) {
  try {
    return await chrome.runtime.sendMessage({
      target: "background-music",
      type,
      ...payload
    });
  } catch (error) {
    return {
      ok: false,
      error:
        error.message === "Could not establish connection. Receiving end does not exist."
          ? "Music background is unavailable. Reload the extension."
          : error.message
    };
  }
}

async function getMusicProviders() {
  const response = await sendBackgroundMusicMessage("MUSIC_GET_PROVIDERS");

  if (!response?.ok) {
    renderMusicProviders(FALLBACK_MUSIC_PROVIDERS);
    throw new Error(response?.error ?? "Could not load music providers.");
  }

  renderMusicProviders(response.providers);
}

async function loadSpotifyAuthStatus() {
  const response = await sendBackgroundMusicMessage("MUSIC_PROVIDER_AUTH_STATUS", {
    providerId: "spotify"
  });

  if (!response?.ok) {
    throw new Error(response?.error ?? "Could not load Spotify status.");
  }

  renderSpotifyAuthStatus(response.authStatus);
}

async function persistNotes(successMessage) {
  setStatus("Saving...");

  try {
    await noteRepository.saveNotes(notes);
    setStatus(successMessage);
  } catch (error) {
    console.error(error);
    setStatus("Could not save");
  }
}

async function persistQuickLinks(successMessage) {
  try {
    await quickLinkRepository.saveQuickLinks(quickLinks);
    setStatus(successMessage);
  } catch (error) {
    console.error(error);
    setStatus("Could not save link");
  }
}

async function loadSettings() {
  try {
    applySettings(await settingsRepository.getSettings());
  } catch (error) {
    console.error(error);
    applySettings(settings);
    setStatus("Settings unavailable");
  }
}

async function loadNotes() {
  storageAreaLabel.textContent = `chrome.storage.${noteRepository.storageAreaName}`;

  try {
    notes = await noteRepository.getNotes();
    renderNotes();
    setStatus(notes.length > 0 ? "Loaded" : "Ready");
  } catch (error) {
    console.error(error);
    setStatus("Storage unavailable");
    noteNameInput.disabled = true;
    noteDetailsInput.disabled = true;
    noteForm.querySelector("button").disabled = true;
  }
}

async function loadQuickLinks() {
  try {
    quickLinks = await quickLinkRepository.getQuickLinks();
    renderQuickLinks();
  } catch (error) {
    console.error(error);
    setStatus("Links unavailable");
    toggleQuickLinkFormButton.disabled = true;
  }
}

async function loadMusicState() {
  try {
    await getMusicProviders();

    try {
      await loadSpotifyAuthStatus();
    } catch (error) {
      console.error(error);
      renderSpotifyAuthStatus();
    }

    await sendMusicMessage("MUSIC_GET_STATE");
  } catch (error) {
    console.error(error);
    musicStatus.textContent = "Music unavailable";
    musicSearchInput.disabled = true;
    musicForm.querySelector("button").disabled = true;
  }
}

async function createNote(event) {
  event.preventDefault();

  const name = noteNameInput.value.trim();

  if (!name) {
    noteNameInput.focus();
    return;
  }

  notes = [noteRepository.createNote({ name, details: noteDetailsInput.value }), ...notes];
  noteForm.reset();
  renderNotes();
  await persistNotes("Created");
  noteNameInput.focus();
}

async function createQuickLink(event) {
  event.preventDefault();

  try {
    const quickLink = quickLinkRepository.createQuickLink({
      icon: quickLinkIconInput.value,
      name: quickLinkNameInput.value,
      url: quickLinkUrlInput.value
    });

    quickLinks = [quickLink, ...quickLinks];
    quickLinkForm.reset();
    setQuickLinkFormVisible(false);
    renderQuickLinks();
    await persistQuickLinks("Link saved");
  } catch (error) {
    console.error(error);
    setStatus("Enter a valid link");
    quickLinkUrlInput.focus();
  }
}

async function addMusicTrack(event) {
  event.preventDefault();

  const query = musicSearchInput.value.trim();

  if (!query) {
    musicSearchInput.focus();
    return;
  }

  musicStatus.textContent = "Searching...";

  try {
    if (!isSelectedMusicProviderPlayable()) {
      const response = await sendBackgroundMusicMessage("MUSIC_OPEN_QUERY", {
        query,
        providerId: musicProviderInput.value
      });

      if (!response?.ok) {
        if (response?.state) {
          renderMusicState(response.state);
        }

        throw new Error(response?.error ?? "Music action failed.");
      }

      if (response.state) {
        renderMusicState(response.state);
      }

      musicStatus.textContent = response.track
        ? `Opened ${getTrackLabel(response.track)}`
        : "Opened track";
      musicSearchInput.value = "";
      musicSearchInput.focus();
      return;
    }

    await sendMusicMessage("MUSIC_ADD_QUERY", {
      query,
      providerId: musicProviderInput.value
    });
    musicSearchInput.value = "";
    musicSearchInput.focus();
  } catch (error) {
    console.error(error);
    musicStatus.textContent = error.message;
  }
}

async function saveSettings(event) {
  event.preventDefault();

  const selectedTheme = new FormData(settingsForm).get("themeId") || settings.themeId;
  const nextSettings = {
    ...settings,
    displayName: displayNameInput.value.trim(),
    timeFormat: timeFormatInput.value,
    colorMode: colorModeInput.value,
    autoplayLibrary: parseAutoplayLibrary(autoplayLibraryInput.value),
    musicProviderId: musicProviderInput.value,
    themeId: selectedTheme
  };

  try {
    if (spotifyClientIdInput.value.trim() || spotifyAuthState.hasClientId) {
      const spotifyConfigResponse = await sendBackgroundMusicMessage("MUSIC_CONFIGURE_PROVIDER", {
        providerId: "spotify",
        options: {
          clientId: spotifyClientIdInput.value
        }
      });

      if (!spotifyConfigResponse?.ok) {
        throw new Error(spotifyConfigResponse?.error ?? "Could not save Spotify settings.");
      }
    }

    await settingsRepository.saveSettings(nextSettings);

    try {
      await loadSpotifyAuthStatus();
    } catch (error) {
      console.error(error);
      renderSpotifyAuthStatus();
    }

    applySettings(nextSettings);
    setSettingsStatus("Saved");
    settingsDialog.close();
  } catch (error) {
    console.error(error);
    setSettingsStatus("Could not save");
  }
}

async function handleNoteAction(event) {
  const button = event.target.closest("button[data-action]");

  if (!button) {
    return;
  }

  const noteId = button.closest(".note-item")?.dataset.noteId;

  if (!noteId) {
    return;
  }

  if (button.dataset.action === "toggle") {
    notes = notes.map((note) =>
      note.id === noteId
        ? { ...note, completed: !note.completed, updatedAt: new Date().toISOString() }
        : note
    );
    renderNotes();
    await persistNotes("Updated");
    return;
  }

  notes = notes.filter((note) => note.id !== noteId);
  renderNotes();
  await persistNotes("Deleted");
}

async function handleQuickLinkAction(event) {
  const deleteButton = event.target.closest(".quick-link-delete");

  if (!deleteButton) {
    return;
  }

  const linkId = deleteButton.closest(".quick-link-item")?.dataset.linkId;

  if (!linkId) {
    return;
  }

  quickLinks = quickLinks.filter((link) => link.id !== linkId);
  renderQuickLinks();
  await persistQuickLinks("Link deleted");
}

noteForm.addEventListener("submit", createNote);
noteList.addEventListener("click", handleNoteAction);
quickLinkForm.addEventListener("submit", createQuickLink);
quickLinkList.addEventListener("click", handleQuickLinkAction);
toggleQuickLinkFormButton.addEventListener("click", () => {
  setQuickLinkFormVisible(quickLinkForm.classList.contains("is-hidden"));
});
toggleQuickLinkDeleteButton.addEventListener("click", () => {
  setQuickLinkDeleteMode(!quickLinkDeleteMode);
});
toggleMusicPanelButton.addEventListener("click", () => {
  setMusicPanelOpen(musicPanel.classList.contains("is-collapsed"));
});
musicProviderInput.addEventListener("change", async () => {
  const nextSettings = {
    ...settings,
    musicProviderId: musicProviderInput.value
  };

  settings = nextSettings;
  renderMusicProviderNote();

  try {
    await settingsRepository.saveSettings(nextSettings);
  } catch (error) {
    console.error(error);
    musicStatus.textContent = "Could not save provider";
  }
});
musicForm.addEventListener("submit", addMusicTrack);
musicAutoplayButton.addEventListener("click", async () => {
  try {
    if (musicState.autoplay.enabled) {
      await sendMusicMessage("MUSIC_AUTOPLAY_STOP");
      return;
    }

    if (!isSelectedMusicProviderPlayable()) {
      musicStatus.textContent = "Autoplay uses iTunes previews in this version.";
      return;
    }

    const autoplayLibrary = parseAutoplayLibrary(autoplayLibraryInput.value);

    if (autoplayLibrary.length === 0) {
      musicStatus.textContent = "Add songs or artists in settings before starting autoplay.";
      syncSettingsForm();
      setSettingsStatus("Add at least one song or artist.");
      settingsDialog.showModal();
      autoplayLibraryInput.focus();
      return;
    }

    if (!areAutoplayLibrariesEqual(autoplayLibrary, settings.autoplayLibrary)) {
      settings = {
        ...settings,
        autoplayLibrary,
        musicProviderId: musicProviderInput.value
      };
      await settingsRepository.saveSettings(settings);
    }

    setAutoplayStarting(true);
    await sendMusicMessage("MUSIC_AUTOPLAY_START", {
      providerId: musicProviderInput.value,
      library: autoplayLibrary
    });
  } catch (error) {
    console.error(error);
    musicStatus.textContent = error.message;
  } finally {
    if (isAutoplayStarting) {
      setAutoplayStarting(false);
    }
  }
});
musicPlayPauseButton.addEventListener("click", async () => {
  try {
    await sendMusicMessage(musicState.status === "playing" ? "MUSIC_PAUSE" : "MUSIC_PLAY");
  } catch (error) {
    console.error(error);
    musicStatus.textContent = error.message;
  }
});
musicSkipButton.addEventListener("click", async () => {
  try {
    await sendMusicMessage("MUSIC_SKIP");
  } catch (error) {
    console.error(error);
    musicStatus.textContent = error.message;
  }
});
musicClearButton.addEventListener("click", async () => {
  try {
    await sendMusicMessage("MUSIC_CLEAR");
  } catch (error) {
    console.error(error);
    musicStatus.textContent = error.message;
  }
});
toggleNotePanelButton.addEventListener("click", () => {
  setGoalsPanelOpen(false);
});
restoreNotePanelButton.addEventListener("click", () => {
  setGoalsPanelOpen(true);
});
themeModeButton.addEventListener("click", async () => {
  const nextSettings = {
    ...settings,
    colorMode: settings.colorMode === "dark" ? "light" : "dark"
  };

  applySettings(nextSettings);

  try {
    await settingsRepository.saveSettings(nextSettings);
  } catch (error) {
    console.error(error);
    setStatus("Could not save mode");
  }
});
settingsButton.addEventListener("click", () => {
  syncSettingsForm();
  setSettingsStatus("Ready");
  settingsDialog.showModal();
});
closeSettingsButton.addEventListener("click", () => {
  settingsDialog.close();
});
spotifyConnectButton.addEventListener("click", async () => {
  spotifyAuthStatus.textContent = "Opening Spotify sign-in...";

  try {
    const response = await sendBackgroundMusicMessage("MUSIC_CONNECT_PROVIDER", {
      providerId: "spotify",
      options: {
        clientId: spotifyClientIdInput.value
      }
    });

    if (!response?.ok) {
      throw new Error(response?.error ?? "Could not connect Spotify.");
    }

    renderSpotifyAuthStatus(response.authStatus);
  } catch (error) {
    console.error(error);
    spotifyAuthStatus.textContent = error.message;
  }
});
spotifyDisconnectButton.addEventListener("click", async () => {
  spotifyAuthStatus.textContent = "Disconnecting Spotify...";

  try {
    const response = await sendBackgroundMusicMessage("MUSIC_DISCONNECT_PROVIDER", {
      providerId: "spotify"
    });

    if (!response?.ok) {
      throw new Error(response?.error ?? "Could not disconnect Spotify.");
    }

    renderSpotifyAuthStatus(response.authStatus);
  } catch (error) {
    console.error(error);
    spotifyAuthStatus.textContent = error.message;
  }
});
settingsDialog.addEventListener("close", () => {
  applyTheme(settings.themeId, settings.colorMode);
  syncSettingsForm();
  updateTimeSurface();
});
settingsForm.addEventListener("submit", saveSettings);
themeOptions.addEventListener("change", (event) => {
  if (event.target.matches('input[name="themeId"]')) {
    applyTheme(event.target.value, colorModeInput.value);
  }
});
colorModeInput.addEventListener("change", () => {
  applyTheme(new FormData(settingsForm).get("themeId"), colorModeInput.value);
});
chrome.runtime.onMessage.addListener((message) => {
  if (message?.target === "newtab-music" && message.type === "MUSIC_STATE_CHANGED") {
    renderMusicState(message.state);
  }
});

loadSettings();
loadNotes();
loadQuickLinks();
loadMusicState();
window.setInterval(updateTimeSurface, 15000);
