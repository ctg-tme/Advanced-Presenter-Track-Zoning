document.addEventListener("DOMContentLoaded", function () {
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const coordinatesDiv = document.getElementById("coordinates");
  const uploadImage = document.getElementById("uploadImage");
  const lineColorInput = document.getElementById("lineColor");
  const dotColorInput = document.getElementById("dotColor");
  const lineThicknessInput = document.getElementById("lineThickness");
  const copyCoordinatesButton = document.getElementById("copyCoordinates");
  const dotRadius = 5;
  let dots = [];
  let connectDots = false;
  let image = new Image();
  let lineColor = lineColorInput.value;
  let dotColor = dotColorInput.value;
  let lineThickness = parseInt(lineThicknessInput.value, 10);
  let imageLoaded = false; // Flag to track if image has been loaded

  // Load initial background image
  image.onload = function () {
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    drawGrid();
    imageLoaded = true; // Set flag to true once image is loaded
  }
  image.src = "sampleImage.jpeg"; // Default image

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

  // Draw dots and lines
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    drawGrid();
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = lineThickness; // Set line thickness for connecting lines
    ctx.setLineDash([5, 5]); // Set line dash pattern (5px dash, 5px gap)
    dots.forEach((dot, index) => {
      ctx.beginPath();
      ctx.fillStyle = dotColor;
      ctx.arc(dot.x, dot.y, dotRadius, 0, Math.PI * 2);
      ctx.fill();
      if (index > 0) {
        ctx.moveTo(dots[index - 1].x, dots[index - 1].y);
        ctx.lineTo(dot.x, dot.y);
      }
      ctx.stroke();
    });
    ctx.setLineDash([]); // Reset line dash pattern to solid line
  }

  // Calculate scaling factor
  const getCanvasScaleFactor = () => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: canvas.width / rect.width,
      y: canvas.height / rect.height
    };
  };

  // Add a dot on click
  canvas.addEventListener("click", function (event) {
    if (!imageLoaded) return; // Prevent adding dots if image is not loaded
    const scaleFactor = getCanvasScaleFactor();
    const x = Math.round((event.clientX - canvas.getBoundingClientRect().left) * scaleFactor.x);
    const y = Math.round((event.clientY - canvas.getBoundingClientRect().top) * scaleFactor.y);
    dots.push({ x, y });
    draw();
    printCoordinates();
    connectDots = true;
  });

  // Remove a dot on right-click
  canvas.addEventListener("contextmenu", function (event) {
    event.preventDefault();
    if (!imageLoaded) return; // Prevent removing dots if image is not loaded
    const scaleFactor = getCanvasScaleFactor();
    const x = Math.round((event.clientX - canvas.getBoundingClientRect().left) * scaleFactor.x);
    const y = Math.round((event.clientY - canvas.getBoundingClientRect().top) * scaleFactor.y);
    dots = dots.filter(dot => Math.sqrt((dot.x - x) ** 2 + (dot.y - y) ** 2) > dotRadius + 2);
    draw();
    printCoordinates();
  });

  // Print coordinates
  function printCoordinates() {
    let coordinatesString = "Coordinates: ";
    dots.forEach((dot, index) => {
      coordinatesString += `${dot.x}, ${dot.y}`;
      if (index !== dots.length - 1) {
        coordinatesString += ", ";
      }
    });
    coordinatesDiv.textContent = coordinatesString;
  }

  // Handle image upload
  uploadImage.addEventListener("change", function (event) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        image = new Image();
        image.onload = function () {
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
          drawGrid();
          draw(); // Redraw dots and lines on the new image
          imageLoaded = true; // Set flag to true once image is loaded
        }
        image.src = e.target.result;
      }
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
    const coordinatesString = coordinatesDiv.textContent.replace('Coordinates: ', '');
    navigator.clipboard.writeText(coordinatesString).then(() => {
      alert(`Coordinates copied to clipboard!\n${coordinatesString}`);
    }).catch(err => {
      console.error("Failed to copy coordinates: ", err);
    });
  });
});
