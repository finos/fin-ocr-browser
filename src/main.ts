/**
 * Copyright (c) 2024 Discover Financial Services
*/
import './style.css';
import cv from '@techstark/opencv-js';
import * as ocr from "@discoverfinancial/fin-ocr-sdk";
import { scanImage, CheckDetails } from './checkProcessor';

let streaming = true;
let largestRect: cv.Rect | null = null;
let capturedFrame: cv.Mat | null = null;
let originalFrame: cv.Mat | null = null;
let frameStableCount = 0;
let checkMgr: ocr.CheckMgr;


document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <header class="bg-blue-600 py-6 text-white shadow-lg">
    <div class="container mx-auto px-4">
      <h1 class="text-3xl font-bold text-white">OCR Demo Application</h1>
      <p class="mt-2 text-lg">Demo of how to use <a href="https://github.com/discoverfinancial/fin-ocr-sdk">fin-ocr-sdk</a></p>
    </div>
  </header>

  <!-- Main Content -->
  <main class="container mx-auto mt-8 px-4">
    <!-- Manual OCR Processing Section -->
    <section class="mb-8 rounded-lg bg-slate-100 p-6 shadow-lg">
      <h2 class="mb-4 text-2xl font-semibold">Manual OCR Processing</h2>
      <p class="mb-4">Perform OCR on any check image manually using the <a href="https://github.com/discoverfinancial/fin-ocr-sdk" class="text-blue-600 underline">fin-ocr-sdk</a>.</p>
      <div class="flex flex-col items-center sm:flex-row">
        <input type="file" id="fileInput" class="mb-4 block w-full rounded border border-gray-300 p-2 sm:mb-0 sm:mr-4 sm:w-auto" />
        <button id="processImageButton" class="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">Process Image</button>
        <button id="generateCheckButton" class="ml-4 rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700">Generate Check Image</button>
      </div>
      <div id="generatedCheckImageContainer" class="mt-6">
        <h3 class="mb-2 text-xl font-semibold">Generated Check Image</h3>
        <img id="generatedCheckImage" src="" alt="Generated Check" class="rounded border border-gray-300 p-2" />
      </div>
      <!-- Output Section -->
      <div id="manualOcrOutput" class="mt-6">
        <p><strong>Routing Number:</strong> <span id="manualRoutingNumber">N/A</span></p>
        <p><strong>Account Number:</strong> <span id="manualAccountNumber">N/A</span></p>
        <p><strong>Check Number:</strong> <span id="manualCheckNumber">N/A</span></p>
      </div>
    </section>



  </main>

  <footer class="mt-8 bg-gray-800 py-4 text-white">
    <div class="container mx-auto px-4 text-center">
      <p>&copy; 2024 Discover Financial Services</p>
    </div>
  </footer>
`;
const video = document.getElementById('videoInput') as HTMLVideoElement;
const canvas = document.getElementById('canvasOutput') as HTMLCanvasElement;

const resetButton = document.getElementById('resetButton') as HTMLButtonElement;
const ocrButton = document.getElementById('ocrButton') as HTMLButtonElement;
const brightnessSlider = document.getElementById('brightness') as HTMLInputElement;
const contrastSlider = document.getElementById('contrast') as HTMLInputElement;


function processVideo(video: HTMLVideoElement, canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  const src = new cv.Mat(video.height, video.width, cv.CV_8UC4);
  const dst = new cv.Mat(video.height, video.width, cv.CV_8UC4);
  const gray = new cv.Mat();
  const blur = new cv.Mat();
  const edges = new cv.Mat();
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();

  const cap = new cv.VideoCapture(video);

  const FPS = 15;

  const cannyLowThreshold = 50;
  const cannyHighThreshold = 150;

  const minRectAreaRatio = 0.15;

  function processFrame(): void {
    try {
      if (!streaming) {
        src.delete();
        dst.delete();
        gray.delete();
        blur.delete();
        edges.delete();
        contours.delete();
        hierarchy.delete();
        return;
      }
      const begin = Date.now();

      cap.read(src);
      src.copyTo(dst);
      cv.cvtColor(dst, gray, cv.COLOR_RGBA2GRAY, 0);
      cv.GaussianBlur(gray, blur, new cv.Size(5, 5), 0);
      cv.Canny(blur, edges, cannyLowThreshold, cannyHighThreshold);

      cv.findContours(edges, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      largestRect = null;
      let maxRectArea = 0;
      const frameArea = video.width * video.height;
      const minRectArea = frameArea * minRectAreaRatio;

      for (let i = 0; i < contours.size(); i++) {
        const contour = contours.get(i);
        const approx = new cv.Mat();
        cv.approxPolyDP(contour, approx, 0.02 * cv.arcLength(contour, true), true);

        if (approx.rows === 4) {
          const rect = cv.boundingRect(approx);
          const rectArea = rect.width * rect.height;

          if (rectArea >= minRectArea && rectArea > maxRectArea && rect.width >= 2 * rect.height) {
            largestRect = rect;
            maxRectArea = rectArea;
          }
        }
        approx.delete();
      }

      if (largestRect) {
              ctx.strokeStyle = 'red';
              ctx.lineWidth = 2;
              ctx.strokeRect(largestRect.x, largestRect.y, largestRect.width, largestRect.height);

              const boundingBox = {
                x: 10,
                y: video.height * 0.2,
                width: video.width - 20,
                height: video.height * 0.6
              };

              const isInsideBoundingBox = (
                largestRect.x >= boundingBox.x &&
                largestRect.y >= boundingBox.y &&
                (largestRect.x + largestRect.width) <= (boundingBox.x + boundingBox.width) &&
                (largestRect.y + largestRect.height) <= (boundingBox.y + boundingBox.height) &&
                maxRectArea >= 0.8 * (boundingBox.width * boundingBox.height)
              );

              if (isInsideBoundingBox) {
                if (frameStableCount > 5) {  // Wait for 5 stable frames
                  captureFrameAndPause(video, canvas, largestRect).then(frame => {
                    capturedFrame = frame;
                    originalFrame = frame.clone();
                  });
                } else {
                  frameStableCount++;
                }
              } else {
                frameStableCount = 0;
              }
            }

            drawCorners(ctx, canvas.width, canvas.height);

            const delay = 1000 / FPS - (Date.now() - begin);
            setTimeout(processFrame, Math.max(0, delay));
          } catch (err) {
            console.error(err);
          }
        }

        requestAnimationFrame(processFrame);
      }

      async function captureFrameAndPause(video: HTMLVideoElement, canvas: HTMLCanvasElement, rect: cv.Rect): Promise<cv.Mat> {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Clear the canvas with a neutral color (light gray)
          ctx.fillStyle = '#e0e0e0';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Calculate the scaling factor to fit the rectangle in the canvas
          const scaleX = canvas.width / rect.width;
          const scaleY = canvas.height / rect.height;
          const scale = Math.min(scaleX, scaleY);

          // Calculate the centered position of the scaled image
          const scaledWidth = rect.width * scale;
          const scaledHeight = rect.height * scale;
          const offsetX = (canvas.width - scaledWidth) / 2;
          const offsetY = (canvas.height - scaledHeight) / 2;

          // Draw the cropped and scaled image
          ctx.drawImage(
            video,
            rect.x, rect.y, rect.width, rect.height,  // Source rectangle
            offsetX, offsetY, scaledWidth, scaledHeight  // Destination rectangle
          );

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          let mat = cv.matFromImageData(imageData);
         // mat = preprocessImage(mat);
          streaming = false;
          displayFrame(mat, canvas);
          return mat;
        } else {
          throw new Error("Could not get canvas context");
        }
      }

      function preprocessImage(src: cv.Mat): cv.Mat {
        let dst = new cv.Mat();

        if (src.channels() === 3) {
          cv.cvtColor(src, dst, cv.COLOR_RGB2GRAY);
        } else {
          src.copyTo(dst);
        }

        let blurred = new cv.Mat();
        cv.GaussianBlur(dst, blurred, new cv.Size(3, 3), 0);

        let binary = new cv.Mat();
        cv.adaptiveThreshold(blurred, binary, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, 11, 2);

        let kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
        let morphed = new cv.Mat();
        cv.morphologyEx(binary, morphed, cv.MORPH_CLOSE, kernel);

        dst.delete();
        blurred.delete();
        binary.delete();
        kernel.delete();

        return morphed;
      }

function resetCanvas(video: HTMLVideoElement, canvas: HTMLCanvasElement) {
  streaming = true;
  frameStableCount = 0;
  requestAnimationFrame(() => processVideo(video, canvas));
}

function drawCorners(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const topBottomOffset = height * 0.2;
  const sideOffset = 10;
  const cornerLength = 20;
  const lineWidth = 4;

  ctx.strokeStyle = '#00FF00';
  ctx.lineWidth = lineWidth;

  ctx.beginPath();
  ctx.moveTo(sideOffset, topBottomOffset + cornerLength);
  ctx.lineTo(sideOffset, topBottomOffset);
  ctx.lineTo(sideOffset + cornerLength, topBottomOffset);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(width - sideOffset, topBottomOffset + cornerLength);
  ctx.lineTo(width - sideOffset, topBottomOffset);
  ctx.lineTo(width - sideOffset - cornerLength, topBottomOffset);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(sideOffset, height - topBottomOffset - cornerLength);
  ctx.lineTo(sideOffset, height - topBottomOffset);
  ctx.lineTo(sideOffset + cornerLength, height - topBottomOffset);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(width - sideOffset, height - topBottomOffset - cornerLength);
  ctx.lineTo(width - sideOffset, height - topBottomOffset);
  ctx.lineTo(width - sideOffset - cornerLength, height - topBottomOffset);
  ctx.stroke();
}



async function initializeAndStart() {
  checkMgr = await ocr.CheckMgr.setInstance({ config: { translators: 'tesseract', logLevel: 'info' } });
  console.log('CheckMgr initialized.');

  navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
    video.srcObject = stream;
    video.play();

    const checkOpenCVReady = () => {
      if (cv.Mat) {
        processVideo(video, canvas);
      } else {
        setTimeout(checkOpenCVReady, 100);
      }
    };

    checkOpenCVReady();
  });



  resetButton.addEventListener('click', () => {
     resetCanvas(video, canvas);
     capturedFrame = null;
     if (originalFrame) {
       originalFrame.delete();
       originalFrame = null;
     }
   });

  ocrButton.addEventListener('click', async () => {
      if (capturedFrame) {
        const brightness = parseInt(brightnessSlider.value, 10);
        const contrast = parseInt(contrastSlider.value, 10);

        adjustBrightnessContrast(capturedFrame, brightness, contrast);

        try {
          const checkDetails = await scanImage(checkMgr, capturedFrame);
          displayCheckDetails(checkDetails);
        } catch (error) {
          console.error('Error processing check details:', error);
        }
      }
    });



  brightnessSlider.addEventListener('input', () => {
    if (originalFrame) {
      capturedFrame = originalFrame.clone();
      adjustBrightnessContrast(capturedFrame, parseInt(brightnessSlider.value, 10), parseInt(contrastSlider.value, 10));
      displayFrame(capturedFrame, canvas);
    }
  });

  contrastSlider.addEventListener('input', () => {
    if (originalFrame) {
      capturedFrame = originalFrame.clone();
      adjustBrightnessContrast(capturedFrame, parseInt(contrastSlider.value, 10), parseInt(brightnessSlider.value, 10));
      displayFrame(capturedFrame, canvas);
    }
  });

}


function adjustBrightnessContrast(src: cv.Mat, brightness: number, contrast: number): void {
  const alpha = contrast / 100 + 1;
  const beta = brightness;
  src.convertTo(src, -1, alpha, beta);
}

function displayFrame(mat: cv.Mat, canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  const imageData = new ImageData(new Uint8ClampedArray(mat.data), mat.cols, mat.rows);
  ctx?.putImageData(imageData, 0, 0);
}

function displayCheckDetails(details: CheckDetails) {
  document.getElementById('routingNumber')!.textContent = details.routingNumber;
  document.getElementById('accountNumber')!.textContent = details.accountNumber;
  document.getElementById('checkNumber')!.textContent = details.checkNumber;
}

const fileInput = document.getElementById('fileInput') as HTMLInputElement;
const processImageButton = document.getElementById('processImageButton') as HTMLButtonElement;
let generatedCheckImageUrl: string = '';
processImageButton.addEventListener('click', async () => {
  const file = fileInput.files?.[0];
  let mat: cv.Mat;

  if (file) {
    const reader = new FileReader();
    reader.onload = async function(event) {
      const img = new Image();
      img.onload = async function() {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);

        const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
        mat = cv.matFromImageData(imageData!);
        try {
          const checkDetails = await scanImage(checkMgr, mat);
          displayManualCheckDetails(checkDetails);
        } catch (error) {
          console.error('Error processing check details:', error);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  } else {
    const img = new Image();
    img.onload = async function() {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0);

      const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
      mat = cv.matFromImageData(imageData!);
      try {
        const checkDetails = await scanImage(checkMgr, mat);
        displayManualCheckDetails(checkDetails);
      } catch (error) {
        console.error('Error processing check details:', error);
      }
    };
    img.src = generatedCheckImageUrl;
  }
});

function displayManualCheckDetails(details: CheckDetails) {
  document.getElementById('manualRoutingNumber')!.textContent = details.routingNumber;
  document.getElementById('manualAccountNumber')!.textContent = details.accountNumber;
  document.getElementById('manualCheckNumber')!.textContent = details.checkNumber;
}

async function generateCheckImage(): Promise<string> {
  const width = 600;
  const height = 250;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to get 2D context');
  }

  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, width, height);

  const font = new FontFace('MICR', 'url(GnuMICR.ttf)');
  await font.load();
  (document.fonts as any).add(font);
  ctx.font = '16px MICR';

  const [routingNumber, accountNumber, checkNumber] = generateRandomCheckDetails();

  const micrLine = `A${routingNumber}A  ${accountNumber}C  ${checkNumber}`;
  ctx.fillStyle = 'black';
  ctx.fillText(micrLine, 10, height - 25);

  return canvas.toDataURL('image/png');
}

const generateCheckButton = document.getElementById('generateCheckButton') as HTMLButtonElement;
const generatedCheckImage = document.getElementById('generatedCheckImage') as HTMLImageElement;

generateCheckButton.addEventListener('click', async () => {
  try {
    const checkImageUrl = await generateCheckImage();
    generatedCheckImage.src = checkImageUrl;
  } catch (error) {
    console.error('Error generating check image:', error);
  }
});

function generateRandomCheckDetails(): [string, string, string] {
    const routingNumber = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10)).join('');
    const accountNumber = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10)).join('');
    const checkNumber = Array.from({ length: 4 }, () => Math.floor(Math.random() * 10)).join('');
    return [routingNumber, accountNumber, checkNumber];
}


//initializeAndStart();
async function initialize() {
  checkMgr = await ocr.CheckMgr.setInstance({ config: { translators: 'opencv', logLevel: 'info' } });
  console.log('CheckMgr initialized.');
  generatedCheckImageUrl = await generateCheckImage();
  generatedCheckImage.src = generatedCheckImageUrl;
}

initialize();
