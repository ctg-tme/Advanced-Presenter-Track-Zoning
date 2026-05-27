import {
  CANVAS_BOUNDS_LABEL,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  MINIMUM_SHAPE_SIZE,
} from "./config.js?v=20260526-xy-status-placement-2";

export function clonePoints(points) {
  return points.map((point) => ({ x: point.x, y: point.y }));
}

export function getDistance(firstPoint, secondPoint) {
  return Math.sqrt(
    (firstPoint.x - secondPoint.x) ** 2 + (firstPoint.y - secondPoint.y) ** 2
  );
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

export function findLineIntersection(points, closePolygon) {
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

export function validateZone(points, options = {}) {
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
      point.x > CANVAS_WIDTH ||
      point.y < 0 ||
      point.y > CANVAS_HEIGHT
    ) {
      return {
        valid: false,
        message: `Point ${index + 1} is outside the ${CANVAS_BOUNDS_LABEL} camera frame.`,
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

export function validatePointMove(points) {
  if (points.length >= 3) {
    return validateZone(points);
  }

  const seenPoints = new Set();
  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    if (
      point.x < 0 ||
      point.x > CANVAS_WIDTH ||
      point.y < 0 ||
      point.y > CANVAS_HEIGHT
    ) {
      return {
        valid: false,
        message: `Point ${index + 1} is outside the ${CANVAS_BOUNDS_LABEL} camera frame.`,
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

export function createShapePoints(shapeName, startPoint, endPoint, snapPoint) {
  const dx = endPoint.x - startPoint.x;
  const dy = endPoint.y - startPoint.y;
  const dragWidth = Math.abs(dx);
  const dragHeight = Math.abs(dy);
  const minX = Math.min(startPoint.x, endPoint.x);
  const maxX = Math.max(startPoint.x, endPoint.x);
  const minY = Math.min(startPoint.y, endPoint.y);
  const maxY = Math.max(startPoint.y, endPoint.y);
  const width = maxX - minX;
  const height = maxY - minY;

  if (dragWidth < MINIMUM_SHAPE_SIZE || dragHeight < MINIMUM_SHAPE_SIZE) {
    return [];
  }

  const midX = minX + width / 2;
  const midY = minY + height / 2;
  const quarterX = width * 0.25;
  const octagonInset = Math.min(width, height) * 0.28;
  const fromAnchor = (xRatio, yRatio) => [
    startPoint.x + dx * xRatio,
    startPoint.y + dy * yRatio,
  ];
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
      fromAnchor(0.2, 0),
      fromAnchor(0.8, 0),
      fromAnchor(1, 1),
      fromAnchor(0, 1),
    ],
    parallelogram: [
      fromAnchor(0, 0),
      fromAnchor(0.78, 0),
      fromAnchor(1, 1),
      fromAnchor(0.22, 1),
    ],
    pentagon: [
      [midX, minY],
      [maxX, minY + height * 0.38],
      [maxX - width * 0.18, maxY],
      [minX + width * 0.18, maxY],
      [minX, minY + height * 0.38],
    ],
    lShape: [
      fromAnchor(0, 0),
      fromAnchor(1, 0),
      fromAnchor(1, 0.38),
      fromAnchor(0.38, 0.38),
      fromAnchor(0.38, 1),
      fromAnchor(0, 1),
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
    snapPoint({
      x: Math.round(x),
      y: Math.round(y),
    })
  );
}
