import {
  clearSpotifyToken,
  getSpotifyClientId,
  getSpotifyToken,
  saveSpotifyClientId,
  saveSpotifyToken
} from "./spotifyAuthStorage.js";

export const SPOTIFY_PROVIDER_ID = "spotify";

const SPOTIFY_AUTHORIZE_URL = "https://accounts.spotify.com/authorize";
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_SEARCH_URL = "https://api.spotify.com/v1/search";
const SPOTIFY_SCOPES = [
  "user-read-private",
  "streaming",
  "user-read-playback-state",
  "user-modify-playback-state"
];

function getRedirectUrl() {
  return chrome.identity.getRedirectURL("spotify");
}

function base64UrlEncode(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function createCodeVerifier() {
  const bytes = new Uint8Array(64);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

async function createCodeChallenge(verifier) {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(digest);
}

function getTokenExpiry(expiresInSeconds) {
  return Date.now() + Math.max(0, expiresInSeconds - 60) * 1000;
}

function isTokenValid(token) {
  return Boolean(token?.accessToken && token.expiresAt > Date.now());
}

async function requestAccessToken({ clientId, code, verifier }) {
  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: "authorization_code",
    code,
    redirect_uri: getRedirectUrl(),
    code_verifier: verifier
  });

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  if (!response.ok) {
    throw new Error("Spotify token exchange failed.");
  }

  const token = await response.json();
  return {
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt: getTokenExpiry(token.expires_in)
  };
}

async function refreshAccessToken({ clientId, refreshToken }) {
  const body = new URLSearchParams({
    client_id: clientId,
    grant_type: "refresh_token",
    refresh_token: refreshToken
  });

  const response = await fetch(SPOTIFY_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  if (!response.ok) {
    await clearSpotifyToken();
    throw new Error("Spotify sign-in expired. Connect Spotify again.");
  }

  const token = await response.json();
  return {
    accessToken: token.access_token,
    refreshToken: token.refresh_token ?? refreshToken,
    expiresAt: getTokenExpiry(token.expires_in)
  };
}

async function getAccessToken() {
  const clientId = await getSpotifyClientId();

  if (!clientId) {
    throw new Error("Add a Spotify Client ID in settings first.");
  }

  const token = await getSpotifyToken();

  if (isTokenValid(token)) {
    return token.accessToken;
  }

  if (token?.refreshToken) {
    const refreshedToken = await refreshAccessToken({ clientId, refreshToken: token.refreshToken });
    await saveSpotifyToken(refreshedToken);
    return refreshedToken.accessToken;
  }

  throw new Error("Connect Spotify before searching Spotify.");
}

async function connect({ clientId }) {
  const normalizedClientId = clientId.trim();

  if (!normalizedClientId) {
    throw new Error("A Spotify Client ID is required.");
  }

  await saveSpotifyClientId(normalizedClientId);

  const verifier = createCodeVerifier();
  const challenge = await createCodeChallenge(verifier);
  const authorizeUrl = new URL(SPOTIFY_AUTHORIZE_URL);
  authorizeUrl.searchParams.set("client_id", normalizedClientId);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("redirect_uri", getRedirectUrl());
  authorizeUrl.searchParams.set("scope", SPOTIFY_SCOPES.join(" "));
  authorizeUrl.searchParams.set("code_challenge_method", "S256");
  authorizeUrl.searchParams.set("code_challenge", challenge);

  const redirectUrl = await chrome.identity.launchWebAuthFlow({
    url: authorizeUrl.toString(),
    interactive: true
  });

  if (!redirectUrl) {
    throw new Error("Spotify sign-in was cancelled.");
  }

  const code = new URL(redirectUrl).searchParams.get("code");

  if (!code) {
    throw new Error("Spotify did not return an authorization code.");
  }

  const token = await requestAccessToken({
    clientId: normalizedClientId,
    code,
    verifier
  });

  await saveSpotifyToken(token);
  return getAuthStatus();
}

async function disconnect() {
  await clearSpotifyToken();
  return getAuthStatus();
}

async function configure({ clientId }) {
  const normalizedClientId = (clientId ?? "").trim();
  const existingClientId = await getSpotifyClientId();

  if (existingClientId && existingClientId !== normalizedClientId) {
    await clearSpotifyToken();
  }

  await saveSpotifyClientId(normalizedClientId);
  return getAuthStatus();
}

async function getAuthStatus() {
  const [clientId, token] = await Promise.all([getSpotifyClientId(), getSpotifyToken()]);

  return {
    providerId: SPOTIFY_PROVIDER_ID,
    clientId,
    hasClientId: Boolean(clientId),
    isConnected: isTokenValid(token),
    redirectUrl: getRedirectUrl()
  };
}

async function fetchAudioSource(query) {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    throw new Error("A song search is required.");
  }

  const accessToken = await getAccessToken();
  const url = new URL(SPOTIFY_SEARCH_URL);
  url.searchParams.set("q", normalizedQuery);
  url.searchParams.set("type", "track");
  url.searchParams.set("limit", "1");

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error("Spotify search failed.");
  }

  const payload = await response.json();
  const track = payload.tracks?.items?.[0];

  if (!track) {
    throw new Error("No Spotify track found.");
  }

  return {
    id: `${SPOTIFY_PROVIDER_ID}-${track.id}-${Date.now()}`,
    providerId: SPOTIFY_PROVIDER_ID,
    playbackType: "provider-control",
    query: normalizedQuery,
    title: track.name,
    artist: track.artists.map((artist) => artist.name).join(", "),
    album: track.album?.name ?? "",
    providerTrackId: track.uri,
    externalUrl: track.external_urls?.spotify,
    source: "Spotify"
  };
}

export const spotifyProvider = {
  id: SPOTIFY_PROVIDER_ID,
  label: "Spotify",
  isPlayable: false,
  requiresAuth: true,
  configure,
  connect,
  disconnect,
  getAuthStatus,
  fetchAudioSource
};
