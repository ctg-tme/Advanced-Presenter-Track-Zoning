export const APTABASE_APP_KEY = "aptabase_api_key_placeholder";
export const APTABASE_SDK_URL =
  "https://cdn.jsdelivr.net/npm/@aptabase/web@0.5.0/+esm";
export const ANALYTICS_ALLOWED_HOSTS = [
  "localhost",
  "127.0.0.1",
  "::1",
  "ctg-tme.github.io",
];

export const CANVAS_WIDTH = 1920;
export const CANVAS_HEIGHT = 1080;
export const CANVAS_BOUNDS_LABEL = `${CANVAS_WIDTH} x ${CANVAS_HEIGHT}`;

export const DOT_RADIUS = 8;
export const TRIANGLE_SIZE = DOT_RADIUS * 1.5;
export const SQUARE_SIZE = DOT_RADIUS * 1.25;
export const MINIMUM_SHAPE_SIZE = 24;

export const MANUAL_SHAPE_VALUE = "manual";
export const COORDINATES_HASH_PARAM = "dptCoordinates";
export const XLAUNCH_HASH_PARAM = "xLaunch";
export const UNSET_COORDINATES_VALUE = "notSet";

export const HELP_DISMISSED_KEY = "aptzb-help-dismissed";
export const STORED_IMAGE_KEY = "aptzb-custom-image";
export const STORED_THEME_KEY = "aptzb-theme";

export const LEGACY_COORDINATE_HASH_PARAMS = ["coordinates", "coords"];
export const RETIRED_HASH_PARAMS = [
  "dptImage",
  "dptLineColor",
  "dptLineWidth",
  "dptPointColor",
  "dptTheme",
];

export const ZONE_THEMES = {
  eveningFjord: {
    dot: "#b96f73",
    line: "#8aa0ff",
  },
  poppyBreeze: {
    dot: "#ff9a76",
    line: "#3bdbe8",
  },
  meadowStone: {
    dot: "#f1c857",
    line: "#514c41",
  },
  auroraSlate: {
    dot: "#39d6b2",
    line: "#7c5cff",
  },
  deuteranopia: {
    dot: "#e69f00",
    line: "#0072b2",
  },
  protanopia: {
    dot: "#d55e00",
    line: "#56b4e9",
  },
  tritanopia: {
    dot: "#cc79a7",
    line: "#009e73",
  },
  monochrome: {
    dot: "#ffffff",
    line: "#111827",
  },
};

export const DEFAULT_ZONE_THEME = "eveningFjord";

export const SIMPLE_SHAPE_LABELS = {
  triangle: "Triangle",
  rectangle: "Rectangle",
  rhombus: "Rhombus",
  trapezoid: "Trapezoid",
  parallelogram: "Parallelogram",
  pentagon: "Pentagon",
  lShape: "L Shape",
  hexagon: "Hexagon",
  octagon: "Octagon",
};
