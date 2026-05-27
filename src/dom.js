function requireElement(id) {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing required element: #${id}`);
  }
  return element;
}

export function getDomElements() {
  const canvas = requireElement("canvas");

  return {
    canvas,
    ctx: canvas.getContext("2d"),
    coordinatesInput: requireElement("coordinates"),
    coordinateHighlights: requireElement("coordinateHighlights"),
    coordinateKeypadButtons: document.querySelectorAll("[data-coordinate-key]"),
    uploadImage: requireElement("uploadImage"),
    uploadFileName: requireElement("uploadFileName"),
    clearImageButton: requireElement("clearImage"),
    zoneThemeButton: requireElement("zoneThemeButton"),
    zoneThemeName: requireElement("zoneThemeName"),
    themePickerModal: requireElement("themePickerModal"),
    themeOptionButtons: document.querySelectorAll(".theme-option"),
    lineThicknessInput: requireElement("lineThickness"),
    dimImageInput: requireElement("dimImage"),
    gridSpacingInput: requireElement("gridSpacing"),
    snapToGridInput: requireElement("snapToGrid"),
    showCoordinateLabelsInput: requireElement("showCoordinateLabels"),
    addShapeButton: requireElement("addShape"),
    shapePickerModal: requireElement("shapePickerModal"),
    shapeOptionButtons: document.querySelectorAll(".shape-option"),
    captureCanvasButton: requireElement("captureCanvasButton"),
    capturePickerModal: requireElement("capturePickerModal"),
    captureFullCanvasButton: requireElement("captureFullCanvas"),
    captureOverlayCanvasButton: requireElement("captureOverlayCanvas"),
    copyCoordinatesButton: requireElement("copyCoordinates"),
    undoCoordinateButton: requireElement("undoCoordinate"),
    redoCoordinateButton: requireElement("redoCoordinate"),
    clearCoordinatesButton: requireElement("clearCoordinates"),
    dragOverModal: requireElement("dragOverModel"),
    statusMessage: requireElement("statusMessage"),
    guidePanel: requireElement("guidePanel"),
    mobileCoordinatesButton: requireElement("mobileCoordinatesButton"),
    mobileGuideButton: requireElement("mobileGuideButton"),
    mobileToolsButton: requireElement("mobileToolsButton"),
    closeGuidePanelButton: requireElement("closeGuidePanel"),
    themeToggle: requireElement("themeToggle"),
    themeToggleText: requireElement("themeToggleText"),
    helpGuideButton: requireElement("helpGuideButton"),
    helpGuideModal: requireElement("helpGuideModal"),
    dismissHelpButton: requireElement("dismissHelp"),
    dismissHelpForeverButton: requireElement("dismissHelpForever"),
    feedbackButton: requireElement("feedbackButton"),
    feedbackModal: requireElement("feedbackModal"),
    feedbackForm: requireElement("feedbackForm"),
    feedbackCancel: requireElement("feedbackCancel"),
    feedbackStatus: requireElement("feedbackStatus"),
    feedbackRating: requireElement("feedbackRating"),
    feedbackUseCase: requireElement("feedbackUseCase"),
    feedbackOutcome: requireElement("feedbackOutcome"),
    feedbackMissing: requireElement("feedbackMissing"),
    feedbackBugNotice: requireElement("feedbackBugNotice"),
    year: document.getElementById("year"),
  };
}
