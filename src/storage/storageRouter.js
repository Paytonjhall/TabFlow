import { getAppEnvironment, isLocalEnvironment } from "../config/environment.js";
import { getValue, removeValue, setValue } from "./chromeStorageAdapter.js";

export const STORAGE_AREAS = Object.freeze({
  local: "local",
  sync: "sync"
});

const STORAGE_ROUTES = Object.freeze({
  default: {
    local: STORAGE_AREAS.local,
    development: STORAGE_AREAS.local,
    test: STORAGE_AREAS.local,
    production: STORAGE_AREAS.sync
  },
  notes: {
    local: STORAGE_AREAS.local,
    development: STORAGE_AREAS.local,
    test: STORAGE_AREAS.local,
    production: STORAGE_AREAS.sync
  },
  quickLinks: {
    local: STORAGE_AREAS.local,
    development: STORAGE_AREAS.local,
    test: STORAGE_AREAS.local,
    production: STORAGE_AREAS.sync
  },
  settings: {
    local: STORAGE_AREAS.local,
    development: STORAGE_AREAS.local,
    test: STORAGE_AREAS.local,
    production: STORAGE_AREAS.sync
  }
});

function normalizeNamespace(namespace) {
  if (!namespace || typeof namespace !== "string") {
    throw new Error("A storage namespace is required.");
  }

  return namespace;
}

function resolveRoute(namespace, environment) {
  const route = STORAGE_ROUTES[namespace] ?? STORAGE_ROUTES.default;
  return route[environment] ?? route.default ?? STORAGE_ROUTES.default[environment];
}

export function getStorageAreaForNamespace(namespace, environment = getAppEnvironment()) {
  const normalizedNamespace = normalizeNamespace(namespace);
  const routeArea = resolveRoute(normalizedNamespace, environment);

  if (routeArea) {
    return routeArea;
  }

  return isLocalEnvironment(environment) ? STORAGE_AREAS.local : STORAGE_AREAS.sync;
}

export function createStorageClient(namespace) {
  const normalizedNamespace = normalizeNamespace(namespace);

  function makeKey(key) {
    if (!key || typeof key !== "string") {
      throw new Error("A storage key is required.");
    }

    return `${normalizedNamespace}.${key}`;
  }

  function getArea() {
    return getStorageAreaForNamespace(normalizedNamespace);
  }

  return {
    get areaName() {
      return getArea();
    },
    get(key, fallbackValue) {
      return getValue(getArea(), makeKey(key), fallbackValue);
    },
    set(key, value) {
      return setValue(getArea(), makeKey(key), value);
    },
    remove(key) {
      return removeValue(getArea(), makeKey(key));
    }
  };
}
