import {
  CANVAS_BOUNDS_LABEL,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
} from "./config.js";
import { validateZone } from "./geometry.js";

export function formatCoordinates(points, compact = false) {
  const separator = compact ? "," : ", ";
  const pairSeparator = compact ? "," : ", ";
  return points.map((point) => `${point.x}${separator}${point.y}`).join(pairSeparator);
}

export function escapeHtml(value) {
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

export function parseCoordinateEntry(value) {
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
      point.x > CANVAS_WIDTH ||
      point.y < 0 ||
      point.y > CANVAS_HEIGHT
    ) {
      error = {
        start: xToken.contentStart,
        end: yToken.contentEnd,
        message: `Point ${points.length + 1} is outside the ${CANVAS_BOUNDS_LABEL} camera frame.`,
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

export function syncCoordinateHighlightScroll(input, highlights) {
  const highlightContent = highlights.querySelector(".coordinate-highlight-content");
  if (!highlightContent) return;
  highlightContent.style.transform = `translateX(${-input.scrollLeft}px)`;
}

export function renderCoordinateHighlights(input, highlights, value, issue) {
  const text = value || "";
  if (!text && !issue) {
    highlights.innerHTML = "";
    input.classList.remove("has-coordinate-issue");
    input.removeAttribute("aria-invalid");
    return;
  }

  input.classList.toggle("has-coordinate-issue", Boolean(issue));
  input.setAttribute("aria-invalid", issue ? "true" : "false");

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

  highlights.innerHTML = `<span class="coordinate-highlight-content">${content}</span>`;
  syncCoordinateHighlightScroll(input, highlights);
}
