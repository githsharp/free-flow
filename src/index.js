let hideCamera = true;
const canvas = document.getElementById("output");

const videoWidth = 256;
const videoHeight = 256;

/**-------------------Setting up the camera------------------- */
async function setupAndPlayVideo() {
  const constraints = {
    audio: false,
    video: {
      facingMode: "user",
      width: videoWidth,
      height: videoHeight
    }
  };

  const video = document.getElementById("video");
  Object.assign(video, { width: videoWidth, height: videoHeight });
  Object.assign(canvas, { width: videoWidth, height: videoHeight });

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = stream;

    await video.play();
    return video;
  } catch (err) {
    throw err;
  }
}

/**-------------------Getting the data from PoseNet------------------- */
const poseNetConfig = {
  algorithm: "single-pose",
  input: {
    architecture: "MobileNetV1",
    outputStride: 16,
    inputResolution: 513,
    multiplier: 0.75,
    quantBytes: 2
  },
  singlePoseDetection: {
    minPoseConfidence: 0.1,
    minPartConfidence: 0.5
  },
  output: {
    showVideo: true,
    showPoints: true
  }
};

function detectPoseInRealTime(video, net) {
  async function poseDetectionFrame() {
    const {
      minPoseConfidence,
      minPartConfidence
    } = poseNetConfig.singlePoseDetection;

    const poses = await net.estimatePoses(video, {
      flipHorizontal: true,
      decodingMethod: "single-person"
    });

    console.log(poses);

    const ctx = canvas.getContext("2d");

    ctx.clearRect(0, 0, videoWidth, videoHeight);

    ctx.save();
    ctx.scale(-1, 1);
    ctx.translate(-videoWidth, 0);
    ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
    ctx.restore();

    poses.forEach(({ score, keypoints }) => {
      if (score >= minPoseConfidence && poseNetConfig.output.showPoints) {
        drawKeypoints(keypoints, minPartConfidence);
      }
    });

    requestAnimationFrame(poseDetectionFrame);
  }

  poseDetectionFrame();
}

/**-------------------Move the objects------------------- */
function drawKeypoints(keypoints, minConfidence) {
  let vw = Math.max(document.documentElement.clientWidth, window.innerWidth);
  let prevPos = 0;
  const min_jump = 5;

  let leftWrist = keypoints.find((point) => point.part === "leftWrist");
  let rightWrist = keypoints.find((point) => point.part === "rightWrist");
  let nose = keypoints.find((point) => point.part === "nose");
  const img = document.querySelector("img");

  if (leftWrist.score > minConfidence || rightWrist.score > minConfidence) {
    hideCamera = false;
    canvas.style.display = "block";
    const text = document.querySelector(".text");
    text.style.display = "none";
  }

  if (!hideCamera) {
    if (nose.score > minConfidence) {
      const { y, x } = nose.position;

      if (Math.abs(prevPos - x) > min_jump) {
        let xPos = (x / canvas.width) * vw;
        if (xPos < vw - 200) {
          img.style.left = `${1 + xPos}px`;
        } else {
          img.style.left = 1;
        }
        prevPos = x;
      }
    }
  }
}

async function loadPage() {
  let net;
  let video;
  try {
    net = await posenet.load(poseNetConfig.input);
    video = await setupAndPlayVideo();
  } catch (e) {
    let info = document.getElementById("info");
    info.textContent = "No support video capture. Do you have a camera?";
    throw e;
  }
  detectPoseInRealTime(video, net);
}

loadPage();
