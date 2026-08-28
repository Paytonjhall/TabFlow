import { createStorageClient } from "../../storage/storageRouter.js";

const settingsStorage = createStorageClient("settings");
const SETTINGS_KEY = "preferences";

export const THEME_PRESETS = Object.freeze({
  ocean: {
    label: "Ocean",
    bg: "#f4f6f8",
    ink: "#182027",
    muted: "#5f6c76",
    line: "#d7dde3",
    accent: "#0f7a8a",
    accentStrong: "#0b5966",
    warm: "#b35c32",
    gridA: "15 122 138",
    gridB: "179 92 50"
  },
  forest: {
    label: "Forest",
    bg: "#f3f6f1",
    ink: "#17231c",
    muted: "#647269",
    line: "#d8e0d7",
    accent: "#3f7d50",
    accentStrong: "#2f5f3d",
    warm: "#a46638",
    gridA: "63 125 80",
    gridB: "164 102 56"
  },
  plum: {
    label: "Plum",
    bg: "#f7f4f8",
    ink: "#241d2b",
    muted: "#706579",
    line: "#ded6e5",
    accent: "#8f4f91",
    accentStrong: "#69386d",
    warm: "#b05b46",
    gridA: "143 79 145",
    gridB: "176 91 70"
  },
  ember: {
    label: "Ember",
    bg: "#f8f5f1",
    ink: "#261d19",
    muted: "#76685f",
    line: "#e1d8cf",
    accent: "#b85735",
    accentStrong: "#833d27",
    warm: "#287070",
    gridA: "184 87 53",
    gridB: "40 112 112"
  },
  graphite: {
    label: "Graphite",
    bg: "#f5f6f7",
    ink: "#181b20",
    muted: "#626a73",
    line: "#d9dde2",
    accent: "#4f6478",
    accentStrong: "#374656",
    warm: "#9d6542",
    gridA: "79 100 120",
    gridB: "157 101 66"
  }
});

const DEFAULT_SETTINGS = Object.freeze({
  displayName: "",
  themeId: "ocean",
  musicProviderId: "itunesPreview",
  autoplayLibrary: [],
  timeFormat: "12",
  colorMode: "light",
  goalsPanelOpen: true,
  musicPanelOpen: true
});

function normalizeSettings(settings) {
  const nextSettings = { ...DEFAULT_SETTINGS, ...(settings ?? {}) };

  if (!THEME_PRESETS[nextSettings.themeId]) {
    nextSettings.themeId = DEFAULT_SETTINGS.themeId;
  }

  if (!["12", "24"].includes(nextSettings.timeFormat)) {
    nextSettings.timeFormat = DEFAULT_SETTINGS.timeFormat;
  }

  if (!["light", "dark"].includes(nextSettings.colorMode)) {
    nextSettings.colorMode = DEFAULT_SETTINGS.colorMode;
  }

  nextSettings.autoplayLibrary = Array.isArray(nextSettings.autoplayLibrary)
    ? nextSettings.autoplayLibrary.map((item) => String(item).trim()).filter(Boolean)
    : DEFAULT_SETTINGS.autoplayLibrary;

  return nextSettings;
}

export const settingsRepository = {
  get storageAreaName() {
    return settingsStorage.areaName;
  },
  async getSettings() {
    return normalizeSettings(await settingsStorage.get(SETTINGS_KEY, DEFAULT_SETTINGS));
  },
  saveSettings(settings) {
    return settingsStorage.set(SETTINGS_KEY, normalizeSettings(settings));
  }
};
