# TabFlow

TabFlow is a Chrome new tab extension MVP. It currently lets a user write one goal or note on the right side of the new tab page.

## Load locally

1. Open `chrome://extensions`.
2. Enable Developer Mode.
3. Choose "Load unpacked".
4. Select this project folder.

## Storage routing

Feature code does not call `chrome.storage` directly. It asks `src/storage/storageRouter.js` for a namespaced client.

- `local`, `development`, and `test` environments route to `chrome.storage.local`.
- `production` routes to `chrome.storage.sync`.
- New features can get their own route by adding a namespace entry to `STORAGE_ROUTES`.

For this static MVP, the current environment is set in `src/config/environment.js`.

## Music queue

The music queue uses the iTunes Search API to resolve text searches like `Song Name - Artist` into public Apple preview streams. Manifest V3 service workers cannot own an `Audio()` element directly, so `src/background.js` owns queue state and controls playback through `src/offscreen/offscreen.html`.

Full-track streaming should be added through an official licensed provider API rather than a YouTube-to-audio resolver.

Autoplay uses the saved songs/artists list in settings. When enabled, the background worker shuffles that list, resolves one item at a time through the active provider, and keeps playing the next preview after each track ends.

Music providers live under `src/features/music/providers/` and are routed by `src/features/music/musicProviders.js`.

- `itunesPreview` is the current playable provider and uses direct public preview audio URLs.
- `spotify` is scaffolded with OAuth + PKCE through `chrome.identity.launchWebAuthFlow`. It stores tokens in `chrome.storage.local`, never asks for a password, and does not require a client secret in the extension. In this version Spotify is a search/open provider: tracks open in Spotify instead of playing through TabFlow.

To try Spotify auth later, create a Spotify app, add the extension redirect URL shown in the settings flow to that app, then paste the app's public Client ID into TabFlow settings.
