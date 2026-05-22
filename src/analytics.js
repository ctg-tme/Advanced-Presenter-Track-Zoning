import {
  ANALYTICS_ALLOWED_HOSTS,
  APTABASE_APP_KEY,
  APTABASE_SDK_URL,
} from "./config.js";

const APTABASE_KEY_PLACEHOLDER = "aptabase_api_key_placeholder";

const metrics = {
  coordinateEdits: 0,
  copies: 0,
  feedbackOpens: 0,
  feedbackSubmits: 0,
  helpOpens: 0,
  pointEdits: 0,
  shapePlacements: 0,
  toolCounts: Object.create(null),
  toolsUsed: new Set(),
};

let sdkPromise = null;
let trackEvent = null;
let analyticsReady = false;
let lastSummarySignature = "";
let resolvedAppKey = null;

function analyticsConfigured() {
  return Boolean(resolvedAppKey) || APTABASE_APP_KEY !== APTABASE_KEY_PLACEHOLDER;
}

function analyticsHostAllowed() {
  return ANALYTICS_ALLOWED_HOSTS.includes(window.location.hostname);
}

function isLocalDebugHost() {
  return ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
}

function getEnvironment() {
  const hostname = window.location.hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
    return "debug";
  }
  if (hostname === "ctg-tme.github.io") {
    return "live";
  }
  if (hostname.endsWith("github.io")) return "fork_or_mirror";
  return "other";
}

function getDeployment() {
  if (window.location.hostname.endsWith("github.io")) return "github-pages";
  if (getEnvironment() === "debug") return "localhost";
  return window.location.hostname || "unknown";
}

function normalizeProp(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "string") return value.slice(0, 1000);
  if (value === null || value === undefined) return "";
  return String(value).slice(0, 1000);
}

function normalizeProps(props = {}) {
  const normalized = {
    app: "digital-presenter-track-zone-builder",
    deployment: getDeployment(),
    environment: getEnvironment(),
    eventVersion: 1,
  };

  Object.entries(props).forEach(([key, value]) => {
    normalized[key] = normalizeProp(value);
  });

  return normalized;
}

function loadSdk() {
  if (sdkPromise) return sdkPromise;
  if (!analyticsHostAllowed()) {
    sdkPromise = Promise.resolve(null);
    return sdkPromise;
  }

  sdkPromise = resolveAppKey()
    .then((appKey) => {
      if (!appKey) return null;
      return import(APTABASE_SDK_URL).then((sdk) => ({ appKey, sdk }));
    })
    .then((result) => {
      if (!result) return null;
      const { appKey, sdk } = result;
      const isDebug = getEnvironment() === "debug";
      sdk.init(appKey, {
        appVersion: "github-pages-static",
        isDebug,
      });
      trackEvent = sdk.trackEvent;
      analyticsReady = true;
      return sdk;
    })
    .catch((error) => {
      analyticsReady = false;
      console.warn("Aptabase analytics unavailable.");
      console.warn(error);
      return null;
    });

  return sdkPromise;
}

function sendEvent(name, props = {}) {
  if (!analyticsHostAllowed()) return;

  loadSdk().then(() => {
    if (!trackEvent) return;
    trackEvent(name, normalizeProps(props));
  });
}

async function resolveAppKey() {
  if (resolvedAppKey) return resolvedAppKey;

  if (APTABASE_APP_KEY !== APTABASE_KEY_PLACEHOLDER) {
    resolvedAppKey = APTABASE_APP_KEY;
    return resolvedAppKey;
  }

  if (!isLocalDebugHost()) return "";

  const localEnvUrl = new URL("./local-env.js", import.meta.url);
  const response = await fetch(localEnvUrl, { cache: "no-store" }).catch(() => null);
  if (!response || !response.ok) return "";

  const localEnv = await import(`${localEnvUrl.href}?t=${Date.now()}`).catch(
    () => null
  );
  const localAppKey = localEnv?.LOCAL_APTABASE_APP_KEY || "";
  resolvedAppKey =
    localAppKey && localAppKey !== APTABASE_KEY_PLACEHOLDER ? localAppKey : "";
  return resolvedAppKey;
}

function incrementTool(toolName) {
  metrics.toolsUsed.add(toolName);
  metrics.toolCounts[toolName] = (metrics.toolCounts[toolName] || 0) + 1;
}

function commonSnapshotProps(snapshot) {
  return {
    dimImage: snapshot.dimImage,
    gridSpacing: snapshot.gridSpacing,
    hasCustomImage: snapshot.hasCustomImage,
    isValidZone: snapshot.isValidZone,
    snapToGrid: snapshot.snapToGrid,
    themeMode: snapshot.themeMode,
    zoneTheme: snapshot.zoneTheme,
  };
}

function sessionMetricProps(snapshot, trigger) {
  return {
    ...commonSnapshotProps(snapshot),
    coordinateEdits: metrics.coordinateEdits,
    copies: metrics.copies,
    feedbackOpens: metrics.feedbackOpens,
    feedbackSubmits: metrics.feedbackSubmits,
    helpOpens: metrics.helpOpens,
    pointCount: snapshot.pointCount,
    pointEdits: metrics.pointEdits,
    shapePlacements: metrics.shapePlacements,
    toolClearCoordinates: metrics.toolCounts.clear_coordinates || 0,
    toolCopyCoordinates: metrics.toolCounts.copy_coordinates || 0,
    toolDimImage: metrics.toolCounts.dim_image || 0,
    toolGridSpacing: metrics.toolCounts.grid_spacing || 0,
    toolShapeSelect: metrics.toolCounts.shape_select || 0,
    toolSnapToGrid: metrics.toolCounts.snap_to_grid || 0,
    toolThemeSelect: metrics.toolCounts.theme_select || 0,
    toolsUsed: Array.from(metrics.toolsUsed).sort().join(","),
    trigger,
  };
}

export function initAnalytics(snapshot) {
  loadSdk();
  sendEvent("session_started", {
    ...commonSnapshotProps(snapshot),
    screenHeight: window.innerHeight,
    screenWidth: window.innerWidth,
  });
}

export function trackToolUse(toolName, props = {}) {
  incrementTool(toolName);
  sendEvent("tool_used", {
    toolName,
    ...props,
  });
}

export function trackCoordinateEdit(source) {
  metrics.coordinateEdits += 1;
  trackToolUse("coordinate_edit", { source });
}

export function trackPointEdit(source) {
  metrics.pointEdits += 1;
  trackToolUse("point_edit", { source });
}

export function trackShapePlaced(shapeName) {
  metrics.shapePlacements += 1;
  trackToolUse("shape_place", { shapeName });
}

export function trackHelpOpened(source) {
  metrics.helpOpens += 1;
  trackToolUse("help_open", { source });
}

export function trackFeedbackOpened() {
  metrics.feedbackOpens += 1;
  trackToolUse("feedback_open");
}

export function trackFeedbackSubmitted({ missing, outcome, rating, useCase }) {
  metrics.feedbackSubmits += 1;
  trackToolUse("feedback_submit", {
    missing,
    outcome,
    rating,
    useCase,
  });
  sendEvent("feedback_submitted", {
    missing,
    outcome,
    rating,
    useCase,
  });
}

export function trackCoordinatesCopied(snapshot) {
  metrics.copies += 1;
  trackToolUse("copy_coordinates");
  sendEvent("coordinates_copied", {
    ...commonSnapshotProps(snapshot),
    pointCount: snapshot.pointCount,
  });
}

export function trackSessionSummary(snapshot, trigger = "pagehide") {
  const props = sessionMetricProps(snapshot, trigger);
  const signature = JSON.stringify(props);
  if (signature === lastSummarySignature) return;

  lastSummarySignature = signature;
  sendEvent("session_summary", props);
}

export function analyticsStatus() {
  return {
    allowed: analyticsHostAllowed(),
    configured: analyticsConfigured(),
    environment: getEnvironment(),
    ready: analyticsReady,
  };
}
