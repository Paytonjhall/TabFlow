import { createStorageClient } from "../../storage/storageRouter.js";

const quickLinksStorage = createStorageClient("quickLinks");
const QUICK_LINKS_KEY = "items";

function createQuickLinkId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeUrl(rawUrl) {
  const trimmedUrl = rawUrl.trim();

  if (!trimmedUrl) {
    throw new Error("A URL is required.");
  }

  const urlWithProtocol = /^[a-z][a-z\d+\-.]*:\/\//i.test(trimmedUrl)
    ? trimmedUrl
    : `https://${trimmedUrl}`;

  return new URL(urlWithProtocol).toString();
}

function getFallbackName(url) {
  return new URL(url).hostname.replace(/^www\./, "");
}

function normalizeQuickLinks(links) {
  return Array.isArray(links) ? links : [];
}

export const quickLinkRepository = {
  get storageAreaName() {
    return quickLinksStorage.areaName;
  },
  async getQuickLinks() {
    return normalizeQuickLinks(await quickLinksStorage.get(QUICK_LINKS_KEY, []));
  },
  saveQuickLinks(links) {
    return quickLinksStorage.set(QUICK_LINKS_KEY, normalizeQuickLinks(links));
  },
  createQuickLink({ icon, name, url }) {
    const normalizedUrl = normalizeUrl(url);
    const now = new Date().toISOString();

    return {
      id: createQuickLinkId(),
      icon: icon || "⌂",
      name: name.trim() || getFallbackName(normalizedUrl),
      url: normalizedUrl,
      createdAt: now,
      updatedAt: now
    };
  }
};
