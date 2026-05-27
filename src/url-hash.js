import {
  COORDINATES_HASH_PARAM,
  LEGACY_COORDINATE_HASH_PARAMS,
  RETIRED_HASH_PARAMS,
  UNSET_COORDINATES_VALUE,
  XLAUNCH_HASH_PARAM,
} from "./config.js?v=20260526-xy-status-placement-2";
import { formatCoordinates } from "./coordinates.js";
import { validateZone } from "./geometry.js";

function getUrlHashParams() {
  return new URLSearchParams(window.location.hash.slice(1));
}

function replaceUrlHashParams(params) {
  const hash = params.toString().replace(/%2C/g, ",");
  const nextUrl = `${window.location.pathname}${window.location.search}${
    hash ? `#${hash}` : ""
  }`;
  window.history.replaceState(null, "", nextUrl);
}

function removeRetiredHashParams(params) {
  RETIRED_HASH_PARAMS.forEach((param) => params.delete(param));
}

function normalizeXLaunchHashParam(params) {
  if (params.has(XLAUNCH_HASH_PARAM) && !params.get(XLAUNCH_HASH_PARAM)) {
    params.set(XLAUNCH_HASH_PARAM, UNSET_COORDINATES_VALUE);
  }
}

export function updateCoordinatesHash(points) {
  const params = getUrlHashParams();
  const validation = validateZone(points);

  removeRetiredHashParams(params);
  normalizeXLaunchHashParam(params);
  LEGACY_COORDINATE_HASH_PARAMS.forEach((param) => params.delete(param));

  if (validation.valid) {
    params.set(COORDINATES_HASH_PARAM, formatCoordinates(points, true));
  } else {
    params.set(COORDINATES_HASH_PARAM, UNSET_COORDINATES_VALUE);
  }

  replaceUrlHashParams(params);
}

export function getCoordinatesHashValue() {
  const params = getUrlHashParams();
  const currentValue = params.get(COORDINATES_HASH_PARAM);
  if (currentValue && currentValue !== UNSET_COORDINATES_VALUE) {
    return currentValue;
  }

  for (const legacyParam of LEGACY_COORDINATE_HASH_PARAMS) {
    const legacyValue = params.get(legacyParam);
    if (legacyValue) return legacyValue;
  }

  return null;
}

export function hashExplicitlyUnset() {
  return getUrlHashParams().get(COORDINATES_HASH_PARAM) === UNSET_COORDINATES_VALUE;
}

export function getXLaunchHashValue() {
  const params = getUrlHashParams();
  if (!params.has(XLAUNCH_HASH_PARAM)) return "";

  const value = params.get(XLAUNCH_HASH_PARAM);
  return value ? value.trim() : UNSET_COORDINATES_VALUE;
}

export function normalizeVisibleHashParams() {
  const params = getUrlHashParams();
  removeRetiredHashParams(params);
  normalizeXLaunchHashParam(params);
  replaceUrlHashParams(params);
}
