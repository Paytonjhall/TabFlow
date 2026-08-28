const SPOTIFY_CLIENT_ID_KEY = "music.spotify.clientId";
const SPOTIFY_TOKEN_KEY = "music.spotify.token";

export async function getSpotifyClientId() {
  const items = await chrome.storage.local.get(SPOTIFY_CLIENT_ID_KEY);
  return items[SPOTIFY_CLIENT_ID_KEY] ?? "";
}

export async function saveSpotifyClientId(clientId) {
  await chrome.storage.local.set({
    [SPOTIFY_CLIENT_ID_KEY]: clientId.trim()
  });
}

export async function getSpotifyToken() {
  const items = await chrome.storage.local.get(SPOTIFY_TOKEN_KEY);
  return items[SPOTIFY_TOKEN_KEY] ?? null;
}

export async function saveSpotifyToken(token) {
  await chrome.storage.local.set({
    [SPOTIFY_TOKEN_KEY]: token
  });
}

export async function clearSpotifyToken() {
  await chrome.storage.local.remove(SPOTIFY_TOKEN_KEY);
}
