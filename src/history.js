import { clonePoints } from "./geometry.js";

function cloneZoneState(state) {
  return {
    dots: clonePoints(state.dots),
    newLine: state.newLine,
  };
}

function statesEqual(firstState, secondState) {
  if (!firstState || !secondState) return false;
  if (firstState.newLine !== secondState.newLine) return false;
  if (firstState.dots.length !== secondState.dots.length) return false;

  return firstState.dots.every((point, index) => {
    const otherPoint = secondState.dots[index];
    return point.x === otherPoint.x && point.y === otherPoint.y;
  });
}

export function createHistoryManager({ getState, restoreState, setStatus }) {
  let undoStack = [];
  let redoStack = [];

  function saveUndoState(state) {
    const normalizedState = cloneZoneState(state);
    const lastState = undoStack[undoStack.length - 1];
    if (lastState && statesEqual(lastState, normalizedState)) return;

    undoStack.push(normalizedState);
    if (undoStack.length > 100) {
      undoStack.shift();
    }
    redoStack = [];
  }

  function recordFrom(previousState) {
    if (statesEqual(previousState, getState())) return;
    saveUndoState(previousState);
  }

  function commit() {
    saveUndoState(getState());
  }

  function undo() {
    if (undoStack.length === 0) {
      setStatus("There is nothing to undo.", "info");
      return false;
    }

    const currentState = getState();
    const previousState = undoStack.pop();
    redoStack.push(currentState);
    restoreState(previousState);
    setStatus("Last action undone.", "success");
    return true;
  }

  function redo() {
    if (redoStack.length === 0) {
      setStatus("There is nothing to redo.", "info");
      return false;
    }

    const currentState = getState();
    const nextState = redoStack.pop();
    undoStack.push(currentState);
    restoreState(nextState);
    setStatus("Action redone.", "success");
    return true;
  }

  return {
    commit,
    recordFrom,
    redo,
    undo,
  };
}
