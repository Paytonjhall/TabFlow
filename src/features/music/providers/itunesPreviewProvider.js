export const ITUNES_PREVIEW_PROVIDER_ID = "itunesPreview";

const ITUNES_SEARCH_URL = "https://itunes.apple.com/search";

function createSearchUrl(query) {
  const url = new URL(ITUNES_SEARCH_URL);
  url.searchParams.set("term", query);
  url.searchParams.set("media", "music");
  url.searchParams.set("entity", "song");
  url.searchParams.set("limit", "5");
  return url;
}

function getBestResult(results) {
  return results.find((result) => result.previewUrl) ?? null;
}

async function fetchAudioSource(query) {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    throw new Error("A song search is required.");
  }

  const response = await fetch(createSearchUrl(normalizedQuery));

  if (!response.ok) {
    throw new Error("iTunes preview search failed.");
  }

  const payload = await response.json();
  const result = getBestResult(payload.results ?? []);

  if (!result?.previewUrl) {
    throw new Error("No playable iTunes preview found.");
  }

  return {
    id: `${ITUNES_PREVIEW_PROVIDER_ID}-${result.trackId}-${Date.now()}`,
    providerId: ITUNES_PREVIEW_PROVIDER_ID,
    playbackType: "direct-audio",
    query: normalizedQuery,
    title: result.trackName,
    artist: result.artistName,
    album: result.collectionName,
    sourceUrl: result.previewUrl,
    source: "iTunes preview"
  };
}

export const itunesPreviewProvider = {
  id: ITUNES_PREVIEW_PROVIDER_ID,
  label: "iTunes previews",
  isPlayable: true,
  requiresAuth: false,
  fetchAudioSource
};
