document.addEventListener("DOMContentLoaded", function () {
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const coordinatesDiv = document.getElementById("coordinates");
  const uploadImage = document.getElementById("uploadImage");
  const pushCoordinates = document.getElementById("pushCoordinates");
  const lineColorInput = document.getElementById("lineColor");
  const dotColorInput = document.getElementById("dotColor");
  const lineThicknessInput = document.getElementById("lineThickness");
  const copyCoordinatesButton = document.getElementById("copyCoordinates");
  const clearCoordinatesButton = document.getElementById("clearCoordinates");
  const dragOverModel = document.getElementById("dragOverModel");
  const dropZone = document.querySelector("body");

  const dotRadius = 8;
  const triangleSize = dotRadius * 1.5;
  const squareSize = dotRadius * 1.25;
  let dots = [];
  let connectDots = false;
  let image = new Image();
  let lineColor = lineColorInput.value;
  let previewLineColor = lineColor;
  let dotColor = dotColorInput.value;
  let lineThickness = parseInt(lineThicknessInput.value, 10);
  let imageLoaded = false; // Flag to track if image has been loaded
  let newLine = true;
  let closeModalTimer;

  function setShadow() {
    // Set shadow
    ctx.shadowColor = "rgba(0, 0, 0, 1)"; // Shadow color
    ctx.shadowBlur = 10; // Blur level
    ctx.shadowOffsetX = 5; // Horizontal offset
    ctx.shadowOffsetY = 5; // Vertical offset
  }

  function clearShadow() {
    // Reset shadow
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  // Load initial background image
  image.onload = function () {
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    drawGrid();
    imageLoaded = true; // Set flag to true once image is loaded
  };
  image.src = "sampleImage.png"; // Default image

  // Draw grid
  function drawGrid() {
    ctx.strokeStyle = "#ccc";
    ctx.lineWidth = 1; // Ensure grid lines have a consistent thickness
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

  // Function to check if two line segments intersect
  function doLinesIntersect(line1Start, line1End, line2Start, line2End) {
    const det = (p1, p2) => p1.x * p2.y - p1.y * p2.x;
    const sub = (p1, p2) => ({ x: p1.x - p2.x, y: p1.y - p2.y });

    const p = line1Start;
    const r = sub(line1End, line1Start);
    const q = line2Start;
    const s = sub(line2End, line2Start);

    const rCrossS = det(r, s);
    const qMinusP = sub(q, p);
    const qMinusPCrossR = det(qMinusP, r);

    if (rCrossS === 0) {
      if (qMinusPCrossR === 0) {
        const t0 = qMinusP.x / r.x;
        const t1 = t0 + s.x / r.x;
        if (t0 <= 1 && t1 >= 0) {
          const yBounds = [
            Math.min(line1Start.y, line1End.y),
            Math.max(line1Start.y, line1End.y),
          ];
          if (
            (q.y >= yBounds[0] && q.y <= yBounds[1]) ||
            (q.y + s.y >= yBounds[0] && q.y + s.y <= yBounds[1])
          )
            return true;
        }
      }
      return false;
    }

    const t = det(qMinusP, s) / rCrossS;
    const u = qMinusPCrossR / rCrossS;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
  }

  // Draw dots and lines
  function draw(curser) {
    let hoverStart = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    drawGrid();
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = lineThickness * 1.5; // Set line thickness for connecting lines

    if (curser) {
      if (dots.length >= 3) {
        hoverStart =
          Math.sqrt((dots[0].x - curser.x) ** 2 + (dots[0].y - curser.y) ** 2) <
          dotRadius + 10;
      }

      if (newLine) {
        ctx.setLineDash([5, 8]); // Set line dash pattern (5px dash, 5px gap)
        ctx.strokeStyle = previewLineColor;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(dots[dots.length - 1].x, dots[dots.length - 1].y);
        ctx.lineTo(curser.x, curser.y);
        ctx.stroke();
        ctx.strokeStyle = lineColor;
        ctx.globalAlpha = 1;
        ctx.setLineDash([]);
      }
    }

    dots.forEach((dot, index) => {
      ctx.beginPath();
      if (index > 0) {
        ctx.moveTo(dots[index - 1].x, dots[index - 1].y);
        ctx.lineTo(dot.x, dot.y);
        ctx.stroke();
      }
      if (dots.length > 2 && index == dots.length - 1) {
        if (newLine) ctx.globalAlpha = 0.8;
        if (newLine) ctx.setLineDash([10, 8]); // Set line dash pattern (5px dash, 5px gap)
        ctx.lineTo(dots[0].x, dots[0].y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      }
    });

    // Check for line intersections
    if (connectDots && dots.length > 1) {
      const newDot = dots[dots.length - 1];
      const prevDot = dots[dots.length - 2];

      for (let i = 0; i < dots.length - 3; i++) {
        const dot1 = dots[i];
        const dot2 = dots[i + 1];

        if (doLinesIntersect(prevDot, newDot, dot1, dot2)) {
          alert(
            "Advanced Presenter Track Zones are unable to process intersecting lines\n\nYour last dot placement was removed"
          );
          // Remove the last placed dot
          dots.pop();
          draw(); // Redraw canvas
          return;
        }
      }
    }

    //  Draw Dots
    dots.forEach((dot, index) => {
      ctx.beginPath();
      setShadow();
      ctx.fillStyle = dotColor;
      if (index === 0) {
        const size = hoverStart ? triangleSize * 2 : triangleSize;
        // Draw triangle for the first dot
        ctx.moveTo(dot.x, dot.y - size);
        ctx.lineTo(dot.x - size, dot.y + size);
        ctx.lineTo(dot.x + size, dot.y + size);
        ctx.closePath(); // Close the path
        ctx.fill();
      } else if (index === dots.length - 1) {
        // Draw square for the last dot
        ctx.fillRect(
          dot.x - squareSize,
          dot.y - squareSize,
          squareSize * 2,
          squareSize * 2
        );
      } else {
        // Draw circle for other dots
        ctx.arc(dot.x, dot.y, dotRadius, 0, Math.PI * 2);
        ctx.closePath(); // Close the path
        ctx.fill();
      }
      clearShadow();
    });

    ctx.setLineDash([]); // Reset line dash pattern to solid line
  }

  // Calculate scaling factor
  const getCanvasScaleFactor = () => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: canvas.width / rect.width,
      y: canvas.height / rect.height,
    };
  };

  // Add a dot on click
  canvas.addEventListener("click", function (event) {
    if (!newLine) {
      alert("Shape Complete");
      return;
    }
    if (!imageLoaded) return; // Prevent adding dots if image is not loaded
    const scaleFactor = getCanvasScaleFactor();
    const x = Math.round(
      (event.clientX - canvas.getBoundingClientRect().left) * scaleFactor.x
    );
    const y = Math.round(
      (event.clientY - canvas.getBoundingClientRect().top) * scaleFactor.y
    );

    let startDotClicked = false;
    if (dots.length > 3) {
      startDotClicked =
        Math.sqrt((dots[0].x - x) ** 2 + (dots[0].y - y) ** 2) < dotRadius + 10;
    }

    if (startDotClicked) {
      newLine = false;
      draw({ x, y });
      printCoordinates();
    } else {
      dots.push({ x, y });
      draw();
      printCoordinates();
      connectDots = true;
    }
  });

  // Remove a dot on right-click
  canvas.addEventListener("contextmenu", function (event) {
    event.preventDefault();
    if (!imageLoaded) return; // Prevent removing dots if image is not loaded
    const scaleFactor = getCanvasScaleFactor();
    const x = Math.round(
      (event.clientX - canvas.getBoundingClientRect().left) * scaleFactor.x
    );
    const y = Math.round(
      (event.clientY - canvas.getBoundingClientRect().top) * scaleFactor.y
    );

    if (!newLine && dots.length >= 3) {
      const startDotClicked =
        Math.sqrt((dots[0].x - x) ** 2 + (dots[0].y - y) ** 2) < dotRadius + 10;

      if (startDotClicked) {
        newLine = true;
        draw();
        return;
      }
    }
    dots = dots.filter(
      (dot) => Math.sqrt((dot.x - x) ** 2 + (dot.y - y) ** 2) > dotRadius + 5
    );
    draw();
    printCoordinates();
  });

  canvas.addEventListener("mouseover", function (event) {
    event.preventDefault();
    if (!imageLoaded) return; // Prevent removing dots if image is not loaded
    if (dots.length <= 0) return;
    const scaleFactor = getCanvasScaleFactor();
    const x = Math.round(
      (event.clientX - canvas.getBoundingClientRect().left) * scaleFactor.x
    );
    const y = Math.round(
      (event.clientY - canvas.getBoundingClientRect().top) * scaleFactor.y
    );

    const curser = { x, y };

    draw(curser);
  });

  canvas.addEventListener("mousemove", function (event) {
    event.preventDefault();
    if (!imageLoaded) return; // Prevent removing dots if image is not loaded
    if (dots.length <= 0) return;
    const scaleFactor = getCanvasScaleFactor();
    const x = Math.round(
      (event.clientX - canvas.getBoundingClientRect().left) * scaleFactor.x
    );
    const y = Math.round(
      (event.clientY - canvas.getBoundingClientRect().top) * scaleFactor.y
    );

    const curser = { x, y };

    draw(curser);
  });

  canvas.addEventListener("mouseleave", function (event) {
    event.preventDefault();
    if (!imageLoaded) return; // Prevent removing dots if image is not loaded
    if (dots.length <= 0) return;
    draw();
  });

  // Print coordinates
  function printCoordinates() {
    let coordinatesString = "";
    dots.forEach((dot, index) => {
      coordinatesString += `${dot.x}, ${dot.y}`;
      if (index !== dots.length - 1) {
        coordinatesString += ", ";
      }
    });
    coordinatesDiv.value = coordinatesString;
    // coordinatesDiv.textContent = coordinatesString;
  }

  // Handle image upload
  uploadImage.addEventListener("change", function (event) {
    const file = event.target.files[0];
    if (file) {
      if(!file.type.startsWith('image/')){
        alert('Only images are supported by your browser')
        return
      }
      const reader = new FileReader();
      reader.onload = function (e) {
        image = new Image();
        image.onload = function () {
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
          drawGrid();
          draw(); // Redraw dots and lines on the new image
          imageLoaded = true; // Set flag to true once image is loaded
        };
        image.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  });

  // Handle line color change
  lineColorInput.addEventListener("input", function (event) {
    lineColor = event.target.value;
    draw();
  });

  // Handle dot color change
  dotColorInput.addEventListener("input", function (event) {
    dotColor = event.target.value;
    draw();
  });

  // Handle line thickness change
  lineThicknessInput.addEventListener("input", function (event) {
    lineThickness = parseInt(event.target.value, 10);
    draw();
  });

  // Copy coordinates to clipboard
  copyCoordinatesButton.addEventListener("click", function () {
    const coordinatesString = coordinatesDiv.value.replaceAll(" ", "");
    console.log("coordinatesString", coordinatesString);
    navigator.clipboard
      .writeText(coordinatesString)
      .then(() => {
        alert(`Coordinates copied to clipboard!\n${coordinatesString}`);
      })
      .catch((err) => {
        console.error("Failed to copy coordinates: ", err);
      });
  });

  // Clear coordinates from inputs field and canvas
  clearCoordinatesButton.addEventListener("click", function () {
    const text =
      "Are you sure you want to clear coordinates?\nClick OK confirm or Cancel.";
    if (confirm(text) == true) {
      newLine = true;
      dots = [];
      coordinatesDiv.value = "";
      draw();
    }
  });

  // Push coordinates from input field to canvas
  pushCoordinates.addEventListener("click", function () {
    const values = coordinatesDiv.value
      .replaceAll(" ", "")
      .split(",")
      .map((point) => parseInt(point));

    console.log(values);
    const points = values.map((point) => parseInt(point));

    console.log(points);
    dots = [];
    while (points.length > 0) {
      dots.push({ x: points.shift(), y: points.shift() });
    }
    newLine = false;
    console.log(dots);
    draw();
    alert("Coordinates Pushed\n" + values.join(","));
  });

  //showModal();
  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  document.body.addEventListener("dragenter", (e) => {
    preventDefaults(e);
    clearTimeout(closeModalTimer);
    showModal();
  });

  const childNodes = dragOverModel.querySelectorAll("*");

  childNodes.forEach((node) => {
    node.addEventListener("dragenter", (e) => {
      //preventDefaults(e);
      clearTimeout(closeModalTimer);
      showModal();
    });

    node.addEventListener(
      "dragleave",
      function (e) {
        clearTimeout(closeModalTimer);
        closeModalTimer = setTimeout(hideModal, 1000);
      },
      true
    );

    node.addEventListener(
      "dragover",
      (e) => {
        preventDefaults(e)
        clearTimeout(closeModalTimer);
        console.log("dragover child", node, e);
      },
      true
    );
    node.addEventListener(
      "drop",
      (e) => {
        preventDefaults(e)
        hideModal();
        const file = e.dataTransfer.files[0]

        if (file) {
          if(!file.type.startsWith('image/')){
            alert('Only images are supported by your browser')
            return
          }
          const reader = new FileReader();
          reader.onload = function (e) {
            image = new Image();
            image.onload = function () {
              ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
              drawGrid();
              draw(); // Redraw dots and lines on the new image
              imageLoaded = true; // Set flag to true once image is loaded
            };
            image.src = e.target.result;
          };
          reader.readAsDataURL(file);
        }
      },
      true
    );
  });


  function showModal() {
    dragOverModel.classList.add("is-active");
  }

  function hideModal() {
    dragOverModel.classList.remove("is-active");
  }


});
