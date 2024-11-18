// Set up the video and canvas
const video = document.getElementById("video");
const canvas = document.getElementById("videoCanvas");
const ctx = canvas.getContext("2d");

const VIDEO_WIDTH = 640;
const VIDEO_HEIGHT = 480;

canvas.width = VIDEO_WIDTH;
canvas.height = VIDEO_HEIGHT;


// alert function
function showAlert() {
  document.getElementById("alertOverlay").style.display = "block";
  document.getElementById("alertModal").style.display = "block";
}

function closeAlert() {
  document.getElementById("alertOverlay").style.display = "none";
  document.getElementById("alertModal").style.display = "none";
}
// UI Elements
const statusBox = document.getElementById("statusBox");
const stats = document.getElementById("stats");

// Eye closure duration variables
let eyeClosureStartTime = null;
let totalEyeClosureDuration = 0;
let isEyesClosed = false;

// Blink detection threshold
const BLINK_THRESHOLD = 5;

// Eye landmarks for blink detection
const leftUpperEyelid = 159;
const leftLowerEyelid = 145;
const rightUpperEyelid = 386;
const rightLowerEyelid = 374;

// Initialize the FaceMesh model
const faceMesh = new FaceMesh({
  locateFile: (file) =>
    `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
});
faceMesh.setOptions({
  maxNumFaces: 1,
  refineLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
});

// Function to start the video stream
async function startVideo() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: VIDEO_WIDTH, height: VIDEO_HEIGHT },
  });
  video.srcObject = stream;
  video.play();
}

// Function to handle frame processing
async function startProcessing() {
  const camera = new Camera(video, {
    onFrame: async () => {
      await faceMesh.send({ image: video });
    },
    width: VIDEO_WIDTH,
    height: VIDEO_HEIGHT,
  });
  camera.start();
}

// Process the face landmarks and detect blinks
function processVideoFrame(results) {
  ctx.clearRect(0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);
  ctx.drawImage(results.image, 0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);

  if (results.multiFaceLandmarks && results.multiFaceLandmarks[0]) {
    detectBlink(results.multiFaceLandmarks[0]);
  }
}

// Detect blink and calculate eye closure duration
function detectBlink(landmarks) {
  const leftEyeDistance = Math.sqrt(
    Math.pow(
      (landmarks[leftUpperEyelid].x - landmarks[leftLowerEyelid].x) *
        VIDEO_WIDTH,
      2
    ) +
      Math.pow(
        (landmarks[leftUpperEyelid].y - landmarks[leftLowerEyelid].y) *
          VIDEO_HEIGHT,
        2
      )
  );

  const rightEyeDistance = Math.sqrt(
    Math.pow(
      (landmarks[rightUpperEyelid].x - landmarks[rightLowerEyelid].x) *
        VIDEO_WIDTH,
      2
    ) +
      Math.pow(
        (landmarks[rightUpperEyelid].y - landmarks[rightLowerEyelid].y) *
          VIDEO_HEIGHT,
        2
      )
  );

  // Detect if eyes are closed
  if (
    leftEyeDistance < BLINK_THRESHOLD &&
    rightEyeDistance < BLINK_THRESHOLD
  ) {
    if (!isEyesClosed) {
      eyeClosureStartTime = Date.now();
      isEyesClosed = true;
      statusBox.textContent = "Eyes Closed";
      statusBox.style.backgroundColor = "#dc3545";
    }

    // Update the total duration
    const currentTime = Date.now();
    totalEyeClosureDuration = (currentTime - eyeClosureStartTime) / 1000;
    stats.textContent = `Total Eye Closure Duration: ${totalEyeClosureDuration.toFixed(
      2
    )} seconds`;

    // Show alert if eyes are closed for more than 2 seconds
    if (totalEyeClosureDuration > 2) {
      showAlert()
    }
    
  } else {
    if (isEyesClosed) {
      isEyesClosed = false;
      statusBox.textContent = "Eyes Open";
      statusBox.style.backgroundColor = "#28a745";
    }
  }
}

// Start the video and processing
startVideo().then(() => {
  startProcessing();
});

// Handle face mesh results
faceMesh.onResults(processVideoFrame);