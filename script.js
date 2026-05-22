document.addEventListener("DOMContentLoaded", function () {
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const coordinatesInput = document.getElementById("coordinates");
  const coordinateHighlights = document.getElementById("coordinateHighlights");
  const uploadImage = document.getElementById("uploadImage");
  const uploadFileName = document.getElementById("uploadFileName");
  const clearImageButton = document.getElementById("clearImage");
  const zoneThemeSelect = document.getElementById("zoneTheme");
  const lineThicknessInput = document.getElementById("lineThickness");
  const gridSpacingInput = document.getElementById("gridSpacing");
  const snapToGridInput = document.getElementById("snapToGrid");
  const simpleShapeSelect = document.getElementById("simpleShape");
  const copyCoordinatesButton = document.getElementById("copyCoordinates");
  const undoCoordinateButton = document.getElementById("undoCoordinate");
  const clearCoordinatesButton = document.getElementById("clearCoordinates");
  const dragOverModal = document.getElementById("dragOverModel");
  const statusMessage = document.getElementById("statusMessage");
  const themeToggle = document.getElementById("themeToggle");
  const themeToggleText = document.getElementById("themeToggleText");
  const year = document.getElementById("year");

  const dotRadius = 8;
  const triangleSize = dotRadius * 1.5;
  const squareSize = dotRadius * 1.25;
  const canvasBoundsLabel = `${canvas.width} x ${canvas.height}`;
  const manualShapeValue = "manual";
  const minimumShapeSize = 24;
  const coordinatesHashParam = "dptCoordinates";
  const unsetCoordinatesValue = "notSet";
  const legacyCoordinateHashParams = ["coordinates", "coords"];
  const retiredHashParams = [
    "dptImage",
    "dptLineColor",
    "dptLineWidth",
    "dptPointColor",
    "dptTheme",
  ];
  const storedImageKey = "aptzb-custom-image";
  const zoneThemes = {
    eveningFjord: {
      dot: "#ff8a7a",
      line: "#67d8ff",
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
  const simpleShapeLabels = {
    triangle: "Triangle",
    rectangle: "Rectangle",
    rhombus: "Rhombus",
    trapezoid: "Trapezoid",
    hexagon: "Hexagon",
    octagon: "Octagon",
  };

  let dots = [];
  let image = new Image();
  let currentZoneTheme = zoneThemes[zoneThemeSelect.value] || zoneThemes.eveningFjord;
  let lineColor = currentZoneTheme.line;
  let previewLineColor = lineColor;
  let dotColor = currentZoneTheme.dot;
  let lineThickness = parseInt(lineThicknessInput.value, 10);
  let gridSpacing = parseInt(gridSpacingInput.value, 10);
  let snapToGrid = snapToGridInput.checked;
  let selectedShape = simpleShapeSelect.value;
  let imageLoaded = false;
  let imageIsSample = true;
  let newLine = true;
  let closeModalTimer;
  let dragState = null;
  let shapeDragState = null;
  let suppressNextClick = false;

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
    retiredHashParams.forEach((param) => params.delete(param));
  }

  function applyZoneTheme(themeName, options = {}) {
    currentZoneTheme = zoneThemes[themeName] || zoneThemes.eveningFjord;
    lineColor = currentZoneTheme.line;
    previewLineColor = lineColor;
    dotColor = currentZoneTheme.dot;
    zoneThemeSelect.value = Object.keys(zoneThemes).includes(themeName)
      ? themeName
      : "eveningFjord";
    document.body.style.setProperty("--zone-theme-line", lineColor);
    document.body.style.setProperty("--zone-theme-dot", dotColor);

    if (!options.silent) {
      draw();
    }
  }

  function applyTheme(theme) {
    const nextTheme = theme === "dark" ? "dark" : "light";
    document.body.dataset.theme = nextTheme;
    document.body.classList.toggle("mds-theme-stable-darkWebex", nextTheme === "dark");
    document.body.classList.toggle("mds-theme-stable-lightWebex", nextTheme === "light");
    themeToggle.setAttribute("aria-pressed", String(nextTheme === "dark"));
    themeToggle.setAttribute(
      "aria-label",
      nextTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"
    );
    themeToggleText.textContent = nextTheme === "dark" ? "Light" : "Dark";
    try {
      localStorage.setItem("aptzb-theme", nextTheme);
    } catch (error) {
      // Theme persistence is optional; drawing should still work without storage.
    }
    draw();
  }

  let savedTheme = null;
  try {
    savedTheme = localStorage.getItem("aptzb-theme");
  } catch (error) {
    savedTheme = null;
  }

  const preferredTheme =
    savedTheme ||
    (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

  applyZoneTheme(zoneThemeSelect.value, { silent: true });
  applyTheme(preferredTheme);

  if (year) {
    year.textContent = new Date().getFullYear();
  }

  function setStatus(message, type = "info") {
    statusMessage.textContent = message;
    statusMessage.className = `help status-message is-${type}`;
  }

  function setShadow() {
    ctx.shadowColor = "rgba(0, 0, 0, 1)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 5;
    ctx.shadowOffsetY = 5;
  }

  function setLineShadow() {
    ctx.shadowColor = "rgba(0, 0, 0, 0.72)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
  }

  function strokeLine() {
    setLineShadow();
    ctx.stroke();
    clearShadow();
  }

  function clearShadow() {
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  function getCanvasTheme() {
    const isDarkTheme = document.body.dataset.theme === "dark";
    const grid = "rgba(128, 128, 128, 0.3)";
    return document.body.dataset.theme === "dark"
      ? {
          empty: "#0e1013",
          sampleOverlay: "rgba(14, 16, 19, 0.46)",
          sampleText: "rgba(255, 255, 255, 0.95)",
          sampleSubtext: "rgba(255, 255, 255, 0.72)",
          sampleShadow: "rgba(0, 0, 0, 0.85)",
          grid,
          isDarkTheme,
        }
      : {
          empty: "#f8fdff",
          sampleOverlay: "rgba(248, 253, 255, 0.66)",
          sampleText: "rgba(0, 0, 0, 0.88)",
          sampleSubtext: "rgba(0, 0, 0, 0.62)",
          sampleShadow: "rgba(255, 255, 255, 0.92)",
          grid,
          isDarkTheme,
        };
  }

  function drawSampleImageHint() {
    const theme = getCanvasTheme();
    const panelY = 78;

    ctx.save();
    ctx.textAlign = "center";
    ctx.shadowColor = theme.sampleShadow;
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = theme.sampleText;
    ctx.font = "700 42px Momentum, Inter, Arial, sans-serif";
    ctx.fillText("Sample camera view", canvas.width / 2, panelY + 56);

    ctx.fillStyle = theme.sampleSubtext;
    ctx.font = "400 28px Momentum, Inter, Arial, sans-serif";
    ctx.fillText(
      "Upload your own P60 or PTZ4K screenshot before creating coordinates.",
      canvas.width / 2,
      panelY + 102
    );
    ctx.restore();
  }

  function drawBackground() {
    const theme = getCanvasTheme();

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = theme.empty;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (imageLoaded) {
      ctx.save();
      if (imageIsSample) {
        ctx.globalAlpha = 0.52;
      }
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      ctx.restore();

      if (imageIsSample) {
        ctx.fillStyle = theme.sampleOverlay;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }

  function drawGrid() {
    ctx.strokeStyle = getCanvasTheme().grid;
    ctx.lineWidth = 1;
    for (let x = gridSpacing; x < canvas.width; x += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = gridSpacing; y < canvas.height; y += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
  }

  function orientation(a, b, c) {
    const value = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
    if (value === 0) return 0;
    return value > 0 ? 1 : 2;
  }

  function onSegment(a, b, c) {
    return (
      b.x <= Math.max(a.x, c.x) &&
      b.x >= Math.min(a.x, c.x) &&
      b.y <= Math.max(a.y, c.y) &&
      b.y >= Math.min(a.y, c.y)
    );
  }

  function doLinesIntersect(line1Start, line1End, line2Start, line2End) {
    const o1 = orientation(line1Start, line1End, line2Start);
    const o2 = orientation(line1Start, line1End, line2End);
    const o3 = orientation(line2Start, line2End, line1Start);
    const o4 = orientation(line2Start, line2End, line1End);

    if (o1 !== o2 && o3 !== o4) return true;
    if (o1 === 0 && onSegment(line1Start, line2Start, line1End)) return true;
    if (o2 === 0 && onSegment(line1Start, line2End, line1End)) return true;
    if (o3 === 0 && onSegment(line2Start, line1Start, line2End)) return true;
    if (o4 === 0 && onSegment(line2Start, line1End, line2End)) return true;
    return false;
  }

  function buildEdges(points, closePolygon) {
    const edges = [];
    for (let index = 0; index < points.length - 1; index += 1) {
      edges.push({
        start: points[index],
        end: points[index + 1],
        startIndex: index,
        endIndex: index + 1,
      });
    }

    if (closePolygon && points.length > 2) {
      edges.push({
        start: points[points.length - 1],
        end: points[0],
        startIndex: points.length - 1,
        endIndex: 0,
      });
    }

    return edges;
  }

  function findLineIntersection(points, closePolygon) {
    const edges = buildEdges(points, closePolygon);

    for (let firstIndex = 0; firstIndex < edges.length; firstIndex += 1) {
      for (
        let secondIndex = firstIndex + 1;
        secondIndex < edges.length;
        secondIndex += 1
      ) {
        const first = edges[firstIndex];
        const second = edges[secondIndex];
        const sharesEndpoint =
          first.startIndex === second.startIndex ||
          first.startIndex === second.endIndex ||
          first.endIndex === second.startIndex ||
          first.endIndex === second.endIndex;

        if (sharesEndpoint) continue;

        if (doLinesIntersect(first.start, first.end, second.start, second.end)) {
          return { first, second };
        }
      }
    }

    return null;
  }

  function validateZone(points, options = {}) {
    const requireClosedPolygon = options.requireClosedPolygon ?? true;

    if (points.length < 3) {
      return {
        valid: false,
        message: "Add at least three coordinate points before copying.",
      };
    }

    for (let index = 0; index < points.length; index += 1) {
      const point = points[index];
      if (
        point.x < 0 ||
        point.x > canvas.width ||
        point.y < 0 ||
        point.y > canvas.height
      ) {
        return {
          valid: false,
          message: `Point ${index + 1} is outside the ${canvasBoundsLabel} camera frame.`,
        };
      }
    }

    const seenPoints = new Set();
    for (const point of points) {
      const key = `${point.x},${point.y}`;
      if (seenPoints.has(key)) {
        return {
          valid: false,
          message: "Each coordinate point must be unique.",
        };
      }
      seenPoints.add(key);
    }

    const intersection = findLineIntersection(points, requireClosedPolygon);
    if (intersection) {
      return {
        valid: false,
        message:
          "Zone lines cannot intersect. Adjust the point order before copying.",
      };
    }

    return { valid: true };
  }

  function escapeHtml(value) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getCoordinateTokens(value) {
    const tokens = [];
    let start = 0;

    for (let index = 0; index <= value.length; index += 1) {
      if (index !== value.length && value[index] !== ",") continue;

      const raw = value.slice(start, index);
      const leadingWhitespace = raw.match(/^\s*/)[0].length;
      const trailingWhitespace = raw.match(/\s*$/)[0].length;
      tokens.push({
        raw,
        value: raw.trim(),
        start,
        end: index,
        contentStart: start + leadingWhitespace,
        contentEnd: index - trailingWhitespace,
      });
      start = index + 1;
    }

    return tokens;
  }

  function isIntegerToken(value) {
    if (!/^-?\d+$/.test(value)) return false;
    return Number.isSafeInteger(Number(value));
  }

  function createCoordinateIssue(token, message, type = "issue") {
    return {
      start: token.contentStart,
      end: Math.max(token.contentStart + 1, token.contentEnd),
      message,
      type,
    };
  }

  function parseCoordinateEntry(value) {
    const tokens = getCoordinateTokens(value);
    const points = [];
    let issue = null;
    let error = null;

    if (!value.trim()) {
      return { points, issue, error, zoneValidation: null };
    }

    for (let index = 0; index < tokens.length; index += 2) {
      const xToken = tokens[index];
      const yToken = tokens[index + 1];

      if (!yToken) {
        if (!xToken.value) {
          issue = {
            start: Math.max(0, xToken.start - 1),
            end: xToken.end,
            message: "Type the next x,y pair or remove the trailing comma.",
            type: "issue",
          };
        } else if (isIntegerToken(xToken.value)) {
          issue = createCoordinateIssue(
            xToken,
            `Missing y coordinate for x=${xToken.value}.`
          );
        } else {
          error = createCoordinateIssue(
            xToken,
            "Coordinates must be whole numbers separated by commas.",
            "error"
          );
        }
        break;
      }

      if (!xToken.value || !yToken.value) {
        const isFinalPair = index + 2 >= tokens.length;
        if (isFinalPair && xToken.value && !yToken.value) {
          issue = {
            start: xToken.contentStart,
            end: xToken.contentEnd,
            message: `Missing y coordinate for x=${xToken.value}.`,
            type: "issue",
          };
          break;
        }

        if (xToken.value) {
          issue = {
            start: xToken.contentStart,
            end: xToken.contentEnd,
            message: `Missing y coordinate for x=${xToken.value}.`,
            type: "issue",
          };
        } else {
          issue = {
            start: yToken.contentStart,
            end: yToken.contentEnd,
            message: `Missing x coordinate before y=${yToken.value}.`,
            type: "issue",
          };
        }
        break;
      }

      if (!isIntegerToken(xToken.value)) {
        error = createCoordinateIssue(
          xToken,
          "Coordinates must be whole numbers separated by commas.",
          "error"
        );
        break;
      }

      if (!isIntegerToken(yToken.value)) {
        error = createCoordinateIssue(
          yToken,
          "Coordinates must be whole numbers separated by commas.",
          "error"
        );
        break;
      }

      const point = {
        x: Number(xToken.value),
        y: Number(yToken.value),
      };

      if (
        point.x < 0 ||
        point.x > canvas.width ||
        point.y < 0 ||
        point.y > canvas.height
      ) {
        error = {
          start: xToken.contentStart,
          end: yToken.contentEnd,
          message: `Point ${points.length + 1} is outside the ${canvasBoundsLabel} camera frame.`,
          type: "error",
        };
        break;
      }

      points.push(point);
    }

    let zoneValidation = null;
    if (points.length >= 3) {
      zoneValidation = validateZone(points);
    }

    return { points, issue, error, zoneValidation };
  }

  function syncCoordinateHighlightScroll() {
    const highlightContent = coordinateHighlights.querySelector(
      ".coordinate-highlight-content"
    );
    if (!highlightContent) return;
    highlightContent.style.transform = `translateX(${-coordinatesInput.scrollLeft}px)`;
  }

  function renderCoordinateHighlights(value, issue) {
    const text = value || "";
    if (!text && !issue) {
      coordinateHighlights.innerHTML = "";
      coordinatesInput.classList.remove("has-coordinate-issue");
      coordinatesInput.removeAttribute("aria-invalid");
      return;
    }

    coordinatesInput.classList.toggle("has-coordinate-issue", Boolean(issue));
    coordinatesInput.setAttribute("aria-invalid", issue ? "true" : "false");

    let content = escapeHtml(text);
    if (issue) {
      const issueClass =
        issue.type === "error"
          ? "coordinate-highlight-issue coordinate-highlight-error"
          : "coordinate-highlight-issue";
      const before = escapeHtml(text.slice(0, issue.start));
      const highlightedText = text.slice(issue.start, issue.end);
      const after = escapeHtml(text.slice(issue.end));
      content = `${before}<mark class="${issueClass}">${escapeHtml(
        highlightedText
      )}</mark>${after}`;
    }

    coordinateHighlights.innerHTML = `<span class="coordinate-highlight-content">${content}</span>`;
    syncCoordinateHighlightScroll();
  }

  function updateCoordinatesHash(points) {
    const params = getUrlHashParams();
    const validation = validateZone(points);

    removeRetiredHashParams(params);
    legacyCoordinateHashParams.forEach((param) => params.delete(param));

    if (validation.valid) {
      params.set(coordinatesHashParam, formatCoordinates(points, true));
    } else {
      params.set(coordinatesHashParam, unsetCoordinatesValue);
    }

    replaceUrlHashParams(params);
  }

  function applyCoordinateEntry(value, options = {}) {
    const parsed = parseCoordinateEntry(value);
    const highlightIssue = parsed.error || parsed.issue;

    renderCoordinateHighlights(value, highlightIssue);
    dots = parsed.points;
    newLine = dots.length < 3;
    draw();
    updateCoordinatesHash(dots);

    if (parsed.error) {
      setStatus(parsed.error.message, "danger");
      return;
    }

    if (parsed.issue) {
      setStatus(`${parsed.issue.message} Complete pairs are applied.`, "warning");
      return;
    }

    if (parsed.zoneValidation && !parsed.zoneValidation.valid) {
      setStatus(parsed.zoneValidation.message, "danger");
      return;
    }

    if (!options.silent) {
      handlePointCountStatus();
    }
  }

  function getCoordinatesHashValue() {
    const params = getUrlHashParams();
    const currentValue = params.get(coordinatesHashParam);
    if (currentValue && currentValue !== unsetCoordinatesValue) {
      return currentValue;
    }

    for (const legacyParam of legacyCoordinateHashParams) {
      const legacyValue = params.get(legacyParam);
      if (legacyValue) return legacyValue;
    }

    return null;
  }

  function loadCoordinatesFromHash() {
    const hashCoordinates = getCoordinatesHashValue();
    if (!hashCoordinates) {
      coordinatesInput.value = "";
      renderCoordinateHighlights(coordinatesInput.value, null);
      updateCoordinatesHash([]);
      return;
    }

    coordinatesInput.value = hashCoordinates;
    applyCoordinateEntry(hashCoordinates, { silent: true });
    handlePointCountStatus();
  }

  function formatCoordinates(points, compact = false) {
    const separator = compact ? "," : ", ";
    const pairSeparator = compact ? "," : ", ";
    return points.map((point) => `${point.x}${separator}${point.y}`).join(pairSeparator);
  }

  function printCoordinates() {
    coordinatesInput.value = formatCoordinates(dots);
    renderCoordinateHighlights(coordinatesInput.value, null);
    updateCoordinatesHash(dots);
  }

  function getCanvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleFactor = {
      x: canvas.width / rect.width,
      y: canvas.height / rect.height,
    };

    return {
      x: Math.round((event.clientX - rect.left) * scaleFactor.x),
      y: Math.round((event.clientY - rect.top) * scaleFactor.y),
    };
  }

  function clampPoint(point) {
    return {
      x: Math.min(canvas.width, Math.max(0, point.x)),
      y: Math.min(canvas.height, Math.max(0, point.y)),
    };
  }

  function snapPointToGrid(point) {
    if (!snapToGrid) return clampPoint(point);

    return clampPoint({
      x: Math.round(point.x / gridSpacing) * gridSpacing,
      y: Math.round(point.y / gridSpacing) * gridSpacing,
    });
  }

  function getPlacementPoint(event) {
    return snapPointToGrid(getCanvasPoint(event));
  }

  function getDistance(firstPoint, secondPoint) {
    return Math.sqrt(
      (firstPoint.x - secondPoint.x) ** 2 + (firstPoint.y - secondPoint.y) ** 2
    );
  }

  function getExistingDotIndex(point) {
    for (let index = dots.length - 1; index >= 0; index -= 1) {
      if (getDistance(dots[index], point) < dotRadius + 12) {
        return index;
      }
    }

    return -1;
  }

  function createShapePoint(x, y) {
    return snapPointToGrid({
      x: Math.round(x),
      y: Math.round(y),
    });
  }

  function createShapePoints(shapeName, startPoint, endPoint) {
    const minX = Math.min(startPoint.x, endPoint.x);
    const maxX = Math.max(startPoint.x, endPoint.x);
    const minY = Math.min(startPoint.y, endPoint.y);
    const maxY = Math.max(startPoint.y, endPoint.y);
    const width = maxX - minX;
    const height = maxY - minY;

    if (width < minimumShapeSize || height < minimumShapeSize) {
      return [];
    }

    const midX = minX + width / 2;
    const midY = minY + height / 2;
    const quarterX = width * 0.25;
    const octagonInset = Math.min(width, height) * 0.28;
    const shapePoints = {
      triangle: [
        [midX, minY],
        [maxX, maxY],
        [minX, maxY],
      ],
      rectangle: [
        [minX, minY],
        [maxX, minY],
        [maxX, maxY],
        [minX, maxY],
      ],
      rhombus: [
        [midX, minY],
        [maxX, midY],
        [midX, maxY],
        [minX, midY],
      ],
      trapezoid: [
        [minX + quarterX, minY],
        [maxX - quarterX, minY],
        [maxX, maxY],
        [minX, maxY],
      ],
      hexagon: [
        [minX + quarterX, minY],
        [maxX - quarterX, minY],
        [maxX, midY],
        [maxX - quarterX, maxY],
        [minX + quarterX, maxY],
        [minX, midY],
      ],
      octagon: [
        [minX + octagonInset, minY],
        [maxX - octagonInset, minY],
        [maxX, minY + octagonInset],
        [maxX, maxY - octagonInset],
        [maxX - octagonInset, maxY],
        [minX + octagonInset, maxY],
        [minX, maxY - octagonInset],
        [minX, minY + octagonInset],
      ],
    };

    return (shapePoints[shapeName] || []).map(([x, y]) =>
      createShapePoint(x, y)
    );
  }

  function getShapeLabel(shapeName) {
    return simpleShapeLabels[shapeName] || "Shape";
  }

  function validatePointMove(points) {
    if (points.length >= 3) {
      return validateZone(points);
    }

    const seenPoints = new Set();
    for (let index = 0; index < points.length; index += 1) {
      const point = points[index];
      if (
        point.x < 0 ||
        point.x > canvas.width ||
        point.y < 0 ||
        point.y > canvas.height
      ) {
        return {
          valid: false,
          message: `Point ${index + 1} is outside the ${canvasBoundsLabel} camera frame.`,
        };
      }

      const key = `${point.x},${point.y}`;
      if (seenPoints.has(key)) {
        return {
          valid: false,
          message: "Each coordinate point must be unique.",
        };
      }
      seenPoints.add(key);
    }

    return { valid: true };
  }

  function isNearStart(point) {
    if (dots.length < 3) return false;
    return (
      getDistance(dots[0], point) < dotRadius + 10
    );
  }

  function drawSnapPreview(point) {
    if (!point) return;

    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.lineWidth = 2;
    ctx.strokeStyle = dotColor;
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.arc(point.x, point.y, dotRadius + 7, 0, Math.PI * 2);
    strokeLine();
    ctx.restore();
  }

  function drawShapePreview(points) {
    if (!points || points.length < 3) return;

    ctx.save();
    ctx.globalAlpha = 0.78;
    ctx.lineWidth = lineThickness * 1.5;
    ctx.strokeStyle = lineColor;
    ctx.setLineDash([12, 8]);
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((point) => {
      ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
    strokeLine();

    ctx.setLineDash([]);
    ctx.globalAlpha = 0.9;
    points.forEach((point) => {
      ctx.beginPath();
      setShadow();
      ctx.fillStyle = dotColor;
      ctx.arc(point.x, point.y, dotRadius * 0.85, 0, Math.PI * 2);
      ctx.fill();
      clearShadow();
    });
    ctx.restore();
  }

  function draw(cursor, options = {}) {
    let hoverStart = false;
    drawBackground();
    drawGrid();

    ctx.strokeStyle = lineColor;
    ctx.lineWidth = lineThickness * 1.5;

    if (cursor && newLine && dots.length > 0) {
      hoverStart = isNearStart(cursor);
      ctx.setLineDash([5, 8]);
      ctx.strokeStyle = previewLineColor;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(dots[dots.length - 1].x, dots[dots.length - 1].y);
      ctx.lineTo(cursor.x, cursor.y);
      strokeLine();
      ctx.strokeStyle = lineColor;
      ctx.globalAlpha = 1;
      ctx.setLineDash([]);
    }

    dots.forEach((dot, index) => {
      ctx.beginPath();
      if (index > 0) {
        ctx.moveTo(dots[index - 1].x, dots[index - 1].y);
        ctx.lineTo(dot.x, dot.y);
        strokeLine();
      }

      if (dots.length > 2 && index === dots.length - 1) {
        if (newLine) {
          ctx.globalAlpha = 0.8;
          ctx.setLineDash([10, 8]);
        }
        ctx.lineTo(dots[0].x, dots[0].y);
        strokeLine();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      }
    });

    dots.forEach((dot, index) => {
      ctx.beginPath();
      setShadow();
      ctx.fillStyle = dotColor;
      if (index === 0) {
        const size = hoverStart ? triangleSize * 2 : triangleSize;
        ctx.moveTo(dot.x, dot.y - size);
        ctx.lineTo(dot.x - size, dot.y + size);
        ctx.lineTo(dot.x + size, dot.y + size);
        ctx.closePath();
        ctx.fill();
      } else if (index === dots.length - 1) {
        ctx.fillRect(
          dot.x - squareSize,
          dot.y - squareSize,
          squareSize * 2,
          squareSize * 2
        );
      } else {
        ctx.arc(dot.x, dot.y, dotRadius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
      }
      clearShadow();
    });

    drawShapePreview(options.shapePreviewPoints);

    if (snapToGrid) {
      drawSnapPreview(options.snapPreviewPoint || cursor);
    }

    if (imageIsSample) {
      drawSampleImageHint();
    }

    ctx.setLineDash([]);
  }

  function handlePointCountStatus() {
    if (dots.length < 3) {
      setStatus(
        `Point ${dots.length} added. Add ${3 - dots.length} more to create a zone.`,
        "info"
      );
      return;
    }

    const validation = validateZone(dots);
    if (validation.valid) {
      setStatus(
        "Zone is valid. Copy the coordinates or add more points if needed.",
        "success"
      );
    } else {
      setStatus(validation.message, "warning");
    }
  }

  function beginShapeDrag(event) {
    const startPoint = getPlacementPoint(event);
    shapeDragState = {
      endPoint: startPoint,
      moved: false,
      shapeName: selectedShape,
      startClientPoint: {
        x: event.clientX,
        y: event.clientY,
      },
      startPoint,
    };

    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add("is-drawing-shape");
    draw(null, {
      snapPreviewPoint: snapToGrid ? startPoint : null,
    });
  }

  function updateShapeDrag(event) {
    const clientDistance = getDistance(shapeDragState.startClientPoint, {
      x: event.clientX,
      y: event.clientY,
    });
    if (!shapeDragState.moved && clientDistance < 3) return;

    shapeDragState.moved = true;
    shapeDragState.endPoint = getPlacementPoint(event);
    const previewPoints = createShapePoints(
      shapeDragState.shapeName,
      shapeDragState.startPoint,
      shapeDragState.endPoint
    );

    draw(null, {
      shapePreviewPoints: previewPoints,
      snapPreviewPoint: snapToGrid ? shapeDragState.endPoint : null,
    });
  }

  function finishShapeDrag(event) {
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }

    canvas.classList.remove("is-drawing-shape");
    suppressNextClick = true;

    const shapeLabel = getShapeLabel(shapeDragState.shapeName);
    const shapePoints = createShapePoints(
      shapeDragState.shapeName,
      shapeDragState.startPoint,
      shapeDragState.endPoint
    );

    if (!shapeDragState.moved || shapePoints.length < 3) {
      shapeDragState = null;
      draw();
      setStatus(`Drag on the editor to place a ${shapeLabel.toLowerCase()}.`, "info");
      return;
    }

    const validation = validateZone(shapePoints);
    if (!validation.valid) {
      shapeDragState = null;
      draw();
      setStatus(`Shape blocked. ${validation.message}`, "danger");
      return;
    }

    dots = shapePoints;
    newLine = false;
    shapeDragState = null;
    printCoordinates();
    draw();
    setStatus(`${shapeLabel} placed. Drag points to refine the zone.`, "success");
  }

  function cancelShapeDrag(event) {
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }

    canvas.classList.remove("is-drawing-shape");
    shapeDragState = null;
    suppressNextClick = true;
    draw();
    setStatus("Shape placement cancelled.", "info");
  }

  canvas.addEventListener("click", function (event) {
    if (!imageLoaded) return;

    if (suppressNextClick) {
      suppressNextClick = false;
      return;
    }

    if (selectedShape !== manualShapeValue) return;

    const point = getPlacementPoint(event);

    if (!newLine) {
      setStatus("Zone is complete. Use Undo Last Point or Clear Coordinates to edit.", "info");
      return;
    }

    if (isNearStart(point)) {
      const validation = validateZone(dots);
      if (!validation.valid) {
        setStatus(validation.message, "danger");
        return;
      }

      newLine = false;
      draw(point);
      printCoordinates();
      setStatus("Zone completed. Coordinates are ready to copy.", "success");
      return;
    }

    dots.push(point);
    const intersection = findLineIntersection(dots, false);
    if (intersection) {
      dots.pop();
      draw();
      printCoordinates();
      setStatus(
        "The last point would create an intersecting line, so it was not added.",
        "danger"
      );
      return;
    }

    draw();
    printCoordinates();
    handlePointCountStatus();
  });

  canvas.addEventListener("contextmenu", function (event) {
    event.preventDefault();
    if (!imageLoaded) return;

    const point = getCanvasPoint(event);

    if (!newLine && isNearStart(point)) {
      newLine = true;
      draw();
      setStatus("Zone reopened. You can add or remove points.", "info");
      return;
    }

    const previousLength = dots.length;
    dots = dots.filter(
      (dot) => Math.sqrt((dot.x - point.x) ** 2 + (dot.y - point.y) ** 2) > dotRadius + 5
    );

    if (dots.length !== previousLength) {
      newLine = true;
      draw();
      printCoordinates();
      handlePointCountStatus();
    }
  });

  canvas.addEventListener("pointerdown", function (event) {
    if (!imageLoaded || event.button !== 0) return;

    const point = getCanvasPoint(event);
    const dotIndex = getExistingDotIndex(point);
    if (dotIndex === -1) {
      if (selectedShape !== manualShapeValue) {
        beginShapeDrag(event);
      }
      return;
    }

    dragState = {
      dotIndex,
      moved: false,
      originalPoint: { ...dots[dotIndex] },
      startClientPoint: {
        x: event.clientX,
        y: event.clientY,
      },
    };

    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add("is-dragging-point");
  });

  canvas.addEventListener("pointermove", function (event) {
    if (shapeDragState) {
      updateShapeDrag(event);
      return;
    }

    if (!dragState) return;

    const clientDistance = getDistance(dragState.startClientPoint, {
      x: event.clientX,
      y: event.clientY,
    });
    if (!dragState.moved && clientDistance < 3) return;

    dragState.moved = true;
    const nextPoint = getPlacementPoint(event);
    const candidateDots = dots.map((dot, index) =>
      index === dragState.dotIndex ? nextPoint : dot
    );
    const validation = validatePointMove(candidateDots);

    if (!validation.valid) {
      setStatus(`Move blocked. ${validation.message}`, "danger");
      draw(null, {
        snapPreviewPoint: snapToGrid ? nextPoint : null,
      });
      return;
    }

    dots = candidateDots;
    printCoordinates();
    draw(null, {
      snapPreviewPoint: snapToGrid ? nextPoint : null,
    });
    setStatus("Point moved. Coordinates updated.", "success");
  });

  canvas.addEventListener("pointerup", function (event) {
    if (shapeDragState) {
      finishShapeDrag(event);
      return;
    }

    if (!dragState) return;

    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }

    canvas.classList.remove("is-dragging-point");
    suppressNextClick =
      dragState.moved || dragState.dotIndex !== 0 || !newLine;

    if (dragState.moved) {
      handlePointCountStatus();
    }

    dragState = null;
  });

  canvas.addEventListener("pointercancel", function (event) {
    if (shapeDragState) {
      cancelShapeDrag(event);
      return;
    }

    if (!dragState) return;

    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }

    dots[dragState.dotIndex] = dragState.originalPoint;
    printCoordinates();
    draw();
    canvas.classList.remove("is-dragging-point");
    setStatus("Point move cancelled.", "info");
    dragState = null;
    suppressNextClick = true;
  });

  canvas.addEventListener("mousemove", function (event) {
    if (dragState || shapeDragState) return;
    if (!imageLoaded || selectedShape !== manualShapeValue) return;

    const point = getPlacementPoint(event);
    if (dots.length <= 0) {
      draw(null, {
        snapPreviewPoint: snapToGrid ? point : null,
      });
      return;
    }

    draw(point, {
      snapPreviewPoint: snapToGrid ? point : null,
    });
  });

  canvas.addEventListener("mouseleave", function () {
    if (dragState || shapeDragState) return;
    if (!imageLoaded || dots.length <= 0) return;
    draw();
  });

  function loadSampleImage(options = {}) {
    imageLoaded = false;
    image = new Image();
    image.onload = function () {
      imageLoaded = true;
      imageIsSample = true;
      uploadFileName.textContent = "Sample image shown. Upload your camera view.";
      draw();
    };
    image.src = "sampleImage.jpg";
  }

  function loadCustomImage(dataUrl, options = {}) {
    imageLoaded = false;
    image = new Image();
    image.onload = function () {
      imageLoaded = true;
      imageIsSample = false;
      uploadFileName.textContent = options.name || "Restored uploaded image.";
      draw();
      if (options.statusMessage) {
        setStatus(options.statusMessage, options.statusType || "success");
      }
    };
    image.src = dataUrl;
  }

  function loadInitialImage() {
    try {
      const savedImage = localStorage.getItem(storedImageKey);
      if (savedImage) {
        loadCustomImage(savedImage, { name: "Restored uploaded image." });
        return;
      }
    } catch (error) {
      // Fall back to the bundled sample when browser storage is unavailable.
    }

    loadSampleImage();
  }

  function clearUploadedImage() {
    try {
      localStorage.removeItem(storedImageKey);
    } catch (error) {
      // Clearing the canvas should still work without storage.
    }
    uploadImage.value = "";
    loadSampleImage();
    setStatus("Uploaded image cleared. Sample image restored.", "info");
  }

  function normalizeImageDataUrl(sourceDataUrl, callback) {
    const sourceImage = new Image();
    sourceImage.onload = function () {
      const tempCanvas = document.createElement("canvas");
      const tempContext = tempCanvas.getContext("2d");
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      tempContext.drawImage(sourceImage, 0, 0, tempCanvas.width, tempCanvas.height);
      callback(tempCanvas.toDataURL("image/jpeg", 0.86));
    };
    sourceImage.onerror = function () {
      callback(sourceDataUrl);
    };
    sourceImage.src = sourceDataUrl;
  }

  function loadImageFile(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setStatus("Only image files are supported by your browser.", "danger");
      return;
    }

    const reader = new FileReader();
    reader.onload = function (event) {
      normalizeImageDataUrl(event.target.result, function (imageDataUrl) {
        let savedForRefresh = true;
        try {
          localStorage.setItem(storedImageKey, imageDataUrl);
        } catch (error) {
          savedForRefresh = false;
        }
        loadCustomImage(imageDataUrl, {
          name: file.name,
          statusMessage: savedForRefresh
            ? "Camera view loaded. Existing coordinates remain on the canvas."
            : "Camera view loaded, but this browser could not save it for refresh.",
          statusType: savedForRefresh ? "success" : "warning",
        });
      });
    };
    reader.readAsDataURL(file);
  }

  loadInitialImage();
  loadCoordinatesFromHash();

  uploadImage.addEventListener("change", function (event) {
    loadImageFile(event.target.files[0]);
  });

  clearImageButton.addEventListener("click", clearUploadedImage);

  coordinatesInput.addEventListener("input", function (event) {
    applyCoordinateEntry(event.target.value);
  });

  coordinatesInput.addEventListener("scroll", syncCoordinateHighlightScroll);

  window.addEventListener("hashchange", function () {
    const hashCoordinates = getCoordinatesHashValue();
    if (!hashCoordinates) {
      if (getUrlHashParams().get(coordinatesHashParam) === unsetCoordinatesValue) {
        coordinatesInput.value = "";
        renderCoordinateHighlights("", null);
        dots = [];
        newLine = true;
        draw();
      }
      return;
    }
    if (hashCoordinates === formatCoordinates(dots, true)) return;

    coordinatesInput.value = hashCoordinates;
    applyCoordinateEntry(hashCoordinates);
  });

  zoneThemeSelect.addEventListener("change", function (event) {
    applyZoneTheme(event.target.value);
  });

  gridSpacingInput.addEventListener("change", function (event) {
    gridSpacing = parseInt(event.target.value, 10);
    draw();
  });

  snapToGridInput.addEventListener("change", function (event) {
    snapToGrid = event.target.checked;
    draw();
    setStatus(snapToGrid ? "Snap to grid enabled." : "Snap to grid disabled.", "info");
  });

  simpleShapeSelect.addEventListener("change", function (event) {
    selectedShape = event.target.value;
    if (selectedShape === manualShapeValue) {
      setStatus("Manual point placement enabled.", "info");
      draw();
      return;
    }

    setStatus(
      `${getShapeLabel(selectedShape)} tool selected. Drag on the editor to place it.`,
      "info"
    );
    draw();
  });

  lineThicknessInput.addEventListener("input", function (event) {
    lineThickness = parseInt(event.target.value, 10);
    draw();
  });

  themeToggle.addEventListener("click", function () {
    applyTheme(document.body.dataset.theme === "dark" ? "light" : "dark");
  });

  copyCoordinatesButton.addEventListener("click", function () {
    const validation = validateZone(dots);
    if (!validation.valid) {
      setStatus(validation.message, "danger");
      return;
    }

    const coordinatesString = formatCoordinates(dots, true);
    navigator.clipboard
      .writeText(coordinatesString)
      .then(() => {
        setStatus("Coordinates copied to clipboard.", "success");
      })
      .catch(() => {
        coordinatesInput.focus();
        coordinatesInput.select();
        setStatus("Clipboard copy failed. The coordinates field is selected.", "warning");
      });
  });

  undoCoordinateButton.addEventListener("click", function () {
    if (dots.length === 0) {
      setStatus("There are no points to undo.", "info");
      return;
    }

    dots.pop();
    newLine = true;
    draw();
    printCoordinates();
    handlePointCountStatus();
  });

  clearCoordinatesButton.addEventListener("click", function () {
    const text =
      "Are you sure you want to clear coordinates?\nClick OK to confirm or Cancel.";
    if (confirm(text)) {
      newLine = true;
      dots = [];
      printCoordinates();
      draw();
      setStatus("Coordinates cleared.", "info");
    }
  });

  function preventDefaults(event) {
    event.preventDefault();
    event.stopPropagation();
  }

  function showModal() {
    dragOverModal.classList.add("is-active");
  }

  function hideModal() {
    dragOverModal.classList.remove("is-active");
  }

  document.body.addEventListener("dragenter", function (event) {
    preventDefaults(event);
    clearTimeout(closeModalTimer);
    showModal();
  });

  document.body.addEventListener("dragover", function (event) {
    preventDefaults(event);
    clearTimeout(closeModalTimer);
  });

  document.body.addEventListener("dragleave", function () {
    clearTimeout(closeModalTimer);
    closeModalTimer = setTimeout(hideModal, 500);
  });

  document.body.addEventListener("drop", function (event) {
    preventDefaults(event);
    hideModal();
    loadImageFile(event.dataTransfer.files[0]);
  });

  dragOverModal
    .querySelector(".modal-close")
    .addEventListener("click", hideModal);
});
