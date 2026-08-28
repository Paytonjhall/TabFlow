const STORAGE_AREA_NAMES = Object.freeze(["local", "sync"]);

function getChromeStorageArea(areaName) {
  if (!STORAGE_AREA_NAMES.includes(areaName)) {
    throw new Error(`Unsupported Chrome storage area: ${areaName}`);
  }

  const storageArea = globalThis.chrome?.storage?.[areaName];

  if (!storageArea) {
    throw new Error(`chrome.storage.${areaName} is unavailable in this context.`);
  }

  return storageArea;
}

function rejectChromeRuntimeError(reject) {
  const runtimeError = globalThis.chrome?.runtime?.lastError;

  if (runtimeError) {
    reject(new Error(runtimeError.message));
    return true;
  }

  return false;
}

export function getValue(areaName, key, fallbackValue = undefined) {
  return new Promise((resolve, reject) => {
    getChromeStorageArea(areaName).get([key], (items) => {
      if (rejectChromeRuntimeError(reject)) {
        return;
      }

      resolve(Object.hasOwn(items, key) ? items[key] : fallbackValue);
    });
  });
}

export function setValue(areaName, key, value) {
  return new Promise((resolve, reject) => {
    getChromeStorageArea(areaName).set({ [key]: value }, () => {
      if (rejectChromeRuntimeError(reject)) {
        return;
      }

      resolve();
    });
  });
}

export function removeValue(areaName, key) {
  return new Promise((resolve, reject) => {
    getChromeStorageArea(areaName).remove(key, () => {
      if (rejectChromeRuntimeError(reject)) {
        return;
      }

      resolve();
    });
  });
}
