import {
  ITUNES_PREVIEW_PROVIDER_ID,
  itunesPreviewProvider
} from "./providers/itunesPreviewProvider.js";
import { SPOTIFY_PROVIDER_ID, spotifyProvider } from "./providers/spotifyProvider.js";

export const DEFAULT_MUSIC_PROVIDER_ID = ITUNES_PREVIEW_PROVIDER_ID;

const PROVIDERS = Object.freeze({
  [ITUNES_PREVIEW_PROVIDER_ID]: itunesPreviewProvider,
  [SPOTIFY_PROVIDER_ID]: spotifyProvider
});

function getProvider(providerId = DEFAULT_MUSIC_PROVIDER_ID) {
  const provider = PROVIDERS[providerId] ?? PROVIDERS[DEFAULT_MUSIC_PROVIDER_ID];

  if (!provider) {
    throw new Error(`Unsupported music provider: ${providerId}`);
  }

  return provider;
}

export function getAvailableMusicProviders() {
  return Object.values(PROVIDERS).map(({ id, label, isPlayable, requiresAuth }) => ({
    id,
    label,
    isPlayable,
    requiresAuth
  }));
}

export async function getMusicProviderAuthStatus(providerId) {
  const provider = getProvider(providerId);

  if (!provider.getAuthStatus) {
    return {
      providerId: provider.id,
      hasClientId: true,
      isConnected: true,
      redirectUrl: ""
    };
  }

  return provider.getAuthStatus();
}

export async function connectMusicProvider(providerId, options = {}) {
  const provider = getProvider(providerId);

  if (!provider.connect) {
    return getMusicProviderAuthStatus(provider.id);
  }

  return provider.connect(options);
}

export async function configureMusicProvider(providerId, options = {}) {
  const provider = getProvider(providerId);

  if (!provider.configure) {
    return getMusicProviderAuthStatus(provider.id);
  }

  return provider.configure(options);
}

export async function disconnectMusicProvider(providerId) {
  const provider = getProvider(providerId);

  if (!provider.disconnect) {
    return getMusicProviderAuthStatus(provider.id);
  }

  return provider.disconnect();
}

export async function fetchAudioSource(query, providerId = DEFAULT_MUSIC_PROVIDER_ID) {
  const provider = getProvider(providerId);
  return provider.fetchAudioSource(query);
}
