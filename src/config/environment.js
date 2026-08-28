export const APP_ENVIRONMENTS = Object.freeze({
  local: "local",
  development: "development",
  production: "production",
  test: "test"
});

const MANUAL_ENV_OVERRIDE = "local";

export function getAppEnvironment() {
  return MANUAL_ENV_OVERRIDE;
}

export function isLocalEnvironment(environment = getAppEnvironment()) {
  return environment === APP_ENVIRONMENTS.local || environment === APP_ENVIRONMENTS.development;
}
