import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  COORDINATES_HASH_PARAM,
  DEFAULT_ZONE_THEME,
  DOT_RADIUS,
  HELP_DISMISSED_KEY,
  MANUAL_SHAPE_VALUE,
  SIMPLE_SHAPE_LABELS,
  SQUARE_SIZE,
  STORED_IMAGE_KEY,
  STORED_THEME_KEY,
  TRIANGLE_SIZE,
  ZONE_THEMES,
} from "./config.js";
import {
  formatCoordinates,
  parseCoordinateEntry,
  renderCoordinateHighlights,
  syncCoordinateHighlightScroll,
} from "./coordinates.js";
import { getDomElements } from "./dom.js";
import {
  clonePoints,
  createShapePoints,
  findLineIntersection,
  getDistance,
  validatePointMove,
  validateZone,
} from "./geometry.js";
import { createHistoryManager } from "./history.js";
import {
  initAnalytics,
  trackCoordinateEdit,
  trackCoordinatesCopied,
  trackCrossLaunch,
  trackFeedbackOpened,
  trackFeedbackSubmitted,
  trackHelpOpened,
  trackPointEdit,
  trackSessionSummary,
  trackShapePlaced,
  trackToolUse,
} from "./analytics.js";
import {
  getCoordinatesHashValue,
  getXLaunchHashValue,
  hashExplicitlyUnset,
  normalizeVisibleHashParams,
  updateCoordinatesHash,
} from "./url-hash.js";

export function startApp() {
  const elements = getDomElements();
  const {
    addShapeButton,
    canvas,
    clearCoordinatesButton,
    clearImageButton,
    coordinateHighlights,
    coordinatesInput,
    copyCoordinatesButton,
    ctx,
    dimImageInput,
    dismissHelpButton,
    dismissHelpForeverButton,
    dragOverModal,
    feedbackButton,
    feedbackBugNotice,
    feedbackCancel,
    feedbackForm,
    feedbackMissing,
    feedbackModal,
    feedbackOutcome,
    feedbackRating,
    feedbackStatus,
    feedbackUseCase,
    gridSpacingInput,
    helpGuideButton,
    helpGuideModal,
    lineThicknessInput,
    redoCoordinateButton,
    shapeOptionButtons,
    shapePickerModal,
    snapToGridInput,
    statusMessage,
    themeOptionButtons,
    themePickerModal,
    themeToggle,
    themeToggleText,
    uploadFileName,
    uploadImage,
    year,
    zoneThemeButton,
    zoneThemeName,
  } = elements;

  let dots = [];
  let image = new Image();
  let currentZoneThemeName = DEFAULT_ZONE_THEME;
  let currentZoneTheme = ZONE_THEMES[currentZoneThemeName];
  let lineColor = currentZoneTheme.line;
  let previewLineColor = lineColor;
  let dotColor = currentZoneTheme.dot;
  let lineThickness = parseInt(lineThicknessInput.value, 10);
  let dimImage = dimImageInput.checked;
  let gridSpacing = parseInt(gridSpacingInput.value, 10);
  let snapToGrid = snapToGridInput.checked;
  let selectedShape = MANUAL_SHAPE_VALUE;
  let imageLoaded = false;
  let imageIsSample = true;
  let newLine = true;
  let closeModalTimer;
  let dragState = null;
  let shapeDragState = null;
  let suppressNextClick = false;
  let typedCoordinateTracked = false;

  const history = createHistoryManager({
    getState: getZoneState,
    restoreState: restoreZoneState,
    setStatus,
  });

  function getAnalyticsSnapshot() {
    return {
      dimImage,
      gridSpacing,
      hasCustomImage: !imageIsSample,
      isValidZone: validateZone(dots).valid,
      pointCount: dots.length,
      snapToGrid,
      themeMode: document.body.dataset.theme || "light",
      xLaunch: getXLaunchHashValue(),
      zoneTheme: currentZoneThemeName,
    };
  }

  function setStatus(message, type = "info") {
    statusMessage.textContent = `Status: ${message}`;
    statusMessage.className = `help status-message is-${type}`;
  }

  function getZoneState() {
    return {
      dots: clonePoints(dots),
      newLine,
    };
  }

  function restoreZoneState(state) {
    dots = clonePoints(state.dots);
    newLine = state.newLine;
    printCoordinates();
    draw();
  }

  function openModal(modal) {
    modal.classList.add("is-active");
    modal.setAttribute("aria-hidden", "false");
  }

  function closeModal(modal) {
    modal.classList.remove("is-active");
    modal.setAttribute("aria-hidden", "true");
  }

  function closePickerModals() {
    closeModal(themePickerModal);
    closeModal(shapePickerModal);
    closeModal(helpGuideModal);
    closeFeedbackModal();
  }

  function getThemeLabel(themeName) {
    const themeButton = Array.from(themeOptionButtons).find(
      (button) => button.dataset.theme === themeName
    );
    return themeButton ? themeButton.textContent.trim() : "Evening Fjord";
  }

  function applyZoneTheme(themeName, options = {}) {
    currentZoneThemeName = ZONE_THEMES[themeName] ? themeName : DEFAULT_ZONE_THEME;
    currentZoneTheme = ZONE_THEMES[currentZoneThemeName];
    lineColor = currentZoneTheme.line;
    previewLineColor = lineColor;
    dotColor = currentZoneTheme.dot;
    zoneThemeName.textContent = getThemeLabel(currentZoneThemeName);
    document.body.style.setProperty("--zone-theme-line", lineColor);
    document.body.style.setProperty("--zone-theme-dot", dotColor);
    themeOptionButtons.forEach((button) => {
      const isSelected = button.dataset.theme === currentZoneThemeName;
      button.classList.toggle("is-selected", isSelected);
      button.setAttribute("aria-pressed", String(isSelected));
    });

    if (!options.silent) {
      draw();
    }
  }

  function applyTheme(theme, options = {}) {
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
      localStorage.setItem(STORED_THEME_KEY, nextTheme);
    } catch (error) {
      // Theme persistence is optional; drawing should still work without storage.
    }
    if (options.track) {
      trackToolUse("display_theme", { themeMode: nextTheme });
    }
    draw();
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
    return isDarkTheme
      ? {
          empty: "#0e1013",
          dimOverlay: "rgba(0, 0, 0, 0.46)",
          sampleOverlay: "rgba(14, 16, 19, 0.46)",
          sampleText: "rgba(255, 255, 255, 0.95)",
          sampleSubtext: "rgba(255, 255, 255, 0.72)",
          sampleShadow: "rgba(0, 0, 0, 0.85)",
          grid,
        }
      : {
          empty: "#f8fdff",
          dimOverlay: "rgba(0, 0, 0, 0.38)",
          sampleOverlay: "rgba(248, 253, 255, 0.66)",
          sampleText: "rgba(0, 0, 0, 0.88)",
          sampleSubtext: "rgba(0, 0, 0, 0.62)",
          sampleShadow: "rgba(255, 255, 255, 0.92)",
          grid,
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
      } else if (dimImage) {
        ctx.fillStyle = theme.dimOverlay;
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

  function drawSnapPreview(point) {
    if (!point) return;

    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.lineWidth = 2;
    ctx.strokeStyle = dotColor;
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.arc(point.x, point.y, DOT_RADIUS + 7, 0, Math.PI * 2);
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
      ctx.arc(point.x, point.y, DOT_RADIUS * 0.85, 0, Math.PI * 2);
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
        const size = hoverStart ? TRIANGLE_SIZE * 2 : TRIANGLE_SIZE;
        ctx.moveTo(dot.x, dot.y - size);
        ctx.lineTo(dot.x - size, dot.y + size);
        ctx.lineTo(dot.x + size, dot.y + size);
        ctx.closePath();
        ctx.fill();
      } else if (index === dots.length - 1) {
        ctx.fillRect(
          dot.x - SQUARE_SIZE,
          dot.y - SQUARE_SIZE,
          SQUARE_SIZE * 2,
          SQUARE_SIZE * 2
        );
      } else {
        ctx.arc(dot.x, dot.y, DOT_RADIUS, 0, Math.PI * 2);
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

  function applyCoordinateEntry(value, options = {}) {
    const previousState = getZoneState();
    const parsed = parseCoordinateEntry(value);
    const highlightIssue = parsed.error || parsed.issue;

    renderCoordinateHighlights(
      coordinatesInput,
      coordinateHighlights,
      value,
      highlightIssue
    );
    dots = parsed.points;
    newLine = dots.length < 3;
    if (options.recordHistory) {
      history.recordFrom(previousState);
    }
    draw();
    updateCoordinatesHash(dots);

    if (options.track && options.source === "paste") {
      trackCoordinateEdit("paste");
    } else if (options.track && options.source === "typed" && !typedCoordinateTracked) {
      typedCoordinateTracked = true;
      trackCoordinateEdit("typed");
    }

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

  function loadCoordinatesFromHash() {
    const hashCoordinates = getCoordinatesHashValue();
    if (!hashCoordinates) {
      coordinatesInput.value = "";
      renderCoordinateHighlights(coordinatesInput, coordinateHighlights, "", null);
      updateCoordinatesHash([]);
      return;
    }

    coordinatesInput.value = hashCoordinates;
    applyCoordinateEntry(hashCoordinates, { silent: true });
    handlePointCountStatus();
  }

  function printCoordinates() {
    coordinatesInput.value = formatCoordinates(dots);
    renderCoordinateHighlights(
      coordinatesInput,
      coordinateHighlights,
      coordinatesInput.value,
      null
    );
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
      x: Math.min(CANVAS_WIDTH, Math.max(0, point.x)),
      y: Math.min(CANVAS_HEIGHT, Math.max(0, point.y)),
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

  function getExistingDotIndex(point) {
    for (let index = dots.length - 1; index >= 0; index -= 1) {
      if (getDistance(dots[index], point) < DOT_RADIUS + 12) {
        return index;
      }
    }

    return -1;
  }

  function isNearStart(point) {
    if (dots.length < 3) return false;
    return getDistance(dots[0], point) < DOT_RADIUS + 10;
  }

  function getShapeLabel(shapeName) {
    return SIMPLE_SHAPE_LABELS[shapeName] || "Shape";
  }

  function setShapeTool(shapeName) {
    selectedShape = SIMPLE_SHAPE_LABELS[shapeName] ? shapeName : MANUAL_SHAPE_VALUE;
    shapeOptionButtons.forEach((button) => {
      const isSelected = button.dataset.shape === selectedShape;
      button.classList.toggle("is-selected", isSelected);
      button.setAttribute("aria-pressed", String(isSelected));
    });
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

  function buildShapePoints(shapeName, startPoint, endPoint) {
    return createShapePoints(shapeName, startPoint, endPoint, snapPointToGrid);
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
    const previewPoints = buildShapePoints(
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
    const shapePoints = buildShapePoints(
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

    history.commit();
    dots = shapePoints;
    newLine = false;
    shapeDragState = null;
    setShapeTool(MANUAL_SHAPE_VALUE);
    printCoordinates();
    draw();
    trackShapePlaced(shapeLabel);
    setStatus(`${shapeLabel} placed. Drag points to refine the zone.`, "success");
  }

  function cancelShapeDrag(event) {
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }

    canvas.classList.remove("is-drawing-shape");
    shapeDragState = null;
    setShapeTool(MANUAL_SHAPE_VALUE);
    suppressNextClick = true;
    draw();
    setStatus("Shape placement cancelled.", "info");
  }

  function loadSampleImage() {
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
      const savedImage = localStorage.getItem(STORED_IMAGE_KEY);
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
      localStorage.removeItem(STORED_IMAGE_KEY);
    } catch (error) {
      // Clearing the canvas should still work without storage.
    }
    uploadImage.value = "";
    loadSampleImage();
    trackToolUse("clear_image");
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
          localStorage.setItem(STORED_IMAGE_KEY, imageDataUrl);
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
        trackToolUse("upload_image", {
          savedForRefresh,
        });
      });
    };
    reader.readAsDataURL(file);
  }

  function copyCoordinatesToClipboard() {
    const validation = validateZone(dots);
    if (!validation.valid) {
      setStatus(validation.message, "danger");
      return;
    }

    const coordinatesString = formatCoordinates(dots, true);
    trackCoordinatesCopied(getAnalyticsSnapshot());
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(coordinatesString)
        .then(() => {
          setStatus("Coordinates copied to clipboard.", "success");
        })
        .catch(() => {
          coordinatesInput.focus();
          coordinatesInput.select();
          setStatus(
            "Clipboard copy failed. The coordinates field is selected.",
            "warning"
          );
        });
      return;
    }

    coordinatesInput.focus();
    coordinatesInput.select();
    setStatus("Clipboard access is unavailable. The coordinates field is selected.", "warning");
  }

  function pasteCoordinatesFromText(text) {
    const nextValue = text.trim();
    if (!nextValue) return;

    coordinatesInput.value = nextValue;
    coordinatesInput.focus();
    applyCoordinateEntry(nextValue, {
      recordHistory: true,
      source: "paste",
      track: true,
    });
  }

  function openHelpGuide(source = "header") {
    openModal(helpGuideModal);
    trackHelpOpened(source);
  }

  function closeHelpGuide() {
    closeModal(helpGuideModal);
  }

  function dismissHelpGuideForever() {
    try {
      localStorage.setItem(HELP_DISMISSED_KEY, "true");
    } catch (error) {
      // Help dismissal persistence is optional.
    }
    trackToolUse("help_dismiss", { action: "dont_show_again" });
    closeHelpGuide();
  }

  function showHelpGuideIfNeeded() {
    let helpDismissed = false;
    try {
      helpDismissed = localStorage.getItem(HELP_DISMISSED_KEY) === "true";
    } catch (error) {
      helpDismissed = false;
    }

    if (!helpDismissed) {
      openHelpGuide("first_time");
    }
  }

  function openFeedbackModal() {
    feedbackStatus.textContent = "";
    updateFeedbackBugNotice();
    openModal(feedbackModal);
    feedbackRating.focus();
    trackFeedbackOpened();
  }

  function closeFeedbackModal() {
    closeModal(feedbackModal);
  }

  function submitFeedback(event) {
    event.preventDefault();
    const rating = feedbackRating.value;
    const useCase = feedbackUseCase.value;
    const outcome = feedbackOutcome.value;
    const missing = feedbackMissing.value;

    trackFeedbackSubmitted({
      missing,
      outcome,
      rating,
      useCase,
    });
    feedbackStatus.textContent = "Feedback submitted. Thank you.";
    feedbackForm.reset();
    updateFeedbackBugNotice();
    window.setTimeout(closeFeedbackModal, 650);
  }

  function isFeedbackFormTarget(target) {
    return feedbackModal.classList.contains("is-active") && feedbackForm.contains(target);
  }

  function updateFeedbackBugNotice() {
    feedbackBugNotice.hidden = feedbackOutcome.value !== "blocked_bug";
  }

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

  function initTheme() {
    let savedTheme = null;
    try {
      savedTheme = localStorage.getItem(STORED_THEME_KEY);
    } catch (error) {
      savedTheme = null;
    }

    const preferredTheme =
      savedTheme ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

    applyZoneTheme(currentZoneThemeName, { silent: true });
    applyTheme(preferredTheme);
  }

  function bindCanvasEvents() {
    canvas.addEventListener("click", function (event) {
      if (!imageLoaded) return;

      if (suppressNextClick) {
        suppressNextClick = false;
        return;
      }

      if (selectedShape !== MANUAL_SHAPE_VALUE) return;

      const point = getPlacementPoint(event);

      if (!newLine) {
        setStatus("Zone is complete. Use Undo, Redo, or Clear to edit.", "info");
        return;
      }

      if (isNearStart(point)) {
        const validation = validateZone(dots);
        if (!validation.valid) {
          setStatus(validation.message, "danger");
          return;
        }

        history.commit();
        newLine = false;
        draw(point);
        printCoordinates();
        trackPointEdit("zone_close");
        setStatus("Zone completed. Coordinates are ready to copy.", "success");
        return;
      }

      const candidateDots = [...dots, point];
      const intersection = findLineIntersection(candidateDots, false);
      if (intersection) {
        draw();
        printCoordinates();
        setStatus(
          "The last point would create an intersecting line, so it was not added.",
          "danger"
        );
        return;
      }

      history.commit();
      dots = candidateDots;
      draw();
      printCoordinates();
      trackPointEdit("manual_add");
      handlePointCountStatus();
    });

    canvas.addEventListener("contextmenu", function (event) {
      event.preventDefault();
      if (!imageLoaded) return;

      const point = getCanvasPoint(event);

      if (!newLine && isNearStart(point)) {
        history.commit();
        newLine = true;
        draw();
        trackPointEdit("zone_reopen");
        setStatus("Zone reopened. You can add or remove points.", "info");
        return;
      }

      const previousLength = dots.length;
      const candidateDots = dots.filter(
        (dot) => getDistance(dot, point) > DOT_RADIUS + 5
      );

      if (candidateDots.length !== previousLength) {
        history.commit();
        dots = candidateDots;
        newLine = true;
        draw();
        printCoordinates();
        trackPointEdit("point_remove");
        handlePointCountStatus();
      }
    });

    canvas.addEventListener("pointerdown", function (event) {
      if (!imageLoaded || event.button !== 0) return;

      const point = getCanvasPoint(event);
      const dotIndex = getExistingDotIndex(point);
      if (dotIndex === -1) {
        if (selectedShape !== MANUAL_SHAPE_VALUE) {
          beginShapeDrag(event);
        }
        return;
      }

      dragState = {
        dotIndex,
        historyState: getZoneState(),
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
      suppressNextClick = dragState.moved || dragState.dotIndex !== 0 || !newLine;

      if (dragState.moved) {
        history.recordFrom(dragState.historyState);
        trackPointEdit("point_move");
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
      if (!imageLoaded || selectedShape !== MANUAL_SHAPE_VALUE) return;

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
  }

  function bindControlEvents() {
    uploadImage.addEventListener("change", function (event) {
      loadImageFile(event.target.files[0]);
    });

    clearImageButton.addEventListener("click", clearUploadedImage);

    coordinatesInput.addEventListener("input", function (event) {
      applyCoordinateEntry(event.target.value, {
        recordHistory: true,
        source: "typed",
        track: true,
      });
    });

    coordinatesInput.addEventListener("scroll", function () {
      syncCoordinateHighlightScroll(coordinatesInput, coordinateHighlights);
    });

    window.addEventListener("hashchange", function () {
      const xLaunch = getXLaunchHashValue();
      if (xLaunch) {
        normalizeVisibleHashParams();
        trackCrossLaunch(xLaunch, getAnalyticsSnapshot());
      }

      const hashCoordinates = getCoordinatesHashValue();
      if (!hashCoordinates) {
        if (hashExplicitlyUnset()) {
          coordinatesInput.value = "";
          renderCoordinateHighlights(coordinatesInput, coordinateHighlights, "", null);
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

    zoneThemeButton.addEventListener("click", function () {
      openModal(themePickerModal);
      trackToolUse("theme_picker");
    });

    themeOptionButtons.forEach((button) => {
      button.addEventListener("click", function () {
        applyZoneTheme(button.dataset.theme);
        closeModal(themePickerModal);
        trackToolUse("theme_select", { zoneTheme: button.dataset.theme });
      });
    });

    addShapeButton.addEventListener("click", function () {
      openModal(shapePickerModal);
      trackToolUse("shape_picker");
    });

    shapeOptionButtons.forEach((button) => {
      button.addEventListener("click", function () {
        setShapeTool(button.dataset.shape);
        closeModal(shapePickerModal);
        trackToolUse("shape_select", { shapeName: getShapeLabel(selectedShape) });
        setStatus(
          `${getShapeLabel(selectedShape)} tool selected. Drag on the editor to place it.`,
          "info"
        );
        draw();
      });
    });

    document.querySelectorAll("[data-close-modal], .picker-modal .modal-close").forEach(
      (closeButton) => {
        closeButton.addEventListener("click", closePickerModals);
      }
    );

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closePickerModals();
      }

      if (isFeedbackFormTarget(event.target)) return;
      if (!(event.metaKey || event.ctrlKey) || event.defaultPrevented) return;

      const key = event.key.toLowerCase();
      if (key === "z" && !event.shiftKey) {
        event.preventDefault();
        if (history.undo()) {
          trackToolUse("undo");
        }
        return;
      }

      if ((key === "z" && event.shiftKey) || key === "y") {
        event.preventDefault();
        if (history.redo()) {
          trackToolUse("redo");
        }
        return;
      }

      if (key === "c") {
        event.preventDefault();
        copyCoordinatesToClipboard();
      }
    });

    document.addEventListener("paste", function (event) {
      if (isFeedbackFormTarget(event.target)) return;

      const text = event.clipboardData && event.clipboardData.getData("text/plain");
      if (!text) return;

      event.preventDefault();
      pasteCoordinatesFromText(text);
    });

    gridSpacingInput.addEventListener("change", function (event) {
      gridSpacing = parseInt(event.target.value, 10);
      draw();
      trackToolUse("grid_spacing", { gridSpacing });
    });

    dimImageInput.addEventListener("change", function (event) {
      dimImage = event.target.checked;
      draw();
      trackToolUse("dim_image", { enabled: dimImage });
      setStatus(dimImage ? "Image dimming enabled." : "Image dimming disabled.", "info");
    });

    snapToGridInput.addEventListener("change", function (event) {
      snapToGrid = event.target.checked;
      draw();
      trackToolUse("snap_to_grid", { enabled: snapToGrid });
      setStatus(snapToGrid ? "Snap to grid enabled." : "Snap to grid disabled.", "info");
    });

    lineThicknessInput.addEventListener("input", function (event) {
      lineThickness = parseInt(event.target.value, 10);
      draw();
      trackToolUse("line_width", { lineThickness });
    });

    themeToggle.addEventListener("click", function () {
      applyTheme(document.body.dataset.theme === "dark" ? "light" : "dark", {
        track: true,
      });
    });

    helpGuideButton.addEventListener("click", function () {
      openHelpGuide("header");
    });

    dismissHelpButton.addEventListener("click", function () {
      trackToolUse("help_dismiss", { action: "got_it" });
      closeHelpGuide();
    });
    dismissHelpForeverButton.addEventListener("click", dismissHelpGuideForever);

    feedbackButton.addEventListener("click", openFeedbackModal);
    feedbackCancel.addEventListener("click", closeFeedbackModal);
    feedbackOutcome.addEventListener("change", updateFeedbackBugNotice);
    feedbackForm.addEventListener("submit", submitFeedback);

    copyCoordinatesButton.addEventListener("click", copyCoordinatesToClipboard);
    elements.undoCoordinateButton.addEventListener("click", function () {
      if (history.undo()) {
        trackToolUse("undo");
      }
    });
    redoCoordinateButton.addEventListener("click", function () {
      if (history.redo()) {
        trackToolUse("redo");
      }
    });

    clearCoordinatesButton.addEventListener("click", function () {
      const text =
        "Are you sure you want to clear coordinates?\nClick OK to confirm or Cancel.";
      if (confirm(text)) {
        if (dots.length > 0) {
          history.commit();
        }
        newLine = true;
        dots = [];
        printCoordinates();
        draw();
        trackToolUse("clear_coordinates");
        setStatus("Coordinates cleared.", "info");
      }
    });
  }

  function bindDragDropEvents() {
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

    dragOverModal.querySelector(".modal-close").addEventListener("click", hideModal);
  }

  function bindAnalyticsExitEvents() {
    const sendSummary = (trigger) => {
      trackSessionSummary(getAnalyticsSnapshot(), trigger);
    };

    window.addEventListener("pagehide", function () {
      sendSummary("pagehide");
    });

    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") {
        sendSummary("visibility_hidden");
      }
    });
  }

  initTheme();
  if (year) {
    year.textContent = new Date().getFullYear();
  }

  loadInitialImage();
  loadCoordinatesFromHash();
  bindCanvasEvents();
  bindControlEvents();
  bindDragDropEvents();
  bindAnalyticsExitEvents();
  initAnalytics(getAnalyticsSnapshot());
  showHelpGuideIfNeeded();
}
