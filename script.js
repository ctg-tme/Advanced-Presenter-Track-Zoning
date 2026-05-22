document.addEventListener("DOMContentLoaded", function () {
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const coordinatesInput = document.getElementById("coordinates");
  const uploadImage = document.getElementById("uploadImage");
  const uploadFileName = document.getElementById("uploadFileName");
  const pushCoordinates = document.getElementById("pushCoordinates");
  const lineColorInput = document.getElementById("lineColor");
  const dotColorInput = document.getElementById("dotColor");
  const lineThicknessInput = document.getElementById("lineThickness");
  const copyCoordinatesButton = document.getElementById("copyCoordinates");
  const undoCoordinateButton = document.getElementById("undoCoordinate");
  const clearCoordinatesButton = document.getElementById("clearCoordinates");
  const dragOverModal = document.getElementById("dragOverModel");
  const statusMessage = document.getElementById("statusMessage");
  const year = document.getElementById("year");

  const dotRadius = 8;
  const triangleSize = dotRadius * 1.5;
  const squareSize = dotRadius * 1.25;
  const canvasBoundsLabel = `${canvas.width} x ${canvas.height}`;

  let dots = [];
  let image = new Image();
  let lineColor = lineColorInput.value;
  let previewLineColor = lineColor;
  let dotColor = dotColorInput.value;
  let lineThickness = parseInt(lineThicknessInput.value, 10);
  let imageLoaded = false;
  let newLine = true;
  let closeModalTimer;
  let dragState = null;
  let suppressNextClick = false;

  if (year) {
    year.textContent = new Date().getFullYear();
  }

  image.onload = function () {
    imageLoaded = true;
    draw();
  };
  image.src = "sampleImage.jpg";

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

  function clearShadow() {
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  function drawBackground() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (imageLoaded) {
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = "#111820";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  function drawGrid() {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
    ctx.lineWidth = 1;
    for (let x = 40; x < canvas.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 40; y < canvas.height; y += 40) {
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

  function parseCoordinates(value) {
    const trimmedValue = value.trim();
    if (!trimmedValue) {
      return {
        valid: false,
        message: "Paste at least three x,y coordinate pairs.",
      };
    }

    const tokens = trimmedValue.split(",").map((token) => token.trim());
    if (tokens.some((token) => token === "")) {
      return {
        valid: false,
        message: "Remove empty coordinate values before pushing.",
      };
    }

    if (tokens.length % 2 !== 0) {
      return {
        valid: false,
        message: "Coordinates must be complete x,y pairs.",
      };
    }

    const values = tokens.map((token) => Number(token));
    if (
      values.some(
        (valueItem) => !Number.isFinite(valueItem) || !Number.isInteger(valueItem)
      )
    ) {
      return {
        valid: false,
        message: "Coordinates must be whole numbers separated by commas.",
      };
    }

    const parsedPoints = [];
    for (let index = 0; index < values.length; index += 2) {
      parsedPoints.push({ x: values[index], y: values[index + 1] });
    }

    if (
      parsedPoints.length > 3 &&
      parsedPoints[0].x === parsedPoints[parsedPoints.length - 1].x &&
      parsedPoints[0].y === parsedPoints[parsedPoints.length - 1].y
    ) {
      return {
        valid: false,
        message:
          "Do not repeat the first point at the end. TriggerZone closes automatically.",
      };
    }

    const validation = validateZone(parsedPoints);
    if (!validation.valid) {
      return validation;
    }

    return { valid: true, points: parsedPoints };
  }

  function formatCoordinates(points, compact = false) {
    const separator = compact ? "," : ", ";
    const pairSeparator = compact ? "," : ", ";
    return points.map((point) => `${point.x}${separator}${point.y}`).join(pairSeparator);
  }

  function printCoordinates() {
    coordinatesInput.value = formatCoordinates(dots);
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

  function draw(cursor) {
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
      ctx.stroke();
      ctx.strokeStyle = lineColor;
      ctx.globalAlpha = 1;
      ctx.setLineDash([]);
    }

    dots.forEach((dot, index) => {
      ctx.beginPath();
      if (index > 0) {
        ctx.moveTo(dots[index - 1].x, dots[index - 1].y);
        ctx.lineTo(dot.x, dot.y);
        ctx.stroke();
      }

      if (dots.length > 2 && index === dots.length - 1) {
        if (newLine) {
          ctx.globalAlpha = 0.8;
          ctx.setLineDash([10, 8]);
        }
        ctx.lineTo(dots[0].x, dots[0].y);
        ctx.stroke();
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

  canvas.addEventListener("click", function (event) {
    if (!imageLoaded) return;

    if (suppressNextClick) {
      suppressNextClick = false;
      return;
    }

    const point = getCanvasPoint(event);

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
    if (dotIndex === -1) return;

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
    if (!dragState) return;

    const clientDistance = getDistance(dragState.startClientPoint, {
      x: event.clientX,
      y: event.clientY,
    });
    if (!dragState.moved && clientDistance < 3) return;

    dragState.moved = true;
    const nextPoint = clampPoint(getCanvasPoint(event));
    const candidateDots = dots.map((dot, index) =>
      index === dragState.dotIndex ? nextPoint : dot
    );
    const validation = validatePointMove(candidateDots);

    if (!validation.valid) {
      setStatus(`Move blocked. ${validation.message}`, "danger");
      draw();
      return;
    }

    dots = candidateDots;
    printCoordinates();
    draw();
    setStatus("Point moved. Coordinates updated.", "success");
  });

  canvas.addEventListener("pointerup", function (event) {
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
    if (dragState) return;
    if (!imageLoaded || dots.length <= 0) return;
    draw(getCanvasPoint(event));
  });

  canvas.addEventListener("mouseleave", function () {
    if (dragState) return;
    if (!imageLoaded || dots.length <= 0) return;
    draw();
  });

  function loadImageFile(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setStatus("Only image files are supported by your browser.", "danger");
      return;
    }

    const reader = new FileReader();
    reader.onload = function (event) {
      image = new Image();
      image.onload = function () {
        imageLoaded = true;
        uploadFileName.textContent = file.name;
        draw();
        setStatus("Camera view loaded. Existing coordinates remain on the canvas.", "success");
      };
      image.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }

  uploadImage.addEventListener("change", function (event) {
    loadImageFile(event.target.files[0]);
  });

  lineColorInput.addEventListener("input", function (event) {
    lineColor = event.target.value;
    previewLineColor = lineColor;
    draw();
  });

  dotColorInput.addEventListener("input", function (event) {
    dotColor = event.target.value;
    draw();
  });

  lineThicknessInput.addEventListener("input", function (event) {
    lineThickness = parseInt(event.target.value, 10);
    draw();
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
      coordinatesInput.value = "";
      draw();
      setStatus("Coordinates cleared.", "info");
    }
  });

  pushCoordinates.addEventListener("click", function () {
    const parsed = parseCoordinates(coordinatesInput.value);
    if (!parsed.valid) {
      setStatus(parsed.message, "danger");
      return;
    }

    dots = parsed.points;
    newLine = false;
    printCoordinates();
    draw();
    setStatus("Coordinates pushed to the canvas.", "success");
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
